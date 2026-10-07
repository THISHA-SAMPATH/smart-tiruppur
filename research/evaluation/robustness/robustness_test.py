import sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from evaluator import load_data,evaluate,rf,write
import numpy as np
def run_robustness_evaluation():
 rows,x,y,_=load_data(); rng=np.random.default_rng(42); missing={}; failed={}
 for r in [0,.10,.25,.50]:
  z=x.copy(); z[rng.random(z.shape)<r]=np.nan; missing[f"{r:.0%} missing readings"]=evaluate(rf,z,y,42)
 stations=np.array([q["station_id"] for q in rows])
 for r in [0,.20,.40,.60]:
  z=x.copy(); ids=rng.choice(np.unique(stations),size=round(len(np.unique(stations))*r),replace=False); z[np.isin(stations,ids)]=np.nan; failed[f"{r:.0%} station failure"]=evaluate(rf,z,y,42)
 write("robustness_test_results.json",{"dataset_rows":len(rows),"time_series_folds":5,"missing_data_robustness":missing,"sensor_failure_robustness":failed})
if __name__=="__main__": run_robustness_evaluation()
