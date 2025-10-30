// Content script for handling text selection on all websites
console.log("Content script loaded");

document.addEventListener(
  "contextmenu",
  (event) => {
    const selectedText = window.getSelection().toString().trim();
    if (selectedText && selectedText.length > 0) {
      console.log("Selected text:", selectedText.substring(0, 50));
    }
  },
  false
);
