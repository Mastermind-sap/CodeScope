// Service Worker - Background script for context menu handling

chrome.runtime.onInstalled.addListener(() => {
  console.log("Code AI Analyzer extension installed!");

  // Parent menu item
  chrome.contextMenus.create({
    id: "code-analyzer-menu",
    title: "Analyze Code with AI",
    contexts: ["selection"],
  });

  // Sub-menu items for each analysis type
  chrome.contextMenus.create({
    id: "analyze-combined",
    parentId: "code-analyzer-menu",
    title: "🎯 Full Analysis",
    contexts: ["selection"],
  });

  chrome.contextMenus.create({
    id: "analyze-summary",
    parentId: "code-analyzer-menu",
    title: "📝 Summary",
    contexts: ["selection"],
  });

  chrome.contextMenus.create({
    id: "analyze-complexity",
    parentId: "code-analyzer-menu",
    title: "⚙️ Complexity",
    contexts: ["selection"],
  });

  chrome.contextMenus.create({
    id: "analyze-flowchart",
    parentId: "code-analyzer-menu",
    title: "📊 Flowchart",
    contexts: ["selection"],
  });
});

// Listen for extension icon clicks to open side panel
chrome.action.onClicked.addListener((tab) => {
  chrome.sidePanel.open({ tabId: tab.id }).catch((err) => {
    console.warn("Could not open side panel from action click:", err);
  });
});

// Listen for context menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
  const selectedCode = info.selectionText;
  let analysisType = "combined";

  if (info.menuItemId === "analyze-summary") {
    analysisType = "summary";
  } else if (info.menuItemId === "analyze-complexity") {
    analysisType = "complexity";
  } else if (info.menuItemId === "analyze-flowchart") {
    analysisType = "flowchart";
  }

  console.log(
    `Starting ${analysisType} analysis with selection:`,
    selectedCode.substring(0, 50) + "..."
  );

  // Store the selected code and analysis type in local storage (persistent)
  // Mark forceNewAnalysis as true so side panel knows to run fresh analysis
  chrome.storage.local.set({
    selectedCode: selectedCode,
    analysisType: analysisType,
    forceNewAnalysis: true,
    timestamp: Date.now(),
  });

  // Open the side panel for the current tab
  chrome.sidePanel.open({ tabId: tab.id }).catch((err) => {
    console.warn("Could not open side panel:", err);
    // Side panel will still get the data from storage when user opens it manually
  });
});
