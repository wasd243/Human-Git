import {setSigningDisableConfirmOverlayVisible} from "./signingDisableConfirmOverlay";

interface SetupBtnSigningDisableCancelParams {
    btnSigningDisableCancel: HTMLElement;
    signingDisableConfirmOverlay: HTMLElement;
    signingEnabledCheckbox: HTMLInputElement;
    updateVerifiedBadge: () => void;
}

export const setupBtnSigningDisableCancel = ({
    btnSigningDisableCancel,
    signingDisableConfirmOverlay,
    signingEnabledCheckbox,
    updateVerifiedBadge
}: SetupBtnSigningDisableCancelParams) => {
    btnSigningDisableCancel.addEventListener("click", () => {
        setSigningDisableConfirmOverlayVisible(signingDisableConfirmOverlay, false);
        signingEnabledCheckbox.checked = true;
        updateVerifiedBadge();
    });
};
