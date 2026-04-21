import {invoke} from "@tauri-apps/api/core";
import {clearCommitMessage, getCommitMessage} from "./commitMessageEl";

interface SetupBtnCommitParams {
    btnCommit: HTMLElement;
    commitMessageEl: HTMLTextAreaElement;
    refreshFileList: () => Promise<void>;
    printLog: (msg: string) => void;
}

export const setupBtnCommit = ({
    btnCommit,
    commitMessageEl,
    refreshFileList,
    printLog
}: SetupBtnCommitParams) => {
    btnCommit.addEventListener("click", async () => {
        const msg = getCommitMessage(commitMessageEl);

        try {
            printLog("[GIT] Creating commit...");
            const result = await invoke<string>("commit_changes", {message: msg});
            printLog(`[SUCCESS] ${result}`);
            clearCommitMessage(commitMessageEl);
            await refreshFileList();
        } catch (e) {
            printLog(`[ERR] ${e}`);
        }
    });
};
