import {invoke} from "@tauri-apps/api/core";
import {setRemoteConfirmOverlayVisible} from "./remoteConfirmOverlay";

interface SetupBtnRemoteConfirmParams {
    btnRemoteConfirm: HTMLElement;
    remoteConfirmOverlay: HTMLElement;
    remoteUrlInput: HTMLTextAreaElement;
    printLog: (msg: string) => void;
    isValidGitRemoteUrl: (url: string) => boolean;
    refreshRemoteList: () => Promise<void>;
}

export const setupBtnRemoteConfirm = ({
    btnRemoteConfirm,
    remoteConfirmOverlay,
    remoteUrlInput,
    printLog,
    isValidGitRemoteUrl,
    refreshRemoteList
}: SetupBtnRemoteConfirmParams) => {
    btnRemoteConfirm.addEventListener("click", async () => {
        setRemoteConfirmOverlayVisible(remoteConfirmOverlay, false);

        const url = remoteUrlInput.value.trim();
        if (!url) {
            printLog("[SYSTEM] Remote URL cannot be empty.");
            return;
        }

        if (!isValidGitRemoteUrl(url)) {
            printLog("[SYSTEM] Invalid remote URL. Example: https://github.com/org/repo");
            return;
        }

        printLog("[GIT] Adding remote 'origin'...");

        try {
            await invoke<string>("add_remote_origin", {url});
            remoteUrlInput.value = "";
            await refreshRemoteList();
        } catch (e) {
            printLog(`[ERR] Failed to invoke remote add: ${e}`);
        }
    });
};
