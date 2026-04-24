export interface TagInfo {
    tag: string;
    hash: string;
    created_at: number;
    commit: string;
}

const escapeHtml = (value: string): string =>
    value
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");

const formatRelativeDays = (unixSeconds: number): string => {
    const nowSeconds = Math.floor(Date.now() / 1000);
    const diffSeconds = Math.max(0, nowSeconds - unixSeconds);
    const days = Math.floor(diffSeconds / 86400);

    if (days <= 0) return "today";
    if (days === 1) return "1 day ago";
    return `${days} days ago`;
};

const buildHeaderRow = (): string => `
<div class="tag-item tag-item-header">
    <span class="tag-name">Tag</span>
    <span class="tag-hash">Hash</span>
    <span class="tag-created">Created</span>
    <span class="tag-commit">Commit</span>
</div>
`;

const buildTagRow = (tagInfo: TagInfo): string => `
<div class="tag-item">
    <span class="tag-name">${escapeHtml(tagInfo.tag)}</span>
    <button
        type="button"
        class="tag-hash tag-hash-toggle"
        data-full-hash="${escapeHtml(tagInfo.hash)}"
        aria-expanded="false"
        title="Click to show hash"
    >+Hash</button>
    <span class="tag-created">${formatRelativeDays(tagInfo.created_at)}</span>
    <span class="tag-commit" title="${escapeHtml(tagInfo.commit)}">${escapeHtml(tagInfo.commit)}</span>
</div>
`;

const bindHashToggleHandlers = (tagListEl: HTMLElement) => {
    const hashButtons = tagListEl.querySelectorAll<HTMLButtonElement>(".tag-hash-toggle");

    for (const hashButton of hashButtons) {
        hashButton.addEventListener("click", () => {
            const fullHash = hashButton.dataset.fullHash ?? "";
            const isExpanded = hashButton.getAttribute("aria-expanded") === "true";

            if (isExpanded) {
                hashButton.textContent = "+Hash";
                hashButton.setAttribute("aria-expanded", "false");
                hashButton.title = "Click to show hash";
            } else {
                hashButton.textContent = fullHash;
                hashButton.setAttribute("aria-expanded", "true");
                hashButton.title = "Click to hide hash";
            }
        });
    }
};

export const renderTagList = (tagListEl: HTMLElement, tags: TagInfo[]) => {
    if (tags.length === 0) {
        tagListEl.innerHTML = `<div class="tag-item tag-item-empty">No tags found.</div>`;
        return;
    }

    const rows = tags.map(buildTagRow).join("");
    tagListEl.innerHTML = `${buildHeaderRow()}${rows}`;
    bindHashToggleHandlers(tagListEl);
};
