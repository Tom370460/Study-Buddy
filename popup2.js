const apiKeyInput = document.getElementById('apiKey');
const saveBtn = document.getElementById('saveBtn');
const status = document.getElementById('status');
const autoToggle = document.getElementById('autoToggle');

// Load saved settings
chrome.storage.local.get(['apiKey', 'autoOpen'], (data) => {
  if (data.apiKey) {
    apiKeyInput.value = data.apiKey;
  }
  if (data.autoOpen) {
    autoToggle.classList.add('active');
  }
});

autoToggle.addEventListener('click', () => {
  autoToggle.classList.toggle('active');
  chrome.storage.local.set({ autoOpen: autoToggle.classList.contains('active') });
});

saveBtn.addEventListener('click', () => {
  const key = apiKeyInput.value.trim();

  if (!key.startsWith('sk-ant-')) {
    status.style.color = '#e06c6c';
    status.textContent = 'Invalid key format';
    return;
  }

  chrome.storage.local.set({ apiKey: key }, () => {
    status.style.color = '#4caf72';
    status.textContent = '✓ Saved! Open any page to chat.';
    setTimeout(() => { status.textContent = ''; }, 3000);
  });
});