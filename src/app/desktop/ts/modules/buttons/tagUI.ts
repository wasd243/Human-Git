import {CSS_CLASS_SHOW} from "./types";

interface OpenTagUIParams {
    tagUI: HTMLElement;
    hideMainButtons: () => void;
}

interface CloseTagUIParams {
    tagUI: HTMLElement;
    showMainButtons: () => void;
}

export const openTagUI = ({tagUI, hideMainButtons}: OpenTagUIParams) => {
    tagUI.classList.add(CSS_CLASS_SHOW);
    hideMainButtons();
};

export const closeTagUI = ({tagUI, showMainButtons}: CloseTagUIParams) => {
    tagUI.classList.remove(CSS_CLASS_SHOW);
    showMainButtons();
};
