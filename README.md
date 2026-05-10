# Study Buddy Sidebar Extension

Chat with an AI assistant on any webpage — a floating sidebar you can open on any site.

## Installation (Chrome / Edge / Brave)

1. **Download** this folder and unzip it somewhere on your computer.
2. Open your browser and go to `chrome://extensions`
3. Enable **Developer mode** (toggle in the top-right corner)
4. Click **Load unpacked**
5. Select the `claude-extension` folder
6. The Claude extension icon will appear in your toolbar

## Setup

1. Click the **Claude ✦** icon in your browser toolbar
2. Enter your **Anthropic API key** (get one at https://console.anthropic.com)
3. Click **Save & Activate**

## Usage

- A **Studdy Buddy** tab appears on the right side of every webpage
- Click it to open the sidebar
- Ask anything — it can see the page you're on and answer questions about it
- Press **Enter** to send, **Shift+Enter** for a new line
- Click **Clear** to start a fresh conversation

## Notes

- Your API key is stored **locally** in your browser — never sent anywhere except Anthropic's API
- Each message uses your Anthropic API credits (claude-sonnet-4 model)
- The sidebar reads up to ~3000 characters of page content for context
