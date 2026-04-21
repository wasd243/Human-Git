import {openBottomUI} from "./bottomUI";

interface SetupBtnGitInitParams {
    btnGitInit: HTMLElement;
    bottomUI: HTMLElement;
    hideMainButtons: () => void;
}

export const setupBtnGitInit = ({btnGitInit, bottomUI, hideMainButtons}: SetupBtnGitInitParams) => {
    btnGitInit.addEventListener("click", () => {
        openBottomUI({bottomUI, hideMainButtons});
    });
};
