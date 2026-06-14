// --- START OF FILE public/js/chatbot.js ---

// Track the last thing the bot said to provide context for "Yes/No" answers
let lastBotReplyText = "";

// This function sends a POST request to our GraphQL endpoint
async function askGraphQL(question) {
    const query = `
        query AskChatbot($question: String!) {
            askChatbot(question: $question) {
                reply
                navigationTarget
                highlightProductId
            }
        }
    `;

    try {
        const response = await fetch('/graphql', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                query,
                variables: { question },
            }),
        });

        const jsonResponse = await response.json();
        if (jsonResponse.errors) {
            console.error('GraphQL Errors:', jsonResponse.errors);
            return { reply: "Sorry, something went wrong with the request." };
        }
        return jsonResponse.data.askChatbot;
    } catch (error) {
        console.error('Network error asking chatbot:', error);
        return { reply: "Sorry, I'm unable to connect right now." };
    }
}

function highlightProduct(productId) {
    // Remove any existing highlights first
    document.querySelectorAll('.product-highlight').forEach(el => {
        el.classList.remove('product-highlight');
    });

    const productCard = document.querySelector(`.product-card[data-id="${productId}"]`);
    if (productCard) {
        productCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
        productCard.classList.add('product-highlight');

        // Remove the highlight after a few seconds
        setTimeout(() => {
            productCard.classList.remove('product-highlight');
        }, 4000);
    }
}

// --- Text-to-Speech with Enhanced Voice Selection ---

let availableVoices = [];

// Function to populate the list of available voices. This is crucial because
// browsers load voices asynchronously.
function loadVoices() {
    availableVoices = window.speechSynthesis.getVoices();
}

// Load voices when they are ready.
if ('speechSynthesis' in window) {
    loadVoices(); // Initial attempt in case they are already loaded.
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
        // The event that fires when the voice list has been loaded.
        window.speechSynthesis.onvoiceschanged = loadVoices;
    }
}

// Function to speak text using browser Web Speech API
function speakText(text) {
    if (!('speechSynthesis' in window)) {
        console.warn("Text-to-speech not supported in this browser.");
        return;
    }

    // Cancel any current speaking to prevent overlap
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);

    // A comprehensive list of known high-quality female voice names across platforms.
    // The more specific, higher-quality names are first.
    const priorityFemaleVoiceNames = [
        'Google UK English Female', // Google Chrome (Desktop)
        'Samantha',                 // Apple (macOS/iOS - high quality)
        'Microsoft Zira Desktop - English (United States)', // Microsoft Edge/Windows
        'Microsoft Zira Mobile - English (United States)', // Microsoft Edge/Windows Mobile
        'Tessa',                    // Apple (macOS/iOS)
        'Karen',                    // Apple (macOS/iOS)
        'Moira',                    // Apple (macOS/iOS)
        'Susan',                    // Older Microsoft
        'Hazel',                    // Older Microsoft
        'Google US English',        // This can be female on some systems
        'Alex',                     // Sometimes female on some systems
        'Victoria',                 // Microsoft
        'Zira',                     // Microsoft
        'Aria',                     // Microsoft
        'Jenny',                    // Microsoft Azure voices
        'AriaRUS',                  // Microsoft
        'ZiraRUS',                  // Microsoft
        'Female'                    // Generic fallback
    ];

    let selectedVoice = null;

    // 1. Try to find a voice from our high-priority list.
    for (const name of priorityFemaleVoiceNames) {
        const voice = availableVoices.find(v => v.name === name && v.lang.startsWith('en'));
        if (voice) {
            selectedVoice = voice;
            break; // Stop searching once we find a priority voice
        }
    }

    // 2. If no priority voice was found, search for any English voice that contains female-related keywords
    if (!selectedVoice) {
        const femaleKeywords = ['Female', 'Woman', 'Girl', 'Lady', 'Zira', 'Samantha', 'Karen', 'Tessa', 'Moira', 'Susan', 'Hazel', 'Victoria', 'Aria', 'Jenny'];
        for (const keyword of femaleKeywords) {
            const voice = availableVoices.find(v => v.lang.startsWith('en') && v.name.includes(keyword));
            if (voice) {
                selectedVoice = voice;
                break;
            }
        }
    }

    // 3. If still no voice found, try any English voice (some systems may not label them as female)
    if (!selectedVoice) {
        selectedVoice = availableVoices.find(voice => voice.lang.startsWith('en'));
    }

    // 4. If a suitable voice was found, assign it. Otherwise, the browser will use its default.
    if (selectedVoice) {
        utterance.voice = selectedVoice;
        console.log(`TTS: Using voice "${selectedVoice.name}" (${selectedVoice.lang})`);
    } else {
        console.warn("TTS: No suitable voice found. Using browser default.");
    }

    utterance.rate = 1; // Speed
    utterance.pitch = 1.1; // Slightly higher pitch for more feminine sound
    utterance.volume = 1; // Volume

    window.speechSynthesis.speak(utterance);
}


export function initChatbot() {
    const container = document.querySelector('.chatbot-container');
    const toggleBtn = document.querySelector('.chat-toggle-btn');
    const closeBtn = document.querySelector('.chat-close-btn');
    const chatForm = document.getElementById('chat-form');
    const chatInput = document.getElementById('chat-input');
    const messagesContainer = document.getElementById('chat-messages');

    // Function to add a message to the chat window
    function addMessage(text, sender) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}`;
        messageDiv.textContent = text;
        messagesContainer.appendChild(messageDiv);
        // Scroll to the bottom
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    // Toggle chat widget visibility
    toggleBtn.addEventListener('click', () => container.classList.add('open'));
    closeBtn.addEventListener('click', () => {
        container.classList.remove('open');
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel(); // Stop speaking if closed
        }
    });

    // Handle form submission
    chatForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const userQuestion = chatInput.value.trim();
        if (!userQuestion) return;

        // Display user's question immediately
        addMessage(userQuestion, 'user');
        chatInput.value = '';

        // Construct context-aware prompt for the backend
        // We hide this logic from the UI, but send it to the LLM
        let contextAwareQuestion = userQuestion;
        if (lastBotReplyText) {
            contextAwareQuestion = `Previous Bot Message: "${lastBotReplyText}"\n\nCurrent User Input: "${userQuestion}"`;
        }

        // Add a temporary "typing" message for the bot
        const typingDiv = document.createElement('div');
        typingDiv.className = 'message bot';
        typingDiv.textContent = 'Thinking...';
        messagesContainer.appendChild(typingDiv);
        
        // Send the context-aware question to the backend
        const { reply, navigationTarget, highlightProductId } = await askGraphQL(contextAwareQuestion);
        
        // Remove the "typing" message
        messagesContainer.removeChild(typingDiv);
        
        // Store this reply for the next turn
        lastBotReplyText = reply;

        addMessage(reply, 'bot');

        // *** TRIGGER TEXT TO SPEECH ***
        speakText(reply);

        // Check for navigation target and act on it
        if (navigationTarget) {
            // Give user a moment to read the reply before navigating
            setTimeout(() => {
                location.hash = navigationTarget;
                // We don't close the widget here anymore
            }, 1500);
        }

        // Check for a product to highlight; if so navigate to the product page first
        if (highlightProductId) {
            const targetHash = `#product/${highlightProductId}`;
            // If we are not already on the product page, navigate there first
            if (location.hash !== targetHash) {
                location.hash = targetHash;
                // Give the router a moment to render the product page, then highlight
                setTimeout(() => highlightProduct(highlightProductId), 600);
            } else {
                // Already on the product page — just highlight
                setTimeout(() => highlightProduct(highlightProductId), 300);
            }
        }
    });
}
// --- END OF FILE public/js/chatbot.js ---