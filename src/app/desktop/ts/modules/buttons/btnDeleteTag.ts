import {setupBtnDeleteTagCancel} from "./btnDeleteTagCancel";
import {setupBtnDeleteTagConfirm} from "./btnDeleteTagConfirm";

interface SetupBtnDeleteTagParams {
    btnDeleteTag: HTMLElement;
    tagDeleteConfirmOverlay: HTMLElement;
    tagDeleteNameInput: HTMLTextAreaElement;
    btnTagDeleteCancel: HTMLElement;
    btnTagDeleteConfirm: HTMLElement;
    tagListEl: HTMLElement;
    printLog: (msg: string) => void;
}

export const setupBtnDeleteTag = ({
    btnDeleteTag,
    tagDeleteConfirmOverlay,
    tagDeleteNameInput,
    btnTagDeleteCancel,
    btnTagDeleteConfirm,
    tagListEl,
    printLog
}: SetupBtnDeleteTagParams) => {
    btnDeleteTag.addEventListener("click", () => {
        tagDeleteNameInput.value = "";
        tagDeleteConfirmOverlay.classList.remove("hidden");
        tagDeleteNameInput.focus();
    });

    setupBtnDeleteTagCancel({
        btnTagDeleteCancel,
        tagDeleteConfirmOverlay,
        tagDeleteNameInput
    });

    setupBtnDeleteTagConfirm({
        btnTagDeleteConfirm,
        tagDeleteConfirmOverlay,
        tagDeleteNameInput,
        tagListEl,
        printLog
    });
};
