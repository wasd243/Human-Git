import {setSigningDisableConfirmOverlayVisible} from "./signingDisableConfirmOverlay";

interface SetupBtnSigningDisableConfirmParams {
    btnSigningDisableConfirm: HTMLElement;
    signingDisableConfirmOverlay: HTMLElement;
    signingEnabledCheckbox: HTMLInputElement;
    applySigningConfig: () => Promise<void>;
    printLog: (msg: string) => void;
}

export const setupBtnSigningDisableConfirm = ({
    btnSigningDisableConfirm,
    signingDisableConfirmOverlay,
    signingEnabledCheckbox,
    applySigningConfig,
    printLog
}: SetupBtnSigningDisableConfirmParams) => {
    btnSigningDisableConfirm.addEventListener("click", async () => {
        setSigningDisableConfirmOverlayVisible(signingDisableConfirmOverlay, false);
        signingEnabledCheckbox.checked = false;
        try {
            await applySigningConfig();
        } catch (e) {
            printLog(`[ERR] ${e}`);
        }
    });
};
