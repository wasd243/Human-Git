import {invoke} from "@tauri-apps/api/core";
import type {MutationPayload} from "../listener";
import {applyFetchPruneVisualState} from "./fetchPruneToggleLabel";

interface SetupBtnChooseFolderParams {
    btnChooseFolder: HTMLElement;
    setActiveRepoPathInternal: (path: string | null) => void;
    selectedUnstagedPaths: Set<string>;
    fileListEl: HTMLElement;
    stagedListEl: HTMLElement;
    remoteListEl: HTMLElement;
    btnQuickDeploy: HTMLButtonElement;
    applyForcePushVisualState: (enabled: boolean) => void;
    fetchPruneCheckbox: HTMLInputElement;
    fetchPruneToggleLabel: HTMLElement;
    btnFetchAction: HTMLElement;
    printLog: (msg: string) => void;
    setStats: (stats: MutationPayload) => void;
    resetStats: () => void;
    refreshDetectedKeys: () => Promise<void>;
    refreshDetectedGpgPrograms: () => Promise<void>;
    signingEnabledCheckbox: HTMLInputElement;
    applySigningConfig: () => Promise<void>;
    refreshRemoteList: () => Promise<void>;
}

export const setupBtnChooseFolder = ({
    btnChooseFolder,
    setActiveRepoPathInternal,
    selectedUnstagedPaths,
    fileListEl,
    stagedListEl,
    remoteListEl,
    btnQuickDeploy,
    applyForcePushVisualState,
    fetchPruneCheckbox,
    fetchPruneToggleLabel,
    btnFetchAction,
    printLog,
    setStats,
    resetStats,
    refreshDetectedKeys,
    refreshDetectedGpgPrograms,
    signingEnabledCheckbox,
    applySigningConfig,
    refreshRemoteList
}: SetupBtnChooseFolderParams) => {
    btnChooseFolder.addEventListener("click", async () => {
        printLog("[SYSTEM] Opening folder dialog...");
        try {
            const path = await invoke<string | null>("open_folder_dialog");
            if (path) {
                printLog(`[SYSTEM] Folder selected: ${path}`);

                await invoke("update_repo_path", {path});
                setActiveRepoPathInternal(path);
                selectedUnstagedPaths.clear();
                fileListEl.replaceChildren();
                stagedListEl.replaceChildren();
                remoteListEl.replaceChildren();
                btnQuickDeploy.disabled = true;
                applyForcePushVisualState(false);
                applyFetchPruneVisualState({
                    fetchPruneCheckbox,
                    fetchPruneToggleLabel,
                    btnFetchAction,
                    enabled: false
                });
                printLog(`[SYSTEM] Monitoring switched to: ${path}`);

                try {
                    const stats = await invoke<MutationPayload>("get_initial_stats");
                    setStats(stats);
                } catch (_statsErr) {
                    resetStats();
                    printLog("[SYSTEM] Selected folder is not a Git repository yet.");
                }

                await refreshDetectedKeys();
                await refreshDetectedGpgPrograms();
                if (signingEnabledCheckbox.checked) {
                    try {
                        await applySigningConfig();
                    } catch (e) {
                        printLog(`[ERR] ${e}`);
                    }
                }

                await refreshRemoteList();
            } else {
                printLog("[SYSTEM] Folder selection cancelled.");
            }
        } catch (e) {
            printLog(`[ERR] ${e}`);
        }
    });
};
