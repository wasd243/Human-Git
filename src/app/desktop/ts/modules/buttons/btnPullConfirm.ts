import {CSS_CLASS_HIDDEN} from "./types";

interface SetupBtnPullConfirmParams {
    btnPullConfirm: HTMLElement;
    pullConfirmOverlay: HTMLElement;
    printLog: (msg: string) => void;
    refreshFileList: () => Promise<void>;
    invokePull: () => Promise<string>;
}

export const setupBtnPullConfirm = ({
    btnPullConfirm,
    pullConfirmOverlay,
    printLog,
    refreshFileList,
    invokePull
}: SetupBtnPullConfirmParams) => {
    btnPullConfirm.addEventListener("click", async () => {
        pullConfirmOverlay.classList.add(CSS_CLASS_HIDDEN);
        printLog("[GIT] Pulling current branch from origin...");

        try {
            const result = await invokePull();
            printLog(`[SUCCESS] ${result}`);
            await refreshFileList();
        } catch (e) {
            printLog(`[ERR] ${e}`);
        }
    });
};
