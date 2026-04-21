import {closeBottomUI} from "./bottomUI";

interface SetupBtnCloseBottomUIParams {
    btnCloseBottomUI: HTMLElement;
    bottomUI: HTMLElement;
    showMainButtons: () => void;
}

export const setupBtnCloseBottomUI = ({btnCloseBottomUI, bottomUI, showMainButtons}: SetupBtnCloseBottomUIParams) => {
    btnCloseBottomUI.addEventListener("click", () => {
        closeBottomUI({bottomUI, showMainButtons});
    });
};
