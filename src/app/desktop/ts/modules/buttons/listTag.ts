export interface TagInfo {
    tag: string;
    hash: string;
    commit: string;
}

export const createTagMessageRow = (message: string): HTMLDivElement => {
    const row = document.createElement("div");
    row.className = "tag-item";
    row.textContent = message;
    return row;
};

const createTagRow = (tagInfo: TagInfo): HTMLDivElement => {
    const row = document.createElement("div");
    row.className = "tag-item";

    const tagName = document.createElement("span");
    tagName.className = "tag-name";
    tagName.textContent = tagInfo.tag;

    const tagHash = document.createElement("span");
    tagHash.className = "tag-hash";
    tagHash.style.cursor = "pointer";
    tagHash.tabIndex = 0;
    tagHash.setAttribute("role", "button");
    tagHash.setAttribute("aria-label", `Toggle hash visibility for tag ${tagInfo.tag}`);

    const fullHash = tagInfo.hash;
    const foldedHash = "+Hash";
    let isHashVisible = false;

    const renderHash = () => {
        tagHash.textContent = isHashVisible ? fullHash : foldedHash;
        tagHash.title = isHashVisible ? "Click to hide hash" : "Click to show hash";
    };

    const toggleHashVisibility = () => {
        isHashVisible = !isHashVisible;
        renderHash();
    };

    tagHash.addEventListener("click", toggleHashVisibility);
    tagHash.addEventListener("keydown", (event: KeyboardEvent) => {
        if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            toggleHashVisibility();
        }
    });

    renderHash();

    const tagCommit = document.createElement("span");
    tagCommit.className = "tag-commit";
    tagCommit.textContent = tagInfo.commit;

    row.appendChild(tagName);
    row.appendChild(tagHash);
    row.appendChild(tagCommit);
    return row;
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

    const tagCommit = document.createElement("span");
    tagCommit.className = "tag-commit";
    tagCommit.textContent = "Commit";

    row.appendChild(tagName);
    row.appendChild(tagHash);
    row.appendChild(tagCommit);
    return row;
};

export const renderTagList = (tagListEl: HTMLElement, tags: TagInfo[]) => {
    tagListEl.replaceChildren();

    if (tags.length === 0) {
        tagListEl.appendChild(createTagMessageRow("No tags found."));
        return;
    }

    tagListEl.appendChild(createTagHeaderRow());

    for (const tagInfo of tags) {
        tagListEl.appendChild(createTagRow(tagInfo));
    }
};
