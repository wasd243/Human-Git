import {CSS_CLASS_SHOW} from "./types";

interface OpenBottomUIParams {
    bottomUI: HTMLElement;
    hideMainButtons: () => void;
}

interface CloseBottomUIParams {
    bottomUI: HTMLElement;
    showMainButtons: () => void;
}

export const openBottomUI = ({bottomUI, hideMainButtons}: OpenBottomUIParams) => {
    bottomUI.classList.add(CSS_CLASS_SHOW);
    hideMainButtons();
};

export const closeBottomUI = ({bottomUI, showMainButtons}: CloseBottomUIParams) => {
    bottomUI.classList.remove(CSS_CLASS_SHOW);
    showMainButtons();
};
