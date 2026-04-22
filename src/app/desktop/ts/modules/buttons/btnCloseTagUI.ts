import {closeTagUI} from "./tagUI";

interface SetupBtnCloseTagUIParams {
    btnCloseTagUI: HTMLElement;
    tagUI: HTMLElement;
    showMainButtons: () => void;
}

export const setupBtnCloseTagUI = ({
    btnCloseTagUI,
    tagUI,
    showMainButtons
}: SetupBtnCloseTagUIParams) => {
    btnCloseTagUI.addEventListener("click", () => {
        closeTagUI({tagUI, showMainButtons});
    });
};
