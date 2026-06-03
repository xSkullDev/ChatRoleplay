// Data Karakter Bawaan (Default) jika LocalStorage kosong
const defaultCharacters = [
    {
        id: "char_1",
        name: "Aiko Yamamoto",
        avatar: "https://images.unsplash.com/photo-1578632767115-351597cf2477?q=80&w=400&auto=format&fit=crop",
        greeting: "Ada keperluan apa mencariku? Katakan dengan cepat, aku sedang sibuk.",
        systemPrompt: "Kamu adalah Aiko Yamamoto, seorang gadis Kuudere (dingin di luar, peduli di dalam) dari era sejarah Jepang. Bicaramu sangat irit, formal, tajam namun elegan. Sembunyikan perasaan pedulimu di balik kalimat ketusmu."
    },
    {
        id: "char_2",
        name: "Cyber Neon",
        avatar: "https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=400&auto=format&fit=crop",
        greeting: "Yo, selamat datang di sub-grid! Siap meretas jaringan malam ini?",
        systemPrompt: "Kamu adalah Cyber Neon, seorang netrunner legendaris di dunia Cyberpunk tahun 2077. Gaya bahasamu santai, menggunakan slang teknologi, penuh energi, gaul, cerdas, dan sinis terhadap korporasi besar."
    }
];

// State Aplikasi
let characters = [];
let currentCharacterId = null;

// Ambil data dari LocalStorage saat pertama kali load
function initApp() {
    const localChars = localStorage.getItem('rp_characters');
    if (localChars) {
        characters = JSON.parse(localChars);
    } else {
        characters = defaultCharacters;
        localStorage.setItem('rp_characters', JSON.stringify(characters));
    }
    
    // Cek jika ada API key tersimpan
    const savedKey = localStorage.getItem('rp_groq_key');
    if (savedKey) document.getElementById('apiKey').value = savedKey;

    renderHub();
    renderSidebarChats();
}

// Ganti Tampilan Halaman (Hub / Chat)
function showView(viewId) {
    document.getElementById('hub-view').style.display = viewId === 'hub-view' ? 'block' : 'none';
    document.getElementById('chat-view').style.display = viewId === 'chat-view' ? 'flex' : 'none';
}

// Render Grid Karakter di Home (Hub)
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

// Render Riwayat Chat Aktif di Sidebar
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

// Mulai Masuk ke Ruang Chat Karakter tertentu
function startChat(charId) {
    currentCharacterId = charId;
    const char = characters.find(c => c.id === charId);
    
    // Set Detail Informasi Karakter di Atas Layar Chat
    document.getElementById('chatBotName').textContent = char.name;
    document.getElementById('chatBotTitle').textContent = "Roleplay Active";
    document.getElementById('chatAvatar').src = char.avatar;

    // Load atau Buat Baru Riwayat Pesan
    const chatHistoryKey = `chat_history_${charId}`;
    let history = localStorage.getItem(chatHistoryKey);
    
    const chatBox = document.getElementById('chatBox');
    chatBox.innerHTML = '';

    if (!history) {
        // Jika belum ada riwayat, jalankan greeting awal bawaan bot
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

// Cetak Pesan ke UI Balon Chat
function addMessageToUI(text, isUser) {
    const chatBox = document.getElementById('chatBox');
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message', isUser ? 'user-message' : 'ai-message');
    messageDiv.textContent = text;
    chatBox.appendChild(messageDiv);
    chatBox.scrollTop = chatBox.scrollHeight;
}

// Kirim Pesan ke API Groq
async function sendMessage() {
    const apiKeyInput = document.getElementById('apiKey').value.trim();
    const userInputBox = document.getElementById('userInput');
    const userMessage = userInputBox.value.trim();
    const loadingIndicator = document.getElementById('loadingIndicator');

    if (!apiKeyInput) {
        alert("Mohon masukkan Groq API Key Anda di sidebar terlebih dahulu.");
        return;
    }
    // Simpan API Key ke localstorage biar ga cape ngetik ulang
    localStorage.setItem('rp_groq_key', apiKeyInput);

    if (!userMessage || !currentCharacterId) return;

    // Ambil info detail bot saat ini
    const char = characters.find(c => c.id === currentCharacterId);
    const chatHistoryKey = `chat_history_${currentCharacterId}`;
    let history = JSON.parse(localStorage.getItem(chatHistoryKey)) || [];

    // Tampilkan di UI & simpan ke riwayat lokal
    addMessageToUI(userMessage, true);
    userInputBox.value = '';
    loadingIndicator.style.display = 'block';

    history.push({ role: "user", content: userMessage });

    // Format Data kirim ke Groq API
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
                temperature: 0.8, // Sedikit lebih tinggi agar respon roleplay lebih kreatif
                max_tokens: 1024
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error?.message || "Terjadi kendala koneksi API.");
        }

        const data = await response.json();
        const aiResponse = data.choices[0].message.content;

        // Tampilkan balasan AI & simpan ke riwayat lokal
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

// Fitur Reset/Hapus Riwayat Chat saat ini
function clearCurrentChat() {
    if (currentCharacterId && confirm("Hapus semua riwayat percakapan dengan karakter ini?")) {
        localStorage.removeItem(`chat_history_${currentCharacterId}`);
        startChat(currentCharacterId);
    }
}

// PENGATURAN MODAL BUAT BOT (Character Creator)
function openCreateModal() { document.getElementById('createModal').style.display = 'flex'; }
function closeCreateModal() { document.getElementById('createModal').style.display = 'none'; }

function saveNewCharacter() {
    const name = document.getElementById('newBotName').value.trim();
    let avatar = document.getElementById('newBotAvatar').value.trim();
    const greeting = document.getElementById('newBotGreeting').value.trim();
    const systemPrompt = document.getElementById('newBotPrompt').value.trim();

    if (!name || !greeting || !systemPrompt) {
        alert("Mohon isi semua form (Nama, Greeting, dan Prompt)!");
        return;
    }

    if (!avatar) avatar = "https://placehold.co/400x400?text=" + name;

    const newChar = {
        id: "char_" + Date.now(), // Generate ID Unik berbasis waktu
        name: name,
        avatar: avatar,
        greeting: greeting,
        systemPrompt: systemPrompt
    };

    characters.push(newChar);
    localStorage.setItem('rp_characters', JSON.stringify(characters));
    
    // Bersihkan form & Tutup modal
    document.getElementById('newBotName').value = '';
    document.getElementById('newBotAvatar').value = '';
    document.getElementById('newBotGreeting').value = '';
    document.getElementById('newBotPrompt').value = '';
    closeCreateModal();

    // Re-render UI Hub
    renderHub();
}

// Event Listeners Operasional Input
document.getElementById('sendBtn').addEventListener('click', sendMessage);
document.getElementById('userInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendMessage();
});

// Jalankan aplikasi pertama kali
window.onload = initApp;

// Data Karakter Bawaan (Default) jika LocalStorage kosong
const defaultCharacters = [
    {
        id: "char_1",
        name: "Aiko Yamamoto",
        avatar: "https://images.unsplash.com/photo-1578632767115-351597cf2477?q=80&w=400&auto=format&fit=crop",
        greeting: "Ada keperluan apa mencariku? Katakan dengan cepat, aku sedang sibuk.",
        systemPrompt: "Kamu adalah Aiko Yamamoto, seorang gadis Kuudere (dingin di luar, peduli di dalam) dari era sejarah Jepang. Bicaramu sangat irit, formal, tajam namun elegan. Sembunyikan perasaan pedulimu di balik kalimat ketusmu."
    },
    {
        id: "char_2",
        name: "Cyber Neon",
        avatar: "https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=400&auto=format&fit=crop",
        greeting: "Yo, selamat datang di sub-grid! Siap meretas jaringan malam ini?",
        systemPrompt: "Kamu adalah Cyber Neon, seorang netrunner legendaris di dunia Cyberpunk tahun 2077. Gaya bahasamu santai, menggunakan slang teknologi, penuh energi, gaul, cerdas, dan sinis terhadap korporasi besar."
    }
];

// State Aplikasi
let characters = [];
let currentCharacterId = null;

// Ambil data dari LocalStorage saat pertama kali load
function initApp() {
    const localChars = localStorage.getItem('rp_characters');
    if (localChars) {
        characters = JSON.parse(localChars);
    } else {
        characters = defaultCharacters;
        localStorage.setItem('rp_characters', JSON.stringify(characters));
    }
    
    // Cek jika ada API key tersimpan
    const savedKey = localStorage.getItem('rp_groq_key');
    if (savedKey) document.getElementById('apiKey').value = savedKey;

    renderHub();
    renderSidebarChats();
}

// Ganti Tampilan Halaman (Hub / Chat)
function showView(viewId) {
    document.getElementById('hub-view').style.display = viewId === 'hub-view' ? 'block' : 'none';
    document.getElementById('chat-view').style.display = viewId === 'chat-view' ? 'flex' : 'none';
}

// Render Grid Karakter di Home (Hub)
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

// Render Riwayat Chat Aktif di Sidebar
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

// Mulai Masuk ke Ruang Chat Karakter tertentu
function startChat(charId) {
    currentCharacterId = charId;
    const char = characters.find(c => c.id === charId);
    
    // Set Detail Informasi Karakter di Atas Layar Chat
    document.getElementById('chatBotName').textContent = char.name;
    document.getElementById('chatAvatar').src = char.avatar;

    // Load atau Buat Baru Riwayat Pesan
    const chatHistoryKey = `chat_history_${charId}`;
    let history = localStorage.getItem(chatHistoryKey);
    
    const chatBox = document.getElementById('chatBox');
    chatBox.innerHTML = '';

    if (!history) {
        // Jika belum ada riwayat, jalankan greeting awal bawaan bot
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

// Cetak Pesan ke UI Balon Chat
function addMessageToUI(text, isUser) {
    const chatBox = document.getElementById('chatBox');
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message', isUser ? 'user-message' : 'ai-message');
    messageDiv.textContent = text;
    chatBox.appendChild(messageDiv);
    chatBox.scrollTop = chatBox.scrollHeight;
}

// Kirim Pesan ke API Groq
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

// MODAL CONTROLLER: BUAT BOT
function openCreateModal() { document.getElementById('createModal').style.display = 'flex'; }
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

// ==========================================
// FITUR BARU: MODAL CONTROLLER & LOGIK EDIT
// ==========================================
function openEditModal() {
    if (!currentCharacterId) return;
    
    // Cari data karakter aktif saat ini
    const char = characters.find(c => c.id === currentCharacterId);
    if (!char) return;

    // Isi form modal edit dengan data lama karakter tersebut
    document.getElementById('editBotName').value = char.name;
    document.getElementById('editBotAvatar').value = char.avatar;
    document.getElementById('editBotGreeting').value = char.greeting;
    document.getElementById('editBotPrompt').value = char.systemPrompt;

    // Tampilkan modal edit
    document.getElementById('editModal').style.display = 'flex';
}

function closeEditModal() {
    document.getElementById('editModal').style.display = 'none';
}

function saveUpdatedCharacter() {
    if (!currentCharacterId) return;

    const name = document.getElementById('editBotName').value.trim();
    let avatar = document.getElementById('editBotAvatar').value.trim();
    const greeting = document.getElementById('editBotGreeting').value.trim();
    const systemPrompt = document.getElementById('editBotPrompt').value.trim();

    if (!name || !greeting || !systemPrompt) {
        alert("Form nama, greeting, dan prompt tidak boleh kosong!");
        return;
    }

    if (!avatar) avatar = "https://placehold.co/400x400?text=" + name;

    // Cari indeks posisi karakter di dalam array state
    const charIndex = characters.findIndex(c => c.id === currentCharacterId);
    
    if (charIndex !== -1) {
        // Timpa data lama dengan data baru hasil edit
        characters[charIndex].name = name;
        characters[charIndex].avatar = avatar;
        characters[charIndex].greeting = greeting;
        characters[charIndex].systemPrompt = systemPrompt;

        // Simpan perubahan ke penyimpanan lokal browser
        localStorage.setItem('rp_characters', JSON.stringify(characters));
        
        // Perbarui komponen antarmuka yang sedang aktif (Chat Header)
        document.getElementById('chatBotName').textContent = name;
        document.getElementById('chatAvatar').src = avatar;

        // Perbarui komponen latar belakang (Hub Utama & Daftar Sidebar)
        renderHub();
        renderSidebarChats();
        
        closeEditModal();
        alert("Profil karakter berhasil diperbarui!");
    }
}

// Event Listeners Operasional Input
document.getElementById('sendBtn').addEventListener('click', sendMessage);
document.getElementById('userInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendMessage();
});

// Jalankan aplikasi pertama kali
window.onload = initApp;