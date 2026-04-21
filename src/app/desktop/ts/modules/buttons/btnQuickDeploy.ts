import {invoke} from "@tauri-apps/api/core";
import {clearCommitMessage, getTrimmedCommitMessage} from "./commitMessageEl";

interface SetupBtnQuickDeployParams {
    btnQuickDeploy: HTMLButtonElement;
    commitMessageEl: HTMLTextAreaElement;
    refreshFileList: () => Promise<void>;
    printLog: (msg: string) => void;
}

export const setupBtnQuickDeploy = ({
    btnQuickDeploy,
    commitMessageEl,
    refreshFileList,
    printLog
}: SetupBtnQuickDeployParams) => {
    btnQuickDeploy.addEventListener("click", async () => {
        if (btnQuickDeploy.disabled) {
            return;
        }

        const message = getTrimmedCommitMessage(commitMessageEl);
        btnQuickDeploy.disabled = true;

        try {
            printLog("[GIT] Running quick deploy: stage, commit, push...");
            const result = await invoke<string>("commit_and_push", {message});
            printLog(`[SUCCESS] ${result}`);
            clearCommitMessage(commitMessageEl);
        } catch (e) {
            printLog(`[ERR] ${e}`);
        } finally {
            await refreshFileList();
        }
    });
};
