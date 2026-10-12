# Related Work and Research-Gap Analysis

*Prepared 12 October 2026. This is a targeted, narrative review of work relevant to the repository's confirmatory study; it is not a systematic review and does not support an exhaustive claim about the literature.*

## Scope and verification approach

The review focuses on selective classification and abstention, calibration under shift, sensor-data quality and faults, water-quality source identification, and transport-based synthetic benchmarks. Bibliographic details below were checked against publisher proceedings/pages, DOI-linked publisher records, PubMed metadata, or author-hosted preprints. Where the publication status is a preprint, that status is stated. The records describe claims and experimental settings reported by the cited works; they are not evidence that those methods have been compared in the Smart Tiruppur benchmark.

## Related literature

### Selective classification, abstention, and risk–coverage evaluation

#### Chow (1970)

- **Full citation:** C. K. Chow. “On optimum recognition error and reject tradeoff.” *IEEE Transactions on Information Theory*, 16(1), 41–46 (1970). DOI: [10.1109/TIT.1970.1054406](https://doi.org/10.1109/TIT.1970.1054406).
- **Problem and method:** Formulates recognition with a reject option and derives an optimum rejection rule relating recognition error and rejection probabilities.
- **Evaluation:** Analytical development with examples using normal and uniform distributions, as described in the available bibliographic record.
- **Relevance and distinction:** This is a foundational formalization of error–rejection trade-offs. It motivates reporting risk together with coverage rather than accuracy alone. It predates modern learned confidence scores and does not address sensor faults, environmental attribution, calibration under shift, or field monitoring.
- **Verification:** DOI, venue, volume, issue, pages, and single-author record checked against DOI-linked and bibliographic records.

#### Geifman and El-Yaniv (2017)

- **Full citation:** Yonatan Geifman and Ran El-Yaniv. “Selective Classification for Deep Neural Networks.” *Advances in Neural Information Processing Systems 30* (NeurIPS 2017). [Publisher proceedings page](https://papers.nips.cc/paper_files/paper/2017/hash/4a8423d5e91fda00bb7e46540e2b0cf1-Abstract.html); [author paper PDF](https://papers.nips.cc/paper_files/paper/2017/file/4a8423d5e91fda00bb7e46540e2b0cf1-Paper.pdf).
- **Problem and method:** Builds selective classifiers from a trained classifier by thresholding a certainty score, with a procedure intended to control risk probabilistically while retaining coverage.
- **Evaluation:** CIFAR and ImageNet classification experiments; the paper reports risk and coverage trade-offs for deep classifiers.
- **Relevance and distinction:** Establishes a modern confidence-thresholding baseline relevant to M3-Selective. It does not model pollution transport, sensor health, or a synthetic water-quality fault suite. Its risk-control procedure should not be conflated with the repository's particular validation threshold selection and saved bootstrap estimates.
- **Verification:** Title, two authors, and NeurIPS 2017 proceedings verified at the publisher.

#### Geifman and El-Yaniv (2019), SelectiveNet

- **Full citation:** Yonatan Geifman and Ran El-Yaniv. “SelectiveNet: A Deep Neural Network with an Integrated Reject Option.” *Proceedings of the 36th International Conference on Machine Learning*, Proceedings of Machine Learning Research 97, 2151–2159 (2019). [PMLR publisher page](https://proceedings.mlr.press/v97/geifman19a.html).
- **Problem and method:** Trains a neural architecture with prediction and rejection components end-to-end to optimize performance over a selected coverage slice, in contrast to post-hoc thresholding alone.
- **Evaluation:** Experiments on several classification and regression datasets; the paper reports improved risk–coverage trade-offs over selected comparison methods on those benchmarks.
- **Relevance and distinction:** Shows that selective prediction includes training-based approaches, not just a confidence threshold. The repository's M3/M4 comparison is a Random Forest based synthetic benchmark and does not implement or compare SelectiveNet.
- **Verification:** Full citation and abstract checked on PMLR, the proceedings publisher.

#### Fisch, Jaakkola, and Barzilay (2022), calibrated selective classification

- **Full citation:** Adam Fisch, Tommi Jaakkola, and Regina Barzilay. “Calibrated Selective Classification.” *Transactions on Machine Learning Research* (December 2022). [TMLR publication record](https://openreview.net/forum?id=zFhNBs8GaV); [arXiv preprint](https://arxiv.org/abs/2208.12084).
- **Problem and method:** Addresses the possibility that confidence scores are uncertain or miscalibrated on examples a selector accepts. It trains a separate selector to improve calibration on the accepted subset and uses simulated input perturbations as a robustness strategy.
- **Evaluation:** Image classification and lung-cancer risk assessment tasks, including out-of-domain evaluation as described by the authors.
- **Relevance and distinction:** Highlights that selective accuracy and calibration among accepted examples are separate questions. The confirmatory benchmark reports Brier score, log loss, and ECE in saved metrics, but it does not establish calibration under real environmental shift or compare selective calibration methods.
- **Verification:** TMLR record and author preprint metadata identify the same title and three authors; publication status is reported as TMLR 2022.

### Calibration and selective prediction under distribution shift

#### Guo et al. (2017)

- **Full citation:** Chuan Guo, Geoff Pleiss, Yu Sun, and Kilian Q. Weinberger. “On Calibration of Modern Neural Networks.” *Proceedings of the 34th International Conference on Machine Learning*, PMLR 70, 1321–1330 (2017). [PMLR record](https://proceedings.mlr.press/v70/guo17a.html); [author preprint](https://arxiv.org/abs/1706.04599).
- **Problem and method:** Studies whether predicted class probabilities correspond to empirical correctness frequencies and evaluates post-hoc calibration, including temperature scaling.
- **Evaluation:** Modern neural networks on image and document classification datasets. The authors report that temperature scaling is an effective low-parameter post-hoc calibration method on many evaluated datasets.
- **Relevance and distinction:** Provides background for the temperature-scaling component documented in M4. Calibration on an in-domain calibration split is not a guarantee of calibration after an input corruption or distribution shift; the saved synthetic results do not establish such a guarantee.
- **Verification:** Authors, venue, year, and pages verified against the PMLR record.

#### Ovadia et al. (2019)

- **Full citation:** Yaniv Ovadia, Emily Fertig, Jie Ren, Zachary Nado, D. Sculley, Sebastian Nowozin, Joshua V. Dillon, Balaji Lakshminarayanan, and Jasper Snoek. “Can You Trust Your Model’s Uncertainty? Evaluating Predictive Uncertainty Under Dataset Shift.” *Advances in Neural Information Processing Systems 32* (NeurIPS 2019). [Publisher proceedings record](https://papers.neurips.cc/paper/2019/hash/8558cb408c1d76621371888657d2eb1d-Abstract.html); [author preprint](https://arxiv.org/abs/1906.02530).
- **Problem and method:** Empirically benchmarks predictive uncertainty methods as test distributions shift, examining changes in accuracy and calibration across several classification tasks.
- **Evaluation:** A large-scale set of image-classification dataset shifts and additional modalities/tasks, using probabilistic and non-probabilistic uncertainty methods. The authors report that conventional post-hoc calibration and some uncertainty methods degrade under shift; model-marginalizing approaches perform comparatively well across a range of tasks.
- **Relevance and distinction:** Supports evaluating confidence and selective behavior under perturbation rather than assuming calibration transfers. Its shifts are not the repository's sensor-level stuck-register and random-missingness fault construction, and it does not study river-source attribution.
- **Verification:** Full author list and NeurIPS 2019 venue verified on the proceedings page.

#### Liang, Peng, and Sun (2024)

- **Full citation:** Hengyue Liang, Le Peng, and Ju Sun. “Selective Classification Under Distribution Shifts.” *Transactions on Machine Learning Research* (October 2024). [TMLR/OpenReview publication record](https://openreview.net/forum?id=dmxMGW6J7N); [author preprint](https://arxiv.org/abs/2405.05160).
- **Problem and method:** Studies selective classification when deployment includes in-distribution, label-shifted, or covariate-shifted examples. The authors propose two margin-based confidence scores for post-hoc selective classification.
- **Evaluation:** Experiments across several classifier–dataset combinations and distribution-shift settings. The authors report improved selective and OOD detection performance for their scores in the evaluated settings.
- **Relevance and distinction:** Directly motivates treating shift-aware selective risk as an empirical question. The repository's configured corruptions are controlled synthetic faults; the analysis is not a general distribution-shift guarantee, and the current experiment does not compare these margin-based scores.
- **Verification:** Author list, title, and TMLR publication status verified against the TMLR/OpenReview record and author preprint.

### Sensor data quality and fault handling in environmental monitoring

#### Teh, Kempa-Liehr, and Wang (2020)

- **Full citation:** Hui Yie Teh, Andreas W. Kempa-Liehr, and Kevin I-Kai Wang. “Sensor data quality: a systematic review.” *Journal of Big Data* 7, article 11 (2020). DOI: [10.1186/s40537-020-0285-1](https://doi.org/10.1186/s40537-020-0285-1).
- **Problem and method:** Systematically reviews physical-sensor data errors and approaches for detecting and correcting them, drawing on three literature databases.
- **Evaluation/evidence base:** The review selected 57 publications from an initial search and reports that missing data, outliers, bias, and drift were common error categories. It also notes that heterogeneous evaluation practices and frequent use of non-public datasets impede direct method comparison.
- **Relevance and distinction:** The review establishes sensor data quality as a distinct problem from the downstream classifier's attribution confidence. It does not provide a source-attribution abstention benchmark, and its findings do not establish that the repository's particular diagnostic rules detect faults reliably.
- **Verification:** Full bibliographic record and author names checked on the journal publisher's open-access page.

#### Leigh et al. (2019)

- **Full citation:** Catherine Leigh, Omar Alsibai, Rob J. Hyndman, Sevvandi Kandanaarachchi, Olivia C. King, James M. McGree, Catherine Neelamraju, Jennifer Strauss, Priyanga Dilini Talagala, Ryan S. Turner, Kerrie Mengersen, and Erin E. Peterson. “A framework for automated anomaly detection in high frequency water-quality data from in situ sensors.” *Science of the Total Environment* 664, 885–898 (2019). DOI: [10.1016/j.scitotenv.2019.02.085](https://doi.org/10.1016/j.scitotenv.2019.02.085); [author publication page](https://fpp.robjhyndman.com/publications/water-quality-2/).
- **Problem and method:** Selects and compares automated anomaly-detection methods for high-frequency turbidity, conductivity, and river-level data, taking end-user anomaly priorities into account.
- **Evaluation:** In-situ sensor data from rivers entering the Great Barrier Reef. The study reports that rule-based methods detected missing, out-of-range, and impossible values, while regression/feature-based methods performed well on spikes and level shifts; drift was among the anomaly types with high false-negative rates.
- **Relevance and distinction:** This is directly relevant to environmental sensor faults and underscores that anomaly types differ in detectability. Its task is quality/anomaly detection, not multi-class source attribution with a selective decision, and the field data context differs from the synthetic benchmark here.
- **Verification:** Publisher DOI metadata and an author publication page identify the title, date, venue, pages, DOI, and 12 authors.

#### Chen et al. (2025), wastewater treatment fault review

- **Full citation:** Shanshan Chen, Xiaodong Wang, Xuejun Bi, and Zakhar Maletskyi. “Sensor fault characteristics and fault detection in wastewater treatment plants: Current status and trend analysis.” *Journal of Process Control* 155, article 103574 (November 2025). DOI: [10.1016/j.jprocont.2025.103574](https://doi.org/10.1016/j.jprocont.2025.103574).
- **Problem and method:** Reviews sensor-fault characteristics and fault-detection approaches in wastewater treatment plants across literature from 2008–2024, with attention to fault diagnosis and monitoring.
- **Evaluation/evidence base:** A literature review rather than a new comparative sensor experiment. Its scope includes faults such as bias, drift, and accuracy degradation and discusses data-driven, statistical, and hybrid FDD approaches.
- **Relevance and distinction:** It shows that sensor-fault detection already has a substantial water-sector literature. The Smart Tiruppur study is not a sensor diagnostic benchmark: it evaluates downstream attribution and acceptance outcomes for a narrow fault configuration, not a comprehensive fault detector across fault types.
- **Verification:** Publisher page supplies title, author list, journal, volume/article number, year, and DOI.

### Water-quality source attribution and transport-based synthetic benchmarks

#### El Badia and Hamdi (2007)

- **Full citation:** Abdellatif El Badia and Adel Hamdi. “Inverse source problem in an advection–dispersion–reaction system: application to water pollution.” *Inverse Problems* 23(5), 2103 (2007). DOI: [10.1088/0266-5611/23/5/017](https://doi.org/10.1088/0266-5611/23/5/017).
- **Problem and method:** Identifies an unknown point source location and time-varying intensity in an advection–dispersion–reaction system using concentration-related observations; establishes identifiability conditions and proposes an identification method.
- **Evaluation:** Mathematical analysis and computational applications under the paper's model assumptions, including assumptions on source activity and observation locations.
- **Relevance and distinction:** Demonstrates that inverse river pollution-source identification is established work and that identifiability depends on model and observation assumptions. It estimates physical source parameters from transport observations, whereas the repository's primary evaluation is a 13-class supervised attribution task on features extracted from simulated episodes.
- **Verification:** IOP publisher DOI page confirms title, authors, journal, year, volume, issue, and abstract.

#### Lugão, Knupp, and Rodriges (2022)

- **Full citation:** Bruno Carlos Lugão, Diego Campos Knupp, and Pedro Paulo G. W. Rodriges. “Direct and inverse simulation applied to the identification and quantification of point pollution sources in rivers.” *Environmental Modelling & Software* 156, article 105488 (2022). DOI: [10.1016/j.envsoft.2022.105488](https://doi.org/10.1016/j.envsoft.2022.105488).
- **Problem and method:** Couples a two-dimensional transient advection–diffusion forward model with inverse optimization using differential evolution to estimate source location/load, considering prior information.
- **Evaluation:** Uses an experimental saline-tracer river case to calibrate transport parameters, then evaluates several simulated single- and multiple-source release cases; the paper also discusses non-uniqueness in multi-point source inversion.
- **Relevance and distinction:** Provides an example of synthetic source-inversion tests anchored to a physical tracer experiment. The Smart Tiruppur simulator is explicitly an idealized 1D ADE screening benchmark; its saved confirmatory data do not validate a transport inversion or field-calibrated attribution.
- **Verification:** Publisher record verifies title, journal, volume/article number, abstract, and DOI; author spellings were checked against publisher/indexed bibliographic records.

#### Zhu, Chen, and Asif (2021)

- **Full citation:** Yinying Zhu, Zhi Chen, and Zunaira Asif. “Identification of point source emission in river pollution incidents based on Bayesian inference and genetic algorithm: Inverse modeling, sensitivity, and uncertainty analysis.” *Environmental Pollution* 285, article 117497 (2021). DOI: [10.1016/j.envpol.2021.117497](https://doi.org/10.1016/j.envpol.2021.117497).
- **Problem and method:** Estimates release mass, release time, and location from time-series concentrations at river monitoring sites. It compares a Bayesian MCMC inverse model with a genetic-algorithm inverse model and examines parameter sensitivity.
- **Evaluation:** A hypothetical case using field river conditions and a real Fen River case are reported. The authors state that their Bayesian approach performed better than the GA approach in the field application and that estimated mass was sensitive to transport parameters.
- **Relevance and distinction:** Shows that transport uncertainty and parameter sensitivity matter for source attribution. This is a physical inverse-modeling task with river case data; the present classifier task uses synthetic labeled episodes and does not infer release time/mass from observed field concentration series.
- **Verification:** DOI-linked PubMed record verifies all three authors, year, title, journal, DOI, abstract, and the reported study structure.

#### Zhang et al. (2024), low-accuracy sensors and source detection

- **Full citation:** Chi Zhang, Zhe Zhu, Yu Li, Erhu Du, Yuheng Sun, and Zhenyao Liu. “Pollution Source Detection With Low-Cost Low-Accuracy Sensors Through Coupling Forward Data Assimilation and Inverse Optimization.” *Water Resources Research* 60, e2023WR036834 (2024). DOI: [10.1029/2023WR036834](https://doi.org/10.1029/2023WR036834).
- **Problem and method:** Combines forward data assimilation and inverse optimization to identify river pollution sources using low-cost, low-accuracy sensor measurements.
- **Evaluation:** Uses model-based/synthetic pollution scenarios with varying sensor noise and compares source-detection behavior as sensor accuracy changes; publication metadata and abstract frame the work around source detection under low-cost sensor error.
- **Relevance and distinction:** It is a close precedent for considering sensor imperfections in pollution source detection. It addresses measurement noise and physical source inversion; it does not establish the performance of confidence-based or fault-diagnostic abstention in the repository's categorical classifier.
- **Verification:** Full citation and author list checked against the publisher's Water Resources Research page.

#### Zhao et al. (2026), river-channel PINN source tracing

- **Full citation:** Xu Zhao, Haifei Liu, Fei Leng, Wei Yang, Xinan Yin, and Yujun Yi. “Source Tracing for Pollutants in River Channels Based on a Physics-Informed Neural Network.” *Water Resources Research* 62(2), e2025WR040846 (2026). DOI: [10.1029/2025WR040846](https://doi.org/10.1029/2025WR040846).
- **Problem and method:** Uses a physics-informed neural network embedding a one-dimensional advection–diffusion equation to recover source location/intensity and pollutant fields from cross-sectional concentration observations.
- **Evaluation:** Numerical test cases include steady, unsteady, and noisy flows. The paper's “real river” case uses CFD-simulated flow and hypothetical pollutant observations rather than field-measured continuous release data. The authors explicitly identify the use of simulated data and simplified transport physics as limitations.
- **Relevance and distinction:** This recent work shows that synthetic ADE/CFD evaluations of river-source methods are active and already combine physical transport and learned inference. It undercuts any claim that synthetic transport source attribution or combining ML and ADE is novel by itself. Its task and method differ from the current Random Forest/selective-abstention benchmark.
- **Verification:** Wiley/AGU DOI record verifies bibliographic details and the paper's own full text specifies its numerical and CFD-simulated cases and limitations.

## What the repository implements and what it establishes

The repository contains two analytically distinct layers. The Smart Tiruppur application and its local attribution engine are documented as a screening prototype: source ranking uses a heuristic, flow velocity is nominal and uncalibrated, the rendered attenuation is illustrative, and no physical transport inversion or local explicit abstention is implemented in that production-facing engine. In contrast, the `research/` experiment code implements a supervised source-classification study with M3-Selective and M4. These must not be described as one deployed or field-validated method.

The confirmatory configuration specifies a synthetic 1D ADE benchmark with 13 classes, ten seeds, 20 episodes per class per seed, and train/calibration/validation/test allocations of 10/3/3/4. It compares clean episodes with a configured faulted condition: a stuck value at `sensor_002` from 6 to 14 hours and 10% random missingness; telemetry delay is disabled. The saved audit verifies 520 physical held-out episodes, each evaluated under both conditions (1,040 condition-level evaluations).

M3-Selective applies confidence-only abstention to the classifier. M4 adds temperature-scaled probabilities, a top-two margin gate, and sensor diagnostics. These are existing methodological ingredients; the study should be framed as an evaluation of these choices in a particular controlled synthetic source-attribution benchmark, not as a new selective-classification theory or as proof that the combination is novel.

The results constrain the interpretation:

- At defaults, pooled selective risk is 7.92% for M3-Selective versus 7.99% for M4 under clean conditions, and 19.70% versus 22.03% under the configured faulted condition. M4 therefore did not demonstrate lower pooled selective risk in either condition. The saved risk-difference intervals include zero and come from a bootstrap with only ten seed clusters.
- Nominal target-coverage results are not matched achieved-coverage comparisons. M4 achieved identical coverage at all three target settings within each condition (81.54% clean; 58.65% faulted); M3's achieved coverage differed. Saved threshold pairs confirm that M4 reused the same pair per seed across target settings, but the validation-grid/tuning diagnostics needed to explain why are absent.
- The documented broader fault plan includes noise, drift, burst dropouts, and delay scenarios. Those are not all represented in the saved confirmatory condition. In particular, telemetry delay is disabled, and no drift or additive-noise scenario is configured in this run. Do not generalize results across those fault types.
- The run is marked complete in metadata and the log, but the OS exit code and runtime source revision/hash were not preserved. This is a provenance gap, not evidence that the run failed.
- The audit rejects the original faulted 70% infeasibility label and approximate 61.5% coverage ceiling as unsupported by saved validation evidence. Held-out test coverage alone cannot establish a validation feasibility bound.

## Research-gap analysis

### Gaps supported by the literature reviewed here

1. **A narrow intersection worth evaluating, but not a claimed empty field.** Selective prediction literature primarily defines risk–coverage behavior for classification; environmental sensing and water-quality studies separately analyze sensor anomalies and data quality; river pollution studies separately solve transport-based inverse source problems. The reviewed set contains close work on low-accuracy sensors and source detection (Zhang et al.) and on uncertainty-aware shifted classification, so the broad intersection is not unoccupied. A defensible gap is a need for transparent, task-specific evaluation of abstention/acceptance policies for source-class attribution when telemetry faults are explicitly injected, with both accepted-error risk and coverage reported.
2. **Fault semantics and downstream consequences need joint evaluation.** Sensor-fault work commonly focuses on detecting, correcting, or flagging measurement anomalies, while selective-classification work evaluates accepted prediction quality. The studies reviewed here do not provide a direct comparative result for this repository's exact combination of known-source synthetic episodes, faulted telemetry, and attribution abstention. This is a scoped observation from the selected literature, not a systematic proof that no such study exists.
3. **Synthetic evidence is useful for controlled stress tests but does not close field-validity gaps.** Transport-based source identification already uses simulated cases, sometimes anchored to tracer experiments or CFD. The need is not simply “more synthetic data”; it is validated benchmark design with identifiable ground truth, documented fault mechanisms, adequate replication, and eventual comparison against field observations or controlled tracer data.

### Limitations specific to this implementation and its saved evidence

These are implementation/evidence gaps, not claims about the entire literature:

- The confirmatory fault suite is narrow: one frozen sensor, a fixed time window, and 10% random missingness. It does not test the full set of fault modes in the experiment-plan narrative (e.g., drift, additive noise, telemetry delay, or graded burst outages).
- The saved evaluation does not demonstrate lower M4 selective risk than M3-Selective; it also lacks matched achieved test coverage. Thus the main claimed benefit must not be stated as a performance advantage.
- The bootstrap has 520 episode clusters nested in only ten seeds. Seed-level variability is visible, but only ten independent seed clusters support between-seed uncertainty; broader generalization remains weakly identified.
- The target tuner’s repeated M4 threshold pairs cannot be explained from saved target-specific validation diagnostics. The 70% faulted infeasibility label and approximately 61.5% ceiling are unsupported and must not be repeated as findings.
- No real Noyyal sensor time series, source-attribution ground truth, field fault labels, or verified facility-release labels were used for confirmatory evaluation. Methodology documentation says application sensor readings and industrial registries are simulated/representative, and the river transport model is uncalibrated screening logic.
- Runtime exit status and source provenance are absent. Although current metadata marks the run complete and the config hash matches, it cannot be proven which exact source revision produced the outputs.
- The research model comparison changes multiple components between M3-Selective and M4 (probability calibration, margin filtering, and sensor diagnostic gating). The observed comparison does not isolate each component's causal contribution. Component ablations and diagnostic sensitivity/specificity analyses would be needed.
- Calibration metrics are saved, but the current written audit focuses mainly on attribution, acceptance, and risk. Calibration quality under each fault, reliability diagrams, calibration uncertainty, and shift-specific calibration behavior would strengthen claims about calibrated confidence.

## Defensible framing

### Proposed research question

**In a ten-seed synthetic 1D ADE source-classification benchmark, how do confidence-only abstention and a multi-signal selective-attribution policy differ in pooled accepted-prediction error and achieved coverage under clean telemetry and one configured stuck-sensor/random-missingness condition?**

This wording describes the comparisons that exist and does not presuppose a benefit, matched coverage, or real-world transport validity.

### Cautious contribution statement

**This study reports a controlled, reproducible synthetic-benchmark comparison of two selective source-attribution operating policies across clean telemetry and a specified synthetic sensor-fault condition, with pooled and seed-level results, paired held-out episodes, and an audited cluster-bootstrap summary. In this saved benchmark, M4 does not show lower pooled selective risk than M3-Selective, and target-labelled settings do not yield matched achieved test coverage. The study therefore contributes descriptive evidence and documents evaluation/provenance limitations rather than establishing superiority or Noyyal field validity.**

### Testable claims supported by existing artifacts

1. **Pooled default-point description:** On the saved 520-episode-per-condition test set, forced-choice accuracy was 91.35% in clean and 75.00% in faulted conditions for both primary methods; pooled selective risks were 7.92% and 7.99% (M3-Selective and M4) in clean conditions, and 19.70% and 22.03% in faulted conditions. These are descriptive pooled estimates, not per-seed means or evidence of a general method effect.
2. **Coverage response under target-labelled settings:** Across nominal settings 0.30, 0.50, and 0.70, saved M3-Selective test coverage increased from 25.58% to 48.08% to 68.27% in clean conditions, and from 18.27% to 33.27% to 51.15% in faulted conditions. M4 achieved 81.54% at each clean setting and 58.65% at each faulted setting. The result demonstrates different achieved coverages and repeated M4 operating points in this dataset, not matched-coverage performance or a known explanation for tuner behavior.
3. **Specified synthetic fault condition description:** Between clean and the configured synthetic faulted evaluations, pooled forced-choice accuracy was lower for both methods (91.35% to 75.00%); M4 also accepted fewer episodes than M3-Selective in faulted conditions (413 versus 472 of 520) while having higher pooled selective risk (22.03% versus 19.70%). These comparisons describe the saved fault suite only and do not isolate diagnostic causality or establish robustness to other faults.

The bootstrap intervals can be reported as saved descriptive uncertainty estimates (clean M4-minus-M3 +0.07 percentage points, 95% CI −0.28 to +0.65; faulted +2.33 points, 95% CI −0.72 to +5.59), with the explicit caveat that only ten seed clusters contribute and both intervals include zero. Do not convert these observations into a superiority or significance claim.

## Evidence needed for stronger claims

1. **Resolve provenance and reproducibility:** Archive a source revision or source hashes, environment/dependency versions, full runner command, exit status, and immutable run manifest tied to outputs.
2. **Make the target-coverage comparison interpretable:** Preserve target-specific validation predictions, candidate-grid scores, selected threshold diagnostics, and the method used to achieve target coverage. Report achieved test coverage for both methods and compare at pre-specified, genuinely comparable operating points; never tune on test results.
3. **Increase replication at the independent level:** Add more independently generated seed clusters and perform a pre-specified power/precision analysis. Keep episode and seed clustering in interval estimation and distinguish pooled from per-seed estimands.
4. **Isolate the components:** Run pre-registered ablations for temperature scaling, confidence threshold, margin gate, and each diagnostic gate. Evaluate fault detection sensitivity, specificity, false abstention on healthy inputs, and accepted error/coverage trade-offs per fault type.
5. **Broaden fault coverage:** Add pre-specified drift, stuck-at variants, burst/MCAR missingness levels, delayed/out-of-order packets, noise, sensor bias, and combinations. Validate fault generators and report which faults are known to the model versus held out.
6. **Assess calibration and shift explicitly:** Report reliability curves and proper scoring metrics before and after each corruption, with uncertainty intervals; evaluate whether threshold selection on clean validation data transfers to faulted test data and whether recalibration uses only permitted data.
7. **Strengthen physical validity:** Validate the ADE simulator against measured tracer releases or a calibrated hydrodynamic/water-quality model, quantify parameter and structural uncertainty, vary monitoring layouts and source identifiability, and include realistic background processes.
8. **Establish field relevance before Noyyal claims:** Obtain quality-controlled time series from the actual sensor network and independently verified source/event labels (or carefully designed tracer/controlled-release evidence), document station calibration and fault records, and evaluate prospectively. Do not treat coordinates or simulated telemetry as measured Noyyal observations.
9. **Evaluate operational consequences:** Quantify abstention costs, review workload, false accusations, missed source events, and class-specific error under a decision protocol with environmental practitioners. Attribution errors may have asymmetric consequences that a single selective-risk figure does not represent.

## Bibliography verification notes

All entries above have a DOI or stable primary/preprint link. The TMLR studies are linked to their OpenReview publication records; arXiv links are supplied where they also provide author manuscripts. The literature search was targeted rather than systematic, so this document should not be used to assert that no other closely related fault-aware source-attribution work exists. Claims about the Smart Tiruppur implementation and confirmatory evidence are grounded in the repository files reviewed below; planned features in `experiment-plan.md` are not treated as implemented unless corroborated by the actual config, saved audit, or research source.

## Repository materials reviewed

- `docs/research/methodology.md`
- `docs/research/experiment-plan.md`
- `docs/research/confirmatory-results-review.md`
- `docs/research/results-and-limitations-draft.md`
- `research/configs/confirmatory.json`
- `research/results/confirmatory_analysis_v2/audit_report.md`
- `research/models/selective_attributor.py`
- `research/models/baselines.py`
