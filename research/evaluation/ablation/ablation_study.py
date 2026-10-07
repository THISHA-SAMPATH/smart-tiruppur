import sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from evaluator import load_data,evaluate,rf,write
def run_ablation_study():
 rows,x,y,_=load_data(); groups={"Full observed-feature model":range(8),"w/o pH":range(1,8),"w/o EC":[0,2,3,4,5,6,7],"w/o TDS":[0,1,3,4,5,6,7],"w/o BOD/COD":[0,1,2,5,6,7],"w/o DO":[0,1,2,3,4,6,7],"w/o location":range(6)}; write("ablation_study_results.json",{"dataset_rows":len(rows),"time_series_folds":5,"ablation_experiments":{n:evaluate(rf,x,y,42,c) for n,c in groups.items()}})
if __name__=="__main__": run_ablation_study()
