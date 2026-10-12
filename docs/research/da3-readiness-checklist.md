# DA3 Readiness Audit and Deliverable Plan — Smart Tiruppur

*Prepared from the DA3 Smart Cities Project Rubric, current repository contents, and the listed research evidence. This is a read-only audit and planning document; no application, data, or experiment files were changed.*

## Executive assessment

The repository contains a substantial Next.js prototype and a separate synthetic source-attribution research experiment. It has enough implementation material for a credible DA3 demonstration, but the interactive workflows have not been validated according to the repository's own test matrix. The current public demo could not be checked from the available web access. The project documentation also overstates some application capabilities and contains unresolved data-count/architecture discrepancies. Resolve those issues before using the system as evidence of functioning real-world monitoring.

The strongest DA3 technical deliverable is a **conference-paper-style project report on the implemented Smart Tiruppur prototype**, with the synthetic attribution experiment presented in a clearly separated research section or companion study. The existing manuscript is about the synthetic classifier experiment; it is not a validated evaluation of the deployed application. Pursue a journal article later as a distinct, expanded contribution after additional system validation. Do not submit the same manuscript simultaneously to conference and journal venues.

The uploaded rubric permits a patent application as one report format, but the student's explicit instruction is not to file a patent or complete an Invention Disclosure Form now. Keep the IP review as a separate pending decision, below.

## 1. Rubric traceability and marks

The DOCX at `D:\Downloads\DA3_Smart_Cities_Project_Rubric (1).docx` was read. It specifies **10 total marks** and a final assessment focus of **20% implementation, project report/document, and live demonstration**. The rubric numbers the last two items both as criterion 5; the table below preserves its listed order and marks rather than silently renumbering it.

| Rubric criterion (rubric marks) | Evidence needed for full credit | Repository evidence / current readiness |
|---|---|---|
| **1. Final implementation — 0.5 marks**. Complete remaining implementation, integrate components, and show progress beyond DA2. | A working integrated build; a short DA2-to-DA3 delta table tied to actual features; demonstrable completion evidence. | Many application routes and modules are present. The repository does not contain a DA2 submission, baseline checklist, or evaluator feedback, so “progress beyond DA2” cannot yet be verified. `validation-matrix.md` records static checks as passed, but this audit did not rerun them. **Partial evidence.** |
| **2. Functionality and validation — 0.5 marks**. Demonstrate key features, use relevant test cases/data, and report results, limitations, and issues accurately. | Executed test cases with environment, expected/observed outcomes, screenshots/logs, and accurate provenance labels. | `docs/research/validation-matrix.md` defines 27 interactive tests and marks **0/27 NOT RUN**. It records earlier static checks as PASS, not an independently reproduced current result. Synthetic and modelled limits are well documented in `data-provenance.md`; presentation claims still need reconciliation. **Important evidence gap.** |
| **3. Report / technical document — 5 marks**. Selected format; plagiarism <10%, AI similarity <10%; required sections, appropriate figures/tables/references. | A venue/rubric-compliant paper with problem, objectives, related work, design/methodology, implementation, verified results, Smart City relevance, references, clear figures/tables; institutional similarity reports. | `manuscript-draft.md` and related-work/results documents exist, but the manuscript is centered on the ten-seed synthetic attribution experiment, not an end-to-end validated application evaluation. Application figure specifications in `figure-captions.md` are **PLANNED / NOT CAPTURED**. Existing confirmatory figures are research plots, not application screenshots. No plagiarism or AI-similarity report is present. **Substantial draft; full-credit evidence incomplete.** |
| **4. Live demo and explanation — 1 mark**. Demonstrate the solution, explain architecture/workflow, link to the selected Tamil Nadu Smart City challenge, answer questions. | A reachable demo or verified local fallback; a tested scripted workflow; architecture/data-flow explanation; explicit mapping to the chosen challenge/problem statement; clear responses on limitations. | README links to `https://smart-tiruppur.vercel.app` and source routes exist. The public URL was inaccessible to the available web checker during this audit, so current availability and behavior are **unverified**. No exact selected challenge statement or official relationship/endorsement is documented. **Not yet evidenced live.** |
| **5. Poster — 2 marks**. A1 or A2; visual, concise, readable; verified results; proposed features labelled. | Final A1/A2 PDF/source; prototype images or diagrams, concise problem/innovation/results/citizen benefits; readable type; synthetic/proposed content labelled; all results trace to sources. | No poster asset/source file is present. Figure capture plan says all nine application figures are `PLANNED / NOT CAPTURED`. **Not prepared.** |
| **5. Presentation and team contribution — 1 mark**. Clear, organised presentation and members explain their contributions and understanding. | Rehearsed timed talk; role-specific contributions; each member can explain system, evidence and limits; slides/demo handoffs and Q&A preparation. | README has an ownership matrix (Thisha: integration dashboard; Haripriya: simulator/inference; Vamika: ledger/DPP), but it is self-reported documentation, not direct evidence of individual work or presentation readiness. No DA3 slide deck, rehearsal record, or contribution evidence is in the repository. **Needs preparation and confirmation.** |

Rubric performance bands are described as full marks for complete, accurate, demonstrated, evidence-supported work; about 75% for mostly complete/minor gaps; about 50% for partial work/important evidence gaps; and about 25% or 0 for minimal, undemonstrated, or missing evidence. The rubric supplies no finer per-indicator point split, so this audit does not invent one. The `<10%` similarity limits are rubric requirements, not results that can be guaranteed from source review; obtain reports through the institution's approved process and preserve proper attribution.

## 2. Repository audit: what exists and what it proves

### Implemented in source and suitable as demo candidates

These routes/modules exist in the inspected repository. Their presence is evidence of implementation, **not** proof that the current public deployment or every workflow works at runtime; manual validation is still pending.

| Feature | Repository evidence | DA3 demonstration framing |
|---|---|---|
| Role-based workspaces, login, citizen and regulator flows | `app/login`, `app/admin`, `app/regulator`, `app/industry`, `app/groundwater`, `app/citizen`; auth and citizen-report API routes | Show one role journey only after login, authorization, persistence and logout are smoke-tested. Do not claim enterprise production readiness from route presence. |
| Interactive mapping / digital-twin views | `app/map`, `app/terrain-map-prototype`, `app/terrain`; MapLibre/Three.js components, Noyyal line and station GeoJSON | Show map/layer selection and entity inspection. Distinguish open GIS geometry and official station coordinates from synthetic facility/telemetry attributes and estimated building heights. |
| Pollution source screening / tracing | `lib/attribution/engine.ts`, `app/api/attribution/route.ts`, trace UI in `app/terrain-map-prototype` | Label outputs as **simulated/modelled inspection-priority estimates**. Current local engine is a heuristic score with confidence fixed at 0.35; it is not the research M4 classifier, a calibrated Bayesian posterior, a verified pollution path, or proof of a violation. |
| Flood scenario screening | `lib/flood/engine.ts`; prototype flood controls | Describe the output as point-based, rule/score screening over nominal sector profiles. It does not provide validated flood forecasts, inundation polygons, or building-level depths. |
| Groundwater assessment and scenarios | `app/groundwater`, `lib/steri`, embedded CGWB-labeled baseline and scenario code | Cite the 2024 administrative baseline only after checking the official source. Mark user-selected multipliers as hypothetical. Firka markers are centroids, not wells or aquifer surfaces. |
| STERI, scenarios, evidence and recommendations | `app/steri`, `app/scenarios`, `app/evidence`, corresponding `lib/` engines and API routes | Demonstrate only after API/data-path smoke tests. Explain this as a decision-support prototype and disclose input provenance and assumptions. |
| Standalone transport CLI | `scripts/live-sensor-physics-simulator.js`, `SIMULATION_GUIDE.md` | Candidate terminal demonstration using simulated releases and a simplified transport model; do not present as a live sensor feed or calibrated Noyyal model. The command was not run in this audit. |

### Implemented but not yet validated

- The validation matrix has 27 interactive cases across map, trace, flood, groundwater, scenarios and state isolation; every one is `NOT RUN` (0/27). Its documented TypeScript/build passes are historical statements in that document and were not rerun here.
- The API route files exist, including `/api/attribution`, `/api/steri`, citizen reports, actions and prediction routes. No end-to-end API status/results were collected for this audit.
- The README claims a live Vercel deployment and multiple external services. The demo URL did not load through the available web checker. This is an access limitation, not proof that deployment is down; a student with browser access must test it.
- `docs/research/figure-captions.md` explicitly marks all nine application screenshots/figures `PLANNED / NOT CAPTURED`. Existing confirmatory plots are not evidence that the application UI was demonstrated.

### Simulated, illustrative, modelled or bounded evidence

| Data/output | What can be said accurately | Do not present as |
|---|---|---|
| Sensor values shown in application (`lib/digital-twin/sensors.ts`) | Simulated demonstration readings. Station coordinates are documented as TNPCB/NWMP locations; the chemical values are not live telemetry or lab assays. | Verified current Noyyal measurements, real-time monitoring, or calibrated sensor records. |
| Facility/outfall registry (`lib/digital-twin/industrial.ts`) | Representative synthetic facility archetypes and nominal discharge parameters. Compliance indicators are demonstrations, not TNPCB violations. | An official industrial census, metered discharge, or legal attribution. |
| Pollution route / influence | A geometric snap to OSM river centerline and uncalibrated constant-velocity screening estimate; physical conveyance is unknown where not evidenced. | Verified pipe/channel connectivity, transport prediction, or proof of downstream impact. |
| 3D buildings and terrain | OSM footprints with fallback heights / nominal terrain offsets as documented. | Surveyed building heights, photogrammetry, or elevation measurements unless separately evidenced. |
| Flood | Deterministic point-based scalar indicators at six nominal sector profiles with hypothetical rainfall scenarios. | Hydrodynamic forecasts, flood extent maps, or verified loss/exposure estimates. |
| Groundwater | Administrative annual values documented as CGWB 2024; multiplier outputs are scenarios and mapped centroids are administrative representations. | Live groundwater monitoring, well-level evidence, or continuous aquifer surfaces. |
| Confirmatory attribution experiment | Ten-seed, 13-class **synthetic 1D ADE** benchmark; 520 paired physical test episodes, configured stuck/missing faults; M4 did not show lower pooled selective risk than M3-Selective, and target results lack matched achieved coverage. | Validation on real Noyyal sensor observations or general field fault robustness. |

The saved synthetic experiment is useful evidence for a bounded research question, not for claiming that the application has been field-validated. Keep its metrics and figures in a clearly labelled synthetic-study panel/section and do not merge them with application performance claims.

### Planned or unsupported by current repository evidence

- Real-time sensor integration and measured historical Noyyal observation data. `research/evaluation/evaluator.py` expects `research/data/noyyal_observations.csv`, which is absent. Consequently the saved baseline/ablation/robustness summaries in `research/evaluation/results/` cannot be traced to that evaluator input in this workspace. Do **not** use their high reported performance figures as validated results without recovering the actual data, run provenance and reproducible outputs.
- Application screenshots are not captured; a final poster and DA3 presentation are absent.
- No DA2 project report, DA2 mark sheet, baseline snapshot, or DA2 feedback is present. Progress beyond DA2 is therefore unverified; do not infer the delta solely from the current feature list.
- Public live-demo availability/current status is not verified in this audit.
- Current README service-architecture claims require reconciliation: it describes separate `ledger/`, `inference/`, and `contracts/` directories/services that are not present in the inspected repository tree. External services may exist, but require working URLs, owners, and integration evidence before being described as current.
- A content discrepancy needs owner confirmation: `app/about/page.tsx` says six administrative Firkas, while `docs/research/data-provenance.md` describes 33 revenue Firkas. Verify the intended geographic scope/count against the implemented data and authoritative source before the demo, paper or poster.

## 3. Prioritized DA3 work plan

Priority is based on score weight and whether the evidence blocks a credible live demonstration. No implementation edits are authorized in this planning task.

| Priority / gap | Why it matters | Smallest concrete action | Completion check / evidence | Deliverable |
|---|---|---|---|---|
| **P0 — Rubric and DA2 baseline**: DA2 delta cannot be evidenced. | Criterion 1 explicitly requires progress beyond DA2; unsupported comparison risks losing the 0.5 mark. | Collect DA2 submission/feedback and make a one-page feature delta: carried forward, changed, newly implemented, still incomplete. | Each claimed delta points to a file, test or dated artifact; supervisor/student confirms DA2 baseline. | Report, presentation |
| **P0 — End-to-end validation**: 0/27 interactive tests are recorded as run. | Criterion 2 (0.5) requires demonstrations using test cases/data; credible live workflow depends on functioning modules. | Run the existing matrix against the intended local/deployed build. Start with `VAL-MAP-01/05/06/07`, `VAL-TRC-01/02/03`, `VAL-GW-01/02/03`, `VAL-FLD-01/02`, `VAL-SCN-01/02/03/05`, then complete remaining cases. Record actual result, date, browser/build, and defect or pass. | Matrix rows changed by the project team with observed outcomes and evidence; not merely expected outcomes. No test execution was performed in this audit. | Implementation, demo, report |
| **P0 — Verify demo availability and one role journey**: public URL status and auth workflow are unknown. | Criterion 4 awards 1 mark for a live, comprehensible demonstration. | In a browser, check landing/login and one least-privilege demo role. Verify one complete task, persistence where promised, logout, and fallback if the hosted service is unavailable. | Dated browser evidence or recorded walkthrough; route, account role and observed outcome logged. Do not expose privileged credentials in slides. | Demo, implementation |
| **P0 — Reconcile what the product is**: README suggests real-time Bayesian inference/external services not evidenced by current code. | Assessors may compare explanation with actual implementation; overclaiming harms validation and technical-document credibility. | Update the DA3 talk track/report to say local attribution is heuristic screening and telemetry is simulated. Verify each claimed external API/service with an endpoint, owner and successful request; otherwise label it planned/external/unverified. Reconcile six-vs-33 Firka discrepancy with the owner and source. | Every architecture box maps to a repository file or verified external service; every measurement has a provenance label; the Firka count has one sourced value. | Report, poster, demo |
| **P1 — Separate evidence classes**: synthetic research and application evaluation can be conflated. | The confirmatory experiment cannot validate the live product or real Noyyal conditions. | Use a two-column evidence inventory: application prototype observations vs. synthetic classifier benchmark; include exact synthetic scope/limitations and state M4 did not lower pooled selective risk. Exclude untraceable `research/evaluation/results` metrics pending data/provenance recovery. | Review all numeric claims against an input file/run record; cite confirmatory artifacts only for the synthetic study and actual demo-test records only for app behavior. | Report, poster, presentation |
| **P1 — Build the DA3 technical document**: existing manuscript is a research paper draft for synthetic attribution, not a complete product report. | Criterion 3 is worth 5 marks and requires specified sections, results, references and figures. | Choose the IEEE conference-paper format for the DA3 system report, subject to course confirmation. Use the structure below; write “expected outcomes” where application evaluation is not yet performed. Carry the synthetic experiment as a bounded, explicitly separate subsection/companion study. | Section-by-section rubric checklist; figures/tables have source data; plagiarism/AI-similarity reports obtained through authorized VIT process and meet stated thresholds. | Report |
| **P1 — Capture verified application evidence**: all planned app figures are uncaptured. | Needed for the 5-mark technical document and 2-mark poster; current research plots do not show application function. | After smoke tests, capture only 3–4 core states: overview with provenance, source-screening panel with synthetic label, groundwater baseline/scenario with source, and one tested workflow result. | Screenshot filenames, route/state, date/build and caption record; visual content matches observed app. If unavailable, use a clearly labelled architecture diagram, not fabricated screenshots. | Report, poster, demo |
| **P1 — Prepare A1/A2 poster**: no poster exists. | Poster is 2 of 10 marks, the second-largest criterion. | Choose size from A1/A2 after confirming printing/venue needs. Lay out problem/challenge, architecture, 3–4 verified implementation results, citizen benefits, limitations/provenance, and QR to the tested demo. Use readable diagrams and concise text. | Print/PDF at exact requested size; inspect at print scale; verify every number and the QR target. Clearly label proposed/not implemented parts. | Poster |
| **P1 — Presentation and contribution evidence**: no deck/rehearsal; README roles are not performance evidence. | Criterion 5 (1 mark) requires clear delivery and members able to explain contributions. | Confirm team roles with all members; prepare a timed run sheet, demo handoffs, one contribution slide, and short Q&A on data limitations and validation. Rehearse once with a fallback if internet fails. | Timed rehearsal; every member explains their own contribution and one system limitation; demo sequence completes in allotted time. | Presentation, demo |
| **P2 — Similarity requirements**: no similarity reports are present. | Rubric states plagiarism <10% and AI similarity <10% within the 5-mark technical-document criterion. | Submit the near-final paper using VIT-approved checking tools; revise for originality, attribution and transparent authorship, not to evade detection. | Save institutional reports and confirm both thresholds with the faculty evaluator. This audit cannot certify a score. | Report |

## 4. Technical-document and publication plan

### DA3 deliverable recommendation

Use an **IEEE conference-paper-style system report** as the DA3 technical document, pending faculty confirmation that this satisfies the rubric. Suggested structure aligned with the uploaded rubric:

1. **Title** — a specific Smart Tiruppur prototype title; avoid “real-time,” “validated,” or “Bayesian” claims unless demonstrated by the final implementation.
2. **Abstract** — city problem, implemented prototype, evaluation method, verified outcomes only, and explicit data limitations.
3. **Keywords** — 4–6 accurate terms, e.g. urban environmental decision support, geospatial prototype, data provenance, synthetic benchmark, selective classification.
4. **Introduction** — Tiruppur/Noyyal context, project objective, challenge problem statement, scope and research questions.
5. **Literature review/background** — concise use of `related-work-and-gap.md`; no novelty or “first” claim based on technique combination.
6. **Proposed methodology** — system architecture and data provenance; distinguish open GIS, official administrative baselines, modelled indicators, simulated demonstration inputs, and scenario assumptions.
7. **System design and implementation** — actual repository modules/routes and workflow; include only verified external services; state the attribution prototype is heuristic and separate from research M3/M4.
8. **Results and discussion** — app functionality results from executed test cases; limitations/defects; a separate boxed subsection or companion manuscript for the 10-seed synthetic attribution experiment, including exact metrics and no real-world claim.
9. **Smart City relevance** — map demonstrated functions to the selected challenge problem and citizen benefit; identify the challenge by its official title/reference once supplied. Do not imply official program selection, endorsement, or partnership without evidence.
10. **Conclusion, limitations, references, figures/tables** — separate implemented outcomes from proposed extensions and field-validation needs.

### Conference and journal sequencing

The current `docs/research/manuscript-draft.md` is specifically a synthetic selective-attribution study; retain it as a research manuscript, not as evidence of field performance by the dashboard. A project-system conference paper may cite or summarize that experiment as a separate research workstream with clear scope and its own data/metrics. A later journal article should provide a materially expanded contribution—such as completed user-workflow evaluation, recoverable data/run provenance, or new validated evidence—and follow the venue's prior-publication rules. Do not submit the same manuscript to a conference and journal simultaneously; disclose and cite related prior versions as required.

### Separate pending VIT IP decision

**Pending decision only:** ask VIT's IP team to screen the narrow fault-aware attribution mechanism before any further potentially public disclosure that describes enabling technical details. Do not file a patent or complete an Invention Disclosure Form in this DA3 plan. Do not claim patentability, novelty, or ownership from the repository review. The conference/journal/public-poster timing should be coordinated with VIT IP guidance.

## 5. Assumptions and student confirmations required

- Confirm that the provided DOCX is the final authoritative rubric for this DA3/F1-F2 slot and that the IEEE conference-paper format is acceptable as the DA3 technical document.
- Provide the DA2 submission/marks/feedback so the “progress beyond DA2” criterion can be evidenced.
- Identify the exact Tamil Nadu Smart Cities challenge/problem statement selected for this project and any official wording the presentation must address.
- Confirm current ownership/availability of external services described in README, the current live demo URL/access credentials, and the intended demo environment.
- Reconcile the six-vs-33 Firka count using the implemented data and authoritative source.
- Confirm team member names/roles and who will present each module.
- Choose poster size A1 or A2 and confirm institution rules for plagiarism/AI-similarity measurement.
- Decide with VIT IP team whether and when further public disclosure is appropriate; this is separate from the rubric and no filing is proposed here.

## Audit sources and limits

Inspected repository evidence includes `README.md`, `package.json`, `app/` routes, `lib/` engines, `scripts/live-sensor-physics-simulator.js`, `SIMULATION_GUIDE.md`, `docs/research/validation-matrix.md`, `data-provenance.md`, `methodology.md`, `experiment-plan.md`, `figure-captions.md`, the manuscript/review set, `research/evaluation/` artifacts and evaluator, confirmatory configuration/results/audit, and the figures/tables README. The uploaded DA3 rubric was read from the supplied DOCX path.

No local app, tests, build, research evaluation, simulation or bootstrap was run. The web checker could not open the README's Vercel URL; therefore current hosted availability is unverified, not declared failed. No DA2 materials, poster, presentation deck, captured app figures, or historical observation CSV were found in the inspected project materials.
