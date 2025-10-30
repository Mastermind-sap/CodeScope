// ============================================================================
// POPUP SCRIPT - Code AI Analyzer (Optimized)
// ============================================================================

let globalMermaidCode = "";
let globalSummary = "";
let globalComplexity = "";
let currentAnalysisType = "combined";

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function showLoading(message = "Analyzing...") {
  const statusEl = document.getElementById("status");
  const statusMsg = statusEl.querySelector("p");
  if (statusMsg) statusMsg.textContent = message;
  statusEl.classList.remove("hidden");
}

function hideLoading() {
  const statusEl = document.getElementById("status");
  statusEl.classList.add("hidden");
}

function showError(message) {
  hideLoading();
  const errorEl = document.getElementById("error");
  errorEl.textContent = "❌ " + message;
  errorEl.classList.remove("hidden");
}

function hideError() {
  const errorEl = document.getElementById("error");
  errorEl.classList.add("hidden");
}

function showResults() {
  const resultsEl = document.getElementById("results");
  const initialEl = document.getElementById("initial-state");
  resultsEl.classList.remove("hidden");
  initialEl.classList.add("hidden");
  hideError();
}

function loadCachedResults() {
  try {
    const cached = localStorage.getItem("codeAnalysisResults");
    if (cached) {
      const results = JSON.parse(cached);
      globalSummary = results.summary || "";
      globalComplexity = results.complexity || "";
      globalMermaidCode = results.mermaid || "";

      if (globalSummary) {
        document.getElementById("summary-output").innerHTML = globalSummary;
      }
      if (globalComplexity) {
        document.getElementById("complexity-output").innerHTML =
          globalComplexity;
      }
      if (globalMermaidCode) {
        displayMermaidChart(globalMermaidCode);
      }

      showResults();
      hideLoading();
      console.log("✓ Loaded cached results");
      return true;
    }
  } catch (e) {
    console.warn("Could not load cached results:", e);
  }
  return false;
}

function cacheResults() {
  try {
    localStorage.setItem(
      "codeAnalysisResults",
      JSON.stringify({
        summary: globalSummary,
        complexity: globalComplexity,
        mermaid: globalMermaidCode,
      })
    );
    console.log("✓ Results cached");
  } catch (e) {
    console.warn("Could not cache results:", e);
  }
}

function renderMarkdown(text) {
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

function displayMermaidChart(mermaidCode) {
  const flowchartDiv = document.getElementById("flowchart-output");
  flowchartDiv.innerHTML = `<div class="mermaid">\n${mermaidCode}\n</div>`;
  setTimeout(() => {
    if (typeof mermaid !== "undefined") {
      try {
        mermaid.contentLoaded();
        console.log("✓ Mermaid rendered");
      } catch (e) {
        console.warn("Mermaid render error:", e);
      }
    }
  }, 100);
}

function displayComplexity(complexityText) {
  const html = renderMarkdown(complexityText);
  document.getElementById("complexity-output").innerHTML = html;
  console.log("✓ Complexity displayed");
}

function displaySummary(summaryText) {
  const html = renderMarkdown(summaryText);
  document.getElementById("summary-output").innerHTML = html;
  console.log("✓ Summary displayed");
}

function parseMermaid(response) {
  console.log("Parsing Mermaid from response...");
  const match = response.match(/```mermaid\n([\s\S]*?)\n```/);
  if (match && match[1]) {
    console.log("✓ Found mermaid code block");
    return match[1].trim();
  }

  const graphMatch = response.match(
    /(graph\s+[A-Z]{2}|flowchart\s+[A-Z]{2})([\s\S]*?)(?=\n\n|$)/
  );
  if (graphMatch) {
    console.log("✓ Found inline mermaid definition");
    return graphMatch[0].trim();
  }

  console.warn("⚠️ Could not parse mermaid code");
  return "graph TD\n  A[Error: Could not generate flowchart]";
}

// ============================================================================
// MAIN ANALYSIS FUNCTION
// ============================================================================

async function runAnalysis(type = "combined") {
  console.log(`=== Starting ${type} Code Analysis ===`);
  currentAnalysisType = type;

  // 1. Check for LanguageModel API
  if (typeof LanguageModel === "undefined") {
    showError(
      "LanguageModel API not found. Please ensure:\n1. Chrome 140+\n2. AI flag enabled: chrome://flags\n3. Model downloaded: chrome://components"
    );
    return;
  }

  console.log("✓ LanguageModel found");

  // 2. Check availability
  let availability;
  try {
    availability = await LanguageModel.availability?.();
    console.log("Availability status:", availability);
  } catch (e) {
    console.warn("Could not check availability:", e);
  }

  if (availability === "no" || availability === "after-download") {
    showError(
      `AI Model not ready. Status: ${availability}\n\nGo to:\n1. chrome://settings/ai → Turn ON 'Use AI'\n2. chrome://components → Update 'On-Device Model'\n3. Restart Chrome`
    );
    return;
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
      "No code selected. Please:\n1. Highlight code on a webpage\n2. Right-click\n3. Select analysis type from 'Analyze Code with AI'"
    );
    return;
  }

  showLoading("🔄 Creating AI session...");
  showResults(); // Show results section immediately

  try {
    // 4. Create session
    const session = await LanguageModel.create?.();

    if (!session) {
      showError(
        "Failed to create LanguageModel session. Try refreshing the page."
      );
      return;
    }

    console.log("✓ Session created");

    // 5. Prepare prompts
    const prompts = {};

    if (type === "combined" || type === "summary") {
      prompts.summary = `Summarize this code in one paragraph:\n\n${selectedCode}`;
    }

    if (type === "combined" || type === "complexity") {
      prompts.complexity = `Analyze the Big O time and space complexity of this code. Provide brief explanation:\n\n${selectedCode}`;
    }

    if (type === "combined" || type === "flowchart") {
      prompts.flowchart = `Create a Mermaid.js flowchart in 'graph TD' format for this code. Only output the Mermaid code inside a single markdown code block:\n\n${selectedCode}`;
    }

    // 6. Run prompts and show results as they complete
    console.log("Running prompts...");
    showLoading("⚡ Generating analysis...");

    const promptKeys = Object.keys(prompts);
    const promptPromises = promptKeys.map(async (key) => {
      try {
        showLoading(`⚡ Generating ${key}...`);
        const result = await session.prompt(prompts[key]);
        console.log(`✓ ${key} received`);

        if (key === "summary") {
          globalSummary = result;
          displaySummary(result);
        } else if (key === "complexity") {
          globalComplexity = result;
          displayComplexity(result);
        } else if (key === "flowchart") {
          globalMermaidCode = parseMermaid(result);
          displayMermaidChart(globalMermaidCode);
        }

        return { key, result };
      } catch (e) {
        console.error(`Error in ${key}:`, e);
        throw e;
      }
    });

    // Wait for all prompts to complete
    await Promise.all(promptPromises);

    console.log("✓ All prompts completed");
    showLoading("✨ Complete!");

    // Cache results
    cacheResults();

    setTimeout(() => {
      hideLoading();
    }, 800);
  } catch (error) {
    console.error("Error during analysis:", error);
    showError("Error: " + (error.message || "Unknown error"));
  }
}

// ============================================================================
// EVENT LISTENERS
// ============================================================================

document.addEventListener("DOMContentLoaded", async () => {
  console.log("DOM Content Loaded");

  // Get analysis type from context menu
  const data = await chrome.storage.local.get(["analysisType"]);
  const analysisType = data.analysisType || "combined";

  // Load cached results first
  const hasCached = loadCachedResults();

  // Analysis type buttons
  const summaryBtn = document.getElementById("btn-summary");
  const complexityBtn = document.getElementById("btn-complexity");
  const flowchartBtn = document.getElementById("btn-flowchart");
  const combinedBtn = document.getElementById("btn-combined");

  // Set active button
  [summaryBtn, complexityBtn, flowchartBtn, combinedBtn].forEach((btn) => {
    if (btn) btn.classList.remove("active");
  });
  if (analysisType === "summary" && summaryBtn)
    summaryBtn.classList.add("active");
  if (analysisType === "complexity" && complexityBtn)
    complexityBtn.classList.add("active");
  if (analysisType === "flowchart" && flowchartBtn)
    flowchartBtn.classList.add("active");
  if (analysisType === "combined" && combinedBtn)
    combinedBtn.classList.add("active");

  if (summaryBtn) {
    summaryBtn.addEventListener("click", () => {
      showLoading("🔄 Analyzing summary...");
      runAnalysis("summary");
    });
  }

  if (complexityBtn) {
    complexityBtn.addEventListener("click", () => {
      showLoading("🔄 Analyzing complexity...");
      runAnalysis("complexity");
    });
  }

  if (flowchartBtn) {
    flowchartBtn.addEventListener("click", () => {
      showLoading("🔄 Generating flowchart...");
      runAnalysis("flowchart");
    });
  }

  if (combinedBtn) {
    combinedBtn.addEventListener("click", () => {
      showLoading("🔄 Running full analysis...");
      runAnalysis("combined");
    });
  }

  // Copy Summary button
  const copySummaryBtn = document.getElementById("copy-summary");
  if (copySummaryBtn) {
    copySummaryBtn.addEventListener("click", async () => {
      if (!globalSummary) {
        alert("No summary to copy.");
        return;
      }
      try {
        await navigator.clipboard.writeText(globalSummary);
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

  // Copy Complexity button
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

  // Copy Mermaid button
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

  // Run analysis if no cached results
  if (!hasCached) {
    runAnalysis(analysisType);
  }
});
