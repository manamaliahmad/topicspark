# TopicSpark ✨ — YouTube Topic Extractor (Chrome Extension)

![Version](https://img.shields.io/badge/version-1.1.0-blue)
![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)
![Manifest V3](https://img.shields.io/badge/Manifest-V3-green)
![Powered by Gemini](https://img.shields.io/badge/powered%20by-Gemini%20video-blue)
![BYOK](https://img.shields.io/badge/BYOK-your%20key%2C%20your%20device-brightgreen)

> **Gemini watches the full YouTube video — visuals, audio, pacing, editing — and
> suggests your next 4 video ideas.** Not just the title. Not just the captions.
> The whole video. Each topic comes with a catchy title, a unique angle, and a
> click hook. Output is **English only**, even if the video itself is in another
> language. You bring your own Gemini key; there is no server of ours.

If TopicSpark saves you an hour of brainstorming, please ⭐ **star this repo**.

## ✨ What it does

- **Watches the whole video.** The video URL is passed to Google's Gemini API as
  video input, so Gemini sees the visuals and hears the audio — the jokes, the
  pacing, the editing style, the moments that land.
- **Exactly 4 topics, every time.** Each topic has a catchy title, a
  one-sentence angle, and a one-sentence hook explaining why viewers will click.
- **English output only.** The prompt enforces English strictly — even if the
  video is in Urdu, Hindi, Roman Urdu, or any other language, the topics come
  back in English. Never Roman Urdu, never mixed.
- **Copy in one click.** Copy a single topic or all four at once.
- **BYOK — Bring Your Own Key.** Your Gemini API key is stored in this browser's
  **local storage (this device only, never synced)** and sent only to the Google
  Gemini API, via a secure header. No backend, no database, no middleman.

## 🧭 How it works

```text
YouTube URL ──▶ Gemini video input (visuals + audio)
                        │
                        ▼
              Structured JSON: 4 topics + angles + hooks
                        │
                        ▼
              Copy & create your next videos
```

1. **Paste a YouTube URL** — `watch`, `youtu.be`, `shorts`, `embed` and `live`
   links all work (they are normalized to a watch URL for Gemini).
2. **Add your Gemini API key** — once. It stays on your device.
3. **Click "Extract 4 Topics"** — Gemini watches the video and returns 4 topics
   in strict JSON. If Gemini cannot access the video (private, age-restricted,
   unavailable), you get a clear error instead of a made-up answer.

## 🔑 Getting a Gemini API key

1. Go to **Google AI Studio**: aistudio.google.com
2. Sign in with your Google account → **Get API Key** → **Create API key**
3. Paste it into TopicSpark. Google AI Studio has a **free tier**, so trying it
   costs nothing (usage limits apply on the free tier).

## 🔒 Privacy & security (BYOK, honestly)

| Question | Answer |
|---|---|
| Where is my API key stored? | In `chrome.storage.local` — on this device only. It is **not** synced to your Google account and **not** sent anywhere except the Google Gemini API. |
| How is it sent? | Via the `x-goog-api-key` header — never in a shared link or a third-party server. |
| Does TopicSpark have a server? | No. The extension talks straight from your browser to Google's Gemini API. |
| What data leaves my browser? | The video URL (so Gemini can watch it) and your key (as the auth header). Nothing goes to us. |
| Can anyone steal my key? | Not through this extension. But on a **shared computer**, anyone using your browser profile could open the popup — remove the key when you're done on shared machines. |
| Permissions | `storage` (your settings + key, local only) and host access (to call the Gemini API from the popup). |

## 🚀 Install

### Option A — Chrome Web Store (coming soon)

Search **"TopicSpark"** and click **Add to Chrome**.

### Option B — Load unpacked (works right now)

1. Download this repo (Code → Download ZIP) and unzip it.
2. Open Chrome → `chrome://extensions` → turn on **Developer mode**.
3. Click **Load unpacked** → select the unzipped folder.
4. Click the TopicSpark icon, add your Gemini key, paste a video URL, extract.

Works in Chrome, Edge, Brave and any Chromium browser.

## 🛠 Project structure

```text
topicspark/
├── manifest.json   # Manifest V3: metadata, permissions, popup
├── popup.html      # Popup UI (English only)
├── popup.js        # URL parsing, Gemini video call, rendering
├── icons/          # Extension icons (16 / 48 / 128 px)
├── LICENSE         # MIT License
└── README.md       # You are here
```

## 🧰 Tech stack

- **Manifest V3**, vanilla JavaScript, zero dependencies, zero build step
- **Google Gemini API** — `generateContent` with YouTube URL as `fileData`
  video input, `responseMimeType: application/json` + `responseSchema` for
  strict structured output (default model: `gemini-2.5-flash`, editable)

## ❓ Troubleshooting

| Problem | Fix |
|---|---|
| "Please paste a valid YouTube URL" | Use a full link: `youtube.com/watch?v=...`, `youtu.be/...`, or a Shorts link. |
| "Gemini error 400" | Gemini cannot access that video (private, age-restricted, unavailable) — try a public video. |
| "Gemini error 400 API key not valid" | Your key is wrong or expired — create a new one in Google AI Studio. |
| "Gemini error 404" | Model name doesn't exist — check the model field (`gemini-2.5-flash` is the default). |
| Topics in the wrong language | Should not happen — the prompt enforces English only. If it ever does, click Extract again. |
| Empty Gemini response | Try again once; very long videos are sampled by the model and can occasionally time out. |

## 🗺 Roadmap

- [ ] Chrome Web Store listing
- [ ] Side-panel view for longer reading
- [ ] Bulk mode: paste several URLs, get topics for each
- [ ] Thumbnail + title idea pairs
- [ ] Optional output-language setting (default stays English only)
- [ ] Firefox port

## 🤝 Contributing

Ideas, bug reports and pull requests are welcome:

1. Fork → branch → commit → Pull Request
2. Found a bug? Open an **Issue** with your Chrome version, model, and a screenshot.

## 👤 Author

Built by **Ali Ahmad** — builder of cute robots, websites and open-source toys.

- GitHub: https://github.com/manamaliahmad
- Instagram: https://instagram.com/manamaliahmad
- X (Twitter): https://x.com/manamaliahmad

## 📄 License

MIT License — see [LICENSE](LICENSE). Use it, remix it, ship it.
