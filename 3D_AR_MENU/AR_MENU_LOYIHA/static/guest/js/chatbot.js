/* chatbot.js — ARMENU AI ofitsiant yordamchi (M-13) */
(function() {
  'use strict';

  function openAIChat() {
    const lang = (window.ARMENU && window.ARMENU.lang) || 'uz';
    const greetings = {
      uz: "Assalomu alaykum! Men AI yordamchingizman. Taomlar, masalliqlar, kaloriyalar bo'yicha savollaringiz bo'lsa bering yoki taom tanlashda yordam so'rang!",
      ru: "Здравствуйте! Я ваш AI-помощник. Задавайте вопросы о блюдах, ингредиентах, калориях или попросите совета по выбору!",
      en: "Hello! I am your AI assistant. Ask me anything about our dishes, ingredients, calories or recommendations!"
    };
    const placeholders = {
      uz: "Savolingizni yozing...",
      ru: "Задайте вопрос...",
      en: "Ask a question..."
    };

    const html = `
      <div class="chatbot-sheet" style="display: flex; flex-direction: column; height: 75vh; max-height: 600px;">
        <div style="display:flex; align-items:center; justify-content:space-between; padding-bottom:12px; border-bottom:1px solid var(--border-color, #334155);">
          <div style="display:flex; align-items:center; gap:8px;">
            <span style="font-size:24px;">🤖</span>
            <div>
              <strong style="font-size:16px;">AI Maslahatchi</strong>
              <div style="font-size:11px; color:#22c55e;">● Online</div>
            </div>
          </div>
          <button class="icon-btn" onclick="closeSheet()" style="font-size:20px; min-width:44px; min-height:44px;">✕</button>
        </div>

        <div id="chatMessages" style="flex:1; overflow-y:auto; padding:16px 0; display:flex; flex-direction:column; gap:12px;">
          <div class="chat-msg bot" style="align-self:flex-start; max-width:85%; background:var(--surface, #1e293b); padding:10px 14px; border-radius:14px 14px 14px 2px; font-size:14px; line-height:1.5;">
            ${greetings[lang] || greetings.uz}
          </div>
        </div>

        <div class="chat-suggestions" style="display:flex; gap:6px; overflow-x:auto; padding:8px 0; border-top:1px solid rgba(255,255,255,0.05);">
          <button class="chip chip--sm chat-sug-btn" data-q="Eng ommabop taomlarni tavsiya qiling">🔥 Mashhur taomlar</button>
          <button class="chip chip--sm chat-sug-btn" data-q="Achchiq bo'lmagan qanday taomlar bor?">🥗 Parhez taomlar</button>
          <button class="chip chip--sm chat-sug-btn" data-q="Bolalar uchun nima tavsiya qilasiz?">👶 Bolalar uchun</button>
        </div>

        <form id="chatForm" style="display:flex; gap:8px; padding-top:8px; border-top:1px solid var(--border-color, #334155);">
          <input type="text" id="chatInput" class="input" placeholder="${placeholders[lang] || placeholders.uz}" style="flex:1; min-height:44px; border-radius:10px;" autocomplete="off" required>
          <button type="submit" id="chatSendBtn" class="btn btn--primary" style="min-width:44px; min-height:44px; padding:0 18px; border-radius:10px;">➤</button>
        </form>
      </div>
    `;

    openSheet(html, root => {
      const messagesBox = root.querySelector('#chatMessages');
      const input = root.querySelector('#chatInput');
      const form = root.querySelector('#chatForm');
      const sendBtn = root.querySelector('#chatSendBtn');

      function appendMessage(text, sender = 'user') {
        const div = document.createElement('div');
        div.className = `chat-msg ${sender}`;
        const isUser = sender === 'user';
        div.style.cssText = `
          align-self: ${isUser ? 'flex-end' : 'flex-start'};
          max-width: 85%;
          background: ${isUser ? 'var(--color-primary, #E85D2A)' : 'var(--surface, #1e293b)'};
          color: #ffffff;
          padding: 10px 14px;
          border-radius: ${isUser ? '14px 14px 2px 14px' : '14px 14px 14px 2px'};
          font-size: 14px;
          line-height: 1.5;
          word-break: break-word;
        `;
        div.textContent = text;
        messagesBox.appendChild(div);
        messagesBox.scrollTop = messagesBox.scrollHeight;
        return div;
      }

      function sendQuestion(q) {
        if (!q || !q.trim()) return;
        const text = q.trim();
        appendMessage(text, 'user');
        input.value = '';
        input.disabled = true;
        sendBtn.disabled = true;

        const typingIndicator = appendMessage('...', 'bot');
        typingIndicator.textContent = '⏳ Javob tayyorlanmoqda...';

        const armenu = window.ARMENU || {};
        const currentCart = (typeof cart !== 'undefined' && Array.isArray(cart)) ? cart : [];
        fetch('/v1/ai/chat/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            question: text,
            lang: armenu.lang || 'uz',
            session: armenu.sessionId || 'guest',
            table_id: armenu.tableId || null,
            cart: currentCart
          })
        })
        .then(r => r.json())
        .then(data => {
          typingIndicator.remove();
          const answer = data.answer || data.text || data.message || (data.error && data.error.message) || "Kechirasiz, javob olishda xatolik yuz berdi.";
          appendMessage(answer, 'bot');
        })
        .catch(() => {
          typingIndicator.remove();
          appendMessage("Aloqa xatosi. Iltimos, ofitsiantga murojaat qiling.", 'bot');
        })
        .finally(() => {
          input.disabled = false;
          sendBtn.disabled = false;
          input.focus();
        });
      }

      form.addEventListener('submit', e => {
        e.preventDefault();
        sendQuestion(input.value);
      });

      root.querySelectorAll('.chat-sug-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          sendQuestion(btn.dataset.q);
        });
      });
    });
  }

  window.openAIChat = openAIChat;

  function bindChatBtn() {
    const btn = document.getElementById('btnChat');
    if (btn) {
      btn.removeEventListener('click', openAIChat);
      btn.addEventListener('click', openAIChat);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bindChatBtn);
  } else {
    bindChatBtn();
  }
})();
