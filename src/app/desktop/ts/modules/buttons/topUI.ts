import {CSS_CLASS_HIDDEN, CSS_CLASS_SHOW} from "./types";

interface OpenTopUIParams {
    topUI: HTMLElement;
    hideMainButtons: () => void;
}

interface CloseTopUIParams {
    topUI: HTMLElement;
    overlaysToHide: HTMLElement[];
    showMainButtons: () => void;
}

export const openTopUI = ({topUI, hideMainButtons}: OpenTopUIParams) => {
    topUI.classList.add(CSS_CLASS_SHOW);
    hideMainButtons();
};

export const closeTopUI = ({topUI, overlaysToHide, showMainButtons}: CloseTopUIParams) => {
    topUI.classList.remove(CSS_CLASS_SHOW);
    overlaysToHide.forEach((el) => el.classList.add(CSS_CLASS_HIDDEN));
    showMainButtons();
};
