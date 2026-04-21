import {setForcePushConfirmOverlayVisible} from "./forcePushConfirmOverlay";

interface SetupBtnForcePushConfirmParams {
    btnForcePushConfirm: HTMLElement;
    forcePushConfirmOverlay: HTMLElement;
    doPush: (force: boolean) => Promise<void>;
}

export const setupBtnForcePushConfirm = ({
    btnForcePushConfirm,
    forcePushConfirmOverlay,
    doPush
}: SetupBtnForcePushConfirmParams) => {
    btnForcePushConfirm.addEventListener("click", async () => {
        setForcePushConfirmOverlayVisible(forcePushConfirmOverlay, false);
        await doPush(true);
    });
};
