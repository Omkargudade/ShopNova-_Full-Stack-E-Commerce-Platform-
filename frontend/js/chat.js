document.addEventListener('DOMContentLoaded', () => {
    // Inject chat HTML into body
    const chatHTML = `
        <div id="chat-widget">
            <button id="chat-toggle-btn">
                <svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>
            </button>
            
            <div id="chat-window" class="hidden">
                <div class="chat-header">
                    <h3>AI Shopping Assistant</h3>
                    <button class="close-btn" id="chat-close-btn">&times;</button>
                </div>
                <div class="chat-body" id="chat-body">
                    <div class="message bot">Hello! I'm your AI assistant. How can I help you today?</div>
                </div>
                <div class="chat-footer">
                    <input type="text" id="chat-input" placeholder="Type a message...">
                    <button id="chat-send-btn">
                        <svg viewBox="0 0 24 24" width="20" height="20" fill="white"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
                    </button>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', chatHTML);

    const toggleBtn = document.getElementById('chat-toggle-btn');
    const closeBtn = document.getElementById('chat-close-btn');
    const chatWindow = document.getElementById('chat-window');
    const chatInput = document.getElementById('chat-input');
    const sendBtn = document.getElementById('chat-send-btn');
    const chatBody = document.getElementById('chat-body');

    toggleBtn.addEventListener('click', () => {
        chatWindow.classList.toggle('hidden');
    });

    closeBtn.addEventListener('click', () => {
        chatWindow.classList.add('hidden');
    });

    sendBtn.addEventListener('click', sendMessage);
    chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendMessage();
    });

    async function sendMessage() {
        const text = chatInput.value.trim();
        if (!text) return;

        // Add user message
        appendMessage('user', text);
        chatInput.value = '';

        try {
            // Show typing indicator
            const typingId = appendMessage('bot', 'Typing...');
            
            const response = await fetchAPI('/chat', 'POST', { message: text });
            
            // Remove typing indicator
            document.getElementById(typingId).remove();

            // Add bot reply
            appendMessage('bot', response.reply);

            // Add product suggestions if any
            if (response.products && response.products.length > 0) {
                response.products.forEach(p => {
                    const productHTML = `
                        <a href="product.html?id=${p.id}" class="chat-product-suggestion">
                            <img src="${p.imageUrl || 'https://via.placeholder.com/40'}" onerror="this.onerror=null;this.src='https://via.placeholder.com/40';" alt="${p.name}">
                            <div>
                                <div style="font-size: 0.85rem; font-weight: bold;">${p.name}</div>
                                <div style="font-size: 0.8rem; color: var(--primary-color)">Rs. ${p.price.toLocaleString()}</div>
                            </div>
                        </a>
                    `;
                    chatBody.insertAdjacentHTML('beforeend', productHTML);
                });
                chatBody.scrollTop = chatBody.scrollHeight;
            }

        } catch (err) {
            document.getElementById(typingId)?.remove();
            appendMessage('bot', 'Sorry, I am having trouble connecting to the server.');
        }
    }

    function appendMessage(sender, text) {
        const id = 'msg-' + Date.now();
        const msgEl = document.createElement('div');
        msgEl.id = id;
        msgEl.className = `message ${sender}`;
        msgEl.textContent = text;
        chatBody.appendChild(msgEl);
        chatBody.scrollTop = chatBody.scrollHeight;
        return id;
    }
});
