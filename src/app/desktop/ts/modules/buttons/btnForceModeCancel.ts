import {setForceModeConfirmOverlayVisible} from "./forceModeConfirmOverlay";

interface SetupBtnForceModeCancelParams {
    btnForceModeCancel: HTMLElement;
    forceModeConfirmOverlay: HTMLElement;
    applyForcePushVisualState: (enabled: boolean) => void;
    printLog: (msg: string) => void;
}

export const setupBtnForceModeCancel = ({
    btnForceModeCancel,
    forceModeConfirmOverlay,
    applyForcePushVisualState,
    printLog
}: SetupBtnForceModeCancelParams) => {
    btnForceModeCancel.addEventListener("click", () => {
        setForceModeConfirmOverlayVisible(forceModeConfirmOverlay, false);
        applyForcePushVisualState(false);
        printLog("[SYSTEM] Cancel ForcePush.");
    });
};
