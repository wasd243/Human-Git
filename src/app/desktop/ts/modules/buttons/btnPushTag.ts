import {invoke} from "@tauri-apps/api/core";

interface SetupBtnPushTagParams {
    btnPushTag: HTMLElement;
    printLog: (msg: string) => void;
}

export const setupBtnPushTag = ({
    btnPushTag,
    printLog
}: SetupBtnPushTagParams) => {
    btnPushTag.addEventListener("click", async () => {
        try {
            printLog("[GIT] Pushing all tags to origin...");
            const result = await invoke<string>("push_tags");
            printLog(`[SUCCESS] ${result}`);
        } catch (e) {
            printLog(`[ERR] Failed to push tags: ${e}`);
        }
    });
};
