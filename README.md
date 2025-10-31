# Chrome Extension: AI Code Analyzer

A production-ready Chrome extension for the **Google Chrome Built-in AI Challenge 2025** that analyzes code using Chrome's on-device AI models.

## Features

✅ **Code Summarization** - AI-powered summaries using Chrome's built-in AI  
✅ **Flowchart Generation** - Automatic Mermaid diagram visualization of code logic  
✅ **Complexity Analysis** - Big O time and space complexity assessment  
✅ **Copy Flowchart Code** - Export Mermaid code for external rendering  
✅ **Side Panel Interface** - Sleek side panel UI for better user experience  
✅ **Scrollable Diagrams** - Large flowcharts scroll smoothly within the interface  
✅ **One-Click Analysis** - Right-click context menu integration  
✅ **Responsive Design** - Optimized layout for side panel viewing  

## Prerequisites

- **Chrome Browser** (Chrome 140+ - latest version)
- **Enable AI Settings** 
  - Go to `chrome://settings/ai`
  - Turn ON "Use AI" (this allows Chrome to download the model)
- **Download the AI Model Component**
  - This is the CRITICAL step that most people miss!
  - Go to `chrome://components`
  - Find "On-Device Model Execution Service" or similar
  - Click **"Check for update"** button
  - Wait for download to complete (several hundred MB)
  - Restart Chrome completely
  - The extension will now work!
- **Device Requirements**:
  - Operating System: Windows 10+, macOS 13+, Linux, or ChromeOS (Chromebook Plus)
  - Storage: At least 22 GB free space
  - RAM: 16 GB or more
  - CPU: 4 cores or more (or GPU with >4 GB VRAM)
  - Network: Unlimited/unmetered connection (Wi-Fi or Ethernet preferred)

## Installation

### 1. Get the Extension
```bash
git clone <repository-url> chrome-extension
cd chrome-extension
```

### 2. Load into Chrome
1. Open `chrome://extensions/` in Chrome Canary
2. Enable **Developer mode** (toggle in top right)
3. Click **Load unpacked**
4. Select the `chrome-extension` folder
5. Extension appears in your Chrome toolbar

### 3. Verify Installation
- Right-click any code text on a webpage
- You should see **"Analyze Code"** option in context menu
- Click it to see the analysis popup

## Usage

1. **Select Code** - Highlight any code snippet on a webpage
2. **Right-Click** - Open context menu
3. **Click "Analyze Code"** - Opens the analyzer popup
4. **Wait for Results** - AI models process your code (~5-10 seconds)
5. **View Results** - See summary, flowchart, and complexity analysis
6. **Export** - Copy Mermaid code or download SVG flowchart

## Architecture

For detailed technical information about Chrome APIs, data flow, and prompt engineering, see [ARCHITECTURE.md](./ARCHITECTURE.md).

## Troubleshooting

### ⚠️ "AI Model Not Ready" Error (MOST COMMON)
This means the on-device AI model hasn't been downloaded yet. **This is normal on first use!**

**FIX:**
1. Go to `chrome://settings/ai` and turn ON "Use AI"
2. Go to `chrome://components`
3. Look for "On-Device Model Execution Service" or "Optimization Guide On Device Model"
4. Click the **"Check for update"** button (version will be 0.0.0.0 initially)
5. Wait for "Component updated" message and version number to appear (download may take 5-10 minutes)
6. **Completely quit Chrome** (not just close the window)
7. **Restart Chrome**
8. Try the extension again - it should work now!

### "Chrome AI API not found"
- You're not using Chrome 140 or later
- Download Chrome 140 from https://www.google.com/chrome/dev/ or https://www.google.com/chrome/canary/
- Ensure you're not using a different browser (Edge, Firefox, etc.)

### Models are downloading
- The on-device model is being downloaded (~500MB+)
- This is a one-time download
- Do NOT close Chrome or the popup during download
- Wait until download completes before trying again

### Extension context menu doesn't appear
- Reload extension: `chrome://extensions` → Find extension → Click reload icon
- Make sure you're selecting text on a webpage before right-clicking
- Try on a different website

### Results show blank or incomplete
- Wait 10-15 seconds for AI to process on first use
- Try with code snippets at least 20 characters long
- Check console for errors: Right-click popup → Inspect → Console tab

## Project Structure

```
chrome-extension/
├── manifest.json           # Extension configuration (Manifest V3)
├── service-worker.js       # Background script (context menu handler)
├── popup.html              # Extension popup UI template
├── popup.js                # Main AI analysis logic
├── styles.css              # Styling and animations
├── icons/                  # Extension icons
│   ├── icon-16.png
│   ├── icon-48.png
│   ├── icon-128.png
│   └── icon-256.png
└── README.md               # This file
```

## Technologies

| Component | Technology |
|-----------|-----------|
| **Language** | JavaScript (ES2020+) |
| **Framework** | Chrome Extension API (Manifest V3) |
| **AI Models** | Chrome Gemini Nano (on-device) |
| **APIs** | Summarizer API, Prompt API |
| **UI** | Vanilla HTML/CSS/JavaScript |
| **Build** | Zero-config (no build step) |
