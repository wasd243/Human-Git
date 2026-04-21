import {setForcePushConfirmOverlayVisible} from "./forcePushConfirmOverlay";

interface SetupBtnForcePushCancelParams {
    btnForcePushCancel: HTMLElement;
    forcePushConfirmOverlay: HTMLElement;
    printLog: (msg: string) => void;
}

export const setupBtnForcePushCancel = ({
    btnForcePushCancel,
    forcePushConfirmOverlay,
    printLog
}: SetupBtnForcePushCancelParams) => {
    btnForcePushCancel.addEventListener("click", () => {
        setForcePushConfirmOverlayVisible(forcePushConfirmOverlay, false);
        printLog("[SYSTEM] Force push canceled.");
    });
};
