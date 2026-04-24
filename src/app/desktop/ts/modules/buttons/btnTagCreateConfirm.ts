import {invoke} from "@tauri-apps/api/core";
import {setTagCreateOverlayVisible} from "./btnTagCreateOverlay";

interface SetupBtnTagCreateConfirmParams {
    btnTagCreateConfirm: HTMLElement;
    tagCreateConfirmOverlay: HTMLElement;
    tagCreateNameInput: HTMLTextAreaElement;
    refreshTagList: () => Promise<void>;
    printLog: (msg: string) => void;
}

export const setupBtnTagCreateConfirm = ({
    btnTagCreateConfirm,
    tagCreateConfirmOverlay,
    tagCreateNameInput,
    refreshTagList,
    printLog
}: SetupBtnTagCreateConfirmParams) => {
    btnTagCreateConfirm.addEventListener("click", async () => {
        const tagName = tagCreateNameInput.value.trim();

        if (!tagName) {
            printLog("[ERR] Tag name cannot be empty.");
            return;
        }

        (btnTagCreateConfirm as HTMLButtonElement).disabled = true;
        printLog(`[GIT] Creating tag '${tagName}'...`);

        try {
            const result = await invoke<string>("create_tag", {tagName});
            printLog(`[SUCCESS] ${result}`);
            setTagCreateOverlayVisible(tagCreateConfirmOverlay, false);
            await refreshTagList();
        } catch (e) {
            printLog(`[ERR] ${e}`);
        } finally {
            (btnTagCreateConfirm as HTMLButtonElement).disabled = false;
        }
    });
};
