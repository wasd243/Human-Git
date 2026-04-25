import {invoke} from "@tauri-apps/api/core";
import {renderTagList, type TagInfo} from "./listTag";

interface SetupBtnDeleteTagConfirmParams {
    btnTagDeleteConfirm: HTMLElement;
    tagDeleteConfirmOverlay: HTMLElement;
    tagDeleteNameInput: HTMLTextAreaElement;
    tagListEl: HTMLElement;
    printLog: (msg: string) => void;
}

export const setupBtnDeleteTagConfirm = ({
    btnTagDeleteConfirm,
    tagDeleteConfirmOverlay,
    tagDeleteNameInput,
    tagListEl,
    printLog
}: SetupBtnDeleteTagConfirmParams) => {
    btnTagDeleteConfirm.addEventListener("click", async () => {
        const tagName = tagDeleteNameInput.value.trim();

        if (!tagName) {
            printLog("[ERR] Please enter a tag name to delete.");
            return;
        }

        const sure = window.confirm(`Double-check: delete local tag "${tagName}" permanently?`);
        if (!sure) {
            return;
        }

        try {
            printLog(`[GIT] Deleting tag '${tagName}'...`);
            const result = await invoke<string>("delete_tag", {tagName});
            printLog(`[SUCCESS] ${result}`);

            const tags = await invoke<TagInfo[]>("list_tags");
            renderTagList(tagListEl, tags);

            tagDeleteNameInput.value = "";
            tagDeleteConfirmOverlay.classList.add("hidden");
        } catch (e) {
            printLog(`[ERR] Failed to delete tag: ${e}`);
        }
    });
};
