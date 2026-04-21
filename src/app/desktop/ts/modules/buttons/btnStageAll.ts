import {invoke} from "@tauri-apps/api/core";

interface SetupBtnStageAllParams {
    btnStageAll: HTMLElement;
    selectedUnstagedPaths: Set<string>;
    refreshFileList: () => Promise<void>;
    printLog: (msg: string) => void;
}

export const setupBtnStageAll = ({
    btnStageAll,
    selectedUnstagedPaths,
    refreshFileList,
    printLog
}: SetupBtnStageAllParams) => {
    btnStageAll.addEventListener("click", async () => {
        try {
            const result = await invoke<string>("stage_files", {paths: ["*"]});
            printLog(`[SUCCESS] ${result}`);
            selectedUnstagedPaths.clear();
            await refreshFileList();
        } catch (e) {
            printLog(`[ERR] ${e}`);
        }
    });
};
