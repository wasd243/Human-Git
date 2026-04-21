import {setRemoteConfirmOverlayVisible} from "./remoteConfirmOverlay";

interface SetupBtnRemoteCancelParams {
    btnRemoteCancel: HTMLElement;
    remoteConfirmOverlay: HTMLElement;
}

export const setupBtnRemoteCancel = ({btnRemoteCancel, remoteConfirmOverlay}: SetupBtnRemoteCancelParams) => {
    btnRemoteCancel.addEventListener("click", () => {
        setRemoteConfirmOverlayVisible(remoteConfirmOverlay, false);
    });
};
