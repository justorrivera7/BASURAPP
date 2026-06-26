# PRD — Recolecta (Uber for Garbage)

## Original problem statement
> "QUIERO UNA APP DE UBER PARA RECOGER LA BASURA TENGO EXPERIENCIA DEVOPS PARA HACER EL DEPLOYMENT LOS USUARIOS TIENEN QUE SABER A QUE HORA LLEGA EL BASURERO Y QUIERO TAMBIEN BASURA"

User has DevOps experience and will handle deployment. Wants residents to know when the garbage truck arrives, plus the ability to handle special waste.

## User choices (confirmed)
- 3 roles: Residente, Conductor, Admin Municipal
- Live map + ETA + notifications
- Special pickup requests enabled
- Phone OTP auth in **mock mode** (code shown on screen, no SMS provider)
- Google Maps API key: env var (`REACT_APP_GOOGLE_MAPS_API_KEY`) left empty — fallback simulated map

## User personas
1. **Carlos (Residente)** — wants to know when the truck arrives and to schedule pickup of bulky items.
2. **Juan (Conductor)** — drives a city truck, needs the day's route and to mark stops collected.
3. **Admin Municipal** — coordinates the fleet, sees KPIs, assigns trucks/routes, handles the queue of special-pickup requests.

## Core requirements (static)
- Phone OTP authentication (mock) with first-signup name + role selection
- Three protected dashboards: `/resident`, `/driver`, `/admin`
- Live truck tracking, ETA calculation (haversine distance / speed)
- Special pickup request lifecycle: pending → scheduled → collected/cancelled
- Notifications generated automatically on key events
- Admin can CRUD trucks and routes

## What's been implemented (2026-02 / iteration 1)
- Backend (FastAPI + Mongo):
  - `/api/auth/request-otp`, `/api/auth/verify-otp` (JWT, 30d)
  - `/api/me`, `/api/me/address`
  - `/api/trucks` CRUD + `/api/trucks/{id}/location`
  - `/api/routes` + `/api/routes/{id}/stops/{id}/status`
  - `/api/resident/eta` (nearest active truck, distance + ETA)
  - `/api/special-pickups` create/list/update
  - `/api/notifications` list + mark-read
  - `/api/admin/stats`, `/api/admin/users`
  - Auto-seeded demo data (admin, 2 drivers, 1 resident, 2 trucks, 1 in-progress route)
- Frontend (React + Tailwind + shadcn):
  - Landing page with Swiss high-contrast aesthetic, safety orange + asphalt black, Outfit/Manrope fonts
  - Login page with two-step phone OTP (code shown inline)
  - Resident dashboard: ETA hero, map (Google Maps when key set, fallback otherwise), special pickup modal, notifications
  - Driver dashboard: route stops, mark collected, auto-route-simulation toggle, real GPS button
  - Admin dashboard: KPI grid, fleet map, trucks list, pickup queue with schedule/cancel/collect actions, route + truck creation modals
  - Role-based routing & guards
- Testing: 20/20 backend pytest tests passing, all UI flows validated by testing agent

## Prioritized backlog
### P1
- Real SMS via Twilio (currently mock)
- Add data-testids on edit-address modal inputs (testing report note)
- Geocoding integration (so admin/resident can type address and get lat/lng automatically) — needs Google Maps key
- WebSocket / push real-time truck location instead of polling

### P2
- Driver photo proof on stop collection
- Resident rating of collection
- Route auto-optimization (TSP)
- Multi-municipality support
- Admin analytics (collections over time, heatmaps)
- Split server.py into routers (auth/trucks/routes/admin)

### P3
- Mobile app (React Native) for drivers
- Citizen-reported illegal dumping markers
- Recycling categories education content

## Files of note
- `/app/backend/server.py` — all routes
- `/app/frontend/src/pages/{Landing,Login,ResidentDashboard,DriverDashboard,AdminDashboard}.jsx`
- `/app/frontend/src/components/{Header,MapView}.jsx`
- `/app/frontend/src/context/AuthContext.jsx`
- `/app/design_guidelines.json`
- `/app/memory/test_credentials.md`

## Deployment notes
- All env via `REACT_APP_BACKEND_URL`, `MONGO_URL`, `DB_NAME`, `JWT_SECRET` (optional), `CORS_ORIGINS`, `REACT_APP_GOOGLE_MAPS_API_KEY`
- Backend on `0.0.0.0:8001`, frontend `3000`, ingress maps `/api` → backend
- No hardcoded secrets
