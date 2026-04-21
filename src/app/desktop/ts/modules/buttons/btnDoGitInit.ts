import {invoke} from "@tauri-apps/api/core";
import type {MutationPayload} from "../listener";

interface SetupBtnDoGitInitParams {
    btnDoGitInit: HTMLElement;
    getActiveRepoPath: () => string | null;
    setStats: (stats: MutationPayload) => void;
    printLog: (msg: string) => void;
}

export const setupBtnDoGitInit = ({
    btnDoGitInit,
    getActiveRepoPath,
    setStats,
    printLog
}: SetupBtnDoGitInitParams) => {
    btnDoGitInit.addEventListener("click", async () => {
        const activeRepoPath = getActiveRepoPath();

        if (!activeRepoPath) {
            printLog("[SYSTEM] Please choose a folder before initializing a repository.");
            return;
        }

        printLog(`[GIT] Initializing repository in ${activeRepoPath}...`);
        try {
            const result = await invoke<string>("git_init", {repoPath: activeRepoPath});
            printLog(`[SUCCESS] ${result}`);
            const stats = await invoke<MutationPayload>("get_initial_stats");
            setStats(stats);
        } catch (e) {
            printLog(`[ERR] ${e}`);
        }
    });
};
