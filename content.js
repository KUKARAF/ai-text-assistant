const style = document.createElement("style");
style.textContent = `
@keyframes ai-breathing {
  0%, 100% { background-color: inherit; }
  50% { background-color: rgba(99, 102, 241, 0.15); }
}

.ai-loading {
  animation: ai-breathing 1.5s ease-in-out infinite;
  pointer-events: none;
}
`;
document.head.appendChild(style);

document.addEventListener("input", (e) => {
  const el = e.target;

  const isContentEditable = el.isContentEditable;
  const isPlainTextField =
    el.tagName === "TEXTAREA" ||
    (el.tagName === "INPUT" && (el.type === "text" || el.type === ""));

  if (!isPlainTextField && !isContentEditable) return;

  const currentText = isContentEditable ? el.innerText : el.value;
  if (!currentText.endsWith("#AI!")) return;

  const text = currentText.slice(0, -4);

  if (isContentEditable) {
    el.innerText = text;
  } else {
    el.value = text;
  }

  el.classList.add("ai-loading");

  chrome.runtime.sendMessage({ type: "AI_REQUEST", text }, (response) => {
    el.classList.remove("ai-loading");

    if (response?.error) {
      alert(response.error);
      return;
    }

    if (response?.result) {
      if (isContentEditable) {
        el.innerText = response.result;
      } else {
        el.value = response.result;
      }
    }
  });
});
