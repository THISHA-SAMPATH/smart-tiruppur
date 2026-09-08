# Smart Tiruppur: NoyyalSense Green Ledger

A simulation-first platform for detecting and investigating abnormal industrial
discharge in a Tiruppur-like water network under noisy/missing sensors — and
turning the resulting evidence into an auditable compliance / Digital Product
Passport (DPP) record.

The core question this project answers:

> Can we infer the most likely discharge source from sparse, noisy downstream
> measurements, and abstain when the evidence is too weak to make a defensible
> accusation?

## System flow

```
Simulated discharge event
  → water-network / sensor simulator
  → source-attribution + uncertainty model
  → regulator dashboard and alert
  → Green Ledger evidence record
  → DPP / QR verification page
```

One integrated web app, three independently demo-able modules.

## Repo structure

```
simulator/     water-network + sensor simulator (synthetic Tiruppur-like network)
inference/     uncertainty-aware source attribution model
ledger/        Green Ledger — hash-chained evidence log, DPP + QR verification
dashboard/     regulator dashboard, unit detail, buyer/DPP verification view
contracts/     shared API contract between inference and the rest of the system
docs/          project brief and design notes
```

## Team

| Module                     | Owner     | Ownership                                                                               |
| -------------------------- | --------- | --------------------------------------------------------------------------------------- |
| Simulator + inference core | Haripriya | Water-network simulator, physics-aware source attribution, reliability/abstention logic |
| Green Ledger + DPP         | Vamika    | Hash-chained audit log, DPP generator, QR verification                                  |
| Integration dashboard      | Thisha    | Regulator dashboard, unit detail page, buyer/DPP view, service integration              |

## Running it locally

Each backend service runs on its own port — **set these explicitly**, since
neither service hardcodes a non-default port and they'll collide on 8000 otherwise.

```bash
# Vamika's ledger
cd ledger
pip install -r requirements.txt
python seed.py
uvicorn app.main:app --reload --port 8000

# Haripriya's inference service
cd ../inference   # or wherever her repo lands in this tree
pip install -r requirements.txt
uvicorn api.main:app --reload --port 8001

# Thisha's dashboard
cd ../dashboard
cp .env.local.example .env.local
npm install
npm run dev
```

Dashboard runs at http://localhost:3000, ledger docs at http://localhost:8000/docs,
inference docs at http://localhost:8001/docs.

## Known integration note

Haripriya's inference API doesn't match `contracts/inference_event_contract.md`
exactly (different endpoints, response shape, and unit ID format — `U007` vs.
`unit_007`). Rather than block on reconciling the two, the dashboard's
`dashboard/lib/adapter.ts` translates her real API output into the contract
shape everywhere else in the app expects. See `dashboard/README.md` for the
full breakdown of what differs and why.

## Demo scenarios

Three fixed scenarios, all reproducible via seed + scenario ID:

1. **Normal operations** — no alert
2. **Detectable night-time discharge** — `unit_007` identified with confidence
3. **Ambiguous / sensor drift** — system abstains rather than falsely accusing a unit

The third scenario is the one that proves the system is reliable rather than
just an alert generator — the dashboard visibly distinguishes **Investigate**,
**Normal**, and **Abstain — insufficient evidence** rather than treating every
anomaly as an accusation.

## What we deliberately did not build

No real hardware requirement, no fake live COD/BOD sensors, no blockchain
(this is a tamper-evident hash chain, not a blockchain), no credit
marketplace, no worker-management platform, no heavy deep learning, no large
number of units/sensors. The goal is a defensible scientific core, reproducible
scenarios, clean integration, and a strong live demo — not scope creep.
