const DEFAULT_PROMPT =
  "You are a helpful writing assistant embedded in a text field. The user will provide text they are working on. Respond ONLY with the improved or completed version of the text — no explanations, no commentary, no markdown formatting, no quotes. Match the tone, language, and style of the original text. If the text contains a question or instruction, answer it directly in a way suitable for the text field context (e.g., email reply, form response, chat message).";

const apiKeyInput = document.getElementById("apiKey");
const modelInput = document.getElementById("model");
const promptInput = document.getElementById("prompt");
const temperatureInput = document.getElementById("temperature");
const tempValue = document.getElementById("tempValue");
const saveBtn = document.getElementById("save");
const status = document.getElementById("status");

temperatureInput.addEventListener("input", () => {
  tempValue.textContent = temperatureInput.value;
});

chrome.storage.sync.get(
  {
    apiKey: "",
    model: "anthropic/claude-3.5-haiku",
    prompt: DEFAULT_PROMPT,
    temperature: 0.7,
  },
  (settings) => {
    apiKeyInput.value = settings.apiKey;
    modelInput.value = settings.model;
    promptInput.value = settings.prompt;
    temperatureInput.value = settings.temperature;
    tempValue.textContent = settings.temperature;
  }
);

saveBtn.addEventListener("click", () => {
  const apiKey = apiKeyInput.value.trim();
  const model = modelInput.value.trim();
  const prompt = promptInput.value.trim();
  const temperature = parseFloat(temperatureInput.value);

  if (!model) {
    status.textContent = "Model cannot be empty.";
    status.style.color = "#dc2626";
    return;
  }

  if (!prompt) {
    status.textContent = "System prompt cannot be empty.";
    status.style.color = "#dc2626";
    return;
  }

  chrome.storage.sync.set({ apiKey, model, prompt, temperature }, () => {
    status.textContent = "Settings saved!";
    status.style.color = "#16a34a";
    setTimeout(() => {
      status.textContent = "";
    }, 2000);
  });
});
