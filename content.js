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

  const isTextField =
    el.tagName === "TEXTAREA" ||
    (el.tagName === "INPUT" && (el.type === "text" || el.type === ""));

  if (!isTextField) return;
  if (!el.value.endsWith("#AI!")) return;

  const text = el.value.slice(0, -4);
  el.value = text;
  el.classList.add("ai-loading");

  chrome.runtime.sendMessage({ type: "AI_REQUEST", text }, (response) => {
    el.classList.remove("ai-loading");

    if (response?.error) {
      alert(response.error);
      return;
    }

    if (response?.result) {
      el.value = response.result;
    }
  });
});
