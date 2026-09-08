import type { Decision } from "@/lib/types";

const LABEL: Record<Decision, string> = {
  investigate: "Investigate",
  abstain: "Abstain — insufficient evidence",
  normal: "Normal",
};

export default function StatusBadge({ decision }: { decision: Decision }) {
  return (
    <span className={`badge badge-${decision}`}>
      <span className="badge-dot" />
      {LABEL[decision]}
    </span>
  );
}
