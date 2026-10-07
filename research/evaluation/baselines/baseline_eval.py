import sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from evaluator import load_data,evaluate,rf,metrics,steri_score,write,WEIGHTS
import numpy as np
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import TimeSeriesSplit
def linear(seed): return LogisticRegression(random_state=seed,max_iter=1000)
def steri_cv(rows,y):
 f=[metrics(y[t],[steri_score(rows[i]) for i in t]) for _,t in TimeSeriesSplit(n_splits=5).split(rows)]; return {k:{"mean":float(np.mean([z[k] for z in f])),"std":float(np.std([z[k] for z in f],ddof=1))} for k in f[0]}
def run_baseline_evaluation():
 rows,x,y,_=load_data(); models={"Single-Source Model":evaluate(linear,x,y,42,[1]),"Rule-Based Scoring":evaluate(linear,x,y,42,[0,1,2,3,4,5]),"Random Forest":evaluate(rf,x,y,42),"STERI Multi-Source Model":steri_cv(rows,y)}; baseline=np.argsort(np.argsort([steri_score(r) for r in rows])); sensitivity={}
 for i,name in enumerate(["pollution","waterQuality","flood","groundwater","industrialPressure","complaintIntensity"]):
  variants=[]
  for change in [-.2,.2]:
   w=WEIGHTS.copy(); w[i]*=1+change; w/=w.sum(); ranks=np.argsort(np.argsort([steri_score(r,w) for r in rows])); variants.append(float(np.corrcoef(baseline,ranks)[0,1]))
  sensitivity[name]={"weight_change_percent":20,"rank_stability_spearman":variants}
 write("baseline_comparison_results.json",{"dataset":{"rows":len(rows),"period":[rows[0]["timestamp"],rows[-1]["timestamp"]]},"time_series_folds":5,"baseline_comparison":models,"weight_sensitivity":sensitivity})
if __name__=="__main__": run_baseline_evaluation()
