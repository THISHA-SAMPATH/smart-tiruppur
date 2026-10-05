import { ActionRecommendation, ActionStatus } from "./types";
import { getInitialRecommendations } from "./engine";

class ActionRecommendationService {
  private recommendations: ActionRecommendation[];

  constructor() {
    this.recommendations = getInitialRecommendations();
  }

  public getRecommendations(statusFilter?: ActionStatus): ActionRecommendation[] {
    let list = [...this.recommendations];
    if (statusFilter) {
      list = list.filter((r) => r.status === statusFilter);
    }
    // Sort top-priority interventions first (highest priorityScore)
    return list.sort((a, b) => b.priorityScore - a.priorityScore);
  }

  public updateStatus(id: string, newStatus: ActionStatus, notes?: string, assignedTo?: string): ActionRecommendation | null {
    const rec = this.recommendations.find((r) => r.id === id);
    if (!rec) return null;

    rec.status = newStatus;
    rec.timestamp = new Date().toISOString();
    if (notes) rec.actionNotes = notes;
    if (assignedTo) rec.assignedTo = assignedTo;

    return rec;
  }

  public addRecommendation(rec: Omit<ActionRecommendation, "id" | "timestamp">): ActionRecommendation {
    const newRec: ActionRecommendation = {
      ...rec,
      id: `rec_act_${Date.now()}`,
      timestamp: new Date().toISOString(),
    };
    this.recommendations.unshift(newRec);
    return newRec;
  }
}

export const actionService = new ActionRecommendationService();
