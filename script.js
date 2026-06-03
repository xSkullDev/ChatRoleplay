const defaultCharacters = [
    {
        id: "char_1",
        name: "Aiko Yamamoto",
        avatar: "https://images.unsplash.com/photo-1578632767115-351597cf2477?q=80&w=400&auto=format&fit=crop",
        greeting: "Ada keperluan apa mencariku? Katakan dengan cepat, aku sedang sibuk.",
        systemPrompt: "Kamu adalah Aiko Yamamoto, seorang gadis Kuudere dari era sejarah Jepang. Bicaramu sangat irit, formal, tajam namun elegan. Sembunyikan perasaan pedulimu di balik kalimat ketusmu."
    },
    {
        id: "char_2",
        name: "Cyber Neon",
        avatar: "https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=400&auto=format&fit=crop",
        greeting: "Yo, selamat datang di sub-grid! Siap meretas jaringan malam ini?",
        systemPrompt: "Kamu adalah Cyber Neon, seorang netrunner legendaris di dunia Cyberpunk tahun 2077. Gaya bahasamu santai, menggunakan slang teknologi, penuh energi, gaul, cerdas, dan sinis terhadap korporasi besar."
    }
];

let characters = [];
let currentCharacterId = null;

function initApp() {
    const localChars = localStorage.getItem('rp_characters');
    if (localChars) {
        characters = JSON.parse(localChars);
    } else {
        characters = defaultCharacters;
        localStorage.setItem('rp_characters', JSON.stringify(characters));
    }
    
    const savedKey = localStorage.getItem('rp_groq_key');
    if (savedKey) document.getElementById('apiKey').value = savedKey;

    renderHub();
    renderSidebarChats();
}

function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('active');
    document.getElementById('sidebarOverlay').classList.toggle('active');
}

function closeSidebarOnMobile() {
    document.getElementById('sidebar').classList.remove('active');
    document.getElementById('sidebarOverlay').classList.remove('active');
}

function showView(viewId) {
    document.getElementById('hub-view').style.display = viewId === 'hub-view' ? 'block' : 'none';
    document.getElementById('chat-view').style.display = viewId === 'chat-view' ? 'flex' : 'none';
    closeSidebarOnMobile();
}

function renderHub() {
    const grid = document.getElementById('characterGrid');
    grid.innerHTML = '';
    
    characters.forEach(char => {
        const card = document.createElement('div');
        card.className = 'char-card';
        card.onclick = () => startChat(char.id);
        card.innerHTML = `
            <img src="${char.avatar}" onerror="this.src='https://placehold.co/400x400?text=AI'">
            <div class="char-info">
                <h3>${char.name}</h3>
                <p>${char.greeting}</p>
            </div>
        `;
        grid.appendChild(card);
    });
}

function renderSidebarChats() {
    const list = document.getElementById('activeChatsList');
    list.innerHTML = '';

    characters.forEach(char => {
        const chatHistoryKey = `chat_history_${char.id}`;
        if (localStorage.getItem(chatHistoryKey)) {
            const item = document.createElement('div');
            item.className = `active-chat-item ${currentCharacterId === char.id ? 'active' : ''}`;
            item.onclick = () => startChat(char.id);
            item.innerHTML = `
                <img src="${char.avatar}" onerror="this.src='https://placehold.co/400x400?text=AI'">
                <div><div style="font-weight:bold; font-size:14px;">${char.name}</div></div>
            `;
            list.appendChild(item);
        }
    });
}

function startChat(charId) {
    currentCharacterId = charId;
    const char = characters.find(c => c.id === charId);
    if (!char) return;
    
    document.getElementById('chatBotName').textContent = char.name;
    document.getElementById('chatAvatar').src = char.avatar;

    const chatHistoryKey = `chat_history_${charId}`;
    let history = localStorage.getItem(chatHistoryKey);
    const chatBox = document.getElementById('chatBox');
    chatBox.innerHTML = '';

    if (!history) {
        const initialHistory = [{ role: "assistant", content: char.greeting }];
        localStorage.setItem(chatHistoryKey, JSON.stringify(initialHistory));
        addMessageToUI(char.greeting, false);
    } else {
        JSON.parse(history).forEach(msg => addMessageToUI(msg.content, msg.role === 'user'));
    }

    renderSidebarChats();
    showView('chat-view');
}

function addMessageToUI(text, isUser) {
    const chatBox = document.getElementById('chatBox');
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message', isUser ? 'user-message' : 'ai-message');
    messageDiv.textContent = text;
    chatBox.appendChild(messageDiv);
    chatBox.scrollTop = chatBox.scrollHeight;
}

async function sendMessage() {
    const apiKeyInput = document.getElementById('apiKey').value.trim();
    const userInputBox = document.getElementById('userInput');
    const userMessage = userInputBox.value.trim();
    const loadingIndicator = document.getElementById('loadingIndicator');

    if (!apiKeyInput) {
        alert("Mohon masukkan Groq API Key Anda di sidebar terlebih dahulu.");
        return;
    }
    localStorage.setItem('rp_groq_key', apiKeyInput);
    if (!userMessage || !currentCharacterId) return;

    const char = characters.find(c => c.id === currentCharacterId);
    const chatHistoryKey = `chat_history_${currentCharacterId}`;
    let history = JSON.parse(localStorage.getItem(chatHistoryKey)) || [];

    addMessageToUI(userMessage, true);
    userInputBox.value = '';
    loadingIndicator.style.display = 'block';
    history.push({ role: "user", content: userMessage });

    try {
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${apiKeyInput}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: "llama-3.1-8b-instant",
                messages: [{ role: "system", content: char.systemPrompt }, ...history],
                temperature: 0.8, max_tokens: 1024
            })
        });

        if (!response.ok) throw new Error("Koneksi API bermasalah.");
        const data = await response.json();
        const aiResponse = data.choices[0].message.content;

        addMessageToUI(aiResponse, false);
        history.push({ role: "assistant", content: aiResponse });
        localStorage.setItem(chatHistoryKey, JSON.stringify(history));
    } catch (error) {
        addMessageToUI(`Error: ${error.message}`, false);
    } finally {
        loadingIndicator.style.display = 'none';
        renderSidebarChats();
    }
}

function clearCurrentChat() {
    if (currentCharacterId && confirm("Hapus semua riwayat percakapan?")) {
        localStorage.removeItem(`chat_history_${currentCharacterId}`);
        startChat(currentCharacterId);
    }
}

function openCreateModal() { document.getElementById('createModal').style.display = 'flex'; closeSidebarOnMobile(); }
function closeCreateModal() { document.getElementById('createModal').style.display = 'none'; }

function saveNewCharacter() {
    const name = document.getElementById('newBotName').value.trim();
    let avatar = document.getElementById('newBotAvatar').value.trim();
    const greeting = document.getElementById('newBotGreeting').value.trim();
    const systemPrompt = document.getElementById('newBotPrompt').value.trim();

    if (!name || !greeting || !systemPrompt) return alert("Mohon isi semua form!");
    if (!avatar) avatar = "https://placehold.co/400x400?text=" + name;

    characters.push({ id: "char_" + Date.now(), name, avatar, greeting, systemPrompt });
    localStorage.setItem('rp_characters', JSON.stringify(characters));
    
    closeCreateModal();
    renderHub();
}

function openEditModal() {
    if (!currentCharacterId) return;
    const char = characters.find(c => c.id === currentCharacterId);
    if (!char) return;

    document.getElementById('editBotName').value = char.name;
    document.getElementById('editBotAvatar').value = char.avatar;
    document.getElementById('editBotGreeting').value = char.greeting;
    document.getElementById('editBotPrompt').value = char.systemPrompt;
    document.getElementById('editModal').style.display = 'flex';
}

function closeEditModal() { document.getElementById('editModal').style.display = 'none'; }

function saveUpdatedCharacter() {
    if (!currentCharacterId) return;
    const name = document.getElementById('editBotName').value.trim();
    let avatar = document.getElementById('editBotAvatar').value.trim();
    const greeting = document.getElementById('editBotGreeting').value.trim();
    const systemPrompt = document.getElementById('editBotPrompt').value.trim();

    if (!name || !greeting || !systemPrompt) return alert("Form tidak boleh kosong!");
    if (!avatar) avatar = "https://placehold.co/400x400?text=" + name;

    const idx = characters.findIndex(c => c.id === currentCharacterId);
    if (idx !== -1) {
        characters[idx] = { ...characters[idx], name, avatar, greeting, systemPrompt };
        localStorage.setItem('rp_characters', JSON.stringify(characters));
        
        document.getElementById('chatBotName').textContent = name;
        document.getElementById('chatAvatar').src = avatar;
        renderHub();
        renderSidebarChats();
        closeEditModal();
    }
}

function deleteCurrentCharacter() {
    if (!currentCharacterId) return;
    const char = characters.find(c => c.id === currentCharacterId);
    if (char && confirm(`Hapus permanen "${char.name}"?`)) {
        localStorage.removeItem(`chat_history_${currentCharacterId}`);
        characters = characters.filter(c => c.id !== currentCharacterId);
        localStorage.setItem('rp_characters', JSON.stringify(characters));
        currentCharacterId = null;
        closeEditModal();
        showView('hub-view');
        renderHub();
        renderSidebarChats();
    }
}

document.getElementById('sendBtn').addEventListener('click', sendMessage);
document.getElementById('userInput').addEventListener('keypress', (e) => { if (e.key === 'Enter') sendMessage(); });
window.onload = initApp;