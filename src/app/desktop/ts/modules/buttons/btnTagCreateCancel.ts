import {setTagCreateOverlayVisible} from "./btnTagCreateOverlay";

interface SetupBtnTagCreateCancelParams {
    btnTagCreateCancel: HTMLElement;
    tagCreateConfirmOverlay: HTMLElement;
    printLog: (msg: string) => void;
}

export const setupBtnTagCreateCancel = ({
    btnTagCreateCancel,
    tagCreateConfirmOverlay,
    printLog
}: SetupBtnTagCreateCancelParams) => {
    btnTagCreateCancel.addEventListener("click", () => {
        setTagCreateOverlayVisible(tagCreateConfirmOverlay, false);
        printLog("[SYSTEM] Tag creation canceled.");
    });
};
