interface SetupBtnFetchActionParams {
    btnFetchAction: HTMLElement;
    fetchPruneCheckbox: HTMLInputElement;
    invokeFetch: (prune: boolean) => Promise<string>;
    refreshRemoteList: () => Promise<void>;
    printLog: (msg: string) => void;
}

export const setupBtnFetchAction = ({
    btnFetchAction,
    fetchPruneCheckbox,
    invokeFetch,
    refreshRemoteList,
    printLog
}: SetupBtnFetchActionParams) => {
    btnFetchAction.addEventListener("click", async () => {
        const prune = fetchPruneCheckbox.checked;
        if (prune) {
            printLog("[GIT] Fetching from origin with prune (-p)...");
        } else {
            printLog("[GIT] Fetching from origin...");
        }

        try {
            const result = await invokeFetch(prune);
            printLog(`[SUCCESS] ${result}`);
            await refreshRemoteList();
        } catch (e) {
            printLog(`[ERR] ${e}`);
        }
    });
};
