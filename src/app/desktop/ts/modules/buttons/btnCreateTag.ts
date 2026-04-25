import {invoke} from "@tauri-apps/api/core";
import {renderTagList, type TagInfo} from "./listTag";
import {setTagCreateOverlayVisible} from "./btnTagCreateOverlay";
import {setupBtnTagCreateCancel} from "./btnTagCreateCancel";
import {setupBtnTagCreateConfirm} from "./btnTagCreateConfirm";

interface SetupBtnCreateTagParams {
    tagUI: HTMLElement;
    tagListEl: HTMLElement;
    printLog: (msg: string) => void;
}

export const setupBtnCreateTag = ({
    tagUI,
    tagListEl,
    printLog
}: SetupBtnCreateTagParams) => {
    const btnCreateTag = document.getElementById("btn-create-tag") as HTMLButtonElement | null;
    const overlay = document.getElementById("tag-create-confirm-overlay") as HTMLElement | null;
    const textarea = document.getElementById("tag-create-name-input") as HTMLTextAreaElement | null;
    const btnCancel = document.getElementById("btn-tag-create-cancel") as HTMLButtonElement | null;
    const btnConfirm = document.getElementById("btn-tag-create-confirm") as HTMLButtonElement | null;

    if (!btnCreateTag || !overlay || !textarea || !btnCancel || !btnConfirm) {
        printLog("[ERR] Tag create UI is missing required HTML elements.");
        return;
    }

    const refreshTagList = async () => {
        try {
            const tags = await invoke<TagInfo[]>("list_tags");
            renderTagList(tagListEl, tags);
        } catch (e) {
            tagListEl.innerHTML = `<div class="tag-item tag-item-empty">Failed to load tags.</div>`;
            printLog(`[ERR] Failed to fetch tags: ${e}`);
        }
    };

    btnCreateTag.addEventListener("click", () => {
        textarea.value = "";
        setTagCreateOverlayVisible(overlay, true);
        textarea.focus();
    });

    setupBtnTagCreateCancel({
        btnTagCreateCancel: btnCancel,
        tagCreateConfirmOverlay: overlay,
        printLog
    });

    setupBtnTagCreateConfirm({
        btnTagCreateConfirm: btnConfirm,
        tagCreateConfirmOverlay: overlay,
        tagCreateNameInput: textarea,
        refreshTagList,
        printLog
    });

    overlay.addEventListener("click", () => {
        setTagCreateOverlayVisible(overlay, false);
    });

    const dialog = overlay.querySelector(".confirm-dialog");
    dialog?.addEventListener("click", (event) => {
        event.stopPropagation();
    });

    tagUI.addEventListener("keydown", (event: KeyboardEvent) => {
        if (event.key === "Escape" && !overlay.classList.contains("hidden")) {
            setTagCreateOverlayVisible(overlay, false);
        }
    });
};
