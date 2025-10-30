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
    title: "📝 Summary Only",
    contexts: ["selection"],
  });

  chrome.contextMenus.create({
    id: "analyze-complexity",
    parentId: "code-analyzer-menu",
    title: "⚙️ Complexity Only",
    contexts: ["selection"],
  });

  chrome.contextMenus.create({
    id: "analyze-flowchart",
    parentId: "code-analyzer-menu",
    title: "📊 Flowchart Only",
    contexts: ["selection"],
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
  chrome.storage.local.set({
    selectedCode: selectedCode,
    analysisType: analysisType,
    timestamp: Date.now(),
  });

  // Open the popup window
  chrome.action.openPopup();
});
