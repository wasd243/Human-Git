import {setForceModeConfirmOverlayVisible} from "./forceModeConfirmOverlay";

interface SetupBtnForceModeConfirmParams {
    btnForceModeConfirm: HTMLElement;
    forceModeConfirmOverlay: HTMLElement;
    applyForcePushVisualState: (enabled: boolean) => void;
    printLog: (msg: string) => void;
}

export const setupBtnForceModeConfirm = ({
    btnForceModeConfirm,
    forceModeConfirmOverlay,
    applyForcePushVisualState,
    printLog
}: SetupBtnForceModeConfirmParams) => {
    btnForceModeConfirm.addEventListener("click", () => {
        setForceModeConfirmOverlayVisible(forceModeConfirmOverlay, false);
        applyForcePushVisualState(true);
        printLog("[SYSTEM] Force Push mode enabled.");
    });
};
