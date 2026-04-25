export interface TagInfo {
    tag: string;
    hash: string;
    created_at: number;
    commit: string;
}

const formatRelativeDays = (unixSeconds: number): string => {
    const nowSeconds = Math.floor(Date.now() / 1000);
    const diffSeconds = Math.max(0, nowSeconds - unixSeconds);
    const days = Math.floor(diffSeconds / 86400);

    if (days <= 0) return "today";
    if (days === 1) return "1 day ago";
    return `${days} days ago`;
};

const createTagHeaderRow = (): HTMLDivElement => {
    const row = document.createElement("div");
    row.className = "tag-item tag-item-header";

    const tagName = document.createElement("span");
    tagName.className = "tag-name";
    tagName.textContent = "Tag";

    const tagHash = document.createElement("span");
    tagHash.className = "tag-hash";
    tagHash.textContent = "Hash";

    const tagCreated = document.createElement("span");
    tagCreated.className = "tag-created";
    tagCreated.textContent = "Created";

    const tagCommit = document.createElement("span");
    tagCommit.className = "tag-commit";
    tagCommit.textContent = "Commit";

    row.appendChild(tagName);
    row.appendChild(tagHash);
    row.appendChild(tagCreated);
    row.appendChild(tagCommit);

    return row;
};

const createTagRow = (tagInfo: TagInfo): HTMLDivElement => {
    const row = document.createElement("div");
    row.className = "tag-item";

    const tagName = document.createElement("span");
    tagName.className = "tag-name";
    tagName.textContent = tagInfo.tag;

    const hashButton = document.createElement("button");
    hashButton.type = "button";
    hashButton.className = "tag-hash tag-hash-toggle";
    hashButton.dataset.fullHash = tagInfo.hash;
    hashButton.setAttribute("aria-expanded", "false");
    hashButton.title = "Click to show hash";
    hashButton.textContent = "+Hash";

    const tagCreated = document.createElement("span");
    tagCreated.className = "tag-created";
    tagCreated.textContent = formatRelativeDays(tagInfo.created_at);

    const tagCommit = document.createElement("span");
    tagCommit.className = "tag-commit";
    tagCommit.title = tagInfo.commit;
    tagCommit.textContent = tagInfo.commit;

    row.appendChild(tagName);
    row.appendChild(hashButton);
    row.appendChild(tagCreated);
    row.appendChild(tagCommit);

    return row;
};

const createEmptyRow = (): HTMLDivElement => {
    const emptyRow = document.createElement("div");
    emptyRow.className = "tag-item tag-item-empty";
    emptyRow.textContent = "No tags found.";
    return emptyRow;
};

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
    tagListEl.replaceChildren();

    if (tags.length === 0) {
        tagListEl.appendChild(createEmptyRow());
        return;
    }

    const fragment = document.createDocumentFragment();
    fragment.appendChild(createTagHeaderRow());

    for (const tagInfo of tags) {
        fragment.appendChild(createTagRow(tagInfo));
    }

    tagListEl.appendChild(fragment);
    bindHashToggleHandlers(tagListEl);
};
