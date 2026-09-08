# NoyyalSense — Regulator Dashboard

Thisha's module: regulator dashboard, unit detail view, buyer/DPP verification view.
Integrates Vamika's ledger service and Haripriya's inference service.

## Setup

```bash
cp .env.local.example .env.local
npm install
npm run dev
```

Runs on http://localhost:3000 by default.

## Running the two backend services

- **Vamika's ledger** (`smart-tiruppur/ledger/`): `uvicorn app.main:app --reload --port 8000`
- **Haripriya's inference service** (`noyyalsense-main/`): run it on **port 8001**, e.g.
  `uvicorn api.main:app --reload --port 8001`
  (her repo has no port set, and it defaults to 8000 same as the ledger — they'll
  collide if you don't set `--port 8001` explicitly)

If either service runs somewhere else, edit `.env.local` to match — nothing is
hardcoded elsewhere.

## The adapter layer (`lib/adapter.ts`)

Haripriya's real API doesn't match `contracts/inference_event_contract.md`. Rather
than block on that being fixed, this dashboard adapts around it:

| Contract expected | What she actually built |
|---|---|
| `GET /events/{event_id}/inference` | `POST /infer`, `POST /simulate_event` |
| unit ids `unit_001`..`unit_012` | unit ids `U001`..`U012` |
| `decision`: `investigate`/`abstain`/`normal` | `decision.decision`: `INVESTIGATE`/`ABSTAIN` (no normal) |
| `confidence`, `explanation`, `evidence_sufficiency`, `estimated_release_severity`, `model_version`, `top_candidates` | none of these — only `posterior_top3`, `decision`, `sensor_health` |

`lib/adapter.ts` is the **only** place that translates her raw response into the
shape everything else in this app (and Vamika's `POST /ledger/events`) expects.
If she ever updates her API to match the contract exactly, this file is the only
thing that should need to change.

**"Normal" status:** her API can only ever return `investigate` or `abstain` —
it has no concept of a clean/normal reading. So on this dashboard, `normal` only
ever shows up for Vamika's pre-seeded demo events (read straight from the
ledger's own records), never from a live simulated inference call. If you want
the adapter to synthesize a "normal" case instead (e.g. high-confidence abstain
with clean sensors), that logic goes in `estimateSeverity`/`normalizeDecision`
in `lib/adapter.ts` — flag it and we can add it.

## What's real vs. what's a known gap

- Unit list, compliance data, DPP, hash-chain ledger, QR verification — all
  live against Vamika's actual endpoints.
- "Run simulated discharge event" button calls Haripriya's real
  `POST /simulate_event`, adapts the response, and writes it to Vamika's ledger.
- **No live sensor trend charts (pH/EC/turbidity/flow over time).** Neither
  service currently exposes an endpoint for raw historical sensor readings —
  Haripriya's API only returns the posterior + sensor health summary, not the
  underlying time series. The dashboard shows sensor health flags (missing
  count, drift) instead. If the simulator exposes raw readings later, this is
  the first thing to wire up.
- If either backend is unreachable, the dashboard falls back to the last
  successful response (cached in the browser) and shows a banner saying so,
  rather than breaking.

## Structure

```
app/
  page.tsx              regulator dashboard (units grid + event feed + simulate button)
  units/[id]/page.tsx    unit detail (compliance, DPP, hash chain)
  verify/page.tsx        buyer/DPP search + verification-by-ID
lib/
  config.ts              service base URLs (env-driven)
  types.ts                contract types + Haripriya's real raw types
  adapter.ts              translation layer (see above)
  api.ts                  fetch wrappers with stale-data fallback
components/               StatusBadge, StaleBanner, Nav, AlertFeed, UnitCard
```
