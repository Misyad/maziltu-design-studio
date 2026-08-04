# MZT APPS — Premium Public Website (Pass 1)

## Stack note (important)

This project runs on TanStack Start + React 19 (file-based routing under `src/routes/`), not Next.js App Router. Everything else you asked for is available and will be used: TypeScript (strict), Tailwind v4, shadcn/ui, TanStack Query, React Hook Form, Zod, Axios, Lucide, Framer Motion, dark/light/system theme. The Laravel backend stays untouched — no endpoint, field, body, or auth change.

## Scope of this pass

The full public marketing site plus the shared design system and the typed API layer. Admin dashboard, auth screens, and all CRUD come in the next pass.

## Design language

Taken from your reference (layout language only, no content or branding):
large photography with gradient overlays, rounded cards, generous whitespace, elegant shadows, restrained Framer Motion (fade / slide / stagger / counters / hover lift).

- Emerald dominant: primary `#166534`, secondary `#15803D`
- Gold `#B8860B` as accent only (eyebrows, small underlines, hover states)
- Background `#F6F8F7`, dark `#0D1317`, text `#17202A`
- Headings Plus Jakarta Sans, body Inter (loaded via `<link>` in the root route)
- All colors as semantic oklch tokens in `src/styles.css` — no hardcoded color classes in components

## Pages

Sectioned marketing routes, each with its own SEO metadata:

- `/` — Hero (full-bleed photo, gradient overlay, headline, subheadline, dual CTA, inline stats), About, Animated Statistics, Programs, Upcoming Events, News, Gallery, Testimonials, CTA band
- `/about` — organization story, mission/vision/history tabs, milestones timeline
- `/programs` — 7 program cards: Members, Events, Attendance, News, Digital ID Card, Online Payment, Dashboard — each with icon, image, title, description, hover animation
- `/events` — event cards with status badge, date range, location, CTA
- `/news` — featured article + recent grid
- `/gallery` — responsive masonry with keyboard-accessible lightbox
- `/contact` — contact form (RHF + Zod), org info, map placeholder
- Shared header (sticky, mobile drawer, theme toggle, "Login" link) and multi-column footer in the root layout

## Data

The service layer is written against your real spec now:

- Axios client on `http://localhost:8000/api` (env-overridable), bearer-token interceptor, `{ success, message, data }` envelope unwrapping, media URLs resolved as `{BASE}/storage/{path}`
- Typed models and TanStack Query hooks for: `/info/mzt`, `/info/pesantren` (both PUBLIC — wired live), plus `/login`, `/user`, `/logout`, `/dashboard/*`, `/members`, `/events`, `/news`, `/attendance`, `/transactions`, `/activity-log`, `/carousel`, `/profile` ready for pass 2
- Because `GET /events` and `GET /news` require auth, the public Events/News/Gallery/Testimonials sections render typed placeholder content from `src/constants/` so the design is reviewable. Each is a single swap to a hook once you expose public read endpoints. I will not invent endpoints.
- Member IDs use `id_users` for detail/update/delete throughout the typed layer

Your listed backend bugs are recorded and respected: KTA rendered client-side from `GET /members/{id_users}`, Code39 barcode generated in the frontend, profile edits routed through `POST /members/{id_users}`.

## Components (reusable, shared with the admin pass)

Button, Card, Badge, Modal/Dialog, Drawer, Toast (sonner), Dropdown, Avatar, EmptyState, Skeleton, Loading, FormField, StatCard, SectionTitle, HeroBanner, Gallery + Lightbox, Timeline, Pagination, SearchBox, ThemeToggle, AnimatedCounter, Reveal wrapper, Header, Footer. DataTable, DateRangePicker, Sidebar, Topbar, Breadcrumb land with the dashboard pass.

## Quality bar

Responsive at mobile/tablet/desktop with no horizontal overflow, semantic HTML, visible focus states, ARIA on interactive components, WCAG AA contrast in both themes, lazy-loaded images and route-level code splitting, no inline styles.

## Folder structure

```text
src/
  routes/            # file-based pages
  components/ui/     # shadcn primitives
  components/shared/ # StatCard, SectionTitle, Reveal, Gallery, ...
  components/layout/ # Header, Footer
  features/          # home/, events/, news/, gallery/, contact/
  services/          # axios client + endpoint modules
  hooks/  types/  schemas/  lib/  constants/  assets/
```

## Next pass

Login (`id_anggota` + password), bearer session + route guard, enterprise dashboard shell (sidebar, topbar, breadcrumb, global search, notifications), and the Members / Events / Attendance / News / Transactions / Activity Log / Profile / ID Card screens.
