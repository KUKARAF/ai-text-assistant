# ai-text-assistant

## Overview
A lightweight Chrome extension that enhances text input fields with AI assistance. When users type `#AI!` in any textfield or textarea, the extension sends the preceding text to OpenRouter's AI models, then replaces the content with the AI-generated response. Designed for quick, contextual AI assistance without leaving the current webpage.

## Goals & Non-Goals

### Goals
- Provide instant AI assistance in any text input field across the web
- Simple trigger mechanism (`#AI!`) that doesn't interfere with normal typing
- Secure storage of OpenRouter API key and user preferences
- Minimal performance impact on browser
- Clean, intuitive settings interface

### Non-Goals
- No backend server required (runs entirely client-side)
- No user authentication system (API key stored locally)
- No support for multiple AI providers beyond OpenRouter
- No complex prompt management or history
- No mobile browser support (Chrome desktop only)

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Chrome Browser                           │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                 Content Script                      │   │
│  │  • Monitors text inputs for #AI! trigger           │   │
│  │  • Captures text before trigger                    │   │
│  │  • Sends message to background script with text    │   │
│  │  • Replaces text with response                     │   │
│  │  • Never handles API key or makes API calls        │   │
│  └─────────────────────────────────────────────────────┘   │
│                          ▲ chrome.runtime messages ▼       │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                 Background Script                   │   │
│  │  • Reads API key from chrome.storage on each req   │   │
│  │  • Makes OpenRouter API calls (sole API caller)    │   │
│  │  • Returns response/error to content script        │   │
│  │  • Handles settings persistence                    │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                            │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                 Popup/Options Page                  │   │
│  │  • Settings UI for API key, model, prompt          │   │
│  │  • Default prompt configuration                    │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │  OpenRouter API  │
                    │  (External)      │
                    └──────────────────┘
```

**Data Flow:**
1. User types in any textfield/textarea on any webpage
2. Content script monitors for `#AI!` trigger
3. When detected, captures text preceding `#AI!`, removes `#AI!` from the field
4. Adds `ai-loading` CSS class to the textfield (triggers breathing color animation)
5. Content script sends user text to background script via `chrome.runtime.sendMessage`
6. Background script reads API key + settings from `chrome.storage.sync`
7. Background script makes the API call to OpenRouter, returns response to content script
8. Content script replaces text with response, removes `ai-loading` class
9. On error, content script removes `ai-loading` class and shows error via `alert()`

## Stack

### Core
- **Manifest Version**: Manifest V3 (required for modern Chrome extensions)
- **JavaScript**: ES6+ with Chrome extension APIs
- **No build system initially** (vanilla JS/HTML/CSS)
- **Storage**: Chrome Storage API (sync or local)

### Development Tooling
- **Package manager**: None required (vanilla extension)
- **Linting**: ESLint with Chrome extension rules
- **Testing**: Jest for unit tests, Puppeteer for E2E
- **Version control**: Git

### Infrastructure
- **Deployment**: Chrome Web Store
- **CI**: GitHub Actions for linting and testing
- **Secrets management**: API keys stored in Chrome sync storage (encrypted by Chrome)

## Project Structure

```
.
├── manifest.json              # Extension manifest (V3)
├── popup.html                # Extension popup interface
├── popup.js                  # Popup logic
├── options.html              # Settings page
├── options.js                # Settings page logic
├── background.js             # Background service worker
├── content.js                # Content script for page injection
├── styles.css                # Shared styles
├── icons/                    # Extension icons (16, 48, 128px)
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
├── tests/                    # Test files
│   ├── unit/
│   └── e2e/
├── .eslintrc.js              # ESLint configuration
├── .gitignore
└── specs.md                  # This file
```

**Why this structure:**
- Flat structure for simplicity (small extension)
- Separate files for each extension component (manifest spec)
- Icons directory for Chrome Web Store requirements
- Tests directory for maintainability

## Environment & Config

**Default System Prompt:**
```
You are a helpful writing assistant embedded in a text field. The user will provide text they are working on. Respond ONLY with the improved or completed version of the text — no explanations, no commentary, no markdown formatting, no quotes. Match the tone, language, and style of the original text. If the text contains a question or instruction, answer it directly in a way suitable for the text field context (e.g., email reply, form response, chat message).
```

**Configuration stored in Chrome Storage:**
- `apiKey`: OpenRouter API key (required)
- `model`: Selected AI model (default: "anthropic/claude-3.5-haiku")
- `prompt`: System prompt template (has reasonable default)
- `temperature`: Response temperature (default: 0.7)

**No `.env` files** - all configuration managed through Chrome extension settings UI.

## API / Interface Design

### Chrome Extension APIs Used
- `chrome.storage.sync` — Settings persistence across devices
- `chrome.runtime` — Message passing between content script and background script
- `chrome.action` — Popup management

### Manifest Permissions
```json
{
  "permissions": ["storage"],
  "host_permissions": ["https://openrouter.ai/*"]
}
```
- `storage` — Required for `chrome.storage.sync`
- `host_permissions` for `openrouter.ai` — Required in MV3 for the background service worker to make `fetch()` calls to the OpenRouter API. Without this, requests will be blocked by CORS. Only the background script makes these calls; content scripts never contact external APIs.

### External API Integration
- **OpenRouter REST API**: Single endpoint for text completion (`https://openrouter.ai/api/v1/chat/completions`)
- **Authentication**: Bearer token (API key), sent only from the background service worker
- **Rate limiting**: Handled by OpenRouter

### Settings Interface
- Simple HTML form with:
  - API key input (password type)
  - Model selection dropdown
  - Prompt template textarea
  - Temperature slider
  - Save/Cancel buttons

## Data Models

### Settings Object
```javascript
{
  apiKey: string,          // OpenRouter API key
  model: string,           // e.g., "anthropic/claude-3.5-haiku"
  prompt: string,          // System prompt template
  temperature: number,     // 0.0 to 1.0
  lastUpdated: timestamp   // For sync conflict resolution
}
```

### API Request Payload
```javascript
{
  model: string,
  messages: [
    { role: "system", content: prompt },
    { role: "user", content: userText }
  ],
  temperature: number
}
```

## Loading Indicator

The content script injects a `<style>` tag with CSS for the `ai-loading` class. When a request is in flight, the class is added to the active textfield. On completion (success or error), the class is removed.

```css
@keyframes ai-breathing {
  0%, 100% { background-color: inherit; }
  50% { background-color: rgba(99, 102, 241, 0.15); }
}

.ai-loading {
  animation: ai-breathing 1.5s ease-in-out infinite;
  pointer-events: none;
}
```

- `pointer-events: none` prevents the user from typing while the request is in flight
- The breathing effect uses a subtle indigo tint so it works on both light and dark backgrounds

## Error Handling

API errors are shown to the user via `alert()` to keep things simple. The original text (minus the `#AI!` trigger) is preserved in the textfield so no user input is lost.

Common error scenarios:
- **Missing/invalid API key**: `alert("AI Assistant: API key is not set. Please configure it in the extension settings.")`
- **Rate limit (429)**: `alert("AI Assistant: Rate limit reached. Please wait a moment and try again.")`
- **Network error**: `alert("AI Assistant: Could not reach the API. Check your internet connection.")`
- **Other API errors**: `alert("AI Assistant: Error — <status code> <message>")`

## Key Design Decisions

### Decision: Manifest V3 over V2
- **Rationale**: Required for Chrome Web Store submission from 2023 onward. More secure with service workers replacing background pages.
- **Alternatives**: Manifest V2 (deprecated, won't be accepted in Web Store)

### Decision: Chrome Storage Sync over Local
- **Rationale**: Allows settings to sync across user's Chrome instances. 100KB quota sufficient for our needs.
- **Alternatives**: Local storage (simpler but no sync), IndexedDB (overkill)

### Decision: Vanilla JS over Framework
- **Rationale**: Extension is simple enough that React/Vue would add unnecessary complexity and bundle size.
- **Alternatives**: React/Preact (more maintainable for complex UIs), Svelte (lightweight but learning curve)

### Decision: #AI! Trigger Syntax
- **Rationale**: Unlikely to appear in normal typing, easy to remember, includes visual indicator (`!`).
- **Alternatives**: Keyboard shortcut (conflicts with sites), button injection (clutters UI), magic words (less discoverable)

### Decision: OpenRouter as Single Provider
- **Rationale**: Provides access to multiple models (OpenAI, Anthropic, etc.) through single API. Good free tier.
- **Alternatives**: Direct OpenAI API (less model variety), multiple providers (complexity)

## Development Workflow

1. **Clone and setup**:
   ```bash
   git clone <repo>
   cd ai-text-assistant
   npm install  # if using ESLint/Jest
   ```

2. **Load in Chrome**:
   - Open `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select project directory

3. **Development cycle**:
   - Edit files
   - Click reload on extension card
   - Test on any webpage

4. **Testing**:
   ```bash
   npm test          # Run unit tests
   npm run test:e2e  # Run E2E tests with Puppeteer
   ```

**PR Conventions**:
- Branch from `main`
- PR should include tests for new functionality
- Update `specs.md` if architecture changes

## Testing Strategy

### Unit Tests (Jest)
- Content script text detection logic
- Settings validation and storage
- API request formatting
- Response processing

### Integration Tests
- Chrome storage API interactions
- Message passing between extension components

### E2E Tests (Puppeteer)
- Full extension installation and configuration
- Trigger detection on sample pages
- API integration (mock or real with test key)

**Coverage Target**: 80%+ for core logic (text detection, API integration)

## Performance & Scaling Considerations

### Known Bottlenecks
- **Network latency**: AI requests may take 2-10 seconds
- **Large pages**: Content script runs on all pages; optimize DOM monitoring
- **Storage sync**: Chrome sync has quotas and delays

### Optimization Strategy
- Debounce text monitoring to avoid excessive DOM queries
- Cache model list to avoid frequent API calls
- Implement request timeout (30s) and retry logic
- Use efficient selectors for text input detection

### Load Considerations
- Single user extension - no server load concerns
- OpenRouter handles rate limiting and scaling

## Security Considerations

### Input Validation
- Sanitize user text before sending to API (remove PII if possible)
- Validate API key format before storage
- Escape HTML in responses before injection

### Secrets Management
- API keys stored in `chrome.storage.sync` (encrypted at rest by Chrome)
- **API key isolation**: The API key is only ever read by the background service worker, immediately before making an API call. It is never sent to content scripts, never passed via message payloads, and never exposed to webpage context.
- Never log API keys to console
- Content scripts send only user text to the background script; the background script retrieves the key from storage, makes the call, and returns only the AI response

### Dependency Security
- No external npm dependencies initially
- If added later: regular `npm audit` checks
- Pin dependency versions

### Content Security
- Use strict Content Security Policy in manifest
- Sanitize all AI responses before DOM injection
- Validate URLs if implementing any external fetches beyond OpenRouter

## Open Questions / TBDs

1. ~~**Default prompt template**: What should the reasonable default system prompt be?~~ ✅ Resolved
2. **Model selection**: Which OpenRouter models should be in the default dropdown?
3. ~~**Error handling**: How to gracefully handle API errors (rate limits, invalid key)?~~ ✅ Resolved — show via `alert()`
4. ~~**User feedback**: Loading indicator while AI processes request?~~ ✅ Resolved — `ai-loading` CSS class with breathing animation
5. **Undo functionality**: Should we implement Ctrl+Z to restore original text?
6. **Multi-language support**: Basic i18n for settings page?
7. **Analytics**: Basic usage metrics (opt-in) for improvement?
8. **Prompt templates**: Pre-defined templates for common tasks (email, tweet, etc.)?