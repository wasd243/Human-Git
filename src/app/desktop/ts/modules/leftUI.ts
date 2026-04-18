export function leftUI() {
    const triggerBtn = document.createElement("button");
    triggerBtn.id = "top-left-sync-btn";
    triggerBtn.innerHTML = `<span class="gear-icon">⚙</span>`;
    document.body.appendChild(triggerBtn);

    const leftPanel = document.createElement("div");
    leftPanel.id = "left-ui";
    leftPanel.textContent = "Left panel reserved for future implementation.";
    document.body.appendChild(leftPanel);

// Interactions
    triggerBtn.addEventListener("click", () => {
        leftPanel.classList.toggle("show");
    });
}
