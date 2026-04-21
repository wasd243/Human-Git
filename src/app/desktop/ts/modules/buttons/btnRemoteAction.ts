import {setFetchPruneConfirmOverlayVisible} from "./fetchPruneConfirmOverlay";
import {isRemoteInputPanelHidden, showRemoteInputPanel} from "./remoteInputPanel";
import {CSS_CLASS_HIDDEN} from "./types";

interface SetupBtnRemoteActionParams {
    btnRemoteAction: HTMLElement;
    remoteInputPanel: HTMLElement;
    remoteUrlInput: HTMLTextAreaElement;
    remoteConfirmOverlay: HTMLElement;
    printLog: (msg: string) => void;
    isValidGitRemoteUrl: (url: string) => boolean;
}

export const setupBtnRemoteAction = ({
    btnRemoteAction,
    remoteInputPanel,
    remoteUrlInput,
    remoteConfirmOverlay,
    printLog,
    isValidGitRemoteUrl
}: SetupBtnRemoteActionParams) => {
    btnRemoteAction.addEventListener("click", () => {
        if (isRemoteInputPanelHidden(remoteInputPanel)) {
            showRemoteInputPanel(remoteInputPanel);
            remoteUrlInput.focus();
            printLog("[SYSTEM] Enter a valid remote URL, then click Remote again.");
            return;
        }

        const url = remoteUrlInput.value.trim();
        if (!url) {
            printLog("[SYSTEM] Remote URL cannot be empty.");
            return;
        }

        if (!isValidGitRemoteUrl(url)) {
            printLog("[SYSTEM] Invalid remote URL. Example: https://github.com/org/repo");
            return;
        }

        remoteConfirmOverlay.classList.remove(CSS_CLASS_HIDDEN);
        setFetchPruneConfirmOverlayVisible;
    });
};
