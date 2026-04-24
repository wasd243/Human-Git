import {invoke} from "@tauri-apps/api/core";
import {createTagMessageRow, renderTagList, type TagInfo} from "./listTag";
import {setTagCreateOverlayVisible} from "./btnTagCreateOverlay";
import {setupBtnTagCreateCancel} from "./btnTagCreateCancel";
import {setupBtnTagCreateConfirm} from "./btnTagCreateConfirm";

interface SetupBtnCreateTagParams {
    tagUI: HTMLElement;
    tagListEl: HTMLElement;
    printLog: (msg: string) => void;
}

interface TagCreateElements {
    btnCreateTag: HTMLButtonElement;
    overlay: HTMLElement;
    textarea: HTMLTextAreaElement;
    btnCancel: HTMLButtonElement;
    btnConfirm: HTMLButtonElement;
}

const ensureTagCreateElements = (tagUI: HTMLElement): TagCreateElements => {
    let btnCreateTag = document.getElementById("btn-create-tag") as HTMLButtonElement | null;
    if (!btnCreateTag) {
        btnCreateTag = document.createElement("button");
        btnCreateTag.id = "btn-create-tag";
        btnCreateTag.className = "quick-deploy-btn";
        btnCreateTag.textContent = "Create Tag";
        tagUI.insertAdjacentElement("afterbegin", btnCreateTag);
    }

    let overlay = document.getElementById("tag-create-confirm-overlay") as HTMLElement | null;
    let textarea = document.getElementById("tag-create-name-input") as HTMLTextAreaElement | null;
    let btnCancel = document.getElementById("btn-tag-create-cancel") as HTMLButtonElement | null;
    let btnConfirm = document.getElementById("btn-tag-create-confirm") as HTMLButtonElement | null;

    if (!overlay || !textarea || !btnCancel || !btnConfirm) {
        const templateOverlay = document.getElementById("force-push-confirm-overlay") as HTMLElement | null;
        const templatePanel = templateOverlay?.firstElementChild as HTMLElement | null;

        overlay = document.createElement("div");
        overlay.id = "tag-create-confirm-overlay";
        overlay.className = templateOverlay?.className ?? "confirm-overlay hidden";
        overlay.classList.add("hidden");

        const panel = document.createElement("div");
        panel.className = templatePanel?.className ?? "confirm-dialog";

        const title = document.createElement("p");
        title.textContent = "Create a new tag";

        textarea = document.createElement("textarea");
        textarea.id = "tag-create-name-input";
        textarea.placeholder = "Enter tag name (e.g. v1.2.0)";
        textarea.rows = 2;

        const actions = document.createElement("div");
        actions.className = "confirm-buttons";

        btnCancel = document.createElement("button");
        btnCancel.id = "btn-tag-create-cancel";
        btnCancel.className = "quick-deploy-btn";
        btnCancel.textContent = "Cancel";

        btnConfirm = document.createElement("button");
        btnConfirm.id = "btn-tag-create-confirm";
        btnConfirm.className = "quick-deploy-btn";
        btnConfirm.textContent = "Create";

        actions.appendChild(btnCancel);
        actions.appendChild(btnConfirm);

        panel.appendChild(title);
        panel.appendChild(textarea);
        panel.appendChild(actions);
        overlay.appendChild(panel);
        document.body.appendChild(overlay);

        panel.addEventListener("click", (event) => {
            event.stopPropagation();
        });

        overlay.addEventListener("click", () => {
            setTagCreateOverlayVisible(overlay!, false);
        });
    }

    return {
        btnCreateTag,
        overlay,
        textarea,
        btnCancel,
        btnConfirm
    };
};

export const setupBtnCreateTag = ({
    tagUI,
    tagListEl,
    printLog
}: SetupBtnCreateTagParams) => {
    const {btnCreateTag, overlay, textarea, btnCancel, btnConfirm} = ensureTagCreateElements(tagUI);

    const refreshTagList = async () => {
        try {
            const tags = await invoke<TagInfo[]>("list_tags");
            renderTagList(tagListEl, tags);
        } catch (e) {
            tagListEl.replaceChildren();
            tagListEl.appendChild(createTagMessageRow("Failed to load tags."));
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
};
