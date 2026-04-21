import {openTopUI} from "./topUI";

interface SetupBtnShowChangesParams {
    btnShowChanges: HTMLElement;
    topUI: HTMLElement;
    hideMainButtons: () => void;
    refreshDetectedKeys: () => Promise<void>;
    refreshDetectedGpgPrograms: () => Promise<void>;
    refreshFileList: () => Promise<void>;
}

export const setupBtnShowChanges = ({
    btnShowChanges,
    topUI,
    hideMainButtons,
    refreshDetectedKeys,
    refreshDetectedGpgPrograms,
    refreshFileList
}: SetupBtnShowChangesParams) => {
    btnShowChanges.addEventListener("click", () => {
        openTopUI({topUI, hideMainButtons});
        void refreshDetectedKeys();
        void refreshDetectedGpgPrograms();
        void refreshFileList();
    });
};
