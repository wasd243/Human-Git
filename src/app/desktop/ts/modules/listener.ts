import {invoke} from "@tauri-apps/api/core";
import {listen} from "@tauri-apps/api/event";

export interface MutationPayload {
    insertions: number;
    deletions: number;
}

interface SetupEventListenersParams {
    setStats: (stats: MutationPayload) => void;
    printLog: (msg: string) => void;
    refreshFileList: () => Promise<void>;
    isTopUIVisible: () => boolean;
}

interface FetchInitialStatsParams {
    setStats: (stats: MutationPayload) => void;
    printLog: (msg: string) => void;
}

export const setupEventListeners = ({
    setStats,
    printLog,
    refreshFileList,
    isTopUIVisible
}: SetupEventListenersParams) => {
    listen<string>("log-event", (event) => {
        printLog(event.payload);
    });

    listen<MutationPayload>("git-mutation", (event) => {
        const {insertions, deletions} = event.payload;
        setStats({insertions, deletions});
        printLog(`Detected movement: +${insertions} / -${deletions}`);
    });

    listen<boolean>("files-changed", () => {
        printLog("[SYSTEM] File change detected, refreshing list...");
        if (isTopUIVisible()) {
            void refreshFileList();
        }
    });
};

export const fetchInitialStats = async ({
    setStats,
    printLog
}: FetchInitialStatsParams) => {
    try {
        const payload = await invoke<MutationPayload>("get_initial_stats");
        setStats(payload);
    } catch (e) {
        if (String(e).includes("Repository path is not selected")) {
            return;
        }
        printLog(`[ERR] Failed to fetch initial stats: ${e}`);
    }
};
