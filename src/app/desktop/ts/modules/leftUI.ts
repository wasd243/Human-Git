export function leftUI() {
    let triggerBtn = document.getElementById("top-left-sync-btn") as HTMLButtonElement | null;
    if (!triggerBtn) {
        triggerBtn = document.createElement("button");
        triggerBtn.id = "top-left-sync-btn";
        triggerBtn.innerHTML = `<span class="gear-icon">⚙</span>`;
        document.body.appendChild(triggerBtn);
    }

    let leftPanel = document.getElementById("left-ui");
    if (!leftPanel) {
        leftPanel = document.createElement("div");
        leftPanel.id = "left-ui";
        document.body.appendChild(leftPanel);
    }

    if (!triggerBtn.dataset.bound) {
        triggerBtn.addEventListener("click", () => {
            leftPanel!.classList.toggle("show");
        });
        triggerBtn.dataset.bound = "true";
    }
}
