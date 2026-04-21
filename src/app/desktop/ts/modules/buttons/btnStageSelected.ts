import {invoke} from "@tauri-apps/api/core";

interface SetupBtnStageSelectedParams {
    btnStageSelected: HTMLElement;
    selectedUnstagedPaths: Set<string>;
    refreshFileList: () => Promise<void>;
    printLog: (msg: string) => void;
}

export const setupBtnStageSelected = ({
    btnStageSelected,
    selectedUnstagedPaths,
    refreshFileList,
    printLog
}: SetupBtnStageSelectedParams) => {
    btnStageSelected.addEventListener("click", async () => {
        const paths = Array.from(selectedUnstagedPaths);

        if (paths.length === 0) {
            printLog("[SYSTEM] No files selected for staging.");
            return;
        }

        try {
            const result = await invoke<string>("stage_files", {paths});
            printLog(`[SUCCESS] ${result}`);
            selectedUnstagedPaths.clear();
            await refreshFileList();
        } catch (e) {
            printLog(`[ERR] ${e}`);
        }
    });
};
