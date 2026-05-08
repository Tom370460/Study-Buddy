// Claude Sidebar Extension - Content Script

(function() {
  if (document.getElementById('claude-ext-sidebar')) return; // Already injected

  let messages = [];
  let isOpen = false;
  let isLoading = false;

  // --- Build Sidebar HTML ---
  const sidebar = document.createElement('div');
  sidebar.id = 'claude-ext-sidebar';
  sidebar.innerHTML = `
    <div id="claude-ext-header">
      <div class="claude-ext-logo">✦</div>
      <div>
        <div class="claude-ext-title">Study Buddy</div>
        <div class="claude-ext-subtitle">Study Assistant</div>
      </div>
      <button id="claude-ext-clear" title="Clear conversation">Clear</button>
    </div>

    <div id="claude-ext-tabs" role="tablist" aria-label="Study Buddy tabs">
      <button class="claude-ext-tab active" role="tab" aria-selected="true" data-tab="chat">Chat</button>
      <button class="claude-ext-tab" role="tab" aria-selected="false" data-tab="notes">Notes</button>
    </div>

    <div id="claude-ext-tab-panels">
      <div class="claude-ext-panel active" id="claude-ext-panel-chat" role="tabpanel">
        <div id="claude-ext-context">
          <div class="claude-ext-context-dot"></div>
          <span id="claude-ext-context-text">${document.title || location.hostname}</span>
        </div>

        <div id="claude-ext-messages">
          <div id="claude-ext-empty">
            <div class="big-symbol">✦</div>
            <p>Ask me anything about this page,<br>or any question on your mind.</p>
          </div>
        </div>

        <div id="claude-ext-input-area">
          <div id="claude-ext-input-row">
            <textarea id="claude-ext-textarea" placeholder="Ask Study Buddy…" rows="1"></textarea>
            <button id="claude-ext-send">➤</button>
          </div>
          <div id="claude-ext-footer">POWERED BY CLAUDE · ANTHROPIC</div>
        </div>
      </div>

      <div class="claude-ext-panel" id="claude-ext-panel-notes" role="tabpanel" hidden>
        <div id="claude-ext-notes-area">
          <h3>Notes</h3>
          <textarea id="claude-ext-notes" placeholder="Write your notes here..."></textarea>
        </div>
      </div>
    </div>
  `;

  // Toggle tab
  const toggleBtn = document.createElement('button');
  toggleBtn.id = 'claude-ext-toggle';
  toggleBtn.textContent = 'Study Buddy';

  document.body.appendChild(sidebar);
  document.body.appendChild(toggleBtn);

  function toggleSidebar() {
    isOpen = !isOpen;
    sidebar.classList.toggle('open', isOpen);
    toggleBtn.classList.toggle('shifted', isOpen);
    if (isOpen) {
      const textarea = sidebar.querySelector('#claude-ext-textarea');
      if (textarea) textarea.focus();
    }
  }

  toggleBtn.addEventListener('click', toggleSidebar);

  // Auto-open if setting enabled
  chrome.storage.local.get(['autoOpen'], (data) => {
    if (data.autoOpen) setTimeout(toggleSidebar, 600);
  });

  // --- Tabs setup ---
  const tabs = sidebar.querySelectorAll('.claude-ext-tab');
  const panels = sidebar.querySelectorAll('.claude-ext-panel');

  function switchTab(tabName) {
    tabs.forEach(tab => {
      const active = tab.dataset.tab === tabName;
      tab.classList.toggle('active', active);
      tab.setAttribute('aria-selected', active ? 'true' : 'false');
    });

    panels.forEach(panel => {
      const active = panel.id === `claude-ext-panel-${tabName}`;
      panel.classList.toggle('active', active);
      panel.hidden = !active;
    });
  }

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      switchTab(tab.dataset.tab);
    });
  });

  // --- Messaging ---
  const messagesEl = sidebar.querySelector('#claude-ext-messages');
  const emptyEl = sidebar.querySelector('#claude-ext-empty');
  const textarea = sidebar.querySelector('#claude-ext-textarea');
  const sendBtn = sidebar.querySelector('#claude-ext-send');
  const clearBtn = sidebar.querySelector('#claude-ext-clear');
  const notesTextarea = sidebar.querySelector('#claude-ext-notes');

  function renderMessages() {
    emptyEl.style.display = messages.length === 0 ? 'flex' : 'none';

    // Remove all message elements (not empty div)
    Array.from(messagesEl.querySelectorAll('.claude-ext-msg')).forEach(el => el.remove());

    messages.forEach(msg => {
      const el = document.createElement('div');
      el.className = 'claude-ext-msg';
      if (msg.role === 'user') {
        el.classList.add('claude-ext-msg-user');
        el.textContent = msg.content;
      } else {
        el.classList.add('claude-ext-msg-claude');
        el.innerHTML = `
          <div class="claude-ext-msg-label">Claude</div>
          <div class="claude-ext-msg-body">${formatMarkdown(msg.content)}</div>
        `;
      }
      messagesEl.appendChild(el);
    });

    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function showTyping() {
    const el = document.createElement('div');
    el.className = 'claude-ext-msg claude-ext-msg-claude';
    el.id = 'claude-ext-typing-msg';
    el.innerHTML = `
      <div class="claude-ext-msg-label">Claude</div>
      <div class="claude-ext-typing">
        <span></span><span></span><span></span>
      </div>
    `;
    messagesEl.appendChild(el);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function hideTyping() {
    const el = document.getElementById('claude-ext-typing-msg');
    if (el) el.remove();
  }

  function formatMarkdown(text) {
    // Basic markdown: bold, italic, inline code, code blocks
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/```([\s\S]*?)```/g, (_, code) => `<pre><code>${code.trim()}</code></pre>`)
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/\n/g, '<br>');
  }

  function getPageContextAroundScroll(maxChars = 20000) {
    // 1. Get a long string of the whole page text
    const fullText = (document.documentElement.innerText || '')
      .replace(/\s+/g, ' ')
      .trim();

    if (!fullText) return '';

    // 2. Estimate “current position” as a rough character offset
    const winHeight = window.innerHeight;
    const docHeight = document.documentElement.scrollHeight;
    const scrollTop = window.scrollY;

    // Scroll position as a fraction of the full page
    const scrollFraction = docHeight > winHeight
      ? Math.max(0, Math.min(1, scrollTop / (docHeight - winHeight)))
      : 0;

    // Turn that fraction into a character index in the text
    const textLength = fullText.length;
    const centerIndex = Math.floor(scrollFraction * textLength);

    // 3. Take a window around the center (a bit above and below)
    const windowRadius = Math.floor(maxChars / 3); // roughly ⅓ before and after

    const start = Math.max(0, centerIndex - windowRadius);
    const end = Math.min(textLength, centerIndex + windowRadius);

    let excerpt = fullText.slice(start, end);

    if (start > 0)  excerpt = '[...] ' + excerpt;
    if (end < textLength) excerpt = excerpt + ' [...]';

    return excerpt;
  }

  async function sendMessage() {
    const text = textarea.value.trim();
    if (!text || isLoading) return;

    chrome.storage.local.get(['apiKey'], async (data) => {
      if (!data.apiKey) {
        alert('Please add your Anthropic API key by clicking the Claude extension icon in your toolbar.');
        return;
      }

      messages.push({ role: 'user', content: text });
      textarea.value = '';
      textarea.style.height = 'auto';
      isLoading = true;
      sendBtn.disabled = true;
      emptyEl.style.display = 'none';
      renderMessages();
      showTyping();

      // Build system prompt with page context
      const pageTitle = document.title;
      const pageUrl = location.href;
      const pageExcerpt = getPageContextAroundScroll(20000); // ≈20k chars window

      const systemPrompt = `You are Claude, a helpful AI assistant embedded as a sidebar on a webpage. You have context about the current page. You are to help to the best of your ability, however anything illegal or unethical should be denied. This does not include questions about quiz or other academic topics, as you are an assistant to students

Current page: "${pageTitle}"
URL: ${pageUrl}
Page content (excerpt):
${pageExcerpt}

Be concise and helpful. You can reference the page content when relevant.`;

      try {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': data.apiKey,
            'anthropic-version': '2023-06-01',
            'anthropic-dangerous-direct-browser-access': 'true'
          },
          body: JSON.stringify({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 1024,
            system: systemPrompt,
            messages: messages.map(m => ({ role: m.role, content: m.content }))
          })
        });

        const result = await response.json();

        if (result.error) {
          throw new Error(result.error.message || 'API error');
        }

        const reply = result.content?.[0]?.text || 'Sorry, I couldn’t get a response.';
        messages.push({ role: 'assistant', content: reply });
      } catch (err) {
        messages.push({ role: 'assistant', content: `⚠ Error: ${err.message}` });
      } finally {
        hideTyping();
        isLoading = false;
        sendBtn.disabled = false;
        renderMessages();
      }
    });
  }

  sendBtn.addEventListener('click', sendMessage);

  textarea.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  // Auto-resize textarea
  textarea.addEventListener('input', () => {
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
  });

  clearBtn.addEventListener('click', () => {
    messages = [];
    renderMessages();
  });

  // Right‑click “Explain with Claude” integration
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "CLAUDE_EXPLAIN_SELECTION" && message.text) {
      if (!isOpen) toggleSidebar();

      textarea.value = `Explain this text clearly:\n\n${message.text}`;
      textarea.style.height = 'auto';
      textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';

      // Optional: auto-send immediately
      sendMessage();
    }
  });

  // Switch to Chat tab by default when first opened
  switchTab('chat');

  renderMessages();
})();