import {closeTopUI} from "./topUI";

interface SetupBtnCloseTopUIParams {
    btnCloseTopUI: HTMLElement;
    topUI: HTMLElement;
    forceModeConfirmOverlay: HTMLElement;
    forcePushConfirmOverlay: HTMLElement;
    signingDisableConfirmOverlay: HTMLElement;
    showMainButtons: () => void;
}

export const setupBtnCloseTopUI = ({
    btnCloseTopUI,
    topUI,
    forceModeConfirmOverlay,
    forcePushConfirmOverlay,
    signingDisableConfirmOverlay,
    showMainButtons
}: SetupBtnCloseTopUIParams) => {
    btnCloseTopUI.addEventListener("click", () => {
        closeTopUI({
            topUI,
            overlaysToHide: [forceModeConfirmOverlay, forcePushConfirmOverlay, signingDisableConfirmOverlay],
            showMainButtons
        });
    });
};
