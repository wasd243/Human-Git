import {CSS_CLASS_HIDDEN} from "./types";

interface SetupSigningEnabledCheckboxParams {
    signingEnabledCheckbox: HTMLInputElement;
    signingDisableConfirmOverlay: HTMLElement;
    applySigningConfig: () => Promise<void>;
    printLog: (msg: string) => void;
}

export const setupSigningEnabledCheckbox = ({
    signingEnabledCheckbox,
    signingDisableConfirmOverlay,
    applySigningConfig,
    printLog
}: SetupSigningEnabledCheckboxParams) => {
    signingEnabledCheckbox.addEventListener("change", async () => {
        if (!signingEnabledCheckbox.checked) {
            signingDisableConfirmOverlay.classList.remove(CSS_CLASS_HIDDEN);
            signingEnabledCheckbox.checked = true;
            return;
        }

        try {
            await applySigningConfig();
        } catch (e) {
            printLog(`[ERR] ${e}`);
        }
    });
};
