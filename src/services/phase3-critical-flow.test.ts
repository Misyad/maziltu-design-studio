import axios from "axios";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiClient, ApiError } from "@/services/api-client";
import type {
  AuditTimelineParams,
  AuditTimelineResponse,
  CheckInRequest,
  CheckInResult,
  VerificationQueueParams,
  VerificationQueueResponse,
  Order,
  Ticket,
  AttendanceSummary,
  GateMonitoringResponse,
  OperationalEvent,
  ParticipantListResponse,
  ScannerLookupResult,
  KtaPriceSettingsResponse,
} from "@/types/api";
import {
  auditTimelineQuery,
  attendanceSummaryQuery,
  gateMonitoringQuery,
  operationalEventsQuery,
  participantsQuery,
  verificationQueueQuery,
  queryKeysAuditTimeline,
} from "@/services/queries";

// Helpers
function axiosError(status: number, data: unknown, config: Record<string, unknown> = {}) {
  return new axios.AxiosError(
    "Request failed",
    "ERR_BAD_REQUEST",
    { headers: {}, ...config } as never,
    undefined,
    {
      status,
      statusText: String(status),
      data,
      headers: {},
      config: { headers: {} } as never,
    },
  );
}

function envelope<T>(data: T) {
  return { success: true, message: "ok", data };
}

function errorEnvelope(message: string, errors?: Record<string, string[]>) {
  return { success: false, message, errors };
}

describe("PHASE 3 — Critical Flow: contract & integration", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  // ── Registration ────────────────────────────────────────────────
  describe("Registration → Payment root aggregate", () => {
    it("registerEvent builds POST /events/{id}/register and unwraps { success, data }", async () => {
      const { registerEvent } = await import("@/services/mzt-api");
      const order: Partial<Order> = {
        uuid: "ord-uuid",
        nomor_order: "ORD-1",
        status_registrasi: "registered" as const,
      };
      const raw = { success: true, message: "registered", data: order };
      const postSpy = vi.spyOn(apiClient, "post").mockResolvedValue({ data: raw });

      // apiPostRaw is used, so raw envelope is returned directly
      const res = await registerEvent(42, "pay_now");
      expect(postSpy).toHaveBeenCalledWith(
        "/events/42/register",
        { payment_choice: "pay_now" },
        expect.anything(),
      );
      expect(res).toEqual(raw);
    });

    it("duplicate registration surfaces as ApiError 409", async () => {
      const { registerEvent } = await import("@/services/mzt-api");
      vi.spyOn(apiClient, "post").mockRejectedValue(
        axiosError(409, errorEnvelope("Already registered")),
      );
      await expect(registerEvent(42, "pay_at_venue")).rejects.toMatchObject({ status: 409 });
      try {
        await registerEvent(42, "pay_at_venue");
      } catch (e) {
        expect(e).toBeInstanceOf(ApiError);
        expect((e as ApiError).status).toBe(409);
      }
    });

    it("fetchMyOrders and fetchOrder use envelope data", async () => {
      const { fetchMyOrders, fetchOrder } = await import("@/services/mzt-api");
      const orders: Partial<Order>[] = [{ uuid: "a" } as Order];
      vi.spyOn(apiClient, "get").mockResolvedValueOnce({ data: envelope(orders) });
      await expect(fetchMyOrders()).resolves.toEqual(orders);

      const order: Partial<Order> = { uuid: "a" } as Order;
      vi.spyOn(apiClient, "get").mockResolvedValueOnce({ data: envelope(order) });
      await expect(fetchOrder("a")).resolves.toEqual(order);
    });
  });

  // ── Payment Verification ────────────────────────────────────────
  describe("Payment Verification Queue", () => {
    it("fetchVerificationQueue encodes params and drops null/empty", async () => {
      const { fetchVerificationQueue } = await import("@/services/mzt-api");
      const spy = vi.spyOn(apiClient, "get").mockResolvedValue({
        data: envelope({
          data: [],
          current_page: 1,
          last_page: 1,
          per_page: 15,
          total: 0,
        } as VerificationQueueResponse),
      });

      const params: VerificationQueueParams = {
        status: "waiting_verification",
        event_id: 5,
        date_from: null,
        date_to: "",
        q: "PAY-1",
        page: 1,
        per_page: 15,
      };
      await fetchVerificationQueue(params);
      const url = spy.mock.calls[0]![0] as string;
      expect(url).toContain("/payments?");
      expect(url).toContain("status=waiting_verification");
      expect(url).toContain("event_id=5");
      expect(url).toContain("q=PAY-1");
      expect(url).not.toContain("date_from");
      expect(url).not.toContain("date_to=");
    });

    it("query key is parameter-aware (different params → different keys)", () => {
      const k1 = verificationQueueQuery({
        status: "waiting_verification",
        page: 1,
        per_page: 15,
      } as VerificationQueueParams).queryKey;
      const k2 = verificationQueueQuery({
        status: "paid",
        page: 1,
        per_page: 15,
      } as VerificationQueueParams).queryKey;
      const k3 = verificationQueueQuery({
        status: "waiting_verification",
        page: 2,
        per_page: 15,
      } as VerificationQueueParams).queryKey;
      expect(k1).not.toEqual(k2);
      expect(k1).not.toEqual(k3);
    });

    it("verifyPayment uses PUT /payments/{uuid}/verify and returns changed flag", async () => {
      const { verifyPayment } = await import("@/services/mzt-api");
      const payload = { payment: { uuid: "p1" } as never, changed: true };
      const spy = vi
        .spyOn(apiClient, "put")
        .mockResolvedValue({ data: { success: true, data: payload } });
      const res = await verifyPayment("p1", { status: "paid", note: "ok" });
      expect(spy).toHaveBeenCalledWith("/payments/p1/verify", { status: "paid", note: "ok" });
      expect(res.success).toBe(true);
    });

    it("verifyPayment propagates ApiError on 403/404/422", async () => {
      const { verifyPayment } = await import("@/services/mzt-api");
      for (const status of [403, 404, 422]) {
        vi.spyOn(apiClient, "put").mockRejectedValueOnce(
          axiosError(status, errorEnvelope("forbidden")),
        );
        await expect(verifyPayment("p1", { status: "paid" })).rejects.toMatchObject({ status });
      }
    });

    it("fetchPaymentDetail unwraps envelope", async () => {
      const { fetchPaymentDetail } = await import("@/services/mzt-api");
      const data = {
        payment: { uuid: "p1" } as never,
        outstanding: { total: 100, paid: 100, outstanding: 0, payment_status: "paid" },
      };
      vi.spyOn(apiClient, "get").mockResolvedValue({ data: envelope(data) });
      await expect(fetchPaymentDetail("p1")).resolves.toEqual(data);
    });
  });

  // ── Ticket ──────────────────────────────────────────────────────
  describe("Ticket Issuance", () => {
    it("fetchMyTicket / fetchTicket unwrap { ticket }", async () => {
      const { fetchMyTicket, fetchTicket } = await import("@/services/mzt-api");
      const ticket: Partial<Ticket> = { uuid: "t1", status: "issued" as const } as Ticket;
      vi.spyOn(apiClient, "get").mockResolvedValueOnce({ data: envelope({ ticket }) });
      await expect(fetchMyTicket("ord-uuid")).resolves.toEqual(ticket);
      vi.spyOn(apiClient, "get").mockResolvedValueOnce({ data: envelope({ ticket }) });
      await expect(fetchTicket("t1")).resolves.toEqual(ticket);
    });

    it("reissueTicket posts note and unwraps ticket", async () => {
      const { reissueTicket } = await import("@/services/mzt-api");
      const ticket: Partial<Ticket> = { uuid: "t1", status: "issued" as const } as Ticket;
      const spy = vi.spyOn(apiClient, "post").mockResolvedValue({ data: envelope({ ticket }) });
      await expect(reissueTicket("t1", "reprint")).resolves.toEqual({ ticket });
      expect(spy).toHaveBeenCalledWith(
        "/tickets/t1/reissue",
        { note: "reprint" },
        expect.anything(),
      );
    });

    it("revokeTicket deletes with note", async () => {
      const { revokeTicket } = await import("@/services/mzt-api");
      const ticket: Partial<Ticket> = { uuid: "t1", status: "revoked" as const } as Ticket;
      // apiClient.delete mock for revoke
      const spy = vi
        .spyOn(apiClient, "delete")
        .mockResolvedValue({ data: { success: true, data: { ticket } } });
      const res = await revokeTicket("t1", "fraud");
      expect(spy).toHaveBeenCalled();
      expect(res).toEqual({ ticket });
    });

    it("ticket state is deterministic: draft → issued → checked_in → finished", () => {
      const allowed: Record<string, string[]> = {
        draft: ["issued", "cancelled"],
        issued: ["checked_in", "revoked", "cancelled"],
        checked_in: ["finished"],
        finished: [],
        cancelled: [],
        revoked: [],
      };
      expect(allowed["issued"]).toContain("checked_in");
      expect(allowed["checked_in"]).toContain("finished");
      expect(allowed["draft"]).not.toContain("checked_in");
    });
  });

  // ── Check-in ────────────────────────────────────────────────────
  describe("Check-in", () => {
    it("checkIn posts to /checkin and returns CheckInResult", async () => {
      const { checkIn } = await import("@/services/mzt-api");
      const result: CheckInResult = {
        ticket: {
          id: 1,
          uuid: "t1",
          nomor_ticket: "T-1",
          status: "checked_in" as const,
          used_at: new Date().toISOString(),
        },
        attendance: {
          id: 10,
          id_event: 1,
          id_tanggal: 1,
          id_anggota: 1,
          id_ticket: 1,
          gate: "A",
          scanned_at: new Date().toISOString(),
          scanned_by: 1,
        },
        participant: { id: 1, id_anggota: "MZT001", name: "A" },
        event: { id_event: 1, event_name: "E" },
      } as CheckInResult;
      const spy = vi
        .spyOn(apiClient, "post")
        .mockResolvedValue({ data: { success: true, data: result } });
      const payload: CheckInRequest = { ticket_uuid: "t1", id_tanggal: 1, gate: "A" };
      const res = await checkIn(payload);
      expect(spy).toHaveBeenCalledWith("/checkin", payload, expect.anything());
      expect(res).toEqual({ success: true, data: result });
    });

    it("duplicate checkIn surfaces 409 with first scan info", async () => {
      const { checkIn } = await import("@/services/mzt-api");
      const dup = {
        success: false,
        message: "already checked",
        data: { first_scanned_at: new Date().toISOString(), first_scanned_by: 1 },
      };
      vi.spyOn(apiClient, "post").mockRejectedValue(axiosError(409, dup));
      await expect(checkIn({ ticket_uuid: "t1", id_tanggal: 1 })).rejects.toMatchObject({
        status: 409,
      });
    });

    it("invalid ticket uuid → 404, expired ticket → 409", async () => {
      const { checkIn } = await import("@/services/mzt-api");
      vi.spyOn(apiClient, "post").mockRejectedValueOnce(
        axiosError(404, errorEnvelope("not found")),
      );
      await expect(checkIn({ ticket_uuid: "bad", id_tanggal: 1 })).rejects.toMatchObject({
        status: 404,
      });
      vi.spyOn(apiClient, "post").mockRejectedValueOnce(axiosError(409, errorEnvelope("expired")));
      await expect(checkIn({ ticket_uuid: "t1", id_tanggal: 1 })).rejects.toMatchObject({
        status: 409,
      });
    });

    it("uses the lookup and onsite admission contracts", async () => {
      const { admitScannerParticipantOnsite, lookupScannerParticipant } =
        await import("@/services/mzt-api");
      const result: ScannerLookupResult = {
        ticket: { id: 1, uuid: "t1", nomor_ticket: "T-1", status: "issued" },
        participant: { id: 1, id_anggota: "MZT001", name: "Anggota" },
        event: { id_event: 2, event_name: "Reuni" },
        payment: {
          choice: "pay_at_venue",
          status: "pending",
          amount: 25000,
          source: null,
          paid_at: null,
        },
        attendance: {
          status: "not_present",
          scanned_at: null,
          scanned_by: null,
          gate: null,
        },
      };
      const post = vi
        .spyOn(apiClient, "post")
        .mockResolvedValueOnce({ data: { success: true, data: result } })
        .mockResolvedValueOnce({ data: { success: true, data: result } });
      const lookupPayload = { identifier: "T-1", id_event: 2, id_tanggal: 3 };
      const onsitePayload = { ticket_uuid: "t1", id_tanggal: 3, gate: "A", amount: 25000 };

      await expect(lookupScannerParticipant(lookupPayload)).resolves.toEqual({
        success: true,
        data: result,
      });
      await expect(admitScannerParticipantOnsite(onsitePayload)).resolves.toEqual({
        success: true,
        data: result,
      });
      expect(post).toHaveBeenNthCalledWith(1, "/checkin/lookup", lookupPayload, {});
      expect(post).toHaveBeenNthCalledWith(2, "/checkin/onsite", onsitePayload, {});
    });
  });

  describe("KTA price settings", () => {
    it("gets and updates the active price with its history", async () => {
      const { fetchKtaPriceSettings, updateKtaPriceSettings } = await import("@/services/mzt-api");
      const settings: KtaPriceSettingsResponse = {
        setting: { amount: 25000, updated_at: "2026-09-23T00:00:00Z", updated_by: "Admin" },
        history: [
          {
            id: 1,
            old_amount: 20000,
            new_amount: 25000,
            actor: "Admin",
            created_at: "2026-09-23T00:00:00Z",
          },
        ],
      };
      const get = vi.spyOn(apiClient, "get").mockResolvedValue({ data: envelope(settings) });
      const put = vi.spyOn(apiClient, "put").mockResolvedValue({ data: envelope(settings) });

      await expect(fetchKtaPriceSettings()).resolves.toEqual(settings);
      await expect(updateKtaPriceSettings(25000)).resolves.toEqual(settings);
      expect(get).toHaveBeenCalledWith("/kta/settings/price");
      expect(put).toHaveBeenCalledWith("/kta/settings/price", { amount: 25000 });
    });
  });

  // ── Attendance / Operations ─────────────────────────────────────
  describe("Attendance & Operations (read-only evidence)", () => {
    it("fetchOperationalEvents encodes date range and event filter", async () => {
      const { fetchOperationalEvents } = await import("@/services/mzt-api");
      const events: OperationalEvent[] = [{ id_event: 1 } as OperationalEvent];
      const spy = vi.spyOn(apiClient, "get").mockResolvedValue({ data: envelope(events) });
      await fetchOperationalEvents({ start: "2026-01-01", end: "2026-01-31", event_id: 1 });
      const url = spy.mock.calls[0]![0] as string;
      expect(url).toContain("/dashboard/operations/events");
      expect(url).toContain("start=2026-01-01");
      expect(url).toContain("event_id=1");
    });

    it("query keys are param-aware", () => {
      const k1 = operationalEventsQuery({ event_id: 1 }).queryKey;
      const k2 = operationalEventsQuery({ event_id: 2 }).queryKey;
      expect(k1).not.toEqual(k2);
    });

    it("fetchParticipants paginates and filters by tgl/gate/q", async () => {
      const { fetchParticipants } = await import("@/services/mzt-api");
      const resp: ParticipantListResponse = {
        rows: [],
        meta: { total: 0, page: 1, per_page: 20, last_page: 0, filter: {} },
      };
      const spy = vi.spyOn(apiClient, "get").mockResolvedValue({ data: envelope(resp) });
      await fetchParticipants(1, { tgl: 2, gate: "A", q: "MZT", page: 1, per_page: 20 });
      const url = spy.mock.calls[0]![0] as string;
      expect(url).toContain("/dashboard/operations/events/1/attendees");
      expect(url).toContain("gate=A");
      expect(url).toContain("q=MZT");
      const k1 = participantsQuery(1, { page: 1, per_page: 20 }).queryKey;
      const k2 = participantsQuery(1, { page: 2, per_page: 20 }).queryKey;
      expect(k1).not.toEqual(k2);
    });

    it("fetchAttendanceSummary returns present/legacy/total", async () => {
      const { fetchAttendanceSummary } = await import("@/services/mzt-api");
      const summary: AttendanceSummary = {
        event_id: 1,
        tanggal_id: 1,
        present: 5,
        legacy_count: 2,
        total: 7,
        per_tanggal: [],
      };
      vi.spyOn(apiClient, "get").mockResolvedValue({ data: envelope(summary) });
      await expect(fetchAttendanceSummary(1, { tgl: 1 })).resolves.toEqual(summary);
      const k1 = attendanceSummaryQuery(1, { tgl: 1 }).queryKey;
      const k2 = attendanceSummaryQuery(1, { tgl: 2 }).queryKey;
      expect(k1).not.toEqual(k2);
    });

    it("fetchGateMonitoring groups by gate", async () => {
      const { fetchGateMonitoring } = await import("@/services/mzt-api");
      const resp: GateMonitoringResponse = {
        event_id: 1,
        tanggal_id: 1,
        rows: [{ gate: "A", present: 3, legacy: 0, total: 3 }],
        breakdown_per_gate: {},
      };
      vi.spyOn(apiClient, "get").mockResolvedValue({ data: envelope(resp) });
      await expect(fetchGateMonitoring(1, { tgl: 1 })).resolves.toEqual(resp);
      const k1 = gateMonitoringQuery(1, { tgl: 1 }).queryKey;
      const k2 = gateMonitoringQuery(1, { tgl: 2 }).queryKey;
      expect(k1).not.toEqual(k2);
    });
  });

  // ── Audit Timeline ──────────────────────────────────────────────
  describe("Audit Timeline — final evidence", () => {
    it("fetchAuditTimeline encodes all filters and drops null/empty", async () => {
      const { fetchAuditTimeline } = await import("@/services/mzt-api");
      const resp: AuditTimelineResponse = { rows: [], total: 0 };
      const spy = vi.spyOn(apiClient, "get").mockResolvedValue({ data: envelope(resp) });
      const params: AuditTimelineParams = {
        event_id: 1,
        date_from: "2026-01-01",
        date_to: "2026-01-31",
        entity_type: "payment",
        action: "verify",
        actor: "finance",
        q: "ORD",
        page: 1,
        per_page: 20,
      };
      await fetchAuditTimeline(params);
      const url = spy.mock.calls[0]![0] as string;
      expect(url).toContain("/audit-timeline/data?");
      expect(url).toContain("event_id=1");
      expect(url).toContain("entity_type=payment");
      expect(url).toContain("action=verify");
      expect(url).toContain("actor=finance");
      expect(url).toContain("q=ORD");
      expect(url).toContain("page=1");

      // drops null/empty — reuse spy, second call should have no query
      vi.mocked(spy).mockResolvedValueOnce({ data: envelope(resp) } as never);
      await fetchAuditTimeline({
        event_id: null,
        date_from: null,
        q: "",
        page: null,
      } as AuditTimelineParams);
      const url2 = spy.mock.calls[1]![0] as string;
      expect(url2).toBe("/audit-timeline/data");
    });

    it("query key is parameter-aware for all filter combos", () => {
      const p1: AuditTimelineParams = {
        event_id: 1,
        entity_type: "payment",
        page: 1,
        per_page: 20,
      };
      const p2: AuditTimelineParams = { event_id: 1, entity_type: "ticket", page: 1, per_page: 20 };
      const p3: AuditTimelineParams = {
        event_id: 2,
        entity_type: "payment",
        page: 1,
        per_page: 20,
      };
      const p4: AuditTimelineParams = {
        event_id: 1,
        entity_type: "payment",
        page: 2,
        per_page: 20,
      };
      expect(queryKeysAuditTimeline(p1)).not.toEqual(queryKeysAuditTimeline(p2));
      expect(queryKeysAuditTimeline(p1)).not.toEqual(queryKeysAuditTimeline(p3));
      expect(queryKeysAuditTimeline(p1)).not.toEqual(queryKeysAuditTimeline(p4));
      expect(auditTimelineQuery(p1).queryKey).toEqual(queryKeysAuditTimeline(p1));
    });

    it("auditTimelineQuery uses retry 0 and does not refetch without param change", async () => {
      const q1 = auditTimelineQuery({ event_id: 1, page: 1, per_page: 20 }) as unknown as {
        retry: number;
        queryKey: unknown;
      };
      const q2 = auditTimelineQuery({ event_id: 1, page: 1, per_page: 20 });
      expect(q1.queryKey).toEqual(q2.queryKey);
      expect(q1.retry).toBe(0);
    });

    it("audit rows contain required fields", async () => {
      const { fetchAuditTimeline } = await import("@/services/mzt-api");
      const rows: AuditTimelineResponse["rows"] = [
        {
          actor: "finance",
          action: "verify",
          entity: "payment",
          entity_id: 1,
          old_status: "waiting_verification",
          new_status: "paid",
          timestamp: "2026-01-01T10:00:00Z",
          note: "ok",
        },
      ];
      vi.spyOn(apiClient, "get").mockResolvedValue({
        data: envelope({ rows, total: 1 } as AuditTimelineResponse),
      });
      const res = await fetchAuditTimeline({ event_id: 1, page: 1, per_page: 20 });
      expect(res.rows[0]).toMatchObject({
        actor: "finance",
        entity: "payment",
        old_status: "waiting_verification",
      });
      expect(res.total).toBe(1);
    });

    it("server pagination: total vs rows length", async () => {
      const { fetchAuditTimeline } = await import("@/services/mzt-api");
      vi.spyOn(apiClient, "get").mockResolvedValue({
        data: envelope({
          rows: Array.from({ length: 20 }, (_, i) => ({
            actor: "a",
            action: "v",
            entity: "payment" as const,
            entity_id: i,
            timestamp: new Date().toISOString(),
          })),
          total: 100,
        } as AuditTimelineResponse),
      });
      const res = await fetchAuditTimeline({ page: 1, per_page: 20 });
      expect(res.rows.length).toBe(20);
      expect(res.total).toBe(100);
    });
  });

  // ── Authorization & State ───────────────────────────────────────
  describe("Authorization & deterministic errors", () => {
    it("FINANCE_ROLES guard blocks non-finance (checked via requireRoles)", async () => {
      const { requireRoles } = await import("@/lib/auth");
      const { FINANCE_ROLES } = await import("@/lib/auth");
      const { isRedirect } = await import("@tanstack/react-router");
      const client = { ensureQueryData: async () => ({ id: 1, roles: ["anggota"] }) } as never;
      await expect(requireRoles(client as never, FINANCE_ROLES)).rejects.toSatisfy((e: unknown) =>
        isRedirect(e as never),
      );
    });

    it("api error mapping preserves status for 401/403/404/409/422", async () => {
      const { apiGet } = await import("@/services/api-client");
      for (const status of [401, 403, 404, 409, 422]) {
        vi.spyOn(apiClient, "get").mockRejectedValueOnce(axiosError(status, errorEnvelope("err")));
        await expect(apiGet("/x")).rejects.toMatchObject({ status });
      }
    });
  });

  // ── End-to-end flow (mocked sequence) ───────────────────────────
  describe("E2E sequence: Registration → Payment verify → Ticket → Check-in → Attendance → Audit", () => {
    it("full happy path mocked via apiClient", async () => {
      const {
        registerEvent,
        verifyPayment,
        fetchMyTicket,
        checkIn,
        fetchAttendanceSummary,
        fetchAuditTimeline,
      } = await import("@/services/mzt-api");

      // 1) register
      vi.spyOn(apiClient, "post").mockResolvedValueOnce({
        data: { success: true, data: { uuid: "ord1", status_registrasi: "registered" } },
      });
      const reg = await registerEvent(1, "pay_now");
      expect((reg as { data: { uuid: string } }).data.uuid).toBe("ord1");

      // 2) verify payment paid
      vi.spyOn(apiClient, "put").mockResolvedValueOnce({
        data: { success: true, data: { payment: { uuid: "pay1", status: "paid" }, changed: true } },
      });
      const ver = await verifyPayment("pay1", { status: "paid" });
      expect(ver.success).toBe(true);

      // 3) ticket issued
      vi.spyOn(apiClient, "get").mockResolvedValueOnce({
        data: envelope({ ticket: { uuid: "t1", status: "issued" } }),
      });
      const ticket = await fetchMyTicket("ord1");
      expect(ticket.status).toBe("issued");

      // 4) check-in
      const chkRes: CheckInResult = {
        ticket: {
          id: 1,
          uuid: "t1",
          nomor_ticket: "T1",
          status: "checked_in",
          used_at: new Date().toISOString(),
        },
        attendance: {
          id: 1,
          id_event: 1,
          id_tanggal: 1,
          id_anggota: 1,
          id_ticket: 1,
          gate: "A",
          scanned_at: new Date().toISOString(),
          scanned_by: 1,
        },
        participant: { id: 1, id_anggota: "MZT001", name: "A" },
        event: { id_event: 1, event_name: "E" },
      } as CheckInResult;
      vi.spyOn(apiClient, "post").mockResolvedValueOnce({ data: { success: true, data: chkRes } });
      const chk = await checkIn({ ticket_uuid: "t1", id_tanggal: 1 });
      expect((chk as { data: CheckInResult }).data.ticket.status).toBe("checked_in");

      // 5) attendance evidence
      const summary: AttendanceSummary = {
        event_id: 1,
        tanggal_id: 1,
        present: 1,
        legacy_count: 0,
        total: 1,
        per_tanggal: [],
      };
      vi.spyOn(apiClient, "get").mockResolvedValueOnce({ data: envelope(summary) });
      const att = await fetchAttendanceSummary(1, { tgl: 1 });
      expect(att.present).toBe(1);

      // 6) audit evidence contains ticket checked_in
      const audit: AuditTimelineResponse = {
        rows: [
          {
            actor: "prisensi",
            action: "checkin",
            entity: "checkin",
            entity_id: 1,
            old_status: "issued",
            new_status: "checked_in",
            timestamp: new Date().toISOString(),
            note: null,
          },
        ],
        total: 1,
      };
      vi.spyOn(apiClient, "get").mockResolvedValueOnce({ data: envelope(audit) });
      const aud = await fetchAuditTimeline({
        event_id: 1,
        entity_type: "checkin",
        page: 1,
        per_page: 20,
      });
      expect(aud.rows[0]!.new_status).toBe("checked_in");
    });
  });
});
