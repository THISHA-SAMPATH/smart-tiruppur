# Noyyal observations input

Place a real historical CSV at `research/data/noyyal_observations.csv`. Required columns: `station_id,timestamp,pH,EC,TDS,BOD,COD,DO,lat,lon`. Rows must be historical station readings, timestamped in chronological order (the scripts sort them), with no fabricated values. The evaluation scripts stop with a clear error when this file is absent.
