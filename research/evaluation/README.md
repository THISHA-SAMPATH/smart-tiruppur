# Evaluation protocol

The target is an observed exceedance label: 1 when a reading violates one or more screening limits (`pH` outside 6.5–8.5, BOD >3 mg/L, COD >250 mg/L, DO <5 mg/L, or TDS >2100 mg/L), otherwise 0. These are research screening rules, not a regulatory compliance determination.

Observations are ordered by timestamp. Evaluation uses a final chronological holdout implicitly through five expanding `TimeSeriesSplit` folds, fixed seed 42, and reports fold mean ± standard deviation. The Python STERI port uses the TypeScript six-component weighted formula; only pollution and water-quality components are observable from this CSV and unavailable flood, groundwater, industrial-pressure, and complaint components are zero rather than fabricated.

Limitations: results depend entirely on the supplied CSV's size, station coverage, source, and timestamp period. The generated summary records those values and must not be interpreted as live monitoring or validated forecasting.
