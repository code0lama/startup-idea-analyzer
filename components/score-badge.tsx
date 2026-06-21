import { Badge } from "./ui/badge";
import { scoreBand } from "@/lib/utils";

const TONE = { low: "red", medium: "amber", high: "green" } as const;
const LABEL = { low: "Low", medium: "Medium", high: "High" } as const;

export function ScoreBadge({ score }: { score: number }) {
  const band = scoreBand(score);
  return (
    <Badge tone={TONE[band]}>
      {score}/10 · {LABEL[band]}
    </Badge>
  );
}
