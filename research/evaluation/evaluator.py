"""Dataset-gated, time-aware evaluation utilities for Noyyal observations."""
import csv
import json
from pathlib import Path
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.impute import SimpleImputer
from sklearn.metrics import accuracy_score, f1_score, mean_absolute_error, mean_squared_error, precision_score, recall_score, roc_auc_score, r2_score
from sklearn.model_selection import TimeSeriesSplit

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data" / "noyyal_observations.csv"
FEATURES = ["pH", "EC", "TDS", "BOD", "COD", "DO", "lat", "lon"]
WEIGHTS = np.array([.20, .20, .15, .15, .15, .15])

def load_data():
    if not DATA.exists():
        raise FileNotFoundError(f"Required historical observations are missing: {DATA}. Add the documented CSV; synthetic fallback is intentionally unavailable.")
    with DATA.open(newline="", encoding="utf-8") as f: rows = list(csv.DictReader(f))
    required = {"station_id", "timestamp", *FEATURES}
    if not rows or not required.issubset(rows[0]): raise ValueError(f"CSV must contain: {', '.join(sorted(required))}")
    rows.sort(key=lambda r: r["timestamp"])
    x = np.array([[float(r[k]) if r[k] not in ("", None) else np.nan for k in FEATURES] for r in rows])
    y = np.array([exceedance(r) for r in rows], dtype=int)
    risk = np.array([steri_score(r) for r in rows])
    if len(rows) < 10 or len(np.unique(y)) < 2: raise ValueError("Need at least 10 time-ordered observations and both exceedance classes.")
    return rows, x, y, risk

def exceedance(r):
    # Observed label: any measured parameter outside the stated research screening limits.
    return int(float(r["pH"]) < 6.5 or float(r["pH"]) > 8.5 or float(r["BOD"]) > 3 or float(r["COD"]) > 250 or float(r["DO"]) < 5 or float(r["TDS"]) > 2100)

def steri_score(r, weights=WEIGHTS):
    # Direct Python port of calculator.ts weighted sum; unavailable components are zero, never invented.
    pH, ec, tds, bod, cod, do, *_ = [float(r[k]) for k in FEATURES]
    pollution = min(1, max(bod / 3, cod / 250))
    water = min(1, .45 * max(0, (ec - 1500) / 2500) + .20 * min(1, abs(pH - 7) / 2) + .20 * min(1, tds / 2100) + .15 * min(1, max(0, (5 - do) / 5)))
    return float(np.dot(weights, [pollution, water, 0, 0, 0, 0]))

def metrics(y, probability):
    prediction = (np.asarray(probability) >= .5).astype(int)
    return {"MAE": float(mean_absolute_error(y, probability)), "RMSE": float(mean_squared_error(y, probability) ** .5), "R2": float(r2_score(y, probability)), "Accuracy": float(accuracy_score(y, prediction)), "Precision": float(precision_score(y, prediction, zero_division=0)), "Recall": float(recall_score(y, prediction, zero_division=0)), "F1": float(f1_score(y, prediction, zero_division=0)), "ROC_AUC": float(roc_auc_score(y, probability))}

def evaluate(factory, x, y, seed=42, feature_indices=None):
    indices = np.arange(x.shape[1]) if feature_indices is None else np.array(feature_indices)
    folds = []
    for train, test in TimeSeriesSplit(n_splits=5).split(x):
        imputer = SimpleImputer(strategy="median"); xt = imputer.fit_transform(x[train][:, indices]); xv = imputer.transform(x[test][:, indices])
        model = factory(seed); model.fit(xt, y[train]); folds.append(metrics(y[test], model.predict_proba(xv)[:, 1]))
    return {key: {"mean": float(np.mean([f[key] for f in folds])), "std": float(np.std([f[key] for f in folds], ddof=1))} for key in folds[0]}

def rf(seed): return RandomForestClassifier(n_estimators=200, random_state=seed, class_weight="balanced")

def write(name, payload):
    out = ROOT / "evaluation" / "results" / name; out.write_text(json.dumps(payload, indent=2), encoding="utf-8")
