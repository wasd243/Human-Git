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
    tagHash.textContent = tagInfo.hash;

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
