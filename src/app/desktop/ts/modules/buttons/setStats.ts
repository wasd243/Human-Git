import type {MutationPayload} from "../listener";

export const applySetStats = (setStats: (stats: MutationPayload) => void, stats: MutationPayload) => {
    setStats(stats);
};
