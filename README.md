<div align="center">

# 💧 NoyyalSense — Smart Tiruppur Green Ledger

### *Civic Intelligence & Physics-Aware Industrial Pollution Attribution Platform*

[![Next.js](https://img.shields.io/badge/Next.js-14.2-000000?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Neon_Cloud-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)](https://neon.tech)
[![Prisma](https://img.shields.io/badge/Prisma-ORM-2D3748?style=for-the-badge&logo=prisma&logoColor=white)](https://www.prisma.io/)
[![FastAPI](https://img.shields.io/badge/FastAPI-Python_3.11-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![Deployment](https://img.shields.io/badge/Vercel-Live_Production-000000?style=for-the-badge&logo=vercel&logoColor=white)](https://smart-tiruppur.vercel.app)

---

[🌐 **Live Production Application**](https://smart-tiruppur.vercel.app) • [🔑 **Role-Based Login Portal**](https://smart-tiruppur.vercel.app/login) • [🗺️ **Interactive GIS Map**](https://smart-tiruppur.vercel.app/map) • [🛡️ **Public DPP Verification**](https://smart-tiruppur.vercel.app/verify)

</div>

<br/>

> **Core Research Question:**  
> *Can we infer the most likely industrial discharge source from sparse, noisy downstream river measurements, and abstain when the evidence is too weak to make a defensible legal accusation?*

---

## 🌟 Executive Summary

**NoyyalSense** is an enterprise-grade civic intelligence and environmental compliance platform built for the textile hub of **Tiruppur, Tamil Nadu**. Situated along the Noyyal River basin, Tiruppur faces severe environmental pressure from textile dyeing units and industrial effluent discharges.

NoyyalSense combines **physics-aware Bayesian source attribution**, a **cryptographic SHA-256 hash-chained Green Ledger**, **CGWB FIRKA groundwater risk modeling**, and **Digital Product Passports (DPP)** into a unified multi-tenant platform for regulators, industry operators, groundwater officers, and citizens.

---

## 🏗️ Core Architecture & Data Flow

```mermaid
flowchart TD
    subgraph SENSORS ["1. Water Quality Sensor Simulator"]
        S1["Node 01: Orathupalayam Dam\n(pH, EC, Turbidity, Flow)"]
        S2["Node 02: Kasipalayam Reach\n(pH, EC, Turbidity, Flow)"]
        S3["Node 03: Mangalam Reach\n(pH, EC, Turbidity, Flow)"]
    end

    subgraph INFERENCE ["2. Bayesian Source Attribution Model"]
        INF["FastAPI Inference Engine\n(Posterior Calculation & Thresholding)"]
        DEC{"Evidence Decision"}
        DEC -- "P(Unit) > 75%" --> ADV["INVESTIGATE\nHigh-Confidence Identification"]
        DEC -- "Normal Bounds" --> NORM["NORMAL\nBaseline Operations"]
        DEC -- "P(Unit) < 75% / Noise" --> ABS["ABSTAIN\nInsufficient Evidence"]
    end

    subgraph LEDGER ["3. Cryptographic Green Ledger"]
        GL["FastAPI Ledger Service\nSHA-256 Hash-Chained Evidence Log"]
        DPP["Digital Product Passport (DPP)\nQR Code Generation"]
    end

    subgraph DASHBOARD ["4. Role-Based Workspaces (Next.js 14)"]
        REG["Regulator Workbench"]
        IND["Industry Facility Portal"]
        GWO["Groundwater FIRKA Assessment"]
        CIT["Citizen Transparency Portal"]
    end

    SENSORS -->|Real-time Sensor Stream| INF
    INF --> DEC
    ADV -->|Log Incident| GL
    NORM -->|Log Baseline| GL
    ABS -->|Log Abstention| GL
    GL --> DPP
    GL --> REG
    GL --> IND
    GL --> GWO
    GL --> CIT
```

---

## 🔑 Key Pillars & System Capabilities

### 1. 🛡️ Physics-Aware Source Attribution & Uncertainty Modeling
- **Downstream Water Sensor Network**: Real-time telemetry monitoring pH, Electrical Conductivity (EC), Turbidity, and Flow rates across the Noyyal River network.
- **Uncertainty-Aware Decision Engine**: Rather than treating every spike as a definitive alert, the inference model evaluates posterior probability distributions.
- **Three-Tier Status Classification**:
  - 🔴 **INVESTIGATE**: High-confidence identification of specific discharging units (e.g., `unit_007`).
  - 🟢 **NORMAL**: Water quality parameters within permissible environmental limits.
  - 🟡 **ABSTAIN**: Detects anomaly but abstains from false accusations when sensor noise or multi-source overlap creates ambiguity.

### 2. 📜 Cryptographic Green Ledger & Digital Product Passports (DPP)
- **Tamper-Evident Evidence Log**: Every sensor reading, attribution decision, and regulator action is written to an immutable, SHA-256 hash-chained ledger.
- **Digital Product Passport (DPP)**: Generates verifiable compliance passports for textile batches produced in Tiruppur.
- **Public QR Verification**: Global brands and buyers can scan product QR codes at `/verify` to inspect the complete environmental audit trail.

### 3. 🌐 CGWB FIRKA Groundwater Assessment
- **Administrative Zone Risk Classification**: Evaluates groundwater draft vs. natural recharge across Tiruppur's 6 administrative FIRKAs (*Avinashi, Tiruppur North, Tiruppur South, Palladam, Kangeyam, Dharapuram*).
- **Dynamic Risk Categorization**: Maps groundwater stress levels into **Safe**, **Semi-Critical**, **Critical**, and **Over-Exploited** categories based on Central Ground Water Board (CGWB) methodology.
- **Interactive GeoJSON GIS Map**: Integrated Leaflet map visualization rendering real Firka boundaries and hydrological monitoring wells.

### 4. 👥 Multi-Tenant Role-Based Access Control (RBAC)
- **5 Dedicated Workspaces**: Custom workflows tailored specifically for Admin, Regulator, Industry Unit, Groundwater Officer, and Citizen roles.
- **Democratized Civic Reporting**: Public portal allowing citizens to lodge geo-referenced pollution reports with real-time status tracking.

---

## 👥 Demo Accounts Matrix

Test the application instantly using pre-configured role credentials (Password: `SmartTiruppur2026!`):

| Role | Email Address | Assigned Workspace | Primary Capability |
| :--- | :--- | :--- | :--- |
| **👑 Admin** | `admin@smarttiruppur.local` | `/admin` | Full system control, user management, global telemetry |
| **🛡️ Regulator** | `regulator@smarttiruppur.local` | `/regulator` | Real-time incident alerts, investigation logging, enforcement |
| **🏭 Industry** | `industry@smarttiruppur.local` | `/industry` | Facility monitoring (`unit_007`), compliance self-audits, DPP batch issuance |
| **🌐 GW Officer** | `groundwater@smarttiruppur.local` | `/groundwater` | FIRKA groundwater extraction assessments & scenario modeling |
| **👤 Citizen** | `citizen@smarttiruppur.local` | `/citizen` | Public water quality view, pollution reporting, DPP QR verification |

---

## 📁 Repository Structure & Service Mesh

```
dashboard/
├── app/                        # Next.js 14 App Router
│   ├── admin/                  # Admin workspace & user management
│   ├── regulator/              # Regulator workbench & incident management
│   ├── industry/               # Industry facility portal & unit detail
│   ├── groundwater/            # CGWB FIRKA assessment & dynamic risk tool
│   ├── citizen/                # Public overview & civic reporting
│   ├── map/                    # Interactive Leaflet GIS city map
│   ├── verify/                 # Public DPP QR verification portal
│   ├── login/                  # Full-viewport role-based authentication portal
│   └── api/                    # Next.js Serverless API routes
├── components/                 # Reusable UI components & AuthProvider
├── lib/                        # Prisma DB client, auth logic, & API adapters
├── prisma/                     # PostgreSQL schema & migration files
├── public/                     # Static assets, GeoJSON maps, & backdrop graphics
├── contracts/                  # Shared API specs between microservices
├── ledger/                     # FastAPI SHA-256 Green Ledger microservice
├── inference/                  # FastAPI Bayesian source attribution microservice
└── simulator/                  # Physics-aware water network simulator
```

---

## ⚡ Quick Start & Local Setup

### Prerequisites
- **Node.js**: `v18.x` or `v20.x`
- **Python**: `3.10+` (for local backend microservices)
- **PostgreSQL**: Neon Cloud database URL configured in `.env.local`

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/THISHA-SAMPATH/smart-tiruppur.git
cd smart-tiruppur
npm install
```

### 2. Environment Configuration
Create a `.env.local` file in the project root:
```env
DATABASE_URL="postgresql://user:password@ep-sample-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require"
JWT_SECRET="your-secure-jwt-secret-key"
NEXT_PUBLIC_LEDGER_BASE_URL="http://localhost:8000"
NEXT_PUBLIC_INFERENCE_BASE_URL="http://localhost:8001"
```

### 3. Database Initialization
```bash
npx prisma generate
npx prisma migrate deploy
```

### 4. Running Microservices Locally

```bash
# Terminal 1 — Green Ledger (Vamika)
cd ledger
pip install -r requirements.txt
python seed.py
uvicorn app.main:app --reload --port 8000

# Terminal 2 — Inference Engine (Haripriya)
cd ../inference
pip install -r requirements.txt
uvicorn api.main:app --reload --port 8001

# Terminal 3 — Dashboard (Thisha)
cd ../dashboard
npm run dev
```

Open **`http://localhost:3000`** in your browser.

---

## 🧪 Scientific & Engineering Rigor

### What We Deliberately Built
- **Defensible Scientific Core**: Prioritizes statistical confidence and false-accusation mitigation over simple threshold alarms.
- **Tamper-Evident Audit Chain**: Cryptographic proof of provenance for every sensor observation and regulatory intervention.
- **Production-Grade Cloud Persistence**: Fully migrated to Neon PostgreSQL with strict relational foreign keys and indices.

### What We Deliberately Avoided
- ❌ No fake live COD/BOD hardware requirements.
- ❌ No heavy blockchain gas fees (lightweight, high-performance SHA-256 hash-chaining).
- ❌ No scope-creep feature padding — focused strictly on a reliable, demo-ready civic intelligence platform.

---

## 👥 Team & Ownership Matrix

| Module | Technical Owner | Primary Responsibilities |
| :--- | :--- | :--- |
| **Simulator + Inference Core** | **Haripriya** | Water-network simulator, physics-aware source attribution, reliability & abstention modeling |
| **Green Ledger + DPP Engine** | **Vamika** | SHA-256 hash-chained audit log, DPP record generator, public QR verification backend |
| **Integration Dashboard** | **Thisha** | Multi-tenant Next.js application, Leaflet GIS integration, RBAC auth, PostgreSQL database architecture |

---

## 🛠️ My Role — Integration Dashboard (Thisha Sampath)

### Core Development
- **Designed & Built Full Integration Dashboard**: Developed the regulator workbench, unit detail screens, citizen portal, groundwater FIRKA risk modeling tools, and buyer/DPP verification views using Next.js 14 App Router, TypeScript, and Prisma ORM.
- **Visual Design System**: Established the dashboard's visual design system, including typography, curated color tokens, and layout structure, used consistently across all screens.

### Cross-Service Integration & Schema Adaptation
- **Inference Service Contract Reconciliation**: Identified that the inference service's actual API diverged from the team's agreed-upon contract (differing endpoints, response structures, unit-ID formatting `U007` vs. `unit_007`, and decision-value casing).
- **Architected Adapter Layer (`lib/adapter.ts`)**: Implemented a transformation adapter to translate the inference service's real output into the shape expected by the rest of the application, allowing integration to proceed without blocking on upstream changes.
- **Ledger Schema Alignment**: Identified and resolved a second schema mismatch where the ledger service's `GET /ledger/events` endpoint returned a simplified stored-record format rather than the full expected event shape; implemented a dedicated mapping function (`mapLedgerEntryToContractEvent`) to normalize data across the stack.

### Reliability & Resilience
- **Offline & Fallback Data Caching**: Implemented client-side data fetching with `localStorage`-backed caching, enabling the dashboard to gracefully fall back to last-known data with a visible status indicator when a backend service becomes unreachable, rather than failing outright.
- **Defensive Production Hardening**: Hardened all data rendering against inconsistent API responses using defensive access patterns (`optional chaining` and fallback values), preventing runtime crashes caused by unexpected `undefined` fields in production.

### Deployment & Production Debugging
- **Vercel & Render Multi-Cloud Deployment**: Deployed the dashboard to Vercel and coordinated integration across microservices deployed on Render and Neon PostgreSQL.
- **Cross-Origin Resource Sharing (CORS) Fix**: Diagnosed and resolved a missing CORS configuration in the inference service that was blocking cross-origin requests in production.
- **Environment & Routing Sanitization**: Identified and corrected multiple environment-variable misconfigurations, including a malformed base URL (trailing slash causing path errors) and a variable incorrectly pointing to a source repository URL instead of the live deployed endpoint.
- **Payload & Endpoint Diagnostics**: Diagnosed a 422 error resulting from an empty request body sent to an endpoint requiring a JSON payload, and corrected the request formatting.
- **QR Code Resolution Utility (`resolveLedgerUrl`)**: Diagnosed and fixed a broken QR code image caused by the ledger service returning a relative URL that resolved incorrectly against the dashboard's domain; implemented a URL-resolution utility to handle relative paths dynamically.
- **State Persistence Strategy**: Identified a data-persistence issue where the deployed ledger's SQLite database reset on service restart due to platform storage limitations, proposing an auto-seed-on-startup solution.

### Independent Microservice Development
- **Groundwater Risk Assessment Engine**: Designed and built a standalone groundwater-risk assessment microservice (FastAPI) implementing an uncertainty-aware classification model with a statistically grounded abstention mechanism, developed and deployed independently with no dependency on other team members' codebases.

### Technical Documentation
- **Integration Architecture Docs**: Authored the integration dashboard's technical documentation covering setup instructions, service configuration, and the adapter layer's design rationale.
- **Executive README**: Authored the project's top-level README, including system architecture overview, Mermaid dataflows, team ownership breakdown, and local development setup.

---

<div align="center">

### NoyyalSense — Building Sustainable Civic Infrastructure for Smart Tiruppur 🌊

Developed for high-impact environmental monitoring and transparent supply chain accountability.

</div>

