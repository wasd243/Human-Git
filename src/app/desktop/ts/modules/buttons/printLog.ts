const REMOTE_URL_PATTERNS: RegExp[] = [
    /^https?:\/\/[^\s/$.?#].[^\s]*$/i,
    /^git@[^:\s]+:[^\s]+$/i,
    /^ssh:\/\/[^\s]+$/i
];

export const isValidGitRemoteUrl = (url: string): boolean => {
    const trimmedUrl = url.trim();
    if (!trimmedUrl) {
        return false;
    }

    return REMOTE_URL_PATTERNS.some((pattern) => pattern.test(trimmedUrl));
};

export const createRemoteMessageRow = (message: string): HTMLDivElement => {
    const row = document.createElement("div");
    row.className = "remote-item";
    row.textContent = message;
    return row;
};

export const renderRemoteList = (remoteListEl: HTMLElement, remotes: string[]) => {
    remoteListEl.replaceChildren();

    if (remotes.length === 0) {
        remoteListEl.appendChild(createRemoteMessageRow("No remotes configured."));
        return;
    }

    for (const remote of remotes) {
        remoteListEl.appendChild(createRemoteMessageRow(remote));
    }
};
