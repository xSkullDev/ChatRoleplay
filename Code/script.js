// Menyimpan riwayat percakapan untuk konteks LLM
let chatHistory = [];

// Inisialisasi elemen DOM
const chatBox = document.getElementById('chatBox');
const userInputBox = document.getElementById('userInput');
const sendBtn = document.getElementById('sendBtn');
const loadingIndicator = document.getElementById('loadingIndicator');
const apiKeyInput = document.getElementById('apiKey');
const systemPromptInput = document.getElementById('systemPrompt');

function addMessageToUI(sender, text, isUser) {
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message');
    messageDiv.classList.add(isUser ? 'user-message' : 'ai-message');
    messageDiv.textContent = text;
    chatBox.appendChild(messageDiv);
    chatBox.scrollTop = chatBox.scrollHeight; // Auto-scroll ke bawah
}

async function sendMessage() {
    const apiKey = apiKeyInput.value.trim();
    const systemPrompt = systemPromptInput.value.trim();
    const userMessage = userInputBox.value.trim();

    if (!apiKey) {
        alert("Mohon masukkan Groq API Key terlebih dahulu.");
        return;
    }
    if (!userMessage) return;

    // Tampilkan pesan pengguna di UI
    addMessageToUI('Anda', userMessage, true);
    userInputBox.value = '';
    loadingIndicator.style.display = 'block';

    // Susun payload pesan sesuai format Chat Completion API
    const messagesPayload = [
        { role: "system", content: systemPrompt },
        ...chatHistory,
        { role: "user", content: userMessage }
    ];

    try {
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: "llama-3.1-8b-instant",
                messages: messagesPayload,
                temperature: 0.7,
                max_tokens: 1024
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error?.message || "Terjadi kesalahan pada API.");
        }

        const data = await response.json();
        const aiResponse = data.choices[0].message.content;

        // Simpan ke riwayat agar AI ingat alur percakapan sebelumnya
        chatHistory.push({ role: "user", content: userMessage });
        chatHistory.push({ role: "assistant", content: aiResponse });

        // Tampilkan balasan AI di UI
        addMessageToUI('AI', aiResponse, false);

    } catch (error) {
        addMessageToUI('Sistem', `Error: ${error.message}`, false);
    } finally {
        loadingIndicator.style.display = 'none';
    }
}

// Event Listener untuk tombol klik dan tombol Enter
sendBtn.addEventListener('click', sendMessage);

userInputBox.addEventListener('keypress', function(event) {
    if (event.key === 'Enter') {
        sendMessage();
    }
});