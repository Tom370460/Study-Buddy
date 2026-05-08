// Background service worker for Claude Sidebar Extension
chrome.runtime.onInstalled.addListener(() => {
  console.log('Claude Sidebar Extension installed');
});
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "explain_with_claude",
    title: "Explain with Claude",
    contexts: ["selection"]
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== "explain_with_claude" || !info.selectionText) return;

  chrome.tabs.sendMessage(tab.id, {
    type: "CLAUDE_EXPLAIN_SELECTION",
    text: info.selectionText
  });
});