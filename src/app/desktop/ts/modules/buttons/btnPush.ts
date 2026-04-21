import {setForcePushConfirmOverlayVisible} from "./forcePushConfirmOverlay";

interface SetupBtnPushParams {
    btnPush: HTMLElement;
    forcePushCheckbox: HTMLInputElement;
    forcePushConfirmOverlay: HTMLElement;
    doPush: (force: boolean) => Promise<void>;
}

export const setupBtnPush = ({
    btnPush,
    forcePushCheckbox,
    forcePushConfirmOverlay,
    doPush
}: SetupBtnPushParams) => {
    btnPush.addEventListener("click", async () => {
        if (forcePushCheckbox.checked) {
            setForcePushConfirmOverlayVisible(forcePushConfirmOverlay, true);
            return;
        }

        await doPush(false);
    });
};
