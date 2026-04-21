import {setForceModeConfirmOverlayVisible} from "./forceModeConfirmOverlay";

interface SetupForcePushCheckboxParams {
    forcePushCheckbox: HTMLInputElement;
    forceModeConfirmOverlay: HTMLElement;
    applyForcePushVisualState: (enabled: boolean) => void;
    printLog: (msg: string) => void;
}

export const setupForcePushCheckbox = ({
    forcePushCheckbox,
    forceModeConfirmOverlay,
    applyForcePushVisualState,
    printLog
}: SetupForcePushCheckboxParams) => {
    forcePushCheckbox.addEventListener("change", () => {
        if (forcePushCheckbox.checked) {
            setForceModeConfirmOverlayVisible(forceModeConfirmOverlay, true);
            applyForcePushVisualState(false);
            return;
        }

        applyForcePushVisualState(false);
        printLog("[SYSTEM] Force Push mode disabled.");
    });
};
