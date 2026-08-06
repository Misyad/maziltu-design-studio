# MZT Apps — Deployment Rollback Plan

Target release: **v2.0.0** (Phase 1 — Digital Identity Foundation).

Phase 1 is strictly **additive** (adds only three nullable `users` columns plus new
read/write endpoints). Old code stays compatible with the new schema and new code
stays compatible with the old schema, which keeps the rollback window wide and
non-disruptive. Rollback is split into two levels depending on whether data was
touched.

---

## Rollback mechanisms

| Mechanism | Command (host, as `root`) | When |
|---|---|---|
| Revert code (auto-redeploy) | `git revert <commit>` → `git push origin <branch>` → Jenkins redeploys | any level |
| Restore database | `gunzip < /opt/mzt/backups/<file>.sql.gz | docker compose exec -T db mysql -u<user> -p<pass> <db>` | Level 2 only |
| Drop the additive columns (alternative) | `docker compose exec -T backend php artisan migrate:rollback --step=1` | if only schema undo desired |

Date backup file is the one produced by `/opt/mzt/mzt-backup.sh` immediately
before release (e.g. `mzt-mazw9983_alvinade_maziltu-YYYYMMDD-HHMMSS.sql.gz`).

---

## Level 1 — Deployment failed (no data-affecting step reached)

Characteristics: `Migrate DB` left the schema additive-empty (or migrate had not
yet run), health check failed, or a runtime issue surfaces with **no bad writes**.
Saved the whole DB is unnecessary because the change does not alter/migrate data.

1. Identify the release commit(s) that caused the failure.
2. Revert code in the affected repo(s):
   ```bash
   git revert <release_commit>               # frontend and/or backend
   git push origin main                       # Jenkins auto-redeploys to previous state
   ```
   `git revert` is used (never `reset --hard` / force-push) to preserve history —
   this repo is Lovable-connected and must not be rewritten.
3. Confirm Jenkins `Health check` stage passes (200 + `success:true`).
4. If the schema had already applied (nullable columns), it can stay; it is
   backward-compatible. Optionally drop it later via
   `migrate:rollback --step=1`.

**No database restore is required at Level 1.**

---

## Level 2 — Failure involving data / schema diverged or bad writes

Trigger: e.g. migration partially applied, seed/backfill wrote wrong values,
bulk account generation created bad state, or schema cannot be reconciled with
code.

1. **Stop / scale writes** if feasible (pause user-triggered account generation).
2. **Revert code** exactly as Level 1 (safe `git revert` + push + auto-redeploy).
3. **Restore the database** from the pre-push snapshot taken in Phase 0:
   ```
   cd /opt/mzt
   docker compose exec -T db sh -c 'exec mysql -uroot -p"$MARIADB_ROOT_PASSWORD" "$MARIADB_DATABASE"' \
       < <(gunzip -c /opt/mzt/backups/mzt-mazw9983_alvinade_maziltu-<timestamp>.sql.gz)
   ```
   or restore the file explicitly:
   ```
   gunzip -c /opt/mzt/backups/mzt-mazw9983_alvinade_maziltu-<ts>.sql.gz \
     | docker compose exec -T db mysql -u<user> -p<pass> <db>
   ```
4. Confirm the restored snapshot contains the `event_status` view and that
   `docker compose exec -T backend php artisan migrate:status` reports the
   additive migration as unrun/absent (i.e. schema is back to pre-release).
5. Run the pipeline again; the `Migrate DB` stage will re-apply additively.
6. **Privacy/security note**: restoring an older DB snapshot reverts any credential
   changes made since the snapshot. If the release rotated any tokens/keys, rotate
   them again after restore.

> Prefer Level 1 whenever the failure occurs before any bad write. Restoring the
> database risks losing data written after the snapshot (e.g. new registrations),
> so reserve Level 2 for genuine schema/data divergence.

---

## Safety guarantees

- Migration is **idempotent**: each column is added only `Schema::hasColumn()` —
  safe to run repeatedly, and `migrate --force` never prompts.
- `.env`, `db/init/*.sql`, and `storage/` are operator-owned and never overwritten
  by the pipeline.
- Health check requires a real DB round-trip (`/api/public/stats` → `success:true`)
  before the build is marked green; the `Migrate DB` stage verifies columns via
  `information_schema` before that health gate.

_Companion doc: `docs/PRD-Digital Identity Foundation.md` (Phase 1 PRD)._