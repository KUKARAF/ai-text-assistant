chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type !== "AI_REQUEST") return;

  handleAIRequest(message.text).then(sendResponse);
  return true; // keep message channel open for async response
});

async function handleAIRequest(text) {
  const { apiKey, model, prompt, temperature } = await chrome.storage.sync.get({
    apiKey: "",
    model: "anthropic/claude-3.5-haiku",
    prompt:
      "You are a helpful writing assistant embedded in a text field. The user will provide text they are working on. Respond ONLY with the improved or completed version of the text — no explanations, no commentary, no markdown formatting, no quotes. Match the tone, language, and style of the original text. If the text contains a question or instruction, answer it directly in a way suitable for the text field context (e.g., email reply, form response, chat message).",
    temperature: 0.7,
  });

  if (!apiKey) {
    return {
      error:
        "AI Assistant: API key is not set. Please configure it in the extension settings.",
    };
  }

  let response;
  try {
    response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: prompt },
          { role: "user", content: text },
        ],
        temperature,
      }),
    });
  } catch {
    return {
      error:
        "AI Assistant: Could not reach the API. Check your internet connection.",
    };
  }

  if (response.status === 429) {
    return {
      error:
        "AI Assistant: Rate limit reached. Please wait a moment and try again.",
    };
  }

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    return {
      error: `AI Assistant: Error — ${response.status} ${body || response.statusText}`,
    };
  }

  let data;
  try {
    data = await response.json();
  } catch {
    return { error: "AI Assistant: Failed to parse API response." };
  }

  const result = data.choices?.[0]?.message?.content;
  if (!result) {
    return { error: "AI Assistant: No response received from the model." };
  }

  return { result };
}
