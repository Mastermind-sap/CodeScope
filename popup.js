// ============================================================================
// CodeScope - Advanced Code AI Analyzer v2
// Fixes: Tab highlighting, selective loading, cached results history,
// CSP compliance, language specification, popup errors
// ============================================================================

let globalMermaidCode = "";
let globalSummary = "";
let globalComplexity = "";
let currentAnalysisType = "combined";
let currentCodeHash = "";
let selectedTab = "combined"; // Track which tab is selected
let analysisHistory = []; // Store past analyses

// ============================================================================
// HASH FUNCTION - Detect code changes
// ============================================================================

function hashCode(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return hash.toString(36);
}

// ============================================================================
// STORAGE FUNCTIONS - Cache & History Management
// ============================================================================

function getCacheKey(codeHash) {
  return `codeAnalysisResults_${codeHash}`;
}

function loadCacheMetadata() {
  try {
    return {
      hash: localStorage.getItem("lastAnalyzedCodeHash") || "",
      timestamp: parseInt(localStorage.getItem("lastAnalysisTimestamp")) || 0,
    };
  } catch (e) {
    console.warn("Could not load metadata:", e);
    return { hash: "", timestamp: 0 };
  }
}

function loadCachedResultsForCode(codeHash) {
  try {
    const cacheKey = getCacheKey(codeHash);
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      const results = JSON.parse(cached);
      console.log(`✓ Loaded cached results for hash: ${codeHash}`);
      return results;
    }
  } catch (e) {
    console.warn("Could not load cached results:", e);
  }
  return null;
}

function saveResultsToCache(codeHash, results) {
  try {
    const cacheKey = getCacheKey(codeHash);
    // Sanitize mermaid before storing
    if (results && results.mermaid) {
      results.mermaid = sanitizeMermaidCode(results.mermaid);
    }
    localStorage.setItem(cacheKey, JSON.stringify(results));
    localStorage.setItem("lastAnalyzedCodeHash", codeHash);
    localStorage.setItem("lastAnalysisTimestamp", Date.now().toString());

    // Add to history
    const historyKey = "analysisHistory";
    let history = [];
    try {
      history = JSON.parse(localStorage.getItem(historyKey) || "[]");
    } catch (e) {}

    // Add new entry and keep only last 10
    history.unshift({
      hash: codeHash,
      timestamp: Date.now(),
      summary: results.summary?.substring(0, 50) + "...",
    });
    history = history.slice(0, 10);
    localStorage.setItem(historyKey, JSON.stringify(history));

    console.log(`✓ Results cached for hash: ${codeHash}`);
  } catch (e) {
    console.warn("Could not cache results:", e);
  }
}

function loadAnalysisHistory() {
  try {
    const historyKey = "analysisHistory";
    const history = JSON.parse(localStorage.getItem(historyKey) || "[]");
    return history;
  } catch (e) {
    console.warn("Could not load history:", e);
    return [];
  }
}

function clearOldCache() {
  try {
    const keys = Object.keys(localStorage);
    const analysisKeys = keys.filter((k) =>
      k.startsWith("codeAnalysisResults_")
    );
    if (analysisKeys.length > 10) {
      analysisKeys.slice(0, -10).forEach((k) => localStorage.removeItem(k));
      console.log("✓ Old cache cleared");
    }
  } catch (e) {
    console.warn("Could not clear old cache:", e);
  }
}

// ============================================================================
// UI HELPER FUNCTIONS
// ============================================================================

function showLoading(message = "Analyzing...") {
  const statusEl = document.getElementById("status");
  const statusMsg = statusEl?.querySelector("p");
  if (statusMsg) statusMsg.textContent = message;
  statusEl?.classList.remove("hidden");
}

function hideLoading() {
  const statusEl = document.getElementById("status");
  statusEl?.classList.add("hidden");
}

function showError(message) {
  hideLoading();
  const errorEl = document.getElementById("error");
  if (errorEl) {
    errorEl.textContent = "❌ " + message;
    errorEl.classList.remove("hidden");
  }
}

function hideError() {
  const errorEl = document.getElementById("error");
  errorEl?.classList.add("hidden");
}

function showResults() {
  const resultsEl = document.getElementById("results");
  const initialEl = document.getElementById("initial-state");
  resultsEl?.classList.remove("hidden");
  initialEl?.classList.add("hidden");
  hideError();
}

function showResultsForTab(tabType) {
  // Hide all sections
  document.querySelectorAll("section").forEach((s) => {
    s.style.display = "none";
  });

  // Show only selected section
  if (tabType === "summary") {
    const section = document.querySelector("section:nth-of-type(1)");
    if (section) section.style.display = "block";
  } else if (tabType === "complexity") {
    const section = document.querySelector("section:nth-of-type(2)");
    if (section) section.style.display = "block";
  } else if (tabType === "flowchart") {
    const section = document.querySelector("section:nth-of-type(3)");
    if (section) section.style.display = "block";
  } else {
    // combined - show all
    document.querySelectorAll("section").forEach((s) => {
      s.style.display = "block";
    });
  }
}

function updateTabHighlight(activeTab) {
  selectedTab = activeTab;
  document.querySelectorAll(".btn-type").forEach((btn) => {
    btn.classList.remove("active");
  });

  if (activeTab === "summary") {
    document.getElementById("btn-summary")?.classList.add("active");
  } else if (activeTab === "complexity") {
    document.getElementById("btn-complexity")?.classList.add("active");
  } else if (activeTab === "flowchart") {
    document.getElementById("btn-flowchart")?.classList.add("active");
  } else {
    document.getElementById("btn-combined")?.classList.add("active");
  }
}

// ============================================================================
// DISPLAY FUNCTIONS
// ============================================================================

function renderMarkdown(text) {
  if (!text || typeof text !== "string") return "<p>No content</p>";

  let html = text
    .replace(/^### (.+)$/gm, "<h3>$1</h3>")
    .replace(/^## (.+)$/gm, "<h2>$1</h2>")
    .replace(/^# (.+)$/gm, "<h1>$1</h1>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/`(.+?)`/g, "<code>$1</code>")
    .replace(/\n\n/g, "</p><p>")
    .replace(/\n/g, "<br>");

  return "<p>" + html + "</p>";
}

function sanitizeMermaidCode(mermaidCode) {
  if (!mermaidCode || typeof mermaidCode !== "string") return mermaidCode;
  // Enclose every node label in double quotes for both [label] and {label} blocks
  let safe = mermaidCode.replace(
    /([A-Za-z0-9_]+)\[([^\]]+)\]/g,
    function (match, node, label) {
      let cleanLabel = label.replace(/"/g, "'"); // Avoid nested quotes
      return `${node}["${cleanLabel}"]`;
    }
  );
  safe = safe.replace(
    /([A-Za-z0-9_]+)\{([^\}]+)\}/g,
    function (match, node, label) {
      let cleanLabel = label.replace(/"/g, "'");
      return `${node}{"${cleanLabel}"}`;
    }
  );
  return safe;
}

// Patch displayMermaidChart to sanitize before rendering
function displayMermaidChart(mermaidCode) {
  const flowchartDiv = document.getElementById("flowchart-output");
  if (!flowchartDiv) return;

  // Sanitize code before rendering
  const safeMermaid = sanitizeMermaidCode(mermaidCode);

  if (!safeMermaid || safeMermaid.length === 0) {
    flowchartDiv.innerHTML =
      '<div class="mermaid">graph TD\n  A[No flowchart available]</div>';
  } else {
    flowchartDiv.innerHTML = `<div class="mermaid">${safeMermaid}</div>`;
  }

  // Initialize mermaid after setting content
  setTimeout(() => {
    if (typeof mermaid !== "undefined") {
      try {
        mermaid.initialize({ startOnLoad: true, theme: "default" });
        mermaid.run();
        console.log("✓ Mermaid rendered successfully");
      } catch (e) {
        console.warn("Mermaid render error:", e);
      }
    }
  }, 100);
}

function displayComplexity(complexityText) {
  const html = renderMarkdown(complexityText);
  const elem = document.getElementById("complexity-output");
  if (elem) elem.innerHTML = html;
  console.log("✓ Complexity displayed");
}

function displaySummary(summaryText) {
  const html = renderMarkdown(summaryText);
  const elem = document.getElementById("summary-output");
  if (elem) elem.innerHTML = html;
  console.log("✓ Summary displayed");
}

// ================= Translator Integration =================
// Translator variables
let translator = null;
let translatorTarget = "en"; // current target language for translation

function setTranslatorStatus(visible, text) {
  const status = document.getElementById("translator-status");
  if (!status) return;
  if (visible) {
    status.style.display = "block";
    status.textContent = text || "Translating…";
  } else {
    status.style.display = "none";
    status.textContent = "";
  }
}

async function ensureTranslator(targetLang) {
  if (targetLang === "en") return null; // no translator needed for English
  if (typeof Translator === "undefined") {
    console.warn("Translator API not available in this browser");
    return null;
  }

  if (translator && translatorTarget === targetLang) return translator;

  try {
    setTranslatorStatus(true, "Checking translator availability…");
    const avail = await Translator.availability({
      sourceLanguage: "en",
      targetLanguage: targetLang,
    });
    console.log("Translator availability:", avail);

    if (
      avail === "downloadable" ||
      avail === "after-download" ||
      avail === "downloading"
    ) {
      setTranslatorStatus(true, "Downloading translation model…");
    }

    translator = await Translator.create({
      sourceLanguage: "en",
      targetLanguage: targetLang,
      monitor(m) {
        m.addEventListener("downloadprogress", (e) => {
          let percent = Math.floor((e.loaded || 0) * 100);
          setTranslatorStatus(true, `Downloading model ${percent}%`);
        });
      },
    });

    translatorTarget = targetLang;
    setTranslatorStatus(false);
    return translator;
  } catch (e) {
    console.warn("Could not create translator:", e);
    setTranslatorStatus(false);
    return null;
  }
}

// ================= Translation Cache Helpers =================
function getTranslationCacheKey(codeHash, lang) {
  return `translation_${codeHash}_${lang}`;
}

function getTranslationFromCache(codeHash, lang) {
  try {
    const key = getTranslationCacheKey(codeHash, lang);
    const stored = localStorage.getItem(key);
    if (!stored) return null;
    const payload = JSON.parse(stored);
    // optional: verify timestamp freshness (not implemented)
    return payload.text || null;
  } catch (e) {
    console.warn("Could not read translation cache:", e);
    return null;
  }
}

function saveTranslationToCache(codeHash, lang, text) {
  try {
    const key = getTranslationCacheKey(codeHash, lang);
    const payload = { text: text, ts: Date.now() };
    localStorage.setItem(key, JSON.stringify(payload));
  } catch (e) {
    console.warn("Could not save translation cache:", e);
  }
}

async function translateAndDisplaySummary(targetLang) {
  const summaryElem = document.getElementById("summary-output");
  if (!summaryElem) return;
  // If no summary generated yet, nothing to translate
  if (!globalSummary || globalSummary.trim().length === 0) return;

  if (targetLang === "en") {
    // Show original English summary
    displaySummary(globalSummary);
    return;
  }

  // Try cache first
  const cached = getTranslationFromCache(currentCodeHash, targetLang);
  if (cached) {
    const html = renderMarkdown(cached);
    summaryElem.innerHTML = html;
    console.log("✓ Loaded translated summary from cache for", targetLang);
    return;
  }

  const tr = await ensureTranslator(targetLang);
  if (!tr) {
    // Translator not available - show message inline
    setTranslatorStatus(true, "Translation not available in this browser");
    setTimeout(() => setTranslatorStatus(false), 3000);
    return;
  }

  try {
    setTranslatorStatus(true, "Translating…");
    const translated = await tr.translate(globalSummary);
    // Save to cache
    try {
      saveTranslationToCache(currentCodeHash, targetLang, translated);
    } catch (e) {
      console.warn("Could not cache translation:", e);
    }
    // Render the translated text (it's plain text; use renderMarkdown for formatting)
    const html = renderMarkdown(translated);
    summaryElem.innerHTML = html;
    setTranslatorStatus(false);
  } catch (e) {
    console.error("Translation failed:", e);
    setTranslatorStatus(true, "Translation failed");
    setTimeout(() => setTranslatorStatus(false), 2500);
  }
}

function displayCachedResults(results) {
  console.log("🔄 Displaying cached results (instant)...");

  if (results.summary) {
    globalSummary = results.summary;
    displaySummary(results.summary);
  }

  if (results.complexity) {
    globalComplexity = results.complexity;
    displayComplexity(results.complexity);
  }

  if (results.mermaid) {
    globalMermaidCode = results.mermaid;
    displayMermaidChart(results.mermaid);
  }

  showResults();
  showResultsForTab(selectedTab);
}

function renderHistoryPanel() {
  // Load and display history
  const history = loadAnalysisHistory();
  const historyPanel = document.getElementById("history-panel");
  const historyList = document.getElementById("history-list");

  if (!historyPanel || !historyList) return;

  if (history.length === 0) {
    historyPanel.classList.add("hidden");
    return;
  }

  historyPanel.classList.remove("hidden");
  historyList.innerHTML = "";

  history.forEach((item, index) => {
    const timeAgo = getTimeAgo(item.timestamp);
    const historyItem = document.createElement("div");
    historyItem.className = "history-item";
    historyItem.innerHTML = `
      <div class="history-item-text" title="${item.summary}">
        📄 ${item.summary || "Code analysis"}
      </div>
      <div class="history-item-time">${timeAgo}</div>
    `;

    historyItem.addEventListener("click", () => {
      // Re-run analysis for this code hash
      console.log("🔄 Re-running analysis for hash:", item.hash);
      const cachedResults = loadCachedResultsForCode(item.hash);
      if (cachedResults) {
        currentCodeHash = item.hash;
        displayCachedResults(cachedResults);
        showResultsForTab(selectedTab);
      }
    });

    historyList.appendChild(historyItem);
  });

  // Add clear history button
  const clearBtn = document.createElement("button");
  clearBtn.className = "btn-secondary";
  clearBtn.textContent = "🗑️ Clear History";
  clearBtn.style.width = "100%";
  clearBtn.style.marginTop = "8px";
  clearBtn.style.padding = "8px";
  clearBtn.addEventListener("click", () => {
    localStorage.removeItem("analysisHistory");
    historyPanel.classList.add("hidden");
    console.log("✓ History cleared");
  });
  historyList.parentElement.appendChild(clearBtn);
}

function getTimeAgo(timestamp) {
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return "now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

// ============================================================================
// PARSING FUNCTIONS
// ============================================================================

function parseMermaid(response) {
  console.log("Parsing Mermaid from response...");

  // Try markdown code block
  const match = response.match(/```mermaid\n([\s\S]*?)\n```/);
  if (match && match[1]) {
    console.log("✓ Found mermaid code block");
    return match[1].trim();
  }

  // Try inline mermaid
  const graphMatch = response.match(
    /(graph\s+[A-Z]{2}|flowchart\s+[A-Z]{2})([\s\S]*?)(?=\n\n|$)/
  );
  if (graphMatch) {
    console.log("✓ Found inline mermaid definition");
    return graphMatch[0].trim();
  }

  console.warn("⚠️ Could not parse mermaid code");
  return "";
}

function parseJSONAnalysis(jsonResponse) {
  console.log("Parsing unified JSON response...");
  try {
    let jsonText = jsonResponse;
    const jsonMatch = jsonResponse.match(/```json\n([\s\S]*?)\n```/);
    if (jsonMatch && jsonMatch[1]) {
      jsonText = jsonMatch[1];
    }

    const analysis = JSON.parse(jsonText);
    console.log("✓ Successfully parsed JSON response");
    return {
      summary: analysis.summary || "",
      complexity: analysis.complexity || "",
      mermaid: analysis.flowchart || "",
    };
  } catch (e) {
    console.error("Could not parse JSON response:", e);
    return null;
  }
}

// ============================================================================
// PROMPT DEFINITIONS - With language specification
// ============================================================================

function getUnifiedPrompt(code, analysisType) {
  // Add language specification to all prompts (fixes "No output language" error)
  const languageHeader = "You must respond in English. Output language: en\n\n";

  if (analysisType === "combined" || analysisType === "all") {
    return (
      languageHeader +
      `You are a code analysis expert. Analyze the following code and provide a structured analysis in JSON format.

CODE TO ANALYZE:
\`\`\`
${code}
\`\`\`

Provide your response as valid JSON (no markdown formatting) with these exact fields:
{
  "summary": "A concise one-paragraph summary of what this code does in 2-3 sentences",
  "complexity": "Big O analysis - start with 'Time: O(...)\\nSpace: O(...)' followed by a brief explanation",
  "flowchart": "A Mermaid.js (v10.9.4) flowchart in 'graph TD' format.STRICT RULES: 1. Node names must only contain letters, numbers, underscores, and spaces.
2. Do NOT use brackets, parentheses, %, &, or any other special characters in node names.
3. Use arrows and simple node connections only (no nested or complex syntax).
4. If the code contains complex expressions, summarize them in plain English (e.g., write “check if x is greater than y” instead of “if (x > y)”, "value of the ith position in array" instead of "array[i]", "call function p for i, j" instead of "p(i, j)", "loop from a to b" instead of "for (let i = a; i < b; i++)").
5. Include all major logic branches (conditions, loops, returns, etc.).
6. Keep the diagram clean, simple, and easy to understand.
7. Example node description style:
- Start process
- Check if input is valid
- Set ith value of array to zero
- Print result and end
  
}

IMPORTANT:
- Make summary clear and concise.
- Include exact Big O notation for both time and space.
- Flowchart must use only valid Mermaid node names (letters, numbers, underscores, spaces), no brackets, parentheses, %, &, or special characters. Summarize complex logic in plain English node names. Output ONLY valid JSON, no extra text.`
    );
  }

  if (analysisType === "summary") {
    return (
      languageHeader +
      `Provide a concise one-paragraph summary of this code in 2-3 sentences. Be clear and direct.

CODE:
\`\`\`
${code}
\`\`\`

Summary:`
    );
  }

  if (analysisType === "complexity") {
    return (
      languageHeader +
      `Analyze the time and space complexity of this code using Big O notation. Format as:
Time: O(...)
Space: O(...)

Then provide a brief explanation.

CODE:
\`\`\`
${code}
\`\`\`

Analysis:`
    );
  }

  if (analysisType === "flowchart") {
    return (
      languageHeader +
      `Create a Mermaid.js (version 10.9.4) flowchart in 'graph TD' format for this code.

CODE:
\`\`\`
${code}
\`\`\`

Important:
- Start with graph TD.
- STRICT RULES: {1. Node names must only contain letters, numbers, underscores, and spaces., 2. Do NOT use brackets, parentheses, %, &, or any other special characters in node names., 3. Use arrows and simple node connections only (no nested or complex syntax)., 4. If the code contains complex expressions, summarize them in plain English (e.g., write “check if x is greater than y” instead of “if (x > y)”, "value of the ith position in array" instead of "array[i]", "call function p for i, j" instead of "p(i, j)", "loop from a to b" instead of "for (let i = a; i < b; i++)", "print the value at i, j of mat" instead of "cout << mat[i][j]")., 5. Include all major logic branches (conditions, loops, returns, etc.)., 6. Keep the diagram clean, simple, and easy to understand., 7. Example node description style:- Start process, - Check if input is valid, - Set ith value of array to zero, - Print result and end}

Flowchart:`
    );
  }
}

// ============================================================================
// MAIN ANALYSIS FUNCTION
// ============================================================================

async function runAnalysis(type = "combined", forceRerun = false) {
  console.log(`=== Starting ${type} Analysis ===`);
  currentAnalysisType = type;
  updateTabHighlight(type);

  // 1. Check for LanguageModel API
  if (
    typeof LanguageModel === "undefined" ||
    !LanguageModel.availability ||
    !LanguageModel.create
  ) {
    showError(
      "LanguageModel API not found. Please:\n1. Use Chrome 140+\n2. Go to chrome://flags and enable: #prompt-api-for-gemini-nano-multimodal-input\n3. Go to chrome://components and update: On-Device Model"
    );
    return;
  }

  console.log("✓ LanguageModel found");

  // 2. Check availability
  let availability;
  try {
    availability = await LanguageModel.availability();
    console.log("Availability status:", availability);
  } catch (e) {
    console.warn("Could not check availability:", e);
    showError("Could not check AI model availability: " + e.message);
    return;
  }

  // Only stop if it's truly "unavailable"
  if (availability === "unavailable" || availability === "no") {
    showError(
      `AI Model is not available.\n\nFIX:\n1. chrome://settings/ai → Enable "Use AI"\n2. chrome://components → Update "On-Device Model"\n3. Restart Chrome`
    );
    return;
  }

  // Check if a download is needed
  const isDownloadNeeded =
    availability === "downloadable" ||
    availability === "after-download" ||
    availability === "downloading";

  if (isDownloadNeeded) {
    console.log("Model is not local. create() will trigger/await download.");
  }

  // 3. Get code from storage
  let selectedCode;
  try {
    const data = await chrome.storage.local.get(["selectedCode"]);
    selectedCode = data.selectedCode;
    console.log("Code retrieved. Length:", selectedCode?.length || 0);
  } catch (e) {
    console.error("Error getting code:", e);
    showError("Error retrieving code: " + e.message);
    return;
  }

  if (!selectedCode || selectedCode.trim().length === 0) {
    showError(
      "No code selected.\n\nTo use CodeScope:\n1. Select code on any webpage\n2. Right-click\n3. Click 'Analyze Code with AI'"
    );
    return;
  }

  // 4. Check if code changed
  currentCodeHash = hashCode(selectedCode);
  const metadata = loadCacheMetadata();

  // If same code and not forced, load cached results instantly
  if (!forceRerun && currentCodeHash === metadata.hash) {
    console.log("✓ Same code detected - loading cached results");
    const cachedResults = loadCachedResultsForCode(currentCodeHash);
    if (cachedResults) {
      displayCachedResults(cachedResults);
      return;
    }
  }

  // 5. New analysis needed
  console.log("⚡ Running new analysis...");
  showResults();
  showResultsForTab(type);

  // Show a specific download message if needed
  if (isDownloadNeeded) {
    showLoading("Downloading AI Model (can take a few min)...");
  } else {
    showLoading(`⚡ Generating ${type}...`);
  }

  try {
    // Create session - This will trigger the download if needed
    const session = await LanguageModel.create({
      monitor(m) {
        m.addEventListener("downloadprogress", (e) => {
          // e.loaded is a value from 0 to 1
          let percent = Math.floor(e.loaded * 100);
          console.log(`Model downloading: ${percent}%`);

          if (e.loaded < 1) {
            showLoading(`Downloading AI Model: ${percent}%`);
          } else {
            // Download is 100%, now it's loading into memory
            showLoading("Model downloaded. Preparing session...");
          }
        });
      },
    });

    if (!session) {
      showError(
        "Failed to create LanguageModel session. Try refreshing and try again."
      );
      return;
    }

    console.log("✓ Session created");

    // Now that the download is done, show the analysis message
    showLoading(`⚡ Generating ${type}...`);

    // Run combined analysis (faster)
    if (type === "combined") {
      const prompt = getUnifiedPrompt(selectedCode, type);
      const result = await session.prompt(prompt);

      const parsed = parseJSONAnalysis(result);

      if (parsed) {
        globalSummary = parsed.summary;
        globalComplexity = parsed.complexity;
        globalMermaidCode = parsed.mermaid;

        displaySummary(globalSummary);
        displayComplexity(globalComplexity);
        displayMermaidChart(globalMermaidCode);

        saveResultsToCache(currentCodeHash, {
          summary: globalSummary,
          complexity: globalComplexity,
          mermaid: globalMermaidCode,
        });

        showLoading("✨ Complete!");
        setTimeout(() => hideLoading(), 800);
      } else {
        showError(
          "Failed to parse AI response. Please try a different code snippet."
        );
      }
    } else {
      // Individual analysis
      const prompt = getUnifiedPrompt(selectedCode, type);
      const result = await session.prompt(prompt);

      if (type === "summary") {
        globalSummary = result;
        displaySummary(result);
      } else if (type === "complexity") {
        globalComplexity = result;
        displayComplexity(result);
      } else if (type === "flowchart") {
        globalMermaidCode = parseMermaid(result);
        displayMermaidChart(globalMermaidCode);
      }

      saveResultsToCache(currentCodeHash, {
        summary: globalSummary,
        complexity: globalComplexity,
        mermaid: globalMermaidCode,
      });

      showLoading("✨ Complete!");
      setTimeout(() => hideLoading(), 800);
    }
  } catch (error) {
    console.error("Error during analysis:", error);
    showError("Error: " + (error.message || "Unknown error"));
  }

  clearOldCache();
}

// ============================================================================
// EVENT LISTENERS
// ============================================================================

document.addEventListener("DOMContentLoaded", async () => {
  console.log("🚀 CodeScope popup loaded");

  // Get analysis type and force flag
  const data = await chrome.storage.local.get([
    "analysisType",
    "forceNewAnalysis",
  ]);
  const analysisType = data.analysisType || "combined";
  const forceRerun = data.forceNewAnalysis === true;

  // Clear force flag
  if (forceRerun) {
    chrome.storage.local.set({ forceNewAnalysis: false });
  }

  console.log(`Analysis type: ${analysisType}, Force rerun: ${forceRerun}`);

  // Setup tab buttons
  const summaryBtn = document.getElementById("btn-summary");
  const complexityBtn = document.getElementById("btn-complexity");
  const flowchartBtn = document.getElementById("btn-flowchart");
  const combinedBtn = document.getElementById("btn-combined");

  // Tab click handlers - force rerun when user clicks
  if (summaryBtn) {
    summaryBtn.addEventListener("click", () => {
      updateTabHighlight("summary");
      showResultsForTab("summary");
      showLoading("🔄 Generating summary...");
      runAnalysis("summary", true);
    });
  }

  if (complexityBtn) {
    complexityBtn.addEventListener("click", () => {
      updateTabHighlight("complexity");
      showResultsForTab("complexity");
      showLoading("🔄 Generating complexity...");
      runAnalysis("complexity", true);
    });
  }

  if (flowchartBtn) {
    flowchartBtn.addEventListener("click", () => {
      updateTabHighlight("flowchart");
      showResultsForTab("flowchart");
      showLoading("🔄 Generating flowchart...");
      runAnalysis("flowchart", true);
    });
  }

  if (combinedBtn) {
    combinedBtn.addEventListener("click", () => {
      updateTabHighlight("combined");
      showResultsForTab("combined");
      showLoading("🔄 Running full analysis...");
      runAnalysis("combined", true);
    });
  }

  // Copy buttons
  const copySummaryBtn = document.getElementById("copy-summary");
  if (copySummaryBtn) {
    copySummaryBtn.addEventListener("click", async () => {
      // Copy displayed summary (translated if selected) or original
      const langSelect = document.getElementById("summary-lang-select");
      let textToCopy = globalSummary || "";
      if (langSelect && langSelect.value !== "en") {
        const summaryElem = document.getElementById("summary-output");
        if (summaryElem) textToCopy = summaryElem.innerText || textToCopy;
      }
      if (!textToCopy) {
        alert("No summary to copy.");
        return;
      }
      try {
        await navigator.clipboard.writeText(textToCopy);
        const originalText = copySummaryBtn.textContent;
        copySummaryBtn.textContent = "✓ Copied!";
        setTimeout(() => {
          copySummaryBtn.textContent = originalText;
        }, 2000);
      } catch (err) {
        console.error("Failed to copy:", err);
      }
    });
  }

  const copyComplexityBtn = document.getElementById("copy-complexity");
  if (copyComplexityBtn) {
    copyComplexityBtn.addEventListener("click", async () => {
      if (!globalComplexity) {
        alert("No complexity analysis to copy.");
        return;
      }
      try {
        await navigator.clipboard.writeText(globalComplexity);
        const originalText = copyComplexityBtn.textContent;
        copyComplexityBtn.textContent = "✓ Copied!";
        setTimeout(() => {
          copyComplexityBtn.textContent = originalText;
        }, 2000);
      } catch (err) {
        console.error("Failed to copy:", err);
      }
    });
  }

  const copyMermaidBtn = document.getElementById("copy-mermaid");
  if (copyMermaidBtn) {
    copyMermaidBtn.addEventListener("click", async () => {
      if (!globalMermaidCode) {
        alert("No flowchart code to copy.");
        return;
      }
      try {
        await navigator.clipboard.writeText(globalMermaidCode);
        const originalText = copyMermaidBtn.textContent;
        copyMermaidBtn.textContent = "✓ Copied!";
        setTimeout(() => {
          copyMermaidBtn.textContent = originalText;
        }, 2000);
      } catch (err) {
        console.error("Failed to copy:", err);
      }
    });
  }

  // Start analysis
  runAnalysis(analysisType, forceRerun);

  // Render history panel
  renderHistoryPanel();

  // Setup translation dropdown
  const langSelect = document.getElementById("summary-lang-select");
  if (langSelect) {
    // default to English
    langSelect.value = "en";
    langSelect.addEventListener("change", async (e) => {
      const target = e.target.value || "en";
      await translateAndDisplaySummary(target);
    });
  }

  // If a summary is already present (from cache), translate it to selected language
  const selectedLang =
    (document.getElementById("summary-lang-select") || {}).value || "en";
  if (selectedLang && selectedLang !== "en") {
    translateAndDisplaySummary(selectedLang);
  }
});
