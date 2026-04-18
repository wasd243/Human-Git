export function leftUI() {
    const triggerBtn = document.createElement("button");
    triggerBtn.id = "top-left-sync-btn";
    triggerBtn.innerHTML = `<span class="gear-icon">⚙</span>`;
    document.body.appendChild(triggerBtn);

    const leftPanel = document.createElement("div");
    leftPanel.id = "left-ui";

    let consoleEl = document.getElementById("console-output");
    if (!consoleEl) {
        consoleEl = document.createElement("div");
        consoleEl.id = "console-output";
    }

    leftPanel.appendChild(consoleEl);
    document.body.appendChild(leftPanel);

    // Interactions
    triggerBtn.addEventListener("click", () => {
        leftPanel.classList.toggle("show");
    });
}
