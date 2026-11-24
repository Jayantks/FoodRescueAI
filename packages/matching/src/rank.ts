export interface Candidate {
  id: string;
  eligible: boolean;
  allocatablePackages: number;
  hoursUntilNeeded: number | null;
  travelMinutes: number;
}

export interface RankedCandidate extends Candidate {
  score: number;
  fill: number;
  urgency: number;
  travel: number;
}

export function rankCandidates(availablePackages: number, candidates: Candidate[]): RankedCandidate[] {
  if (!Number.isInteger(availablePackages) || availablePackages <= 0) return [];

  return candidates
    .filter(({ eligible, allocatablePackages, travelMinutes }) =>
      eligible && Number.isInteger(allocatablePackages) && allocatablePackages > 0
      && Number.isFinite(travelMinutes) && travelMinutes >= 0)
    .map((candidate) => {
      const allocatablePackages = Math.min(candidate.allocatablePackages, availablePackages);
      const fill = allocatablePackages / availablePackages;
      const urgency = candidate.hoursUntilNeeded === null || candidate.hoursUntilNeeded < 0
        ? 0
        : 1 - Math.min(candidate.hoursUntilNeeded, 24) / 24;
      const travel = 1 - Math.min(candidate.travelMinutes, 60) / 60;
      return {
        ...candidate,
        allocatablePackages,
        fill,
        urgency,
        travel,
        score: 0.45 * fill + 0.35 * urgency + 0.20 * travel,
      };
    })
    .sort((a, b) => b.score - a.score || a.travelMinutes - b.travelMinutes || a.id.localeCompare(b.id));
}
