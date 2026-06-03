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

// LOGIKA RESPONSIF SIDEBAR TOGGLE
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    sidebar.classList.toggle('active');
    overlay.classList.toggle('active');
}

function closeSidebarOnMobile() {
    document.getElementById('sidebar').classList.remove('active');
    document.getElementById('sidebarOverlay').classList.remove('active');
}

function showView(viewId) {
    document.getElementById('hub-view').style.display = viewId === 'hub-view' ? 'block' : 'none';
    document.getElementById('chat-view').style.display = viewId === 'chat-view' ? 'flex' : 'none';
    closeSidebarOnMobile(); // Otomatis tutup sidebar setelah memilih menu di HP
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
        const hasHistory = localStorage.getItem(chatHistoryKey);
        
        if (hasHistory) {
            const item = document.createElement('div');
            item.className = `active-chat-item ${currentCharacterId === char.id ? 'active' : ''}`;
            item.onclick = () => startChat(char.id);
            item.innerHTML = `
                <img src="${char.avatar}" onerror="this.src='https://placehold.co/400x400?text=AI'">
                <div>
                    <div style="font-weight:bold; font-size:14px;">${char.name}</div>
                </div>
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
        const parsedHistory = JSON.parse(history);
        parsedHistory.forEach(msg => {
            addMessageToUI(msg.content, msg.role === 'user');
        });
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

    const messagesPayload = [
        { role: "system", content: char.systemPrompt },
        ...history
    ];

    try {
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKeyInput}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: "llama-3.1-8b-instant",
                messages: messagesPayload,
                temperature: 0.8,
                max_tokens: 1024
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error?.message || "Terjadi kendala koneksi API.");
        }

        const data = await response.json();
        const aiResponse = data.choices[0].message.content;

        addMessageToUI(aiResponse, false);
        history.push({ role: "assistant", content: aiResponse });
        localStorage.setItem(chatHistoryKey, JSON.stringify(history));

    } catch (error) {
        addMessageToUI(`Sistem Error: ${error.message}`, false);
    } finally {
        loadingIndicator.style.display = 'none';
        renderSidebarChats();
    }
}

function clearCurrentChat() {
    if (currentCharacterId && confirm("Hapus semua riwayat percakapan dengan karakter ini?")) {
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

    if (!name || !greeting || !systemPrompt) {
        alert("Mohon isi semua form!");
        return;
    }

    if (!avatar) avatar = "https://placehold.co/400x400?text=" + name;

    const newChar = {
        id: "char_" + Date.now(),
        name: name,
        avatar: avatar,
        greeting: greeting,
        systemPrompt: systemPrompt
    };

    characters.push(newChar);
    localStorage.setItem('rp_characters', JSON.stringify(characters));
    
    document.getElementById('newBotName').value = '';
    document.getElementById('newBotAvatar').value = '';
    document.getElementById('newBotGreeting').value = '';
    document.getElementById('newBotPrompt').value = '';
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

    if (!name || !greeting || !systemPrompt) {
        alert("Form tidak boleh kosong!");
        return;
    }

    if (!avatar) avatar = "https://placehold.co/400x400?text=" + name;

    const charIndex = characters.findIndex(c => c.id === currentCharacterId);
    if (charIndex !== -1) {
        characters[charIndex].name = name;
        characters[charIndex].avatar = avatar;
        characters[charIndex].greeting = greeting;
        characters[charIndex].systemPrompt = systemPrompt;

        localStorage.setItem('rp_characters', JSON.stringify(characters));
        
        document.getElementById('chatBotName').textContent = name;
        document.getElementById('chatAvatar').src = avatar;

        renderHub();
        renderSidebarChats();
        closeEditModal();
    }
}

// ==========================================
// FITUR BARU: HAPUS KARAKTER SECARA PERMANEN
// ==========================================
function deleteCurrentCharacter() {
    if (!currentCharacterId) return;

    const char = characters.find(c => c.id === currentCharacterId);
    if (!char) return;

    const konfirmasi = confirm(`Apakah Anda yakin ingin menghapus karakter "${char.name}"? Semua riwayat chat dengan karakter ini juga akan dihapus permanen.`);
    
    if (konfirmasi) {
        // 1. Bersihkan riwayat chat dari LocalStorage
        localStorage.removeItem(`chat_history_${currentCharacterId}`);

        // 2. Filter array characters untuk membuang karakter saat ini
        characters = characters.filter(c => c.id !== currentCharacterId);

        // 3. Simpan perubahan ke LocalStorage
        localStorage.setItem('rp_characters', JSON.stringify(characters));

        // 4. Reset state karakter aktif
        currentCharacterId = null;

        // 5. Tutup modal & kembalikan tampilan ke Hub Utama
        closeEditModal();
        showView('hub-view');

        // 6. Segarkan komponen UI
        renderHub();
        renderSidebarChats();

        alert("Karakter berhasil dihapus.");
    }
}

document.getElementById('sendBtn').addEventListener('click', sendMessage);
document.getElementById('userInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendMessage();
});

window.onload = initApp;