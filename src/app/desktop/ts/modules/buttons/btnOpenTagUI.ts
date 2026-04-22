import {openTagUI} from "./tagUI";

interface SetupBtnOpenTagUIParams {
    btnOpenTagUI: HTMLElement;
    tagUI: HTMLElement;
    hideMainButtons: () => void;
    refreshTagList: () => Promise<void>;
}

export const setupBtnOpenTagUI = ({
    btnOpenTagUI,
    tagUI,
    hideMainButtons,
    refreshTagList
}: SetupBtnOpenTagUIParams) => {
    btnOpenTagUI.addEventListener("click", () => {
        openTagUI({tagUI, hideMainButtons});
        void refreshTagList();
    });
};
