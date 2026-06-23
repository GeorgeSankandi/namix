import { isLoggedIn, logout } from './auth.js';
import { getSellerType } from './adminAuth.js';
import { CartManager, setCartUpdateCallback } from './cart.js';
import * as api from './api.js';
import { geocodeLocation, showLocationOnMap } from './map.js';

// Global variables to track admin type (accessible to all event listeners)
let isMainAdmin = false;
let isFurnitureAdmin = false;
let isClothesAdmin = false;
let isKidsAdmin = false;
let isFashionAdmin = false;

// Dynamic check variables for streamlined modules
let isVehiclesAdmin = false;
let isPropertyAdmin = false;
let isFoodAdmin = false;
let isBooksAdmin = false;

// Track intervals to clean them up on navigation
let liveViewerInterval = null;

// Global settings dictionary cached on runtime updates
let globalSettingsMap = {};

// Active list of products chosen for combo generation
let selectedComboProducts = [];

// Standard Clothing Sizes for Admin Dropdown
const STANDARD_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL', 'UK 4', 'UK 6', 'UK 8', 'UK 10', 'UK 12', 'UK 14', 'One Size'];

// Peak human activity times for realistic viewer timestamps
const PEAK_ACTIVITY_TIMES = [
  { label: '6:00 AM', hour: 6, minute: 0 },
  { label: '8:00 AM', hour: 8, minute: 0 },
  { label: '10:00 AM', hour: 10, minute: 0 },
  { label: '12:00 PM (Noon)', hour: 12, minute: 0 },
  { label: '2:00 PM', hour: 14, minute: 0 },
  { label: '4:00 PM', hour: 16, minute: 0 },
  { label: '6:00 PM', hour: 18, minute: 0 },
  { label: '8:00 PM', hour: 20, minute: 0 },
  { label: '10:00 PM', hour: 22, minute: 0 },
];

// Set up cart update callback
setCartUpdateCallback(() => {
    updateFloatingCartButton();
});

const getCurrentUser = () => {
    try {
        return JSON.parse(localStorage.getItem('userInfo')) || null;
    } catch (err) {
        return null;
    }
};

// Robust Message Element (Requirement 2, 3)
const createChatMessageElement = (message, fromMe = false) => {
    const wrapper = document.createElement('div');
    wrapper.style.margin = '8px 0';
    wrapper.style.display = 'flex';
    wrapper.style.justifyContent = fromMe ? 'flex-end' : 'flex-start';

    const bubble = document.createElement('div');
    bubble.style.cssText = `max-width:78%; padding:10px 14px; border-radius:16px; background:${fromMe ? 'var(--corporate-blue)' : '#f4f4f4'}; color:${fromMe ? '#fff' : '#222'}; box-shadow:0 1px 8px rgba(0,0,0,0.08); font-size:0.95rem;`;

    let contentHtml = `<div>${message.text || message}</div>`;
    if (message.voiceUrl) {
        contentHtml += `<div style="margin-top:6px;"><audio src="${message.voiceUrl}" controls style="max-width:100%; height:40px;"></audio></div>`;
    }
    if (message.attachmentUrl) {
        const isImg = /\.(jpg|jpeg|png|webp|gif)/i.test(message.attachmentUrl);
        if (isImg) {
            contentHtml += `<div style="margin-top:6px;"><img src="${message.attachmentUrl}" style="max-width:100%; border-radius:8px; max-height:120px; object-fit:contain; cursor:pointer;" onclick="window.open(this.src)"></div>`;
        } else {
            contentHtml += `<div style="margin-top:6px;"><a href="${message.attachmentUrl}" target="_blank" style="color: ${fromMe ? '#ffec99' : '#007bff'}; text-decoration:underline; font-weight:700;"><i class="fas fa-file-download"></i> ${message.attachmentName || 'Download Attachment'}</a></div>`;
        }
    }
    bubble.innerHTML = contentHtml;
    wrapper.appendChild(bubble);
    return wrapper;
};

// Seller chat with Voice Recording, File uploads & Trade sections replacing layby (Requirement 2, 3, 4)
const createSellerChatModal = ({ sellerId, sellerName }) => {
    const currentUser = getCurrentUser();
    if (!currentUser) {
        alert('Please log in to message the seller.');
        location.hash = '#login';
        return null;
    }

    const buyerId = currentUser._id || `guest_${Math.random().toString(36).slice(2, 10)}`;
    const roomId = `chat:${sellerId}:${buyerId}`;
    const existing = document.getElementById('seller-chat-modal');
    if (existing) return existing;

    const modal = document.createElement('div');
    modal.id = 'seller-chat-modal';
    modal.style.cssText = 'position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.55); display:flex; align-items:center; justify-content:center; z-index:22000;';
    modal.innerHTML = `
        <div id="seller-chat-container" style="width: 95%; max-width: 480px; height: 90vh; max-height: 650px; background: #fff; border-radius: 14px; overflow: hidden; box-shadow: 0 20px 50px rgba(0,0,0,0.18); display: flex; flex-direction: column; box-sizing: border-box;">
            <div style="padding: 14px 18px; background: #fafafa; border-bottom: 1px solid #eee; display:flex; justify-content:space-between; align-items:center;">
                <div>
                    <div style="font-weight:700; font-size:1rem;">Message Seller</div>
                    <div style="font-size:0.9rem; color:#555;">${sellerName || 'Seller'}</div>
                </div>
                <button id="seller-chat-close" style="border:none;background:none;font-size:1.5rem;cursor:pointer;color:#333;">&times;</button>
            </div>
            
            <div style="background:#eef3ff; padding:10px 15px; border-bottom:1px solid #d2e3fe; color:var(--corporate-blue); font-size:0.85rem; display:flex; align-items:center; gap:8px;">
                <i class="fas fa-shield-alt" style="font-size:1.1rem;"></i>
                <strong>Negotiate inside chat for full protection.</strong>
            </div>

            <div id="seller-chat-messages" style="flex:1; padding: 14px; overflow-y:auto; background:#fbfbfb;"></div>
            
            <!-- Custom Trade Negotiation Panel replacing Lay-by options (Requirement 4) -->
            <div id="negotiation-panel" style="background:#f9f9fb; border-top:1px solid var(--border-color); padding:15px; display:flex; flex-direction:column; gap:10px;">
                <h4 style="margin:0; font-size:0.9rem; color:var(--corporate-blue);">Trade & Price Agreement</h4>
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px;">
                    <input type="number" id="negotiated-price" placeholder="Agreed Price (N$)" style="padding:8px; border:1px solid #ddd; border-radius:4px; font-size:0.85rem;">
                    <input type="number" id="negotiated-deposit" placeholder="Deposit (N$)" style="padding:8px; border:1px solid #ddd; border-radius:4px; font-size:0.85rem;">
                </div>
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px;">
                    <input type="text" id="negotiated-trade-item" placeholder="Trade-in Item" style="padding:8px; border:1px solid #ddd; border-radius:4px; font-size:0.85rem;">
                    <input type="number" id="negotiated-trade-value" placeholder="Trade Value (N$)" style="padding:8px; border:1px solid #ddd; border-radius:4px; font-size:0.85rem;">
                </div>
                <button type="button" id="btn-save-agreement" style="background:var(--corporate-blue); color:white; font-weight:700; border:none; border-radius:6px; font-size:0.8rem; cursor:pointer; padding:10px 14px; height:100%;">Save Agreement</button>
            </div>

            <!-- Footer with Voice Note & Attachment Buttons (Requirement 2, 3) -->
            <div style="display:flex; flex-direction:column; border-top:1px solid #eee; background:#fff; padding: 12px; box-sizing:border-box; gap: 8px;">
                <div id="voice-rec-status" style="display:none; align-items:center; gap:8px; color:var(--corporate-red); font-size:0.85rem; font-weight:bold;">
                    <i class="fas fa-microphone" style="animation: timerPulse 1s infinite;"></i> <span>Recording Audio...</span>
                    <button id="btn-cancel-voice" style="background:none; border:none; color:#666; font-size:0.8rem; cursor:pointer; text-decoration:underline;">Cancel</button>
                </div>
                <div style="display:flex; gap: 8px; align-items:center;">
                    <button id="btn-chat-attach" style="background:none; border:none; color:var(--corporate-blue); font-size:1.3rem; cursor:pointer; padding: 4px;" title="Attach File/Image"><i class="fas fa-paperclip"></i></button>
                    <input id="seller-chat-input" type="text" placeholder="Write a message..." style="flex:1; padding:10px 12px; border:1px solid #ddd; border-radius:10px; outline:none; font-size:0.95rem;" />
                    <button id="btn-chat-voice" style="background:none; border:none; color:var(--corporate-green); font-size:1.3rem; cursor:pointer; padding: 4px;" title="Record Voice"><i class="fas fa-microphone"></i></button>
                    <button id="seller-chat-send" class="btn-primary" style="padding: 10px 16px; border-radius:8px; font-weight:bold; height:100%;">Send</button>
                </div>
                <input type="file" id="chat-file-input" style="display:none;" accept="*/*">
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    const closeModal = () => {
        if (modal && modal.parentNode) modal.parentNode.removeChild(modal);
        if (socket && socket.disconnect) socket.disconnect();
        if (mediaRecorder && mediaRecorder.state !== 'inactive') mediaRecorder.stop();
    };

    modal.querySelector('#seller-chat-close').addEventListener('click', closeModal);
    modal.addEventListener('click', (event) => {
        if (event.target === modal) closeModal();
    });

    const messagesEl = modal.querySelector('#seller-chat-messages');
    const inputEl = modal.querySelector('#seller-chat-input');
    const sendBtn = modal.querySelector('#seller-chat-send');
    const saveAgreementBtn = modal.querySelector('#btn-save-agreement');
    const fileAttachBtn = modal.querySelector('#btn-chat-attach');
    const fileInput = modal.querySelector('#chat-file-input');
    const voiceRecBtn = modal.querySelector('#btn-chat-voice');
    const voiceStatusDiv = modal.querySelector('#voice-rec-status');
    const cancelVoiceBtn = modal.querySelector('#btn-cancel-voice');

    const addChatMessage = (text, fromMe, voiceUrl = null, attachmentUrl = null, attachmentName = null) => {
        if (!messagesEl) return;
        const msgEl = createChatMessageElement({ text, voiceUrl, attachmentUrl, attachmentName }, fromMe);
        messagesEl.appendChild(msgEl);
        messagesEl.scrollTop = messagesEl.scrollHeight;
    };

    let socket = null;
    const isSocketAvailable = typeof io !== 'undefined';

    if (isSocketAvailable) {
        socket = io();
        socket.on('connect', () => {
            socket.emit('join_chat', { roomId, sellerId, buyerId, userName: currentUser.name || 'Buyer' });
        });
        socket.on('chat_history', (history = []) => {
            history.forEach(m => addChatMessage(m.text, m.senderId === buyerId, m.voiceUrl, m.attachmentUrl, m.attachmentName));
        });
        socket.on('chat_message', (m) => {
            if (m.roomId === roomId && m.senderId !== buyerId) {
                addChatMessage(m.text, false, m.voiceUrl, m.attachmentUrl, m.attachmentName);
            }
        });
    }

    const sendMessage = (textVal = '', voiceNoteUrl = null, fileUrl = null, fileName = null) => {
        const text = textVal.trim() || inputEl.value.trim();
        if (!text && !voiceNoteUrl && !fileUrl) return;
        if (socket) {
            socket.emit('send_message', {
                roomId,
                senderId: buyerId,
                senderName: currentUser.name || 'Buyer',
                text: text || (voiceNoteUrl ? '🎙️ Voice Message' : '📎 Attachment'),
                voiceUrl: voiceNoteUrl,
                attachmentUrl: fileUrl,
                attachmentName: fileName
            });
        }
        addChatMessage(text || (voiceNoteUrl ? '🎙️ Voice Message' : '📎 Attachment'), true, voiceNoteUrl, fileUrl, fileName);
        inputEl.value = '';
        inputEl.focus();
    };

    sendBtn.addEventListener('click', () => sendMessage());
    inputEl.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); sendMessage(); } });

    // File attachments uploads (Requirement 3)
    fileAttachBtn.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', async () => {
        if (fileInput.files.length === 0) return;
        const file = fileInput.files[0];
        const formData = new FormData();
        formData.append('image', file);

        try {
            const res = await fetch('/api/upload/product', { method: 'POST', body: formData });
            if (res.ok) {
                const data = await res.json();
                sendMessage('', null, data.image, file.name);
            } else {
                alert('Upload failed.');
            }
        } catch (e) {
            console.error(e);
        }
        fileInput.value = '';
    });

    // Voice Message Recorder (Requirement 2)
    let mediaRecorder = null;
    let audioChunks = [];
    voiceRecBtn.addEventListener('click', async () => {
        if (mediaRecorder && mediaRecorder.state === 'recording') {
            mediaRecorder.stop();
            voiceStatusDiv.style.display = 'none';
            voiceRecBtn.style.color = 'var(--corporate-green)';
            return;
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            audioChunks = [];
            mediaRecorder = new MediaRecorder(stream);
            mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunks.push(e.data); };
            mediaRecorder.onstop = async () => {
                if (audioChunks.length === 0) return;
                const audioBlob = new Blob(audioChunks, { type: 'audio/mp3' });
                const reader = new FileReader();
                reader.onloadend = () => sendMessage('', reader.result, null, null);
                reader.readAsDataURL(audioBlob);
                stream.getTracks().forEach(track => track.stop());
            };
            mediaRecorder.start();
            voiceStatusDiv.style.display = 'flex';
            voiceRecBtn.style.color = 'var(--corporate-red)';
        } catch (err) {
            alert('Unable to access microphone.');
        }
    });

    cancelVoiceBtn.addEventListener('click', () => {
        if (mediaRecorder && mediaRecorder.state === 'recording') {
            mediaRecorder.onstop = null;
            mediaRecorder.stop();
            voiceStatusDiv.style.display = 'none';
            voiceRecBtn.style.color = 'var(--corporate-green)';
        }
    });

    saveAgreementBtn.addEventListener('click', async () => {
        const agreedPrice = parseFloat(document.getElementById('negotiated-price').value);
        const deposit = parseFloat(document.getElementById('negotiated-deposit').value) || 0;
        const tradeItem = document.getElementById('negotiated-trade-item').value.trim();
        const tradeValue = parseFloat(document.getElementById('negotiated-trade-value').value) || 0;

        if (!agreedPrice) return alert('Enter agreed price.');

        try {
            await api.saveChatAgreement({
                roomId, sellerId, buyerId, agreedPrice, deposit, tradeItem, tradeValue
            });
            alert('Negotiated trade agreement parameters recorded!');
            sendMessage(`🤝 Proposing Trade Terms: N$${agreedPrice} with Trade-in Offer: "${tradeItem || 'None'}" valued at N$${tradeValue}`);
        } catch (err) {
            alert('Failed to save trade agreement.');
        }
    });

    return modal;
};

export let categoryData = {
    'electronics': { name: 'Electronics', heroImage: 'https://images.unsplash.com/photo-1498049794561-7780e7231661?auto=format&fit=crop&w=1350&q=80', subcategories: ['phones', 'computers', 'tvs-audio', 'chargers-power', 'other-electronics'] },
    'phones': { name: 'Phones & Accessories', parent: 'electronics', heroImage: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=1350&q=80' },
    'computers': { name: 'Computers & Laptops', parent: 'electronics', heroImage: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&w=1350&q=80' },
    'tvs-audio': { name: 'TVs & Audio', parent: 'electronics', heroImage: 'https://images.unsplash.com/photo-1593305841991-05c297ba4575?auto=format&fit=crop&w=1350&q=80' },
    'chargers-power': { name: 'Chargers & Power Banks', parent: 'electronics', heroImage: 'https://images.unsplash.com/photo-1609592424109-dd9892f1b17c?auto=format&fit=crop&w=1350&q=80' },
    'other-electronics': { name: 'Other Electronics', parent: 'electronics', heroImage: 'https://images.unsplash.com/photo-1550745165-9bc0b252726a?auto=format&fit=crop&w=1350&q=80' },

    'solar': { name: 'Solar Energy', heroImage: 'https://images.unsplash.com/photo-1509391366360-2e959784a276?auto=format&fit=crop&w=1350&q=80', subcategories: ['solar-panels', 'solar-lights', 'inverters-batteries', 'solar-kits'] },
    'solar-panels': { name: 'Solar Panels', parent: 'solar', heroImage: 'https://images.unsplash.com/photo-1508514177221-188b1cf16e9d?auto=format&fit=crop&w=1350&q=80' },
    'solar-lights': { name: 'Solar Lights & Lamps', parent: 'solar', heroImage: 'https://images.unsplash.com/photo-1550985543-f47f38aee64e?auto=format&fit=crop&w=1350&q=80' },
    'inverters-batteries': { name: 'Inverters & Batteries', parent: 'solar', heroImage: 'https://images.unsplash.com/photo-1620714223084-8fcacc6dfd8d?auto=format&fit=crop&w=1350&q=80' },
    'solar-kits': { name: 'Solar Kits & Accessories', parent: 'solar', heroImage: 'https://images.unsplash.com/photo-1581092921461-eab62e97a780?auto=format&fit=crop&w=1350&q=80' },

    'fashion': { name: 'Fashion & Beauty', heroImage: 'https://images.unsplash.com/photo-1445205170230-053b83016050?auto=format&fit=crop&w=1350&q=80', subcategories: ['clothes-shoes', 'traditional-attire', 'beauty-products', 'jewellery-accessories'] },
    'clothes-shoes': { name: 'Clothes & Shoes', parent: 'fashion', heroImage: 'https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?auto=format&fit=crop&w=1350&q=80', subcategories: ['mens-clothing', 'womens-clothing', 'kids-clothing'] },
    'mens-clothing': { name: "Men's Clothing", parent: 'clothes-shoes', heroImage: 'https://images.unsplash.com/photo-1490367532201-b9bc1dc483f6?auto=format&fit=crop&w=1350&q=80' },
    'womens-clothing': { name: "Women's Clothing", parent: 'clothes-shoes', heroImage: 'https://images.unsplash.com/photo-1572804013427-4d7ca726b655?auto=format&fit=crop&w=1350&q=80' },
    'kids-clothing': { name: "Children's Clothing", parent: 'clothes-shoes', heroImage: 'https://images.unsplash.com/photo-1519457431-44cac6c763a4?auto=format&fit=crop&w=1350&q=80' },
    'traditional-attire': { name: 'Traditional Attire', parent: 'fashion', heroImage: 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=1350&q=80' },
    'beauty-products': { name: 'Beauty Products', parent: 'fashion', heroImage: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&w=1350&q=80' },
    'jewellery-accessories': { name: 'Jewellery & Accessories', parent: 'fashion', heroImage: 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?auto=format&fit=crop&w=1350&q=80' },

    'groceries': { name: 'Groceries', heroImage: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1350&q=80', subcategories: ['food-items', 'drinks-beverages', 'household-essentials'] },
    'food-items': { name: 'Food & Cooking Items', parent: 'groceries', heroImage: 'https://images.unsplash.com/photo-1506084868230-bb9d95c24759?auto=format&fit=crop&w=1350&q=80' },
    'drinks-beverages': { name: 'Drinks & Beverages', parent: 'groceries', heroImage: 'https://images.unsplash.com/photo-1527960656366-ee2a69d9e5c8?auto=format&fit=crop&w=1350&q=80' },
    'household-essentials': { name: 'Household Essentials', parent: 'groceries', heroImage: 'https://images.unsplash.com/photo-1583947215259-38e31be8751f?auto=format&fit=crop&w=1350&q=80' },

    'appliances': { name: 'Home Appliances', heroImage: 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=1350&q=80', subcategories: ['fridges-freezers', 'stoves-cookers', 'furniture', 'kitchen-tools'] },
    'fridges-freezers': { name: 'Fridges & Freezers', parent: 'appliances', heroImage: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=1350&q=80' },
    'stoves-cookers': { name: 'Stoves & Cookers', parent: 'appliances', heroImage: 'https://images.unsplash.com/photo-1525699078109-90605a3ee341?auto=format&fit=crop&w=1350&q=80' },
    'furniture': { name: 'Furniture', parent: 'appliances', heroImage: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=1350&q=80', subcategories: ['beds', 'tables', 'chairs', 'sofas', 'wardrobes'] },
    'beds': { name: 'Beds', parent: 'furniture', heroImage: 'https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=1350&q=80' },
    'tables': { name: 'Tables', parent: 'furniture', heroImage: 'https://images.unsplash.com/photo-1577140917170-285929fb55b7?auto=format&fit=crop&w=1350&q=80' },
    'chairs': { name: 'Chairs', parent: 'furniture', heroImage: 'https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?auto=format&fit=crop&w=1350&q=80' },
    'sofas': { name: 'Sofas', parent: 'furniture', heroImage: 'https://images.unsplash.com/photo-1540574163026-6addeaabfcdb?auto=format&fit=crop&w=1350&q=80' },
    'wardrobes': { name: 'Wardrobes', parent: 'furniture', heroImage: 'https://images.unsplash.com/photo-1558882224-cca166733360?auto=format&fit=crop&w=1350&q=80' },
    'kitchen-tools': { name: 'Kitchen Tools', parent: 'appliances', heroImage: 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=1350&q=80' },

    'vehicles': { name: 'Vehicles & Parts', heroImage: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=1350&q=80', subcategories: ['cars-bakkies', 'motorcycles', 'vehicle-parts', 'bicycles'] },
    'cars-bakkies': { name: 'Cars & Bakkies', parent: 'vehicles', heroImage: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=1350&q=80' },
    'motorcycles': { name: 'Motorcycles', parent: 'vehicles', heroImage: 'https://images.unsplash.com/photo-1558981806-ec527fa84c39?auto=format&fit=crop&w=1350&q=80' },
    'vehicle-parts': { name: 'Vehicle Parts & Tyres', parent: 'vehicles', heroImage: 'https://images.unsplash.com/photo-1486006920555-c77dce18193b?auto=format&fit=crop&w=1350&q=80' },
    'bicycles': { name: 'Bicycles', parent: 'vehicles', heroImage: 'https://images.unsplash.com/photo-1485965120184-e220f721d03e?auto=format&fit=crop&w=1350&q=80' },

    'crafts': { name: 'Local Crafts & Handmade', heroImage: 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&w=1350&q=80', subcategories: ['handmade-crafts', 'traditional-items', 'art-decor'] },
    'handmade-crafts': { name: 'Handmade Crafts', parent: 'crafts', heroImage: 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&w=1350&q=80' },
    'traditional-items': { name: 'Traditional Items', parent: 'crafts', heroImage: 'https://images.unsplash.com/photo-1561542320-9a18cd340469?auto=format&fit=crop&w=1350&q=80' },
    'art-decor': { name: 'Art & Decor', parent: 'crafts', heroImage: 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&w=1350&q=80' },

    'farm': { name: 'Farm & Food Products', heroImage: 'https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&w=1350&q=80', subcategories: ['fresh-produce', 'meat-poultry', 'farm-tools'] },
    'fresh-produce': { name: 'Fresh Produce', parent: 'farm', heroImage: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1350&q=80' },
    'meat-poultry': { name: 'Meat & Poultry', parent: 'farm', heroImage: 'https://images.unsplash.com/photo-1607623814075-e51df1bdc82f?auto=format&fit=crop&w=1350&q=80' },
    'farm-tools': { name: 'Farm Tools & Equipment', parent: 'farm', heroImage: 'https://images.unsplash.com/photo-1589923188900-85dae440342b?auto=format&fit=crop&w=1350&q=80' },

    'fuel': { name: 'Charcoal & Fuel', heroImage: 'https://images.unsplash.com/photo-1524491989244-1f40317fe6f0?auto=format&fit=crop&w=1350&q=80', subcategories: ['charcoal', 'firewood', 'other-fuel'] },
    'charcoal': { name: 'Charcoal', parent: 'fuel', heroImage: 'https://images.unsplash.com/photo-1524491989244-1f40317fe6f0?auto=format&fit=crop&w=1350&q=80' },
    'firewood': { name: 'Free firewood', parent: 'fuel', heroImage: 'https://images.unsplash.com/photo-1549400829-54c345333b29?auto=format&fit=crop&w=1350&q=80' },
    'other-fuel': { name: 'Other Fuel', parent: 'fuel', heroImage: 'https://images.unsplash.com/photo-1581094794329-c8112a89af12?auto=format&fit=crop&w=1350&q=80' },

    'other': { name: 'Other / Miscellaneous', heroImage: 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&w=1350&q=80', subcategories: ['books-stationery', 'sports-toys', 'services', 'anything-else'] },
    'books-stationery': { name: 'Books & Stationery', parent: 'other', heroImage: 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&w=1350&q=80' },
    'sports-toys': { name: 'Sports & Toys', parent: 'other', heroImage: 'https://images.unsplash.com/photo-1531525645387-7f14be1bdbbd?auto=format&fit=crop&w=1350&q=80' },
    'services': { name: 'Services', parent: 'other', heroImage: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=1350&q=80' },
    'anything-else': { name: 'Anything Else', parent: 'other', heroImage: 'https://images.unsplash.com/photo-151342789411-b6a5d4f31634?auto=format&fit=crop&w=1350&q=80' }
};

export const updateCategoryData = (settings) => {
    globalSettingsMap = settings || {};
    for (const key in settings) {
        if (key.startsWith('heroImage_') && categoryData[key.replace('heroImage_', '')]) {
            categoryData[key.replace('heroImage_', '')].heroImage = settings[key];
        }
    }
};

const getAppRoot = () => {
    const root = document.getElementById('app-root');
    if (!root) {
        const main = document.createElement('main');
        main.id = 'app-root';
        document.body.appendChild(main);
        return main;
    }
    return root;
};

export const clearRoot = () => {
    if (liveViewerInterval) {
        clearInterval(liveViewerInterval);
        liveViewerInterval = null;
    }
    const floatingChat = document.getElementById('floating-seller-chat');
    if (floatingChat) floatingChat.remove();

    const root = getAppRoot();
    if (root) root.innerHTML = '';
};

export const updateFloatingCartButton = () => {
    const cartCount = CartManager.getCartCount();
    const headerCart = document.getElementById('header-cart-btn') || document.querySelector('.cart');
    if (headerCart) {
        const hb = headerCart.querySelector('.cart-badge');
        if (hb) hb.textContent = cartCount;
        headerCart.classList.remove('hidden');
    }
};

export const initFloatingCart = () => {
    updateFloatingCartButton();
};

const formatCurrency = (amount) => `N$${(Number(amount) || 0).toLocaleString()}`;

export const calculateTimeRemaining = (endDate) => {
    if (!endDate) return null;
    const now = new Date();
    const end = new Date(endDate);
    const diff = end - now;
    
    if (diff <= 0) return null;
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const secs = Math.floor((diff % (1000 * 60)) / 1000);
    
    if (days > 0) {
        return `${days}d ${hours}h ${mins}m`;
    } else if (hours > 0) {
        return `${hours}h ${mins}m ${secs}s`;
    } else {
        return `${mins}m ${secs}s`;
    }
};

export const startLiveTimerUpdates = () => {
    if (window.liveTimerInterval) {
        clearInterval(window.liveTimerInterval);
    }

    window.liveTimerInterval = setInterval(() => {
        const allTimers = document.querySelectorAll('.product-timer .timer-countdown, .product-detail-timer .timer-display-large');
        let hasActiveTimers = false;

        allTimers.forEach(el => {
            const parent = el.closest('[data-sale-end-date], [data-combo-end-date]');
            if (!parent) return;

            const saleDate = parent.dataset.saleEndDate;
            const comboDate = parent.dataset.comboEndDate;
            const dateToUse = comboDate || saleDate; 

            if (dateToUse) {
                const timeLeft = calculateTimeRemaining(dateToUse);
                if (timeLeft) {
                    el.textContent = timeLeft;
                    hasActiveTimers = true;
                } else {
                    const foundTimer = el.closest('.product-timer, .product-detail-timer');
                    if (foundTimer) foundTimer.style.display = 'none';
                }
            }
        });

        if (!hasActiveTimers) {
            clearInterval(window.liveTimerInterval);
        }
    }, 1000);
};

const renderStars = (rating, reviewCount) => {
    if (!rating || reviewCount === 0) return `<div class="not-rated">Not Rated</div>`;
    let stars = '';
    const fullStars = Math.floor(rating);
    const halfStar = rating % 1 !== 0;
    const emptyStars = 5 - fullStars - (halfStar ? 1 : 0);

    for (let i = 0; i < fullStars; i++) stars += '<i class="fas fa-star"></i>';
    if (halfStar) stars += '<i class="fas fa-star-half-alt"></i>';
    for (let i = 0; i < emptyStars; i++) stars += '<i class="far fa-star"></i>';
    
    if (reviewCount !== undefined) {
        return `${stars} <span>(${reviewCount} reviews)</span>`;
    }
    return stars;
};

const createProductTags = (product, pageType) => {
    let rightTags = '';
    let leftTags = '';
    
    if (product.stock !== undefined && product.stock !== null) {
        leftTags += `<div class="product-tag stock-badge" style="background: linear-gradient(135deg, #cb152d, #ff6b6b);">${product.stock} left</div>`;
    }

    if (product.curatedPages && product.curatedPages.includes('combos')) {
        rightTags += `<div class="product-tag combo-tag">COMBO</div>`;
    }

    if (product.onSale && product.saleEndDate && new Date(product.saleEndDate) > new Date()) {
        if (pageType !== 'detail') {
            rightTags += `<div class="product-tag sale-tag">SALE</div>`;
        }
    }
    
    if (product.condition === 'second-hand') {
        rightTags += `<div class="product-tag second-hand-tag">PRE-OWNED</div>`;
    }
    
    return `
        ${leftTags ? `<div class="product-tags-left">${leftTags}</div>` : ''}
        ${rightTags ? `<div class="product-tags">${rightTags}</div>` : ''}
    `;
};

const createProductCard = (product) => {
    const isSoldOut = product.stock !== undefined && product.stock <= 0;
    const isCombo = product.curatedPages && product.curatedPages.includes('combos');
    const comboTimeLeft = isCombo ? calculateTimeRemaining(product.comboEndDate) : null;
    const saleTimeLeft = product.onSale ? calculateTimeRemaining(product.saleEndDate) : null;
    const savedAmount = product.oldPrice - product.currentPrice;
    
    let timerHTML = '';
    if (saleTimeLeft) {
        timerHTML += `<div class="product-timer sale-timer"><span class="timer-label">Sale Ends:</span> <span class="timer-countdown">${saleTimeLeft}</span></div>`;
    } else if (comboTimeLeft) {
        timerHTML += `<div class="product-timer sale-timer" style="background: linear-gradient(135deg, var(--corporate-blue), #2a7fec); border: 2px solid #4dabf7;"><span class="timer-label">Combo Ends:</span> <span class="timer-countdown">${comboTimeLeft}</span></div>`;
    }

    let promotionBannerHTML = '';
    if (product.promotionStatus && product.promotionStatus !== 'None') {
        promotionBannerHTML = `<div style="background: linear-gradient(135deg, #ff9800, #ff5722); color: white; padding: 4px 10px; font-weight: bold; font-size: 0.8rem; position: absolute; top: 12px; left: 12px; border-radius: 4px; z-index: 10; box-shadow: 0 2px 5px rgba(0,0,0,0.15);">${product.promotionStatus}</div>`;
    }

    const isVerifiedSeller = product.seller && product.seller.isVerified;
    const showBestSellerBadge = product.seller && product.seller.showBestSellerBadge;

    const badgesHTML = `
        <div style="display:flex; align-items:center; gap:6px; margin-top:4px;">
            ${isVerifiedSeller ? `<span style="color:#0084ff; font-weight:700; font-size:0.85rem;" title="Verified Reseller"><i class="fas fa-check-circle"></i> Verified</span>` : ''}
            ${showBestSellerBadge ? `<span style="background:#eacc52; color:#1d1d1f; padding:2px 6px; border-radius:4px; font-weight:700; font-size:0.75rem;" title="Top Performing Merchant">Best Seller</span>` : ''}
        </div>
    `;

    // Verified Tick on bottom-left and Best Seller verified badge on bottom-right
    const verifiedTickBadgeHTML = isVerifiedSeller 
        ? `<div class="verified-tick-badge" style="position: absolute; bottom: 10px; left: 10px; color: #0084ff; background: white; border-radius: 50%; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 8px rgba(0,0,0,0.15); z-index: 10;" title="Verified Reseller"><i class="fas fa-check-circle"></i></div>` 
        : '';

    // Free transport icon displaying next to the verified blue tick (Requirement 9 part B)
    const freeTransportBadgeHTML = (isVerifiedSeller && product.freeTransport)
        ? `<div class="free-transport-badge" style="position: absolute; bottom: 10px; left: 38px; color: #069a44; background: white; border-radius: 50%; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 8px rgba(0,0,0,0.15); z-index: 10;" title="Free Transport"><i class="fas fa-shipping-fast"></i></div>`
        : '';

    const bestSellerBadgeHTML = showBestSellerBadge 
        ? `<div class="best-seller-badge-container" style="position: absolute; bottom: 10px; right: 10px; background: #eacc52; color: #1d1d1f; padding: 4px 8px; border-radius: 4px; font-weight: 700; font-size: 0.75rem; box-shadow: 0 2px 8px rgba(0,0,0,0.15); z-index: 10;" title="Top Reseller">Best Seller</div>` 
        : '';
    
    const viewerLinkedReviews = (product.reviews || []).filter(r => r.viewerId);
    return `
        <a href="#product/${product.productId}" class="product-card" data-id="${product.productId}" data-sale-end-date="${product.saleEndDate || ''}" data-combo-end-date="${product.comboEndDate || ''}">
            <div class="product-image" style="position:relative;">
                ${promotionBannerHTML}
                ${createProductTags(product, 'card')}
                ${timerHTML}
                ${verifiedTickBadgeHTML}
                ${freeTransportBadgeHTML}
                ${bestSellerBadgeHTML}
                <img src="${product.image}" alt="${product.title}" onerror="this.onerror=null; this.src='https://via.placeholder.com/250x250.png?text=Image+Not+Found';">
            </div>
            <div class="product-details">
                <h3 class="product-title">${product.title}</h3>
                ${badgesHTML}
                ${viewerLinkedReviews.length > 0 ? `<div class="product-rating" style="margin-top:6px;">${renderStars(product.rating, product.reviewCount)}</div>` : ''}
                <div class="product-price">
                    ${formatCurrency(product.currentPrice)}
                    ${(savedAmount > 0) ? `<span class="original-price">${formatCurrency(product.oldPrice)}</span>` : ''}
                </div>
                ${(savedAmount > 0) ? `<div class="product-save-amount" style="color:var(--corporate-green); font-weight:700;">You save ${formatCurrency(savedAmount)}!</div>` : ''}
                <button class="add-to-cart-btn"${isLoggedIn() ? '' : ' data-guest="true"'} data-id="${product.productId}" ${isSoldOut ? 'disabled' : ''}>
                    ${isSoldOut ? 'Sold Out' : 'Add to Cart'}
                </button>
            </div>
        </a>
    `;
};

const getDefaultHeroImage = (pageKey, slideIdx) => {
    const defaults = {
        home: [
            'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80',
            'https://images.unsplash.com/photo-1550745165-9bc0b252726a?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80',
            'https://images.unsplash.com/photo-1601784551446-20c9e07cdbf1?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80',
            'https://images.unsplash.com/photo-1542223616-4a4b2f9b4b9f?auto=format&fit=crop&w=1350&q=80'
        ],
        about: [
            'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1350&q=80',
            'https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=1350&q=80',
            'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=1350&q=80',
            'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1350&q=80'
        ],
        'how-to-sell': [
            'https://images.unsplash.com/photo-1556742049-0cfed4f7a07d?auto=format&fit=crop&w=1350&q=80',
            'https://images.unsplash.com/photo-1556742502-ec7c0e9f34b1?auto=format&fit=crop&w=1350&q=80',
            'https://images.unsplash.com/photo-1563013544-824ae1d704d3?auto=format&fit=crop&w=800&q=60',
            'https://images.unsplash.com/photo-1472851294608-062f824d29cc?auto=format&fit=crop&w=1350&q=80'
        ]
    };

    if (defaults[pageKey]) return defaults[pageKey][slideIdx - 1];

    const catInfo = categoryData[pageKey];
    if (catInfo && catInfo.heroImage) {
        return catInfo.heroImage;
    }

    const fallbacks = [
        'https://images.unsplash.com/photo-1511556532299-8f662fc26c06?auto=format&fit=crop&w=1350&q=80',
        'https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=1350&q=80',
        'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1350&q=80',
        'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?auto=format&fit=crop&w=1350&q=80'
    ];
    return fallbacks[slideIdx - 1];
};

const getDefaultHeroTitle = (pageKey, slideIdx, defaultTitle) => {
    const homeTitles = [
        'NAMKUKU',
        'Start Selling Today',
        'Everyone is Welcome Here',
        'Better Prices, Better Life'
    ];
    if (pageKey === 'home') return homeTitles[slideIdx - 1];
    return `${defaultTitle} - Slide ${slideIdx}`;
};

const getDefaultHeroSubtitle = (pageKey, slideIdx) => {
    const homeSubtitles = [
        'Proudly Namibian Marketplace',
        'Take the brave step and grow your business on Namibia’s own marketplace',
        'From small sellers to big dreams — all Namibians belong on Namkuku',
        'Get quality phones, clothes & more at prices that make sense'
    ];
    if (pageKey === 'home') return homeSubtitles[slideIdx - 1];
    return '';
};

const getDefaultHeroDesc = (pageKey, slideIdx) => {
    const homeDescs = [
        'Buy quality. Sell your own. Built with love for every Namibian.',
        'Free to join • Easy to sell • Real support',
        'Shop local • Support local • Grow together',
        'Quality products without breaking the bank'
    ];
    if (pageKey === 'home') return homeDescs[slideIdx - 1];
    return '';
};

const getDefaultHeroBtnText = (pageKey, slideIdx) => {
    const homeBtns = [
        'Shop Local',
        'Start Selling',
        'Join Now',
        'Explore Deals'
    ];
    if (pageKey === 'home') return homeBtns[slideIdx - 1];
    return 'Explore More';
};

const getDefaultHeroBtnLink = (pageKey, slideIdx) => {
    const homeLinks = [
        '#category/clothes',
        '#how-to-sell',
        '#register',
        '#category/phones'
    ];
    if (pageKey === 'home') return homeLinks[slideIdx - 1];
    return '#home';
};

export const renderDynamicHero = (pageKey, defaultTitle) => {
    const slides = [1, 2, 3, 4].map(idx => {
        const image = globalSettingsMap[`${pageKey}_hero_image_${idx}`] || getDefaultHeroImage(pageKey, idx);
        const title = globalSettingsMap[`${pageKey}_hero_title_${idx}`] || getDefaultHeroTitle(pageKey, idx, defaultTitle);
        const subtitle = globalSettingsMap[`${pageKey}_hero_subtitle_${idx}`] || getDefaultHeroSubtitle(pageKey, idx);
        const desc = globalSettingsMap[`${pageKey}_hero_desc_${idx}`] || getDefaultHeroDesc(pageKey, idx);
        const btnText = globalSettingsMap[`${pageKey}_hero_btn_text_${idx}`] || getDefaultHeroBtnText(pageKey, idx);
        const btnLink = globalSettingsMap[`${pageKey}_hero_btn_link_${idx}`] || getDefaultHeroBtnLink(pageKey, idx);

        return { image, title, subtitle, desc, btnText, btnLink };
    });

    return `
        <section class="hero dynamic-hero" data-page="${pageKey}">
            <div class="slides-container">
                ${slides.map((slide, idx) => `
                    <div class="slide ${idx === 0 ? 'active' : ''}" style="background-image: linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.5)), url('${slide.image}');">
                        <div class="content">
                            <h1>${slide.title}</h1>
                            ${slide.subtitle ? `<p class="hero-subtitle">${slide.subtitle}</p>` : ''}
                            ${slide.desc ? `<p>${slide.desc}</p>` : ''}
                            <a href="${slide.btnLink}" class="cta" style="padding: 10px 22px; font-size: 15px;">${slide.btnText}</a>
                        </div>
                    </div>
                `).join('')}
            </div>
            <div class="carousel-controls" style="bottom: 25px;">
                <button class="prev" style="width: 40px; height: 40px; font-size: 15px;">&lt;</button>
                <div class="pagination"></div>
                <button class="next" style="width: 40px; height: 40px; font-size: 15px;">&gt;</button>
            </div>
        </section>
    `;
};

export const initDynamicHeros = () => {
    const heroes = document.querySelectorAll('.hero');
    heroes.forEach(hero => {
        const slides = hero.querySelectorAll('.slide');
        const pagination = hero.querySelector('.pagination');
        if (!pagination || slides.length === 0) return;

        pagination.innerHTML = '';
        slides.forEach((_, i) => {
            const dot = document.createElement('span');
            dot.classList.add('dot');
            if (i === 0) dot.classList.add('active');
            pagination.appendChild(dot);
        });

        const dots = pagination.querySelectorAll('.dot');
        let currentSlide = 0;
        let autoPlayTimer = null;
        let pauseTimeout = null;

        const showSlide = (n) => {
            currentSlide = n;
            slides.forEach((slide, i) => {
                slide.classList.toggle('active', i === n);
            });
            dots.forEach((dot, i) => {
                dot.classList.toggle('active', i === n);
            });
        };

        const nextSlide = () => {
            showSlide((currentSlide + 1) % slides.length);
        };

        const prevSlide = () => {
            showSlide((currentSlide - 1 + slides.length) % slides.length);
        };

        const startAutoPlay = () => {
            if (autoPlayTimer) clearInterval(autoPlayTimer);
            autoPlayTimer = setInterval(nextSlide, 8000); // Slowed speed to 8 seconds
        };

        const resetAutoPlayWithDelay = () => {
            if (autoPlayTimer) {
                clearInterval(autoPlayTimer);
                autoPlayTimer = null;
            }
            if (pauseTimeout) clearTimeout(pauseTimeout);
            pauseTimeout = setTimeout(startAutoPlay, 5000);
        };

        dots.forEach((dot, i) => {
            dot.addEventListener('click', () => {
                showSlide(i);
                resetAutoPlayWithDelay();
            });
        });

        const nextBtn = hero.querySelector('.next');
        const prevBtn = hero.querySelector('.prev');
        if (nextBtn) nextBtn.onclick = (e) => { e.preventDefault(); showSlide(currentSlide + 1); resetAutoPlayWithDelay(); };
        if (prevBtn) prevBtn.onclick = (e) => { e.preventDefault(); showSlide(currentSlide - 1); resetAutoPlayWithDelay(); };

        startAutoPlay();
        hero.dataset.intervalId = autoPlayTimer;
    });
};

export const populateHeroSlidesEditor = (pageKey) => {
    const container = document.getElementById('page-hero-slides-editor');
    if (!container) return;

    let slidesHTML = '';
    for (let i = 1; i <= 4; i++) {
        const keyImage = `${pageKey}_hero_image_${i}`;
        const keyTitle = `${pageKey}_hero_title_${i}`;
        const keySubtitle = `${pageKey}_hero_subtitle_${i}`;
        const keyDesc = `${pageKey}_hero_desc_${i}`;
        const keyBtnText = `${pageKey}_hero_btn_text_${i}`;
        const keyBtnLink = `${pageKey}_hero_btn_link_${i}`;

        const imgVal = globalSettingsMap[keyImage] || getDefaultHeroImage(pageKey, i);
        const titleVal = globalSettingsMap[keyTitle] || getDefaultHeroTitle(pageKey, i, pageKey.charAt(0).toUpperCase() + pageKey.slice(1));
        const subtitleVal = globalSettingsMap[keySubtitle] || getDefaultHeroSubtitle(pageKey, i);
        const descVal = globalSettingsMap[keyDesc] || getDefaultHeroDesc(pageKey, i);
        const btnTextVal = globalSettingsMap[keyBtnText] || getDefaultHeroBtnText(pageKey, i);
        const btnLinkVal = globalSettingsMap[keyBtnLink] || getDefaultHeroBtnLink(pageKey, i);

        slidesHTML += `
            <div style="border-bottom: 1px dashed var(--border-color); padding-bottom: 1.5rem; margin-bottom: 1.5rem;">
                <h4 style="color:var(--corporate-blue); margin-bottom:1rem; font-size:1.15rem;">Slide ${i} Configuration</h4>
                <div class="form-grid">
                    <div class="form-group">
                        <label>Image URL</label>
                        <input type="text" name="${keyImage}" placeholder="Image URL" value="${imgVal}">
                    </div>
                    <div class="form-group">
                        <label>Or Upload File</label>
                        <input type="file" class="dynamic-hero-file-input" data-setting-key="${keyImage}" accept="image/*">
                    </div>
                    <div class="form-group">
                        <label>Card Title</label>
                        <input type="text" name="${keyTitle}" value="${titleVal}">
                    </div>
                    <div class="form-group">
                        <label>Subtitle</label>
                        <input type="text" name="${keySubtitle}" value="${subtitleVal}">
                    </div>
                    <div class="form-group">
                        <label>Description</label>
                        <input type="text" name="${keyDesc}" value="${descVal}">
                    </div>
                    <div class="form-group">
                        <label>Button Text</label>
                        <input type="text" name="${keyBtnText}" value="${btnTextVal}">
                    </div>
                    <div class="form-group">
                        <label>Button Link</label>
                        <input type="text" name="${keyBtnLink}" value="${btnLinkVal}">
                    </div>
                </div>
            </div>
        `;
    }
    container.innerHTML = slidesHTML;
};

export const renderShippingInfoPage = () => {
    getAppRoot().innerHTML = `
        <div class="page-container static-page-container" style="margin-top: 2rem;">
            <p>At Namkuku, we strive to deliver your products as quickly and safely as possible.</p>
            <h3>Delivery Times</h3>
            <ul>
                <li><strong>Windhoek:</strong> Same day or next day delivery.</li>
                <li><strong>Major Towns (Swakopmund, Walvis Bay, Oshakati, etc.):</strong> 2-3 business days.</li>
                <li><strong>Remote Areas:</strong> 3-5 business days.</li>
            </ul>
        </div>
    `;
};

export const renderReturnsPage = () => {
    getAppRoot().innerHTML = `
        <div class="page-container static-page-container" style="margin-top: 2rem;">
            <h3>15-Day Return Policy</h3>
            <p>If you are not completely satisfied with your purchase, you can return it within 15 days of receipt for a full refund.</p>
            <h3>Warranty</h3>
            <p>All new products come with a standard warranty cover as listed on the product specifications.</p>
        </div>
    `;
};

export const renderTermsAndConditionsPage = () => {
    getAppRoot().innerHTML = `
        <div class="page-container static-page-container" style="margin-top: 2rem;">
            <p>Welcome to Namkuku. By using our website, you agree to these terms.</p>
            <h3>1. General</h3>
            <p>These terms apply to all purchases made on the Namkuku online store.</p>
        </div>
    `;
};

export const renderPrivacyPolicyPage = () => {
    getAppRoot().innerHTML = `
        <div class="page-container static-page-container" style="margin-top: 2rem;">
            <p>Your privacy is important to us.</p>
            <h3>Information Collection</h3>
            <p>We collect information you provide directly to us to process transactions and fulfill shipping services.</p>
        </div>
    `;
};

export const renderContactPage = () => {
    getAppRoot().innerHTML = `
        <div class="page-container static-page-container" style="margin-top: 2rem;">
            <p>Have questions? We're here to help!</p>
            <ul>
                <li><strong>Email:</strong> support@namkuku.com</li>
                <li><strong>Phone:</strong> +264 81 123 4567</li>
            </ul>
        </div>
    `;
};

export const renderHowToSellPage = () => {
    getAppRoot().innerHTML = `
        <div class="amazon-layout-wrapper" style="margin-top: 2rem;">
            <div class="amazon-section">
                <div class="amazon-section-header">
                    <h2>Why Sell on Namkuku?</h2>
                </div>
                <div class="amazon-card-grid">
                    <div class="amazon-card">
                        <h3>Reach More Customers</h3>
                        <p>Instantly access a growing database of tech-savvy Namibian shoppers.</p>
                    </div>
                </div>
            </div>
        </div>
    `;
};

export const renderTradeInPage = () => {
    getAppRoot().innerHTML = `
        <div class="page-container static-page-container" style="margin-top: 2rem;">
            <p>Upgrade to the latest tech for less by trading in your old device.</p>
        </div>
    `;
};

export const renderFaqsPage = async () => {
    let faqs = [];
    try {
        faqs = await api.fetchFAQs();
    } catch (e) {
        console.error(e);
    }

    const faqItems = faqs.length > 0
        ? faqs.map(f => `
            <div class="faq-item">
                <button class="faq-question">${f.question}</button>
                <div class="faq-answer"><p>${f.answer}</p></div>
            </div>`).join('')
        : '<p>No FAQs available at the moment.</p>';

    getAppRoot().innerHTML = `
        <div class="page-container static-page-container faq-container" style="margin-top: 2rem;">
            ${faqItems}
        </div>
    `;
    
    document.querySelectorAll('.faq-question').forEach(btn => {
        btn.addEventListener('click', () => {
            btn.classList.toggle('active');
            const ans = btn.nextElementSibling;
            if (btn.classList.contains('active')) {
                ans.style.maxHeight = ans.scrollHeight + 'px';
            } else {
                ans.style.maxHeight = 0;
            }
        });
    });
};

export const renderAboutPage = async () => {
    getAppRoot().innerHTML = `
        <div class="minimal-about-wrapper" style="margin-top: 2rem;">
            <div class="minimal-content-container">
                <h2>Our Philosophy</h2>
                <p>At Namkuku, we believe in premium experiences and accessibility for all Namibians.</p>
            </div>
        </div>
    `;
};

export const renderHomePage = async () => {
    let reviewsCardsHTML = '';
    try {
        const products = await api.fetchProducts();
        if(products) {
            const allReviews = (products || []).flatMap(p => (p.reviews || []).map(r => ({...r, productTitle: p.title}))).filter(r => r.rating === 5 && r.viewerId);
            reviewsCardsHTML = allReviews.length > 0
                ? allReviews.map(review => `
                    <div class="review-card">
                        <div class="review-stars">${renderStars(review.rating)}</div>
                        <p class="review-text">${review.text}</p>
                        <p class="review-author">${review.author} (${review.productTitle})</p>
                    </div>
                `).join('')
                : '<p>No 5-star reviews yet.</p>';
        }
    } catch (err) {
        reviewsCardsHTML = '<p>Could not load reviews.</p>';
    }

    const reviewsHTML = `
        <section class="reviews-carousel-section">
            <h2 class="section-title">What Our Customers Say</h2>
            <div class="reviews-carousel">
                <div class="reviews-carousel-track">
                    ${reviewsCardsHTML}
                </div>
            </div>
        </section>
    `;

    const defaultUnderHeroCards = [
      { title: "Trending Now", link: "#trending", image: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80" },
      { title: "New Arrivals", link: "#new-arrivals", image: "https://images.unsplash.com/photo-1546054454-aa26e2b734c7?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80" },
      { title: "Super Combos", link: "#combos", image: "https://images.unsplash.com/photo-1572594691920-87d1b7b7a8a0?auto=format&fit=crop&w=800&q=60" },
      { title: "Pre-Owned Deals", link: "#second-hand", image: "https://images.unsplash.com/photo-1598327105666-658454354c03?auto=format&fit=crop&w=800&q=60" },
      { title: "On Sale", link: "#on-sale", image: "https://images.unsplash.com/photo-1555774698-0b77e0d5fac6?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80" },
      { title: "Gaming Gear", link: "#category/gaming-accessories", image: "https://images.unsplash.com/photo-1598550476439-6847785fcea6?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80" }
    ];

    let underHeroCards = defaultUnderHeroCards;
    if (globalSettingsMap['home_under_hero_cards']) {
        try {
            underHeroCards = JSON.parse(globalSettingsMap['home_under_hero_cards']);
        } catch (e) {
            console.error('Failed to parse home_under_hero_cards', e);
            underHeroCards = defaultUnderHeroCards;
        }
    }

    const appRoot = getAppRoot();
    if(appRoot) {
        appRoot.innerHTML = `
            ${renderDynamicHero('home', 'NAMKUKU')}
            
            <div class="category-grid-container" style="padding: 40px 5%;">
                <section class="home-category-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 30px;">
                    ${underHeroCards.map(card => `
                        <a href="${card.link || '#'}" class="item" style="background-image: url('${card.image || ''}'); flex: none; width: 100%; height: 220px; border-radius: var(--border-radius); display: flex; flex-direction: column; justify-content: flex-end; padding: 30px; box-shadow: var(--shadow-soft); transition: var(--transition); background-size: cover; background-position: center; position: relative; overflow: hidden; text-decoration: none;">
                            <h2 style="font-size: 1.5rem; color: white; position: relative; z-index: 1;">${card.title || ''}</h2>
                            <span class="shop-now-btn" style="position: relative; z-index: 1; margin-top: 10px; padding: 8px 16px; background-color: var(--white); color: var(--corporate-blue); border-radius: 20px; font-weight: 600; text-decoration: none; font-size: 14px; display: inline-block; transition: var(--transition); align-self: flex-start;">Shop Now</span>
                        </a>
                    `).join('')}
                </section>
            </div>

            ${reviewsHTML}
        `;
    }
};

export const renderCategoryPage = async (products, categoryKey, searchTerm = '') => {
    const category = categoryData[categoryKey];
    let title = "Search Results";
    let heroHTML = '';

    if (category) {
        title = category.name;
        heroHTML = renderDynamicHero(categoryKey, category.name);
    }

    const isClothesLanding = categoryKey === 'clothes' || categoryKey === 'clothing' || categoryKey === 'mens-clothing' || categoryKey === 'womens-clothing' || categoryKey === 'clothes-shoes';
    const productGridHTML = products && products.length > 0 ? products.map(p => createProductCard(p)).join('') : (isClothesLanding ? `<h3>No clothes available at the moment.</h3>` : `<h3>No products found ${searchTerm ? `for "${searchTerm}"` : 'in this category yet'}.</h3>`);

    let clothingOptionsHTML = '';
    if (categoryKey === 'womens-clothing' || categoryKey === 'womens-clothes') {
        clothingOptionsHTML = `
            <option value="filter-tops">Shirts, Sweaters, Jerseys, and Jackets</option>
            <option value="filter-bottoms">Skirts, Trousers, Shorts, Dresses</option>
            <option value="filter-official">Official Attire</option>
            <option value="filter-traditional">Traditional Attire</option>
            <option value="filter-shoes">Shoes</option>
            <option value="filter-accessories">Accessories</option>
        `;
    } else if (categoryKey === 'mens-clothing' || categoryKey === 'mens-clothes') {
        clothingOptionsHTML = `
            <option value="filter-tops">Shirts, Sweaters, Jerseys, and Jackets</option>
            <option value="filter-bottoms">Trousers, Shorts</option>
            <option value="filter-official">Official Attire</option>
            <option value="filter-traditional">Traditional Attire</option>
            <option value="filter-shoes">Shoes</option>
            <option value="filter-accessories">Accessories</option>
        `;
    } else if (['furniture','furnitures','living-room','bedroom','office','kitchen'].includes(categoryKey)) {
        clothingOptionsHTML = `
            <option value="filter-furniture">Furniture</option>
            <option value="filter-appliances">Appliances</option>
        `;
    } else if (categoryKey === 'vehicles' || categoryKey === 'cars-bakkies') {
        clothingOptionsHTML = `
            <option value="filter-bakkies">Bakkies (Pickups)</option>
            <option value="filter-suvs">SUVs</option>
            <option value="filter-sedans">Sedans</option>
            <option value="filter-hatchbacks">Hatchbacks</option>
        `;
    } else if (categoryKey === 'real-estate') {
        clothingOptionsHTML = `
            <option value="filter-forsale">Properties For Sale</option>
            <option value="filter-forrent">Properties For Rent</option>
            <option value="filter-commercial">Commercial Property</option>
        `;
    } else if (categoryKey === 'food' || categoryKey === 'food-items') {
        clothingOptionsHTML = `
            <option value="filter-hotmeals">Hot Meals</option>
            <option value="filter-groceries">Groceries & Meat</option>
            <option value="filter-beverages">Beverages</option>
        `;
    } else if (categoryKey === 'books' || categoryKey === 'books-stationery') {
        clothingOptionsHTML = `
            <option value="filter-fiction">Fiction & Literature</option>
            <option value="filter-nonfiction">Non-Fiction & Self-Development</option>
            <option value="filter-spirituality">Spirituality & Consciousness</option>
            <option value="filter-heritage">Namibian Heritage & Local Interest</option>
            <option value="filter-children">Children's & Young Adult</option>
            <option value="filter-education">Education & Learning</option>
            <option value="filter-practical">Other Practical</option>
        `;
    }

    let secondHandFilterHTML = '';
    if (categoryKey === 'second-hand') {
        secondHandFilterHTML = `
            <div class="filter-group">
                <label for="second-hand-category-filter">Category:</label>
                <select id="second-hand-category-filter">
                    <option value="all">All Categories</option>
                    <option value="phones">Phones</option>
                    <option value="tablets">Tablets</option>
                    <option value="computers">Laptops & Computers</option>
                    <option value="gaming">Gaming</option>
                    <option value="furniture">Furniture</option>
                </select>
            </div>
        `;
    }

    let brandFilterDropdownHTML = '';
    if (isClothesLanding) {
        try {
            const brandsList = await api.fetchBrands();
            if (brandsList && brandsList.length > 0) {
                brandFilterDropdownHTML = `
                    <div class="filter-group">
                        <label for="brand-filter">Brand:</label>
                        <select id="brand-filter">
                            <option value="all">All Brands</option>
                            ${brandsList.map(b => `<option value="${b.name.toLowerCase()}">${b.name}</option>`).join('')}
                        </select>
                    </div>
                `;
            }
        } catch (err) {
            console.error('Failed to load brands for filter dropdown:', err);
        }
    }

    const filterControlsHTML = `
        <div class="filter-controls">
            ${secondHandFilterHTML}
            ${brandFilterDropdownHTML}
            <div class="filter-group">
                <label for="sort-by">Sort By:</label>
                <select id="sort-by">
                    <option value="default">Default</option>
                    ${clothingOptionsHTML}
                    <option value="price-asc">Price: Low to High</option>
                    <option value="price-desc">Price: High to Low</option>
                    <option value="name-asc">Name: A to Z</option>
                    <option value="name-desc">Name: Z to A</option>
                </select>
            </div>
        </div>
    `;

    // Dynamic icon lookup logic from custom admin uploads (Requirement 4)
    const getIconHTML = (itemKey, defaultSVG) => {
        const customUrl = globalSettingsMap[`clothes_sidebar_icon_${itemKey}`];
        if (customUrl) {
            return `<img src="${customUrl}" style="width:26px; height:26px; object-fit:contain; border-radius:4px;" alt="${itemKey}">`;
        }
        return defaultSVG;
    };

    let sidebarHTML = '';
    if (categoryKey === 'womens-clothing' || categoryKey === 'womens-clothes' || categoryKey === 'mens-clothing' || categoryKey === 'mens-clothes') {
        const womenExtraTabs = categoryKey === 'womens-clothing' || categoryKey === 'womens-clothes' ? `
                <div class="category-tab" data-filter="filter-official" title="Official Attire">
                    <div class="icon">${getIconHTML('official', '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M6 4h12v4h-2v10H8V8H6V4zm2 6h8V6H8v4z"/></svg>')}</div>
                    <div class="label">Official</div>
                </div>
                <div class="category-tab" data-filter="filter-traditional" title="Traditional Attire">
                    <div class="icon">${getIconHTML('traditional', '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M4 6h16v2l-2 12H6L4 8V6zm4 4h8V8H8v2z"/></svg>')}</div>
                    <div class="label">Traditional</div>
                </div>
            ` : '';

        sidebarHTML = `
            <aside class="category-sidebar" aria-hidden="false">
                <div class="category-tab" data-filter="filter-tops" title="Top">
                    <div class="icon">${getIconHTML('tops', '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M12 2l3 4h4v2c0 1-1 3-1 3s-3 1-5 1-5-1-5-1-1-2-1-3V6h4l3-4z"/></svg>')}</div>
                    <div class="label">Top</div>
                </div>
                <div class="category-tab" data-filter="filter-bottoms" title="Bottom">
                    <div class="icon">${getIconHTML('bottoms', '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M4 6h16v2l-2 10H6L4 8V6zM9 12h6v2H9v-2z"/></svg>')}</div>
                    <div class="label">Bottom</div>
                </div>
                ${womenExtraTabs}
                <div class="category-tab" data-filter="filter-shoes" title="Shoes">
                    <div class="icon">${getIconHTML('shoes', '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M2 14s2 4 8 4 10-4 10-4v-2h-2l-2 2H6l-4-2v2z"/></svg>')}</div>
                    <div class="label">Shoes</div>
                </div>
                <div class="category-tab" data-filter="filter-accessories" title="Accessories">
                    <div class="icon">${getIconHTML('accessories', '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M12 2a4 4 0 1 0 0 8 6 6 0 0 0 6 6h2a8 8 0 0 1-8-8 4 4 0 0 0-0-6z"/></svg>')}</div>
                    <div class="label">Accessories</div>
                </div>
                <div class="category-tab" data-filter="filter-glasses" title="Glasses">
                    <div class="icon">${getIconHTML('glasses', '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M4 10a4 4 0 0 1 8 0h-2a2 2 0 0 0-4 0H4zM20 10a4 4 0 0 0-8 0h2a2 2 0 0 1 4 0h2z"/></svg>')}</div>
                    <div class="label">Glasses</div>
                </div>
                <div class="category-tab" data-filter="filter-hats" title="Hats">
                    <div class="icon">${getIconHTML('hats', '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M2 12a10 10 0 0 1 20 0v2H2v-2z"/></svg>')}</div>
                    <div class="label">Hats</div>
                </div>
                <div class="category-tab" data-filter="filter-hats" title="Hats">
                    <div class="icon"><svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M12 16l-4-4h8l-4 4z"/></svg></div>
                </div>
            </aside>
        `;
    }

    getAppRoot().innerHTML = `
        ${heroHTML}
        <div class="page-container">
            <div class="category-layout">
                ${sidebarHTML}
                <main class="category-main">
                    ${searchTerm ? `<h2>Search results for: "${searchTerm}"</h2>` : ''}
                    ${filterControlsHTML}
                    <div class="products-grid" style="margin-top: 1rem;">
                        ${productGridHTML}
                    </div>
                </main>
            </div>
        </div>
    `;
    
    let currentDisplayed = Array.isArray(products) ? [...products] : [];

    setTimeout(() => {
        const sidebar = document.querySelector('.category-sidebar');
        const sidebarTabs = document.querySelectorAll('.category-sidebar .category-tab');
        const sortEl = document.getElementById('sort-by');
        if (sidebar && sidebarTabs && sidebarTabs.length > 0) {
            const savedSidebarState = localStorage.getItem('categorySidebarState') || 'collapsed';
            const savedSidebarFilter = localStorage.getItem('categorySidebarFilter');

            if (savedSidebarState === 'minimized') {
                sidebar.classList.add('minimized');
            } else {
                sidebar.classList.add('collapsed');
            }

            if (sortEl && savedSidebarFilter && Array.from(sortEl.options).some(opt => opt.value === savedSidebarFilter)) {
                sortEl.value = savedSidebarFilter;
                sortEl.dispatchEvent(new Event('change'));
            }

            sidebarTabs.forEach(tab => {
                if (tab.classList.contains('more')) return;
                tab.addEventListener('click', () => {
                    sidebarTabs.forEach(t => t.classList.remove('selected'));
                    tab.classList.add('selected');
                    const filter = tab.dataset.filter || 'default';
                    localStorage.setItem('categorySidebarFilter', filter);
                    if (sortEl) {
                        sortEl.value = filter === 'default' ? 'default' : filter;
                        sortEl.dispatchEvent(new Event('change'));
                    }
                });
            });

            const moreTab = document.querySelector('.category-sidebar .category-tab.more');
            if (moreTab) {
                const minimized = sidebar.classList.contains('minimized');
                moreTab.setAttribute('title', minimized ? 'Maximize sidebar' : 'Minimize sidebar');
                moreTab.setAttribute('aria-expanded', String(!minimized));
                moreTab.addEventListener('click', () => {
                    const hidden = sidebar.classList.toggle('minimized');
                    localStorage.setItem('categorySidebarState', hidden ? 'minimized' : 'collapsed');
                    moreTab.setAttribute('title', hidden ? 'Maximize sidebar' : 'Minimize sidebar');
                    moreTab.setAttribute('aria-expanded', String(!hidden));
                    if (!hidden) {
                        sidebar.classList.add('collapsed');
                    }
                });
            }

            const activeFilter = savedSidebarFilter || 'filter-tops';
            const sel = document.querySelector(`.category-sidebar .category-tab[data-filter="${activeFilter}"]`);
            if (sel) sel.classList.add('selected');
            else {
                const defaultSel = document.querySelector('.category-sidebar .category-tab[data-filter="filter-tops"]');
                if (defaultSel) defaultSel.classList.add('selected');
            }
        }
    }, 50);

    if (categoryKey === 'second-hand') {
        const secondHandFilter = document.getElementById('second-hand-category-filter');
        if (secondHandFilter) {
            secondHandFilter.addEventListener('change', (e) => {
                const filterVal = e.target.value;
                if (filterVal === 'all') {
                    currentDisplayed = [...products];
                } else {
                    currentDisplayed = products.filter(p => {
                        const cat = (p.category || '').toLowerCase();
                        if (filterVal === 'phones') return cat.includes('phone') || cat === 'iphones';
                        if (filterVal === 'tablets') return cat.includes('tablet') || cat.includes('ipad') || cat.includes('tab');
                        if (filterVal === 'computers') return cat.includes('laptop') || cat.includes('macbook') || cat.includes('imac') || cat.includes('aio') || cat.includes('computer');
                        if (filterVal === 'gaming') return cat.includes('game') || cat.includes('gaming') || cat.includes('playstation') || cat.includes('xbox') || cat.includes('nintendo');
                        if (filterVal === 'furniture') return cat.includes('furniture') || cat.includes('chair') || cat.includes('sofa') || cat.includes('table') || cat.includes('living') || cat.includes('bed') || cat.includes('office') || cat.includes('kitchen');
                        return false;
                    });
                }
                
                const sortBy = document.getElementById('sort-by');
                if(sortBy) sortBy.value = 'default';

                const newGridHTML = currentDisplayed.length > 0 
                    ? currentDisplayed.map(p => createProductCard(p)).join('') 
                    : '<h3>No products found in this category.</h3>';
                
                document.querySelector('.products-grid').innerHTML = newGridHTML;
                startLiveTimerUpdates();
            });
        }
    }

    const brandFilterDropdown = document.getElementById('brand-filter');
    if (brandFilterDropdown) {
        brandFilterDropdown.addEventListener('change', (e) => {
            const selectedBrand = e.target.value;
            let filteredResults = [];
            
            if (selectedBrand === 'all') {
                filteredResults = [...products];
            } else {
                filteredResults = products.filter(p => {
                    const filtersList = Array.isArray(p.clothingFilters) ? p.clothingFilters.map(f => f.toLowerCase()) : [];
                    return filtersList.includes(`brand-${selectedBrand}`) || 
                           filtersList.includes(selectedBrand) || 
                           (p.title && p.title.toLowerCase().includes(selectedBrand));
                });
            }
            
            currentDisplayed = filteredResults;
            const sortVal = document.getElementById('sort-by')?.value || 'default';
            if (sortVal !== 'default' && !sortVal.startsWith('filter-')) {
                const [sortBy, order] = sortVal.split('-');
                if (sortBy === 'price') {
                    currentDisplayed.sort((a, b) => order === 'asc' ? a.currentPrice - b.currentPrice : b.currentPrice - a.currentPrice);
                } else if (sortBy === 'name') {
                    currentDisplayed.sort((a, b) => order === 'asc' ? a.title.localeCompare(b.title) : b.title.localeCompare(a.title));
                }
            }

            const newGridHTML = currentDisplayed.length > 0 
                ? currentDisplayed.map(p => createProductCard(p)).join('') 
                : '<h3>No products match this brand selection.</h3>';
            
            document.querySelector('.products-grid').innerHTML = newGridHTML;
            startLiveTimerUpdates();
        });
    }

    const filterMap = {
        tops: ['shirt','sweater','jersey','jacket','coat','blazer','top','hoodie'],
        bottoms: ['skirt','trouser','trousers','pants','shorts','dress','jean','jeans'],
        official: ['uniform','official','suit','blazer','tie','blouse'],
        traditional: ['traditional','attire','ethnic','kandeka','oshifima','shaku'],
        shoes: ['shoe','sneaker','boot','sandals','heel','loafer','trainer'],
        accessories: ['belt','hat','cap','scarf','bag','purse','sunglass','jewel','watch'],
        furniture: ['sofa','sofas','couch','table','tables','chair','chairs','bed','beds','desk','shelf','cabinet','furniture','wardrobe','dresser'],
        appliances: ['fridge','refrigerator','oven','stove','microwave','washer','dryer','appliance','blender','toaster','kettle'],
        bakkies: ['bakkie', 'hilux', 'pickup', 'truck'],
        suvs: ['suv', 'toyota', 'raider', 'fortuner', 'sport'],
        sedans: ['sedan', 'vw', 'polo', 'comfortline', 'car'],
        hatchbacks: ['hatchbacks', 'hatchback', 'clio', 'golf'],
        forsale: ['sale', 'buy', 'house', 'plot', 'erf', 'modern'],
        forrent: ['rent', 'rental', 'apartment', 'flat', 'room', 'studio'],
        commercial: ['commercial', 'office', 'warehouse', 'shop', 'retail'],
        hotmeals: ['kapana', 'meal', 'platter', 'braai', 'porridge', 'traditional'],
        groceries: ['biltong', 'meat', 'spices', 'vegetables', 'fruit', 'combo'],
        beverages: ['juice', 'coffee', 'tea', 'drink', 'beer', 'soda', 'cool-drink'],
        fiction: ['literature', 'novel', 'andreas', 'violet', 'story', 'fiction'],
        nonfiction: ['mindset', 'development', 'self', 'habits', 'growth', 'non-fiction'],
        spirituality: ['conscious', 'living', 'spirit', 'meditation', 'zen'],
        heritage: ['heritage', 'braves', 'traditional', 'namibian', 'history', 'local'],
        children: ['children', 'young', 'adult', 'kids-book', 'fairy'],
        education: ['learning', 'science', 'math', 'textbook', 'school'],
        practical: ['practical', 'cook', 'diy', 'garden', 'guide']
    };

    const sortByEl = document.getElementById('sort-by');
    if (sortByEl) {
        sortByEl.addEventListener('change', (e) => {
            const val = e.target.value;
            const sidebarTabs = document.querySelectorAll('.category-sidebar .category-tab');
            if (sidebarTabs && sidebarTabs.length > 0) {
                sidebarTabs.forEach(t => t.classList.remove('selected'));
                if (val.startsWith('filter-')) {
                    const selectedTab = document.querySelector(`.category-sidebar .category-tab[data-filter="${val}"]`);
                    if (selectedTab) selectedTab.classList.add('selected');
                }
            }
            if (val.startsWith('filter-')) {
                localStorage.setItem('categorySidebarFilter', val);
                const key = val.replace('filter-', '');
                if (key === 'default') {
                    currentDisplayed = Array.isArray(products) ? [...products] : [];
                } else {
                    const keywords = filterMap[key] || [];
                    if (key === 'furniture' || key === 'appliances') {
                        currentDisplayed = (products || []).filter(p => {
                            const filtersArr = Array.isArray(p.clothingFilters) ? p.clothingFilters.map(x => (x||'').toLowerCase()) : [];
                            if (filtersArr.includes(key)) return true;
                            const singular = key.replace(/s$/,'');
                            if (filtersArr.includes(singular)) return true;
                            if (filtersArr.includes(key + 's')) return true;
                            if (key === 'appliances' && (filtersArr.includes('appliance') || filtersArr.includes('appliances'))) return true;
                            return false;
                        });
                    } else {
                        currentDisplayed = (products || []).filter(p => {
                            const title = (p.title || '').toLowerCase();
                            const cat = (p.category || '').toLowerCase();
                            const filtersArr = Array.isArray(p.clothingFilters) ? p.clothingFilters.map(x => (x||'').toLowerCase()) : [];
                            const filterMatches = () => {
                                if (filtersArr.includes(key)) return true;
                                const singular = key.replace(/s$/,'');
                                if (filtersArr.includes(singular)) return true;
                                if (filtersArr.includes(key + 's')) return true;
                                if (key === 'appliances' && (filtersArr.includes('appliance') || filtersArr.includes('appliances'))) return true;
                                return false;
                            };
                            return keywords.some(k => title.includes(k) || cat.includes(k)) || filterMatches();
                        });
                    }
                }

                const brandVal = document.getElementById('brand-filter')?.value;
                if (brandVal && brandVal !== 'all') {
                    currentDisplayed = currentDisplayed.filter(p => {
                        const filtersList = Array.isArray(p.clothingFilters) ? p.clothingFilters.map(f => f.toLowerCase()) : [];
                        return filtersList.includes(`brand-${brandVal}`) || filtersList.includes(brandVal) || (p.title && p.title.toLowerCase().includes(brandVal));
                    });
                }

                const newGridHTML = currentDisplayed.map(p => createProductCard(p)).join('');
                document.querySelector('.products-grid').innerHTML = newGridHTML;
                startLiveTimerUpdates();
                return;
            }

            const [sortBy, order] = val.split('-');
            let sortedProducts = [...currentDisplayed];
            if (sortBy === 'price') {
                sortedProducts.sort((a, b) => order === 'asc' ? a.currentPrice - b.currentPrice : b.currentPrice - a.currentPrice);
            } else if (sortBy === 'name') {
                sortedProducts.sort((a, b) => order === 'asc' ? a.title.localeCompare(b.title) : b.title.localeCompare(a.title));
            } else if (val === 'default') {
                if (categoryKey === 'second-hand') {
                     sortedProducts = Array.isArray(products) ? [...products] : [];
                     const catFilter = document.getElementById('second-hand-category-filter');
                     if(catFilter) catFilter.value = 'all';
                } else {
                     sortedProducts = Array.isArray(products) ? [...products] : [];
                }
                const brandVal = document.getElementById('brand-filter')?.value;
                if (brandVal && brandVal !== 'all') {
                    sortedProducts = sortedProducts.filter(p => {
                        const filtersList = Array.isArray(p.clothingFilters) ? p.clothingFilters.map(f => f.toLowerCase()) : [];
                        return filtersList.includes(`brand-${brandVal}`) || filtersList.includes(brandVal) || (p.title && p.title.toLowerCase().includes(brandVal));
                    });
                }
            }

            const newGridHTML = sortedProducts.map(p => createProductCard(p)).join('');
            document.querySelector('.products-grid').innerHTML = newGridHTML;
            startLiveTimerUpdates();
        });
    }

    try {
        const focusId = sessionStorage.getItem('focusProduct');
        if (focusId) {
            setTimeout(() => {
                const el = document.querySelector(`.products-grid .product-card[data-id="${focusId}"]`);
                if (el) {
                    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    el.classList.add('product-highlight');
                    setTimeout(() => el.classList.remove('product-highlight'), 4000);
                }
            }, 150);
            sessionStorage.removeItem('focusProduct');
        }
    } catch (err) {
        console.warn('Could not focus product after navigation', err);
    }
    
    startLiveTimerUpdates();
};

export const renderProductPage = async (product) => {
    if (!product) { getAppRoot().innerHTML = '<h2>Product not found</h2>'; return; }

    let similarProducts = [];
    try {
        similarProducts = await api.fetchProducts(product.category);
    } catch (err) {
        console.warn('Could not fetch similar products by category', err);
    }

    let filteredSimilar = (similarProducts || [])
        .filter(p => p.productId !== product.productId)
        .slice(0, 4);

    if (filteredSimilar.length === 0) {
        try {
            const allProducts = await api.fetchProducts();
            filteredSimilar = (allProducts || [])
                .filter(p => p.productId !== product.productId)
                .slice(0, 4);
        } catch (err) {
            console.warn('Could not fetch fallback similar products', err);
        }
    }

    let similarProductsHTML = '';
    if (filteredSimilar && filteredSimilar.length > 0) {
        similarProductsHTML = `
            <section class="similar-products-section page-container">
                <h2 class="section-title">You Might Also Like</h2>
                <div class="products-grid">
                    ${filteredSimilar.map(p => createProductCard(p)).join('')}
                </div>
            </section>
        `;
    }

    let fiveStarReviews = [];
    if (product.reviews && product.reviews.length > 0) {
        fiveStarReviews = product.reviews.filter(r => r.rating === 5 && r.viewerId);
    }
    const viewerLinkedReviews = (product.reviews || []).filter(r => r.viewerId);
    const textReviews = viewerLinkedReviews.filter(r => r.text && r.text.trim().length > 0);
    const reviewsHTML = textReviews.length > 0
        ? textReviews.map(review => `<div class="review"><div class="product-rating">${renderStars(review.rating)}</div><p class="review-author">by ${review.author}</p><p>${review.text}</p></div>`).join('')
        : '<p>0 reviews</p>';

    let fiveStarSectionHTML = '';
    if (fiveStarReviews.length > 0) {
        fiveStarSectionHTML = `
            <section class="five-star-reviews">
                <h3>5-Star Reviews (${fiveStarReviews.length})</h3>
                ${fiveStarReviews.map(r => `<div class="review"><div class="product-rating">${renderStars(r.rating)}</div><p class="review-author">by ${r.author}</p><p>${r.text}</p></div>`).join('')}
            </section>
        `;
    }
        
    const featuresListHTML = product.features && product.features.length > 0
        ? `<ul>${product.features.map(feature => `<li>${feature}</li>`).join('\n')}</ul>`
        : '';

    let canViewDescription = product.description && product.description.trim() !== '';

    let transportHTML = `
        <div style="background:#f5f5f7; border:1px solid #d2d2d7; color:#1d1d1f; padding:12px; border-radius:8px; margin-top:10px; font-size:0.9rem;">
            <div style="font-size: 0.9rem; color: var(--text-light); display: flex; align-items: center; gap: 6px;">
                <i class="fas fa-shopping-bag"></i> Products Sold: <strong>${product.purchaseCount || 0}</strong>
            </div>
        </div>`;

    if (product.freeTransport) {
        transportHTML = `
            <div style="background:#e6ffed; border:1px solid #b7eb8f; color:#2e7d32; padding:12px; border-radius:8px; margin-top:10px; font-weight:700;">
                <i class="fas fa-truck"></i> Free Delivery Eligible!
                <div style="margin-top: 8px; font-size: 0.9rem; color: #444; display: flex; align-items: center; gap: 6px; border-top: 1px solid #b7eb8f; padding-top: 8px;">
                    <i class="fas fa-shopping-bag"></i> Products Sold: <strong>${product.purchaseCount || 0}</strong>
                </div>
            </div>`;
    }

    const colorOptionsHTML = product.colorsEnabled && product.colors && product.colors.length > 0
        ? `<div class="color-options"><h4>Available Colors:</h4><div class="color-swatches">${product.colors.map((color, idx) => `<button type="button" class="color-swatch ${idx === 0 ? 'selected' : ''}" data-color="${color}" style="background-color: ${color.toLowerCase()};" title="${color}" aria-label="Select ${color} color"></button>`).join('')}</div></div>`
        : '';
    
    const hasSizes = product.sizes && product.sizes.length > 0;
    const sizeOptionsHTML = hasSizes
        ? `<div class="size-options" style="margin: 1.5rem 0; padding: 1.2rem; background-color: var(--background-light); border-radius: 12px;">
            <h4 style="margin-bottom: 1rem;">Available Sizes:</h4>
            <div class="size-selectors" style="display: flex; gap: 10px; flex-wrap: wrap;">
                ${product.sizes.map((size, idx) => `
                    <button type="button" class="size-btn ${idx === 0 ? 'selected' : ''}" data-size="${size}" style="padding: 10px 15px; border: 2px solid var(--border-color); background: white; border-radius: 8px; cursor: pointer; font-weight: 600; min-width: 45px;">${size}</button>
                `).join('')}
            </div>
           </div>`
        : '';

    const isCombo = product.curatedPages && product.curatedPages.includes('combos');
    const comboTimeLeft = isCombo ? calculateTimeRemaining(product.comboEndDate) : null;
    const saleTimeLeft = product.onSale ? calculateTimeRemaining(product.saleEndDate) : null;
    
    let topBarTimerHTML = '';
    if (saleTimeLeft) {
        topBarTimerHTML = `
            <div class="product-detail-timer sale-timer">
                <div class="timer-title"><i class="fas fa-fire"></i> Sale Ends:</div>
                <div class="timer-display-large">${saleTimeLeft}</div>
            </div>`;
    } else if (comboTimeLeft) {
        topBarTimerHTML = `
            <div class="product-detail-timer sale-timer" style="background: linear-gradient(135deg, var(--corporate-blue), #2a7fec); color: var(--white);">
                <div class="timer-title"><i class="fas fa-star"></i> Combo Deal Ends:</div>
                <div class="timer-display-large">${comboTimeLeft}</div>
            </div>`;
    }
        
    let giftRewardHTML = '';
    if (product.giftCardEnabled && product.giftCardValue > 0) {
        let rewardAmount = 0;
        let rewardText = '';
    
        if (product.giftCardType === 'fixed') {
            rewardAmount = product.giftCardValue;
            rewardText = `<strong>${formatCurrency(rewardAmount)}</strong>`;
        } else {
            rewardAmount = (product.currentPrice * product.giftCardValue) / 100;
            rewardText = `<strong>${formatCurrency(rewardAmount)}</strong> (${product.giftCardValue}%)`;
        }
    
        if (rewardAmount > 0) {
            giftRewardHTML = `
                <div class="gift-reward">
                    <p><i class="fas fa-gift"></i> Earn a ${rewardText} gift reward with this purchase to spend on your next purchase!</p>
                </div>`;
        }
    }
    const savedAmount = (product.oldPrice || 0) - (product.currentPrice || 0);
    const isActuallyOnSale = savedAmount > 0;

    // Trust Toggles filtering logic: only display activated badges (Requirement 5)
    const warrantyText = product.seller?.defaultWarranty || product.warrantyDuration || '1-Year Warranty';
    const deliveryText = product.seller?.defaultDeliveryOption || 'Delivery Nationwide';

    const trustBar1Items = [];
    if (product.showTradeIn !== false) trustBar1Items.push(`<div class="trust-info-item"><i class="fas fa-exchange-alt"></i> Trade-In</div>`);
    if (product.showLayBye !== false) trustBar1Items.push(`<div class="trust-info-item"><i class="fas fa-calendar-alt"></i> Lay-Bye</div>`);
    if (product.showDeposit !== false) trustBar1Items.push(`<div class="trust-info-item"><i class="fas fa-percent"></i> Deposit</div>`);

    const trustBar2Items = [];
    // Activated Delivery Nationwide when toggle in relevant reseller dashboard is checked (Requirement 5)
    if (product.showDeliveryNationwide !== false) {
        trustBar2Items.push(`<div class="trust-info-item"><i class="fas fa-truck"></i> ${deliveryText}</div>`);
    }
    if (product.showOneYearWarranty !== false) trustBar2Items.push(`<div class="trust-info-item"><i class="fas fa-shield-alt"></i> ${warrantyText}</div>`);
    if (product.showFifteenDayReturns !== false) trustBar2Items.push(`<div class="trust-info-item"><i class="fas fa-undo"></i> 15-Day Returns</div>`);
    
    let trustBarHTML = '';
    if (trustBar1Items.length > 0 || trustBar2Items.length > 0) {
        trustBarHTML = `
            <div class="trust-info-bar">
                ${trustBar1Items.join('')}
                ${trustBar2Items.join('')}
            </div>
        `;
    }

    // Dynamic safe delivery insurance info block
    let safeInsuranceBannerHTML = '';
    if (product.safeInsuranceEnabled && product.safeInsurancePrice > 0) {
        safeInsuranceBannerHTML = `
            <div style="background:#eaf5ff; border:1px solid #91caff; color:#1890ff; padding:12px; border-radius:8px; margin-top:10px; font-weight:700;">
                <i class="fas fa-shield-halved"></i> Safe Delivery Insurance available for ${formatCurrency(product.safeInsurancePrice)}
            </div>`;
    }

    getAppRoot().innerHTML = `
        <div class="page-container product-page-container" data-sale-end-date="${product.saleEndDate || ''}" data-combo-end-date="${product.comboEndDate || ''}">
            <div class="product-page-top-bar">
                <a href="#category/${product.category}" class="back-to-products"><i class="fas fa-arrow-left"></i> Back to ${product.category}</a>
            </div>
            <div class="product-main">
                <div class="gallery-section">
                    ${createProductTags(product, 'detail')}
                    <div id="image-viewer-count" class="image-viewer-count" style="display: none;"></div>
                    <div class="main-image-container">
                        <img src="${product.image}" alt="${product.title}" class="main-image" id="main-image" onerror="this.onerror=null; this.src='https://via.placeholder.com/500x500.png?text=Image+Not+Found';">
                    </div>
                    <div class="thumbnails">${[product.image, ...(product.thumbnails || [])].map((thumb, i) => `<img src="${thumb}" class="thumbnail ${i === 0 ? 'active' : ''}" data-full="${thumb}" onerror="this.onerror=null; this.src='https://via.placeholder.com/100x100.png?text=Error';">`).join('')}</div>
                </div>
                <div class="details-section">
                    <h1>${product.title}</h1>
                    ${product.seller ? `
                    <div class="seller-info" style="margin: 12px 0; display:flex; align-items:center; gap:12px;">
                        <div class="seller-avatar" style="width:56px;height:56px;border-radius:50%;background:#f1f1f1;display:flex;align-items:center;justify-content:center;font-weight:700;color:#444;overflow:hidden;border:1px solid #ddd;">
                            ${product.seller.profileImage 
                                ? `<img src="${product.seller.profileImage}" style="width:100%; height:100%; object-fit:cover;">` 
                                : (product.seller.businessName || product.seller.name || 'S').charAt(0)}
                        </div>
                        <div class="seller-meta" style="flex:1;">
                            <div style="display:flex;align-items:center;gap:8px;">
                                <div style="font-weight:700;font-size:1rem;">${product.seller.businessName || product.seller.name}</div>
                                ${product.seller.isVerified ? '<div class="verified-badge" title="Verified seller" style="color:var(--corporate-blue);display:flex;align-items:center;gap:6px;"><i class="fas fa-check-circle"></i> Verified</div>' : ''}
                                ${product.seller.showBestSellerBadge ? `<span style="background:#eacc52; color:#1d1d1f; padding: 2px 6px; border-radius: 4px; font-weight: 700; font-size: 0.75rem;" title="Top Performing Merchant">Best Seller</span>` : ''}
                            </div>
                            <div style="font-size:0.9rem;color:#666;margin-top:4px;">${product.seller.location || ''} ${product.seller.sellerRating ? `· ${renderStars(product.seller.sellerRating)} (${Number(product.seller.sellerRating).toFixed(1)})` : ''}</div>
                        </div>
                    </div>
                    ` : ''}
                    ${(viewerLinkedReviews.length > 0) ? `<div class="product-rating">${renderStars(product.rating, product.reviewCount)}</div>` : ''}
                    <div class="product-price">
                        ${formatCurrency(product.currentPrice)}
                        ${isActuallyOnSale ? `<span class="original-price">${formatCurrency(product.oldPrice)}</span><span class="save-badge">Save ${formatCurrency(savedAmount)}</span>` : ''}
                    </div>
                    
                    <!-- Display Warranty details -->
                    <div style="background:#f9f9fb; padding:15px; border-radius:10px; margin: 15px 0;">
                        <div style="font-weight:700;"><i class="fas fa-shield-alt"></i> Warranty:</div>
                        <div style="font-size:1.1rem; color:var(--corporate-blue); margin-top:4px;">${warrantyText}</div>
                    </div>

                    ${giftRewardHTML}
                    ${transportHTML}
                    ${safeInsuranceBannerHTML}
                    ${colorOptionsHTML}
                    ${sizeOptionsHTML}

                    ${trustBarHTML}
                    
                    <div style="margin-top: 15px; display:flex; flex-direction:column; gap:8px;">
                        <button class="add-to-cart-btn" id="btn-add-cart-detail" ${product.stock !== undefined && product.stock <= 0 ? 'disabled' : ''}>
                            ${product.stock !== undefined && product.stock <= 0 ? 'Sold Out' : 'Add to Cart'}
                        </button>
                    </div>
                    
                    <div class="product-info-tabs">
                        <div class="tab-buttons">
                            <button class="tab-btn active" data-tab="description">Description</button>
                            <button class="tab-btn" data-tab="reviews">Reviews (${product.reviewCount})</button>
                        </div>
                        <div id="description" class="tab-content active">
                            ${featuresListHTML}
                            ${canViewDescription ? `<p style="margin-top:15px;">${product.description}</p>` : ''}
                        </div>
                        <div id="reviews" class="tab-content">
                            ${fiveStarSectionHTML}
                            ${reviewsHTML}
                        </div>
                    </div>

                    <!-- Moved Buttons Segment: Positioned below description & reviews tab container (Requirement 6) -->
                    ${product.seller ? `
                    <div style="margin-top: 25px; padding: 20px; background: #fafafa; border: 1px solid var(--border-color); border-radius: 12px; display:flex; flex-direction:column; gap:12px;">
                        <h4 style="margin:0; font-size:1.1rem; color:var(--corporate-blue);">Interact with Reseller:</h4>
                        <div style="display:flex; gap:10px; align-items:center; flex-wrap:wrap;">
                            ${isLoggedIn() ? '<button id="btn-message-seller" class="cta" style="border:none; cursor:pointer; padding:12px 24px; font-size:14px; border-radius:30px; display:inline-flex; align-items:center; justify-content:center; text-shadow:none; box-shadow:0 4px 10px rgba(0,0,0,0.2);">Send Message</button>' : ''}
                            <button id="btn-show-seller-map" class="btn btn-outline" style="border-radius:30px; padding:10px 20px; font-size:14px; display:inline-flex; align-items:center; gap:6px;"><i class="fas fa-map-marked-alt"></i> Show On Map</button>
                            <a href="#seller/${product.seller._id || 'seller'}" class="btn btn-outline" style="text-decoration:none; border-radius:30px; padding:10px 20px; font-size:14px; display:inline-flex; align-items:center; justify-content:center; gap:6px;"><i class="fas fa-store"></i> Explore Products</a>
                        </div>
                    </div>` : ''}
                </div>
            </div>
        </div>
        ${similarProductsHTML}
    `;
    
    // Floating action button toggle trigger setup removed as requested

    const backBtn = document.getElementById('back-to-products');
    if (backBtn) {
        backBtn.addEventListener('click', (e) => {
            e.preventDefault();
            try { sessionStorage.setItem('focusProduct', product.productId); } catch (err) {}
            history.back();
        });
    }

    const thumbnails = document.querySelectorAll('.thumbnail');
    thumbnails.forEach(thumb => {
        thumb.addEventListener('click', () => {
            document.getElementById('main-image').src = thumb.dataset.full;
            thumbnails.forEach(t => t.classList.remove('active'));
            thumb.classList.add('active');
        });
    });

    const colorSwatches = document.querySelectorAll('.color-swatch');
    colorSwatches.forEach(swatch => {
        swatch.addEventListener('click', (e) => {
            e.preventDefault();
            colorSwatches.forEach(s => s.classList.remove('selected'));
            swatch.classList.add('selected');
        });
    });

    const sizeBtns = document.querySelectorAll('.size-btn');
    sizeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            sizeBtns.forEach(b => {
                b.classList.remove('selected');
                b.style.borderColor = 'var(--border-color)';
                b.style.color = 'var(--text-dark)';
                b.style.backgroundColor = 'white';
            });
            btn.classList.add('selected');
            btn.style.borderColor = 'var(--corporate-blue)';
            btn.style.color = 'var(--white)';
            btn.style.backgroundColor = 'var(--corporate-blue)';
        });
    });
    if(sizeBtns.length > 0) {
        const firstBtn = sizeBtns[0];
        firstBtn.classList.add('selected');
        firstBtn.style.borderColor = 'var(--corporate-blue)';
        firstBtn.style.color = 'var(--white)';
        firstBtn.style.backgroundColor = 'var(--corporate-blue)';
    }

    const tabButtons = document.querySelectorAll('.tab-btn');
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            tabButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
            document.getElementById(button.dataset.tab).classList.add('active');
        });
    });

    const addToCartBtnDetail = document.getElementById('btn-add-cart-detail');
    if (addToCartBtnDetail) {
        addToCartBtnDetail.addEventListener('click', () => {
            const selectedColorEl = document.querySelector('.color-swatch.selected');
            const selectedSizeEl = document.querySelector('.size-btn.selected');
            
            const color = selectedColorEl ? selectedColorEl.dataset.color : null;
            const size = selectedSizeEl ? selectedSizeEl.dataset.size : null;

            if (product.colors && product.colors.length > 0 && !color) {
                alert('Please select a color.');
                return;
            }
            if (product.sizes && product.sizes.length > 0 && !size) {
                alert('Please select a size.');
                return;
            }

            CartManager.addItem(product.productId, 1, color, size);
        });
    }

    const msgBtnDetail = document.getElementById('btn-message-seller');
    if (msgBtnDetail) {
        msgBtnDetail.addEventListener('click', () => {
            if (!product.seller) return alert('Seller information not available.');
            createSellerChatModal({
                sellerId: product.seller._id || product.seller.email || 'seller',
                sellerName: product.seller.businessName || product.seller.name || 'Seller'
            });
        });
    }

    // Leaflet geolocating based on custom saved dashboard coordinates or reverse geocoding fallback (Requirement 7)
    const mapBtnDetail = document.getElementById('btn-show-seller-map');
    if (mapBtnDetail) {
        mapBtnDetail.addEventListener('click', async () => {
            const hasCoords = product.seller && product.seller.latitude && product.seller.longitude;
            let geo = null;
            if (hasCoords) {
                geo = { lat: product.seller.latitude, lon: product.seller.longitude, display_name: product.seller.physicalAddress || product.seller.businessName };
            } else {
                const loc = product.seller ? (product.seller.physicalAddress || product.seller.location || '') : '';
                if (!loc) return alert('Seller address not available');
                geo = await geocodeLocation(loc);
            }

            if (!geo) return alert('Could not resolve seller coordinates.');

            let modal = document.getElementById('map-modal');
            if (!modal) {
                modal = document.createElement('div');
                modal.id = 'map-modal';
                modal.style.position = 'fixed';
                modal.style.left = '0';
                modal.style.top = '0';
                modal.style.width = '100%';
                modal.style.height = '100%';
                modal.style.background = 'rgba(0,0,0,0.6)';
                modal.style.display = 'flex';
                modal.style.alignItems = 'center';
                modal.style.justifyContent = 'center';
                modal.style.zIndex = 21000;
                modal.innerHTML = `
                    <div id="map-modal-container" style="width:90%;max-width:900px;background:white;padding:14px;border-radius:12px;box-shadow:0 20px 60px rgba(0,0,0,0.18);">
                        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
                            <div style="font-size:1rem;font-weight:700;">Seller Location</div>
                            <button id="map-modal-close" style="border:none;background:none;font-size:1.5rem;cursor:pointer;color:#333;">&times;</button>
                        </div>
                        <div id="map-modal-content" style="width:100%;height:420px;border-radius:8px;overflow:hidden;"></div>
                    </div>
                `;
                document.body.appendChild(modal);
                modal.querySelector('#map-modal-close').addEventListener('click', () => modal.remove());
                modal.addEventListener('click', (event) => {
                    if (event.target === modal) modal.remove();
                });
            }

            await showLocationOnMap({ lat: geo.lat, lon: geo.lon, display_name: geo.display_name }, 'map-modal-content');
        });
    }

    const exploreMoreBtnDetail = document.getElementById('btn-explore-more');
    if (exploreMoreBtnDetail) {
        exploreMoreBtnDetail.addEventListener('click', () => {
            const targetResellerId = (product.exploreMoreReseller && (product.exploreMoreReseller._id || product.exploreMoreReseller)) || (product.seller ? product.seller._id : null);
            if (targetResellerId) {
                location.hash = `#category/${product.category}?seller=${targetResellerId}`;
            } else {
                location.hash = `#category/${product.category}`;
            }
        });
    }

    try {
        const viewerResponse = await fetch(`/api/products/${product.productId}/viewers`);
        if (viewerResponse.ok) {
            const viewerData = await viewerResponse.json();
            const viewerDisplay = document.getElementById('image-viewer-count');
            if (viewerDisplay && viewerData && viewerData.viewerCount !== undefined && viewerData.viewerCount !== null) {
                
                let currentViewers = viewerData.viewerCount;
                const baseCount = currentViewers;

                const updateDisplay = (count) => {
                    const label = count === 1 ? 'person viewing' : 'people viewing';
                    viewerDisplay.innerHTML = `<i class="fas fa-eye"></i> ${count} ${label}`;
                    viewerDisplay.style.display = 'flex';
                };

                updateDisplay(currentViewers);

                if (liveViewerInterval) clearInterval(liveViewerInterval);
                
                liveViewerInterval = setInterval(() => {
                    const change = Math.floor(Math.random() * 3) + 1;
                    const increase = Math.random() > 0.5;

                    if (increase) {
                        currentViewers += change;
                    } else {
                        currentViewers -= change;
                    }

                    if (currentViewers < 1) currentViewers = 1;
                    
                    const maxAllowed = Math.max(baseCount * 1.5, baseCount + 15);
                    if (currentViewers > maxAllowed) currentViewers = Math.floor(maxAllowed);

                    updateDisplay(currentViewers);
                }, 4000);
            }
        }
    } catch (err) {
        console.warn('Could not fetch viewer count', err);
    }
    
    startLiveTimerUpdates();
};

export const renderCartPage = (detailedCartItems) => {
    const validItems = Array.isArray(detailedCartItems) 
        ? detailedCartItems.filter(item => item && item.productId && typeof item.currentPrice === 'number') 
        : [];

    let subtotal = 0;
    let shippingFee = 0;
    let insuranceFee = 0;

    const itemsHTML = validItems.length > 0 ? validItems.map(item => {
        const itemTotal = item.currentPrice * item.quantity;
        subtotal += itemTotal;
        const savedPerUnit = (item.oldPrice || 0) - (item.currentPrice || 0);
        const savedAmount = savedPerUnit > 0 ? savedPerUnit * item.quantity : 0;
        const isActuallyOnSale = savedAmount > 0;
        const stockInfo = item.stock !== undefined ? `<span class="cart-item-stock in-stock">${item.stock} left</span>` : '';
        const colorDisplay = item.selectedColor ? `<div style="display: flex; align-items: center; gap: 8px; margin-top: 5px;"><span style="font-size: 0.85rem; color: #666;">Color:</span><div style="width: 20px; height: 20px; border-radius: 50%; border: 1px solid #ddd; background-color: ${item.selectedColor.toLowerCase()}; cursor: help;" title="${item.selectedColor}"></div><span style="font-size: 0.85rem; font-weight: 500;">${item.selectedColor}</span></div>` : '';
        const sizeDisplay = item.selectedSize ? `<div style="margin-top: 2px; font-size: 0.85rem; color: #666;">Size: <strong>${item.selectedSize}</strong></div>` : '';

        return `
            <div class="cart-item" data-product-id="${item.productId}">
                <div class="cart-item-img-wrapper">
                    <img src="${item.image}" class="cart-item-img" alt="${item.title}">
                </div>
                <div class="cart-item-details">
                    <div class="cart-item-title">${item.title} ${isActuallyOnSale ? `<span class="item-save-badge">Save ${formatCurrency(savedPerUnit)}</span>` : ''} ${stockInfo}</div>
                    <div>${formatCurrency(item.currentPrice)} x ${item.quantity} = <strong>${formatCurrency(itemTotal)}</strong></div>
                    ${isActuallyOnSale ? `<div class="item-saved-amount" style="color:var(--corporate-green); font-weight:700;">You saved ${formatCurrency(savedAmount)}!</div>` : ''}
                    ${colorDisplay}
                    ${sizeDisplay}
                </div>
                <div class="cart-item-actions">
                    <button class="quantity-change" data-id="${item.productId}" data-change="-1">−</button>
                    <span class="quantity-display">${item.quantity}</span>
                    <button class="quantity-change" data-id="${item.productId}" data-change="1">+</button>
                    <button class="remove-item" data-id="${item.productId}">✕</button>
                </div>
            </div>`;
    }).join('') : '<p>Your cart is empty.</p>';
    
    const giftAmount = subtotal * 0.05;

    getAppRoot().innerHTML = `
        <div class="cart-page-container">
            <div class="cart-header"><h1>Shopping Cart</h1></div>
            <div class="cart-section">
                ${itemsHTML}

                ${validItems.length > 0 ? `
                <!-- STEP 2: Delivery Address Form -->
                <div style="background:#fff; border:1px solid #ddd; border-radius:12px; padding:25px; margin:30px 0; box-shadow:var(--shadow-soft);">
                    <h3 style="color:var(--corporate-blue); margin-top:0; margin-bottom:15px;"><i class="fas fa-map-marker-alt"></i> Where should we send your order?</h3>
                    <form id="delivery-address-form">
                        <div style="display:grid; grid-template-columns:1fr 1fr; gap:15px; margin-bottom:15px;">
                            <div class="form-group">
                                <label>Full Name</label>
                                <input type="text" id="delivery-name" required style="padding:10px; border-radius:8px; border:1px solid #ddd; width:100%;">
                            </div>
                            <div class="form-group">
                                <label>Phone Number</label>
                                <input type="tel" id="delivery-phone" required style="padding:10px; border-radius:8px; border:1px solid #ddd; width:100%;">
                            </div>
                        </div>
                        <div style="display:grid; grid-template-columns:1fr 1fr; gap:15px; margin-bottom:15px;">
                            <div class="form-group">
                                <label>Location / Region</label>
                                <select id="delivery-location" required style="padding:10px; border-radius:8px; border:1px solid #ddd; width:100%;">
                                    <option value="" disabled selected>Select location...</option>
                                    <option value="Windhoek">Windhoek</option>
                                    <option value="Ongwediva">Ongwediva</option>
                                    <option value="Swakopmund">Swakopmund</option>
                                    <option value="Walvis Bay">Walvis Bay</option>
                                    <option value="Rundu">Rundu</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label>Landmark / Directions (Optional)</label>
                                <input type="text" id="delivery-landmark" style="padding:10px; border-radius:8px; border:1px solid #ddd; width:100%;">
                            </div>
                        </div>
                        <button type="button" id="save-address-btn" style="background:var(--corporate-blue); color:white; border:none; padding:12px 25px; border-radius:8px; font-weight:700; cursor:pointer;">Save Address & Continue</button>
                    </form>
                </div>

                <!-- STEP 3: Dynamic Transport Form (Hidden until address saved) -->
                <div id="transport-form-wrapper" style="display:none; background:#fff; border:1px solid #ddd; border-radius:12px; padding:25px; margin: 30px 0; box-shadow:var(--shadow-soft);">
                    <h3 style="color:var(--corporate-blue); margin-top:0; margin-bottom:15px;"><i class="fas fa-truck"></i> Choose Transport Option</h3>
                    <div id="transport-options-container" style="display:flex; flex-direction:column; gap:10px;">
                        <!-- Injected dynamically based on location -->
                    </div>
                    
                    <!-- COD Pickup Point address dropdown selector (Requirement 9) -->
                    <div id="cod-pickup-selector-container" style="display:none; margin-top: 15px; background: #fbfbfb; border: 1px solid #eee; padding: 15px; border-radius: 8px;">
                        <label for="cod-pickup-select" style="font-weight:700; display:block; margin-bottom:6px;">Select Reseller Pickup & COD Payment Point:</label>
                        <select id="cod-pickup-select" style="width:100%; padding:10px; border-radius:6px; border: 1px solid #ccc;"></select>
                    </div>

                    <div id="insurance-form-wrapper" style="margin-top:20px; border-top:1px solid #eee; padding-top:15px; display:none;">
                        <label style="display:flex; align-items:center; gap:10px; font-weight:700; cursor:pointer;">
                            <input type="checkbox" id="safe-insurance-toggle" style="width:20px; height:20px;">
                            Add Safe Delivery Insurance (<span id="insurance-price-display">+N$0.00</span>)
                        </label>
                    </div>
                </div>

                <div class="gift-reward" style="margin-top: 20px; text-align: center; padding: 15px; background: #eaf5ff; border-radius: 8px;"><h4><i class="fas fa-gift"></i> Your Gift Reward</h4><p>Complete this order to earn <strong>${formatCurrency(giftAmount)}</strong> for your next purchase!</p></div>
                
                <div class="order-summary">
                    <h3>Order Summary</h3>
                    <div class="summary-row" style="display: flex; justify-content: space-between; margin-bottom: 10px;"><span>Subtotal:</span> <span>${formatCurrency(subtotal)}</span></div>
                    <div class="summary-row" style="display: flex; justify-content: space-between; margin-bottom: 10px;"><span>Delivery:</span> <span id="summary-delivery-fee">${formatCurrency(shippingFee)}</span></div>
                    <div class="summary-row" style="display: flex; justify-content: space-between; margin-bottom: 10px;"><span>Insurance:</span> <span id="summary-insurance-fee">${formatCurrency(insuranceFee)}</span></div>
                    <div class="summary-row total-row" style="display: flex; justify-content: space-between; font-weight: bold; margin-top: 15px; border-top: 1px solid var(--border-color); padding-top: 10px;"><span>Total:</span> <span id="summary-total-fee" style="color:var(--corporate-green);">${formatCurrency(subtotal + shippingFee + insuranceFee)}</span></div>
                </div>` : ''}

                <div class="action-buttons">
                    <a href="#home" class="btn btn-outline">← Continue Shopping</a>
                    ${validItems.length > 0 ? `<button type="button" id="proceed-checkout-btn" disabled class="btn btn-primary" style="background:#ccc; color:#666; cursor:not-allowed;">Proceed to Checkout →</button>` : ''}
                </div>
            </div>
        </div>`;
    
    const saveAddressBtn = document.getElementById('save-address-btn');
    const transportWrapper = document.getElementById('transport-form-wrapper');
    const optionsContainer = document.getElementById('transport-options-container');
    const insuranceFormWrapper = document.getElementById('insurance-form-wrapper');
    const insuranceToggle = document.getElementById('safe-insurance-toggle');
    const insurancePriceDisplay = document.getElementById('insurance-price-display');
    const proceedBtn = document.getElementById('proceed-checkout-btn');
    const codPickupContainer = document.getElementById('cod-pickup-selector-container');
    const codPickupSelect = document.getElementById('cod-pickup-select');

    let chosenTransport = '';
    let selectedLocation = '';
    let computedInsuranceCost = 0;

    // Calculate dynamic safe insurance costs based on items in the cart
    let activeInsuranceEnabled = false;
    validItems.forEach(item => {
        if (item.safeInsuranceEnabled && item.safeInsurancePrice > 0) {
            activeInsuranceEnabled = true;
            computedInsuranceCost += (item.safeInsurancePrice * item.quantity);
        }
    });

    const updateTotals = () => {
        if (insuranceToggle && insuranceToggle.checked) {
            insuranceFee = computedInsuranceCost > 0 ? computedInsuranceCost : 49;
        } else {
            insuranceFee = 0;
        }

        const deliveryFeeEl = document.getElementById('summary-delivery-fee');
        const insuranceFeeEl = document.getElementById('summary-insurance-fee');
        const totalFeeEl = document.getElementById('summary-total-fee');

        if (deliveryFeeEl) deliveryFeeEl.textContent = formatCurrency(shippingFee);
        if (insuranceFeeEl) insuranceFeeEl.textContent = formatCurrency(insuranceFee);
        if (totalFeeEl) totalFeeEl.textContent = formatCurrency(subtotal + shippingFee + insuranceFee);
    };

    saveAddressBtn?.addEventListener('click', async () => {
        const name = document.getElementById('delivery-name').value.trim();
        const phone = document.getElementById('delivery-phone').value.trim();
        selectedLocation = document.getElementById('delivery-location').value;

        if (!name || !phone || !selectedLocation) {
            return alert('Please fill in your Delivery Address fields.');
        }

        if (transportWrapper) transportWrapper.style.display = 'block';

        // Display safe delivery insurance block if any product has it active
        if (insuranceFormWrapper) {
            if (activeInsuranceEnabled) {
                insuranceFormWrapper.style.display = 'block';
                if (insurancePriceDisplay) {
                    insurancePriceDisplay.textContent = `+${formatCurrency(computedInsuranceCost)}`;
                }
            } else {
                insuranceFormWrapper.style.display = 'none';
            }
        }

        // Dynamically compute dynamic shipping price from individual products
        shippingFee = 0;
        validItems.forEach(item => {
            if (item.freeTransport === true) {
                return; // Free delivery
            }
            const windhoekPrice = item.deliveryPriceWindhoek !== undefined ? item.deliveryPriceWindhoek : 49;
            const outsidePrice = item.deliveryPriceOutside !== undefined ? item.deliveryPriceOutside : 79;
            const itemShipping = (selectedLocation === 'Windhoek') ? windhoekPrice : outsidePrice;
            if (itemShipping > shippingFee) {
                shippingFee = itemShipping;
            }
        });

        const codAllowed = validItems.every(i => i.cashOnDelivery === true);

        // Fetch reseller COD pickup points array (Requirement 9)
        let pickupPointsHTML = '';
        if (codAllowed) {
            try {
                const firstItemSeller = validItems[0]?.seller;
                if (firstItemSeller) {
                    const sellerObj = typeof firstItemSeller === 'object' ? firstItemSeller : await (await fetch(`/api/users`)).json().then(users => users.find(u => u._id === firstItemSeller));
                    if (sellerObj && sellerObj.pickupPoints && sellerObj.pickupPoints.length > 0) {
                        pickupPointsHTML = sellerObj.pickupPoints.map(p => `<option value="${p.name} (${p.address})">${p.name} - ${p.address}</option>`).join('');
                    }
                }
            } catch (err) {
                console.error('Failed to load pickup points', err);
            }
        }

        if (optionsContainer) {
            optionsContainer.innerHTML = `
                <label style="border:1px solid #ddd; padding:15px; border-radius:8px; display:flex; justify-content:space-between; cursor:pointer; align-items:center;">
                    <div>
                        <input type="radio" name="transport-opt" value="standard" checked>
                        <strong>Standard Company Delivery</strong> <span style="font-size:0.85rem; color:#666;">(2-3 Business Days)</span>
                    </div>
                    <div style="font-weight:700;">${formatCurrency(shippingFee)}</div>
                </label>
                <label style="border:1px solid #ddd; padding:15px; border-radius:8px; display:flex; justify-content:space-between; cursor:pointer; align-items:center;">
                    <div>
                        <input type="radio" name="transport-opt" value="fast">
                        <strong>Yango Fast Delivery</strong> <span style="font-size:0.85rem; color:#666;">(Same Day Express)</span>
                    </div>
                    <div style="font-weight:700;">${formatCurrency(shippingFee + 50)}</div>
                </label>
                ${codAllowed ? `
                <label style="border:1px solid #ddd; padding:15px; border-radius:8px; display:flex; justify-content:space-between; cursor:pointer; align-items:center;">
                    <div>
                        <input type="radio" name="transport-opt" value="cod">
                        <strong>Seller Own Transport + COD (Cash on Delivery)</strong>
                    </div>
                    <div style="font-weight:700;">${formatCurrency(shippingFee)}</div>
                </label>
                ` : ''}
            `;
        }

        if (codPickupSelect && pickupPointsHTML) {
            codPickupSelect.innerHTML = pickupPointsHTML;
        } else if (codPickupSelect) {
            codPickupSelect.innerHTML = '<option value="">No pickup points set by reseller. Default address will be used.</option>';
        }

        chosenTransport = 'Standard Company Delivery';
        if (proceedBtn) {
            proceedBtn.removeAttribute('disabled');
            proceedBtn.style.background = 'var(--corporate-blue)';
            proceedBtn.style.color = '#fff';
            proceedBtn.style.cursor = 'pointer';
        }

        updateTotals();
    });

    optionsContainer?.addEventListener('change', (e) => {
        const val = e.target.value;
        let baseFee = 0;
        validItems.forEach(item => {
            if (item.freeTransport === true) return;
            const windhoekPrice = item.deliveryPriceWindhoek !== undefined ? item.deliveryPriceWindhoek : 49;
            const outsidePrice = item.deliveryPriceOutside !== undefined ? item.deliveryPriceOutside : 79;
            const itemShipping = (selectedLocation === 'Windhoek') ? windhoekPrice : outsidePrice;
            if (itemShipping > baseFee) {
                baseFee = itemShipping;
            }
        });

        if (val === 'fast') {
            shippingFee = baseFee + 50;
            chosenTransport = 'Yango Fast Delivery';
            if (codPickupContainer) codPickupContainer.style.display = 'none';
        } else if (val === 'cod') {
            shippingFee = baseFee;
            chosenTransport = 'COD (Cash on Delivery)';
            if (codPickupContainer) codPickupContainer.style.display = 'block';
        } else {
            shippingFee = baseFee;
            chosenTransport = 'Standard Company Delivery';
            if (codPickupContainer) codPickupContainer.style.display = 'none';
        }

        updateTotals();
    });

    insuranceToggle?.addEventListener('change', updateTotals);

    proceedBtn?.addEventListener('click', () => {
        const name = document.getElementById('delivery-name').value.trim();
        const phone = document.getElementById('delivery-phone').value.trim();
        const landmark = document.getElementById('delivery-landmark').value.trim();

        let transportMethod = chosenTransport;
        if (chosenTransport === 'COD (Cash on Delivery)' && codPickupSelect && codPickupSelect.value) {
            transportMethod += ` - Pickup Point: ${codPickupSelect.value}`;
        }

        const pendingOrder = {
            customerName: name,
            customerEmail: getCurrentUser()?.email || 'N/A',
            customerAddress: selectedLocation,
            phoneNumber: phone,
            landmark: landmark,
            locationRegion: selectedLocation,
            transportMethod: transportMethod,
            deliveryFee: shippingFee,
            insuranceSelected: insuranceToggle ? insuranceToggle.checked : false,
            insuranceFee: insuranceFee,
            items: validItems.map(item => ({
                productId: item.productId,
                title: item.title,
                quantity: item.quantity,
                price: item.currentPrice,
                selectedColor: item.selectedColor || null,
            })),
            totalAmount: subtotal + shippingFee + insuranceFee,
            giftCardEarned: subtotal * 0.05,
        };

        sessionStorage.setItem('pendingOrder', JSON.stringify(pendingOrder));
        location.hash = '#payment';
    });

    getAppRoot().addEventListener('click', async (e) => {
        const quantityBtn = e.target.closest('.quantity-change');
        if (quantityBtn) {
            e.preventDefault();
            const productId = quantityBtn.dataset.id;
            const change = parseInt(quantityBtn.dataset.change);
            const currentItem = validItems.find(item => item.productId === productId);
            if (currentItem) {
                const newQuantity = currentItem.quantity + change;
                if (newQuantity > 0) {
                    CartManager.updateQuantity(productId, newQuantity);
                    const cartItem = document.querySelector(`[data-product-id="${productId}"]`);
                    if (cartItem) {
                        const quantityDisplay = cartItem.querySelector('.quantity-display');
                        const newItemTotal = currentItem.currentPrice * newQuantity;
                        quantityDisplay.textContent = newQuantity;
                        const itemPriceText = cartItem.querySelector('.cart-item-details > div:nth-child(2)');
                        if (itemPriceText) {
                            itemPriceText.innerHTML = `${formatCurrency(currentItem.currentPrice)} x ${newQuantity} = <strong>${formatCurrency(newItemTotal)}</strong>`;
                        }
                    }
                    currentItem.quantity = newQuantity;
                    location.reload();
                } else {
                    CartManager.removeItem(productId);
                    const cartItem = document.querySelector(`[data-product-id="${productId}"]`);
                    if (cartItem) {
                        cartItem.remove();
                    }
                    location.reload();
                }
            }
        }
        
        const removeBtn = e.target.closest('.remove-item');
        if (removeBtn) {
            e.preventDefault();
            const productId = removeBtn.dataset.id;
            if (confirm('Are you sure you want to remove this item?')) {
                CartManager.removeItem(productId);
                const cartItem = document.querySelector(`[data-product-id="${productId}"]`);
                if (cartItem) {
                    cartItem.remove();
                }
                location.reload();
            }
        }
    });
};

export const renderCheckoutPage = () => {
    location.hash = '#cart';
};

export const renderCompetitionsPage = async () => {
    let comps = [];
    try {
        comps = await api.fetchCompetitions();
    } catch (e) {
        console.error(e);
    }

    const cards = comps.map(c => `
        <div style="background:white; border:1px solid #ddd; border-radius:12px; padding:25px; margin-bottom:20px; box-shadow:var(--shadow-soft);">
            <h2 style="color:var(--corporate-blue); margin-top:0;">🏆 ${c.title}</h2>
            <p style="color:#555;">${c.description}</p>
            <div style="background:#eef3ff; padding:12px; border-radius:6px; margin: 15px 0;">
                <strong>Gift Reward / Prizes to be Won:</strong> ${c.prizeDetails}
            </div>
            
            <h4>Enter Competition</h4>
            <form class="comp-entry-form" data-comp-id="${c._id}" style="margin-top:10px;">
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:10px;">
                    <input type="text" name="userName" required placeholder="Full Name" style="padding:10px; border-radius:6px; border:1px solid #ccc; width:100%;">
                    <input type="email" name="userEmail" required placeholder="Email Address" style="padding:10px; border-radius:6px; border:1px solid #ccc; width:100%;">
                </div>
                <div class="form-group" style="margin-bottom:10px;">
                    <label style="display:block; margin-bottom:4px; font-weight:700;">Upload Proof of Purchase (JPG/PNG/Video):</label>
                    <input type="file" name="proofFile" accept="image/*,video/*" required style="width:100%;">
                </div>
                <button type="submit" style="background:var(--corporate-blue); color:white; border:none; padding:10px 20px; border-radius:6px; font-weight:bold; cursor:pointer;">Submit Entry</button>
            </form>

            <div style="margin-top:20px;">
                <strong>Winners:</strong>
                <ul style="margin:10px 0 0 0; padding-left:20px;">
                    ${c.winners && c.winners.length > 0 ? c.winners.map(w => `
                        <li><strong>${w.userName}</strong> won ${w.prizeWon} on ${new Date(w.dateWon).toLocaleDateString()}</li>
                    `).join('') : '<li>No winners declared yet. Upload your proof to be the first!</li>'}
                </ul>
            </div>
        </div>
    `).join('');

    getAppRoot().innerHTML = `
        <div class="page-container" style="max-width:800px; margin-top:2rem;">
            <p style="text-align:center; font-size:1.1rem; color:#666; margin-bottom:30px;">Upload your proof of purchase (photos or videos) to enter current active Namkuku competitions and win spectacular prizes!</p>
            ${cards || '<p style="text-align:center;">No active competitions right now. Check back soon!</p>'}
        </div>
    `;

    document.querySelectorAll('.comp-entry-form').forEach(form => {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const compId = form.dataset.compId;
            const formData = new FormData();
            formData.append('userName', form.querySelector('[name="userName"]').value);
            formData.append('userEmail', form.querySelector('[name="userEmail"]').value);
            formData.append('proofFile', form.querySelector('[name="proofFile"]').files[0]);

            try {
                await api.submitCompetitionEntry(compId, formData);
                alert('Entry uploaded successfully! Good luck!');
                location.reload();
            } catch (err) {
                alert('Submission failed: ' + err.message);
            }
        });
    });
};

export const renderOrderConfirmationPage = async (txnId) => {
    let transaction = null;
    try {
        const txns = await api.getAllTransactions();
        transaction = txns.find(t => t._id === txnId);
    } catch (e) {
        console.error(e);
    }

    if (!transaction) {
        getAppRoot().innerHTML = '<h2 style="text-align:center; margin-top:3rem;">Invoice / Order not found.</h2>';
        return;
    }

    getAppRoot().innerHTML = `
        <div class="page-container" style="max-width:750px; margin-top:2rem; background:white; border:1px solid #ddd; border-radius:12px; padding:35px; box-shadow:var(--shadow-soft);">
            <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:2px solid var(--corporate-blue); padding-bottom:15px; margin-bottom:25px;">
                <div>
                    <h1 style="color:var(--corporate-blue); margin:0;">NAMKUKU INVOICE</h1>
                    <span style="color:#666;">Order ID: #${transaction._id}</span>
                </div>
                <div style="text-align:right;">
                    <strong>Date:</strong> ${new Date(transaction.createdAt).toLocaleDateString()}
                </div>
            </div>

            <div style="display:grid; grid-template-columns:1fr 1fr; gap:20px; margin-bottom:25px;">
                <div>
                    <h3 style="margin-top:0; color:var(--corporate-blue);">Buyer Details</h3>
                    <p style="margin:4px 0;"><strong>Name:</strong> ${transaction.customerName}</p>
                    <p style="margin:4px 0;"><strong>Phone:</strong> ${transaction.phoneNumber || 'N/A'}</p>
                    <p style="margin:4px 0;"><strong>Location:</strong> ${transaction.locationRegion || 'N/A'}</p>
                    ${transaction.landmark ? `<p style="margin:4px 0;"><strong>Landmark:</strong> ${transaction.landmark}</p>` : ''}
                </div>
                <div>
                    <h3 style="margin-top:0; color:var(--corporate-blue);">Delivery Instructions</h3>
                    <p style="margin:4px 0;"><strong>Method:</strong> ${transaction.transportMethod}</p>
                    <p style="margin:4px 0;"><strong>Payment:</strong> ${transaction.paymentMethod.toUpperCase()}</p>
                </div>
            </div>

            <h3 style="color:var(--corporate-blue); border-bottom:1px solid #eee; padding-bottom:5px;">Ordered Items</h3>
            <table style="width:100%; border-collapse:collapse; margin-bottom:25px;">
                <thead>
                    <tr style="background:#fafafa; border-bottom:1px solid #eee;">
                        <th style="padding:10px; text-align:left;">Item Description</th>
                        <th style="padding:10px; text-align:center;">Qty</th>
                        <th style="padding:10px; text-align:right;">Price</th>
                    </tr>
                </thead>
                <tbody>
                    ${transaction.items.map(item => `
                        <tr style="border-bottom:1px solid #eee;">
                            <td style="padding:10px;">${item.title}</td>
                            <td style="padding:10px; text-align:center;">${item.quantity}</td>
                            <td style="padding:10px; text-align:right;">${formatCurrency(item.price)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>

            <div style="width:100%; border-top:2px solid #eee; padding-top:15px; display:flex; flex-direction:column; align-items:flex-end;">
                <div style="width:250px; display:flex; justify-content:space-between; margin-bottom:6px;">
                    <span>Delivery Fee:</span>
                    <span>${formatCurrency(transaction.deliveryFee)}</span>
                </div>
                ${transaction.insuranceSelected ? `
                <div style="width:250px; display:flex; justify-content:space-between; margin-bottom:6px;">
                    <span>Insurance Fee:</span>
                    <span>${formatCurrency(transaction.insuranceFee)}</span>
                </div>` : ''}
                <div style="width:250px; display:flex; justify-content:space-between; font-weight:bold; font-size:1.25rem; border-top:1px solid #ddd; padding-top:8px; margin-top:8px;">
                    <span>Total Cost:</span>
                    <span style="color:var(--corporate-green);">${formatCurrency(transaction.totalAmount)}</span>
                </div>
            </div>

            <div style="display:flex; gap:10px; margin-top:35px;" class="desktop-only">
                <button onclick="window.print()" style="background:var(--corporate-blue); color:white; border:none; padding:12px 25px; border-radius:8px; font-weight:700; cursor:pointer;"><i class="fas fa-print"></i> Print Invoice</button>
                <a href="#home" style="background:#fafafa; border:1px solid #ddd; color:#333; padding:12px 25px; border-radius:8px; text-decoration:none; font-weight:700;">Continue Shopping</a>
            </div>
        </div>
    `;
};

export const renderPaymentOptionsPage = () => {
    const pending = sessionStorage.getItem('pendingOrder');
    if (!pending) {
        location.hash = '#checkout';
        return;
    }

    getAppRoot().innerHTML = `
        <div style="text-align:center; padding: 40px 20px; background:var(--corporate-blue); color:white; border-radius:12px; margin-bottom:2rem;">
            <h1>Choose Payment Method</h1>
        </div>
        <div class="page-container" style="max-width: 900px; margin-top: 2rem;">
            <p style="text-align: center; font-size: 1.1rem; color: var(--text-light); margin-bottom: 2.5rem;">Please choose how you'd like to complete your order. Your transaction will be finalized on the next step.</p>
            <div class="payment-options-grid" style="display:grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap:20px;">
                <a href="#payment/eft" class="payment-option-card" style="text-decoration:none; color:inherit; text-align:center; border:1px solid #eee; padding:20px; border-radius:8px; background:white;">
                    <div class="icon-wrapper" style="font-size:2rem; color:var(--corporate-blue); margin-bottom:10px;"><i class="fas fa-university"></i></div>
                    <h3>Direct Bank Transfer (EFT)</h3>
                    <p style="font-size:0.9rem; color:#666; margin-top:5px;">Pay securely from your bank account.</p>
                </a>
                <a href="#payment/ewallet" class="payment-option-card" style="text-decoration:none; color:inherit; text-align:center; border:1px solid #eee; padding:20px; border-radius:8px; background:white;">
                    <div class="icon-wrapper" style="font-size:2rem; color:var(--corporate-blue); margin-bottom:10px;"><i class="fas fa-wallet"></i></div>
                    <h3>E-Wallet or Blue Wallet</h3>
                    <p style="font-size:0.9rem; color:#666; margin-top:5px;">Use your preferred mobile wallet app.</p>
                </a>
                <a href="#payment/layby" class="payment-option-card" style="text-decoration:none; color:inherit; text-align:center; border:1px solid #eee; padding:20px; border-radius:8px; background:white;">
                    <div class="icon-wrapper" style="font-size:2rem; color:var(--corporate-blue); margin-bottom:10px;"><i class="fas fa-calendar-alt"></i></div>
                    <h3>Lay-by</h3>
                    <p style="font-size:0.9rem; color:#666; margin-top:5px;">Pay over 3 months, interest-free.</p>
                </a>
                <a href="#payment/tradein" class="payment-option-card" style="text-decoration:none; color:inherit; text-align:center; border:1px solid #eee; padding:20px; border-radius:8px; background:white;">
                    <div class="icon-wrapper" style="font-size:2rem; color:var(--corporate-blue); margin-bottom:10px;"><i class="fas fa-exchange-alt"></i></div>
                    <h3>Trade-in Credit</h3>
                    <p style="font-size:0.9rem; color:#666; margin-top:5px;">Apply credit from your old device.</p>
                </a>
            </div>
        </div>
    `;
};

export const renderPaymentMethodPage = async (method) => {
    const pending = sessionStorage.getItem('pendingOrder');
    if (!pending) { location.hash = '#checkout'; return; }
    const order = JSON.parse(pending);

    const methodMap = {
        eft: { title: 'Direct Bank Transfer (EFT)', icon: 'fas fa-university' },
        ewallet: { title: 'E-Wallet / Blue Wallet', icon: 'fas fa-wallet' },
        layby: { title: 'Lay-by', icon: 'fas fa-calendar-alt' },
        tradein: { title: 'Trade-in Credit', icon: 'fas fa-exchange-alt' },
    };

    const info = methodMap[method] || { title: method, icon: 'fas fa-credit-card' };

    let instructionsHTML = '';
    if (method === 'eft') {
        instructionsHTML = `
            <h4>How to Pay via EFT</h4>
            <p>Use the bank details below and email your proof of payment to payments@namix.com.</p>
            <ul class="payment-details-list">
                <li><strong>Bank:</strong> <span>FNB Namibia</span></li>
                <li><strong>Account Name:</strong> <span>NAMIX Tech</span></li>
                <li><strong>Account Number:</strong> <span class="monospaced">62201234567</span></li>
                <li><strong>Reference:</strong> <span class="highlight-ref">${order.customerName}</span></li>
            </ul>
        `;
    } else if (method === 'ewallet') {
        instructionsHTML = `
            <h4>Pay with E-Wallet</h4>
            <p>Transfer the total to the NAMIX merchant account using your preferred app.</p>
            <ul class="payment-details-list">
                <li><strong>Number:</strong> <span class="monospaced">081 123 4567</span></li>
                <li><strong>Ref:</strong> <span>${order.customerName}</span></li>
            </ul>
        `;
    } else if (method === 'layby') {
        instructionsHTML = `
            <h4>Lay-by Instructions</h4>
            <p>To arrange a Lay-by, we require a 20% deposit.</p>
            <ul class="payment-details-list">
                <li><strong>Deposit:</strong> <span>${formatCurrency(order.totalAmount * 0.2)}</span></li>
                <li><strong>Balance:</strong> <span>${formatCurrency(order.totalAmount * 0.8)}</span></li>
            </ul>
        `;
    } else if (method === 'tradein') {
        instructionsHTML = `
            <h4>Apply Trade-in Credit</h4>
            <p>Use our Trade-in flow to value your old device. Once accepted, credit is applied.</p>
        `;
    }

    getAppRoot().innerHTML = `
        <div style="text-align:center; padding: 40px 20px; background:var(--corporate-blue); color:white; border-radius:12px; margin-bottom:2rem;">
            <h1>${info.title}</h1>
        </div>
        <div class="page-container payment-method-wrapper" style="margin-top: 2rem;">
            <div class="payment-detail">
                <div class="payment-summary">
                    <span class="label">Order Total</span>
                    <span class="amount">${formatCurrency(order.totalAmount)}</span>
                </div>
                
                <div class="payment-instructions-body">
                    ${instructionsHTML}
                </div>

                <div class="payment-actions">
                    <button id="complete-order-btn" class="btn btn-primary">Complete Order</button>
                    <a href="#payment" class="btn btn-outline">Back</a>
                </div>
            </div>
        </div>
    `;

    document.getElementById('complete-order-btn').addEventListener('click', async () => {
        try {
            const response = await fetch('/api/transactions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    customerName: order.customerName,
                    customerEmail: order.customerEmail,
                    customerAddress: order.customerAddress,
                    phoneNumber: order.phoneNumber,
                    landmark: order.landmark,
                    locationRegion: order.locationRegion,
                    transportMethod: order.transportMethod,
                    deliveryFee: order.deliveryFee,
                    insuranceSelected: order.insuranceSelected,
                    insuranceFee: order.insuranceFee,
                    items: order.items,
                    totalAmount: order.totalAmount,
                    giftCardEarned: order.giftCardEarned,
                    paymentMethod: method,
                }),
            });

            if (response.ok) {
                const completedTxn = await response.json();
                CartManager.clearCart();
                sessionStorage.removeItem('pendingOrder');
                location.hash = `#order-confirmation/${completedTxn._id}`;
            } else {
                alert('Failed to record transaction payment.');
            }
        } catch (err) {
            console.error('Error completing transaction', err);
        }
    });
};

export const renderAdminLoginPage = () => {
    getAppRoot().innerHTML = `
        <div class="page-container" style="max-width: 500px; margin-top: 3rem;">
            <div style="background: var(--white); padding: 2.5rem; border-radius: var(--border-radius); box-shadow: var(--shadow-medium); position:relative;">
                <h1 style="text-align: center; color: var(--corporate-blue); margin-bottom: 2rem;">Admin / Seller Portal</h1>
                <form id="admin-login-form">
                    <div class="form-group">
                        <label for="email">Email Address</label>
                        <input type="email" id="email" name="email" required autocomplete="email">
                    </div>
                    <div class="form-group" style="position:relative;">
                        <label for="password">Password</label>
                        <input type="password" id="password" name="password" required autocomplete="current-password" style="padding-right: 40px; width:100%;">
                        <i class="fas fa-eye toggle-password" style="position: absolute; right: 10px; top: 38px; cursor: pointer; color: #666; z-index:10;"></i>
                    </div>
                    <div id="admin-login-message" class="form-message error" style="text-align: center;"></div>
                    <button type="submit" class="btn btn-primary" style="width: 100%; margin-top: 1rem; padding: 15px;">Sign In</button>
                </form>
            </div>
        </div>
    `;
};

export const renderLoginPage = () => {
    getAppRoot().innerHTML = `
        <div class="page-container" style="max-width: 500px; margin-top: 3rem;">
            <div style="background: var(--white); padding: 2.5rem; border-radius: var(--border-radius); box-shadow: var(--shadow-medium); position:relative;">
                <h1 style="text-align: center; color: var(--corporate-blue); margin-bottom: 2rem;">Sign In</h1>
                <form id="login-form">
                    <div class="form-group">
                        <label for="email">Email Address</label>
                        <input type="email" id="email" name="email" required autocomplete="email">
                    </div>
                    <div class="form-group" style="position:relative;">
                        <label for="password">Password</label>
                        <input type="password" id="password" name="password" required autocomplete="current-password" style="padding-right: 40px; width:100%;">
                        <i class="fas fa-eye toggle-password" style="position: absolute; right: 10px; top: 38px; cursor: pointer; color: #666; z-index:10;"></i>
                    </div>
                    <div id="login-message" class="form-message" style="text-align: center;"></div>
                    <button type="submit" class="btn btn-primary" style="width: 100%; margin-top: 1rem; padding: 15px;">Sign In</button>
                </form>
                <div style="text-align: center; margin-top: 1.5rem;">
                    <p>Don't have an account? <a href="#register" style="color: var(--corporate-blue); text-decoration: underline;">Sign Up</a></p>
                </div>
            </div>
        </div>
    `;
};

export const renderRegisterPage = () => {
    getAppRoot().innerHTML = `
        <div class="page-container" style="max-width: 500px; margin-top: 3rem;">
            <div style="background: var(--white); padding: 2.5rem; border-radius: var(--border-radius); box-shadow: var(--shadow-medium); position:relative;">
                <h1 style="text-align: center; color: var(--corporate-blue); margin-bottom: 2rem;">Create Account</h1>
                <form id="register-form" enctype="multipart/form-data">
                    <div class="form-group">
                        <label for="name">Full Name</label>
                        <input type="text" id="name" name="name" required autocomplete="name">
                    </div>
                    <div class="form-group">
                        <label for="businessName">Business Name / Brand Name</label>
                        <input type="text" id="businessName" name="businessName">
                    </div>
                    <div class="form-group">
                        <label for="phone">Phone Number</label>
                        <input type="tel" id="phone" name="phone">
                    </div>
                    <div class="form-group">
                        <label for="email">Email Address</label>
                        <input type="email" id="email" name="email" required autocomplete="email">
                    </div>
                    <div class="form-group" style="position:relative;">
                        <label for="password">Password</label>
                        <input type="password" id="password" name="password" required autocomplete="new-password" minlength="6" style="padding-right: 40px; width:100%;">
                        <i class="fas fa-eye toggle-password" style="position: absolute; right: 10px; top: 38px; cursor: pointer; color: #666; z-index:10;"></i>
                    </div>
                    <div class="form-group">
                        <label for="sellerType">Account Type (Select multiple by holding Ctrl/Cmd)</label>
                        <select id="sellerType" name="sellerType" multiple style="height: 120px;">
                            <option value="customer" selected>Customer</option>
                            <option value="electronics">Electronics Seller</option>
                            <option value="solar">Solar Energy Seller</option>
                            <option value="fashion">Fashion & Beauty Seller</option>
                            <option value="groceries">Food & Groceries Seller</option>
                            <option value="appliances">Home Appliances Seller</option>
                            <option value="vehicles">Vehicles & Parts Seller</option>
                            <option value="crafts">Crafts & Handmade Seller</option>
                            <option value="farm">Farm & Food Seller</option>
                            <option value="fuel">Charcoal & Fuel Seller</option>
                            <option value="other">Other/Misc Seller</option>
                        </select>
                    </div>
                    <div id="seller-verification-fields" style="display:none;">
                        <div class="form-group">
                            <label for="sellerIdNumber">Seller ID Number (Optional)</label>
                            <input type="text" id="sellerIdNumber" name="sellerIdNumber">
                        </div>
                        <div class="form-group">
                            <label for="sellerIdImage">Upload Picture of ID (Optional)</label>
                            <input type="file" id="sellerIdImage" name="sellerIdImage" accept="image/*">
                        </div>
                        <div class="form-group">
                            <label for="businessRegistrationNumber">Business Registration Number (Optional)</label>
                            <input type="text" id="businessRegistrationNumber" name="businessRegistrationNumber">
                        </div>
                        <div class="form-group">
                            <label for="businessRegistrationDocument">Business Registration Document (PDF) (Optional)</label>
                            <input type="file" id="businessRegistrationDocument" name="businessRegistrationDocument" accept="application/pdf">
                        </div>
                        <div class="form-group">
                            <label for="physicalAddress">Physical Address</label>
                            <input type="text" id="physicalAddress" name="physicalAddress">
                        </div>
                    </div>
                    <div id="register-message" class="form-message" style="text-align: center;"></div>
                    <button type="submit" class="btn btn-primary" style="width: 100%; margin-top: 1rem; padding: 15px;">Create Account</button>
                </form>
            </div>
        </div>
    `;

    document.getElementById('sellerType')?.addEventListener('change', (e) => {
        const selected = Array.from(e.target.selectedOptions).map(opt => opt.value);
        const isSeller = selected.some(val => val !== 'customer');
        document.getElementById('seller-verification-fields').style.display = isSeller ? 'block' : 'none';
    });
};

export const renderAdminPage = async (allProducts, allUsers, allViewers, allTransactions, allFAQs, settings, sellerType, allComps) => {
    sellerType = sellerType || 'admin';
    allProducts = Array.isArray(allProducts) ? allProducts : (allProducts ? Array.from(allProducts) : []);
    allUsers = Array.isArray(allUsers) ? allUsers : [];
    allViewers = Array.isArray(allViewers) ? allViewers : [];
    allTransactions = Array.isArray(allTransactions) ? allTransactions : [];
    allFAQs = Array.isArray(allFAQs) ? allFAQs : [];

    isMainAdmin = sellerType === 'admin';
    const mapSellerToCategory = (st) => {
        if (!st) return '';
        const map = {
            'electronics': 'electronics', 'solar': 'solar', 'fashion': 'fashion',
            'groceries': 'groceries', 'appliances': 'appliances', 'vehicles': 'vehicles',
            'crafts': 'crafts', 'farm': 'farm', 'fuel': 'fuel', 'other': 'other'
        };
        return map[st] || st;
    };
    const mappedSellerCategory = mapSellerToCategory(sellerType);
    
    isClothesAdmin = mappedSellerCategory === 'fashion';
    isFashionAdmin = isClothesAdmin;
    isFurnitureAdmin = mappedSellerCategory === 'appliances';
    isKidsAdmin = mappedSellerCategory === 'electronics';

    const currentUser = getCurrentUser();
    
    // SAFE FILTERING: Guarantees no TypeErrors if product.seller or currentUser is null
    const relevantProducts = isMainAdmin
        ? allProducts
        : allProducts.filter(p => {
            if (!p || !currentUser) return false;
            const sellerId = p.seller ? (p.seller._id || p.seller) : null;
            if (!sellerId) return false;
            return String(sellerId) === String(currentUser._id);
        });

    const productListHTML = relevantProducts.map(p => `
        <li>
            <div class="product-info">${p.title} <span>(Stock: ${p.stock !== undefined ? p.stock : 'N/A'})</span></div>
            <div class="actions">
                <button class="edit-btn" data-product-id="${p.productId}" data-mongo-id="${p._id}"><i class="fas fa-edit"></i> Edit</button>
                <button class="delete-btn" data-id="${p._id}"><i class="fas fa-trash"></i> Delete</button>
            </div>
        </li>`).join('');

    const adminTabs = `
        <button class="admin-tab-btn active" data-tab="products">Products</button>
        <button class="admin-tab-btn" data-tab="transactions">Transactions</button>
        ${!isMainAdmin ? `
            <button class="admin-tab-btn" data-tab="reseller-profile">Profile Settings</button>
            <button class="admin-tab-btn" data-tab="reseller-pickup-points">Manage Pickup Points</button>
        ` : ''}
        ${isMainAdmin ? `
            <button class="admin-tab-btn" data-tab="sellers">Resellers</button>
            <button class="admin-tab-btn" data-tab="competitions-manager">Competitions</button>
            <button class="admin-tab-btn" data-tab="add-viewer">Add Viewer</button>
            <button class="admin-tab-btn" data-tab="manage-viewers">Manage Viewers</button>
            <button class="admin-tab-btn" data-tab="users">Users</button>
            <button class="admin-tab-btn" data-tab="faqs">FAQs</button>
            <button class="admin-tab-btn" data-tab="brands">Brands Manager</button>
            <button class="admin-tab-btn" data-tab="site-settings">Site Settings</button>
            <button class="admin-tab-btn" data-tab="page-settings">Page Settings</button>
            <button class="admin-tab-btn" data-tab="simulate-views">Simulate Views</button>
        ` : ''}
    `;

    const userListHTML = allUsers.map(u => {
        const isAdmin = u.isAdmin || u.sellerType === 'admin';
        const deleteButton = isAdmin
            ? `<span style="color: #999; font-size: 0.9rem;">Admin Account</span>`
            : `<button class="delete-user-btn" data-user-id="${u._id}"><i class="fas fa-trash"></i> Delete</button>`;
        return `<li><div class="user-info">${u.name}<span>${u.email}</span></div><div class="actions">${deleteButton}</div></li>`;
    }).join('');

    const sellerAccounts = allUsers.filter(u => u.sellerType && u.sellerType !== 'admin' && u.sellerType !== 'customer');
    let sellerListHTML = '';
    if (sellerAccounts.length === 0) {
        sellerListHTML = `<li style="padding: 15px; border-bottom: 1px solid #eee; color:#666;">No reseller accounts found.</li>`;
    } else {
        sellerListHTML = sellerAccounts.map(u => {
            const isApproved = u.isApproved === true;
            const showBestSellerBadge = u.showBestSellerBadge === true;
            const isVerified = u.isVerified === true;
            let statusBadge;

            if (isApproved) {
                statusBadge = `<span class="status-badge" style="background: #e6ffed; color: #065f46; padding: 4px 8px; border-radius: 4px; font-size: 0.8rem; font-weight: bold;">Active</span>`;
            } else {
                statusBadge = `<span class="status-badge" style="background: #e0e0e0; color: #333; padding: 4px 8px; border-radius: 4px; font-size: 0.8rem; font-weight: bold;">Deactivated</span>`;
            }

            return `<li style="padding: 15px; border-bottom: 1px solid #eee; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;" class="seller-account-item">
                <div class="user-info">
                    <div style="font-weight: 600; display:flex; align-items:center; gap:10px;">${u.name} ${statusBadge}</div>
                    <span style="font-size: 0.9rem; color: #666;">${u.email} | Type: <strong>${u.sellerType}</strong></span>
                </div>
                <div class="actions" style="display:flex; gap:15px; align-items:center; flex-wrap:wrap;">
                    <label class="verify-switch switch" title="Toggle Approval">
                        <input type="checkbox" class="seller-approve-toggle" data-user-id="${u._id}" ${isApproved ? 'checked' : ''}>
                        <span class="slider round"></span>
                    </label>
                    <label class="verify-switch switch" title="Toggle Verification" style="display:inline-flex; align-items:center; gap:5px; font-size:0.85rem; font-weight:bold;">
                        <input type="checkbox" class="seller-verified-toggle" data-user-id="${u._id}" ${isVerified ? 'checked' : ''}>
                        <span class="slider round"></span>
                        Verified Tick
                    </label>
                    <label class="bestseller-switch" title="Toggle Bestseller Badge" style="display:inline-flex; align-items:center; gap:5px; font-size:0.85rem; font-weight:bold;">
                        <input type="checkbox" class="seller-bestseller-toggle" data-user-id="${u._id}" ${showBestSellerBadge ? 'checked' : ''}>
                        Best Seller
                    </label>
                    <button class="delete-user-btn" data-user-id="${u._id}" style="color: var(--danger-red); background:none; border:none; cursor:pointer;"><i class="fas fa-trash"></i></button>
                </div>
            </li>`;
        }).join('');
    }

    const activeCompsListHTML = allComps ? allComps.map(c => `
        <li style="padding:10px; border-bottom:1px solid #eee;">
            <strong>${c.title}</strong> - Prize: ${c.prizeDetails}
            <div style="font-size:0.85rem; color:#666; margin-top:4px;">Total entries: ${c.entries ? c.entries.length : 0}</div>
        </li>
    `).join('') : '';

    const viewerListHTML = (allViewers || []).flatMap(p => {
        const reviewsByViewerId = {};
        (p.reviews || []).forEach(r => { if (r.viewerId) reviewsByViewerId[r.viewerId.toString()] = r; });
        return (p.viewers || []).map(v => {
            const viewerName = v.name ? v.name : 'Anonymous';
            const review = reviewsByViewerId[v._id.toString()];
            const hasReview = !!review;
            const reviewStatus = hasReview ? `<span style="color: var(--success-green); font-weight: 600; display:flex; align-items:center; gap: 5px;"><i class="fas fa-check-circle"></i> Review Added</span>` : '';
            const reviewDetails = hasReview ? `<div class="review-details" style="margin-top:4px; font-size:0.95em; color:#444; background:#f8f8f8; padding:6px 10px; border-radius:6px;"><strong>Review:</strong> ${review.text}<br/><strong>Rating:</strong> ${review.rating} ★</div>` : '';
            return `<li><div class="viewer-info">${p.title}<span>${viewerName}</span><span>Viewed At: ${new Date(v.viewedAt).toLocaleString()}</span></div><div class="actions" style="display:flex; align-items:center; gap: 15px; flex-direction:column; align-items:flex-start;">${reviewStatus}${reviewDetails}<button class="delete-btn" data-product-id="${p._id}" data-viewer-id="${v._id}"><i class="fas fa-trash"></i> Delete</button></div></li>`;
        });
    }).join('') || "<li>No viewers found.</li>";
    
    // SAFE TRANSACTION FILTERING: Fully protected from null fields or missing products
    const relevantTransactions = isMainAdmin 
        ? allTransactions 
        : allTransactions.filter(transaction => {
            if (!transaction || !transaction.items) return false;
            return transaction.items.some(item => {
                const product = allProducts.find(p => p.productId === item.productId);
                if (!product || !product.seller || !currentUser) return false;
                const sellerId = product.seller._id ? product.seller._id : product.seller;
                return String(sellerId) === String(currentUser._id);
            });
        });

    const faqListHTML = allFAQs.map(faq => `<li><div class="faq-info"><strong>Q:</strong> ${faq.question}<p style="margin-left: 20px; color: #555;"><strong>A:</strong> ${faq.answer}</p></div><div class="actions"><button class="edit-faq-btn" data-faq-id="${faq._id}"><i class="fas fa-edit"></i> Edit</button><button class="delete-faq-btn" data-faq-id="${faq._id}"><i class="fas fa-trash"></i> Delete</button></div></li>`).join('');

    let brandListHTML = '';
    if (isMainAdmin) {
        try {
            const allBrands = await api.fetchBrands();
            brandListHTML = allBrands.map(brand => `<li><div class="brand-info"><strong>Brand:</strong> ${brand.name}</div><div class="actions"><button class="edit-brand-btn" data-brand-id="${brand._id}"><i class="fas fa-edit"></i> Edit</button><button class="delete-brand-btn" data-brand-id="${brand._id}"><i class="fas fa-trash"></i> Delete</button></div></li>`).join('');
        } catch (err) {
            console.error('Failed to load brands:', err);
        }
    }

    const transactionsListHTML = (relevantTransactions || []).length > 0 ? (() => {
        const totalRevenue = (relevantTransactions || []).reduce((sum, t) => sum + (t.totalAmount || 0), 0);
        return `<table class="transactions-table" style="width: 100%; border-collapse: collapse; margin-top: 15px;"><thead><tr style="background-color: #f0f0f0; border-bottom: 2px solid var(--border-color);"><th style="padding: 10px; text-align: left; border: 1px solid var(--border-color);">Customer</th><th style="padding: 10px; text-align: left; border: 1px solid var(--border-color);">Email</th><th style="padding: 10px; text-align: right; border: 1px solid var(--border-color);">Total</th><th style="padding: 10px; text-align: left; border: 1px solid var(--border-color);">Date</th><th style="padding: 10px; text-align: center; border: 1px solid var(--border-color);">Details</th><th style="padding: 10px; text-align: center; border: 1px solid var(--border-color);">Verified</th></tr></thead><tbody>${(relevantTransactions || []).map((t, idx) => `<tr class="transaction-row ${t.verified ? 'verified' : ''}" data-transaction-id="${t._id}"><td style="padding: 10px; border: 1px solid var(--border-color);">${t.customerName || 'N/A'}</td><td style="padding: 10px; border: 1px solid var(--border-color);">${t.customerEmail || 'N/A'}</td><td style="padding: 10px; border: 1px solid var(--border-color); text-align: right;"><strong>${formatCurrency(t.totalAmount || 0)}</strong></td><td style="padding: 10px; border: 1px solid var(--border-color);">${t.createdAt ? new Date(t.createdAt).toLocaleDateString() : 'N/A'}</td><td style="padding: 10px; border: 1px solid var(--border-color); text-align: center;"><button class="view-transaction-btn" data-index="${idx}" style="padding: 6px 12px; background-color: var(--corporate-blue); color: white; border: none; border-radius: 4px; cursor: pointer;"><i class="fas fa-eye"></i></button></td><td style="padding: 10px; border: 1px solid var(--border-color); text-align: center;"><label class="verify-switch switch"><input type="checkbox" class="verify-switch" ${t.verified ? 'checked' : ''}><span class="slider round"></span></label></td></tr>`).join('')}</tbody><tfoot><tr style="background-color: #f0f0f0; border-top: 2px solid var(--border-color); font-weight: bold;"><td colspan="2" style="padding: 15px 10px; border: 1px solid var(--border-color); text-align: right;"><strong>TOTAL REVENUE:</strong></td><td style="padding: 15px 10px; border: 1px solid var(--border-color); text-align: right; background-color: #c8e6c9;"><strong style="color: #1b5e20; font-size: 1.1rem;">${formatCurrency(totalRevenue)}</strong></td><td colspan="3" style="padding: 15px 10px; border: 1px solid var(--border-color);"></td></tr></tfoot></table>`;
    })() : '<p>No transactions yet.</p>';
    
    const productOptions = allProducts.map(p => `<option value="${p.productId}">${p.title}</option>`).join('');
    
    const backToAdminButton = sessionStorage.getItem('mainAdminInfo') 
        ? `<button id="back-to-main-admin" class="btn btn-primary" style="margin-bottom: 1rem; background-color: var(--corporate-gold); color: #333;"><i class="fas fa-arrow-left"></i> Return to Main Admin Dashboard</button>` 
        : '';

    getAppRoot().innerHTML = `
    <div class="page-container admin-container">
        <div style="background-color: #d4edda; border: 2px solid #28a745; padding: 12px; margin-bottom: 16px; border-radius: 6px; color: #155724;">
            <strong>✓ Admin Dashboard Loaded Successfully</strong> | Role: ${sellerType} | Time: ${new Date().toLocaleTimeString()}
        </div>
        ${backToAdminButton}
         <div style="display: flex; justify-content: space-between; align-items: center;">
            <h1>${sellerType.charAt(0).toUpperCase() + sellerType.slice(1)} Dashboard</h1>
            <button id="logout-btn" class="btn btn-outline">Logout</button>
        </div>
        <div class="admin-tabs">${adminTabs}</div>

        <div id="products" class="admin-tab-content active">
            <section class="admin-section">
                <h2>Add / Edit Product</h2>
                <form id="product-form" class="admin-form">
                    <input type="hidden" id="product-id-hidden">
                    <div class="form-grid">
                        <div class="form-group" style="${isMainAdmin ? '' : 'display:none;'}"><label for="product-id">Product ID</label><input type="text" id="product-id" ${isMainAdmin ? 'required' : ''}></div>
                        <div class="form-group"><label for="product-title">Title</label><input type="text" id="product-title" required></div>
                        <div class="form-group"><label for="product-currentPrice">Current Price</label><input type="number" id="product-currentPrice" required></div>
                        <div class="form-group"><label for="product-oldPrice">Old Price</label><input type="number" id="product-oldPrice" required></div>
                        <div class="form-group"><label for="product-category">Category</label><input type="text" id="product-category" value="${isMainAdmin ? '' : mappedSellerCategory}" ${!isMainAdmin ? 'readonly' : ''} required></div>
                        <div class="form-group">
                            <label for="product-image">Main Image URL</label>
                            <input type="text" id="product-image" required>
                            <label for="product-image-file" style="margin-top:0.35rem; display:block; font-size:0.85rem; color:#555;">or Upload Main Image</label>
                            <input type="file" id="product-image-file" accept="image/*">
                        </div>
                        <div id="main-image-preview-container" style="margin-top:8px; display:none;">
                            <img id="main-image-preview" src="" alt="Main Image Preview" style="max-width:150px; max-height:150px; object-fit:cover; border-radius:6px; box-shadow:0 2px 8px rgba(0,0,0,0.1);" onerror="this.style.display='none'; document.getElementById('main-image-preview-error').style.display='block';">
                            <div id="main-image-preview-error" style="color:#d32f2f; font-size:0.85rem; margin-top:4px; display:none;">⚠️ Image failed to load. Check URL.</div>
                        </div>
                        <div id="carousel-image-urls" class="form-group full-width">
                            <label>Carousel Image URLs (up to 4)</label>
                            <div class="form-grid">
                                <div style="display:flex; flex-direction:column; gap:4px;"><input type="text" id="carousel-url-1" placeholder="Carousel Image 1 URL"><input type="file" id="carousel-file-1" accept="image/*"></div>
                                <div style="display:flex; flex-direction:column; gap:4px;"><input type="text" id="carousel-url-2" placeholder="Carousel Image 2 URL"><input type="file" id="carousel-file-2" accept="image/*"></div>
                                <div style="display:flex; flex-direction:column; gap:4px;"><input type="text" id="carousel-url-3" placeholder="Carousel Image 3 URL"><input type="file" id="carousel-file-3" accept="image/*"></div>
                                <div style="display:flex; flex-direction:column; gap:4px;"><input type="text" id="carousel-url-4" placeholder="Carousel Image 4 URL"><input type="file" id="carousel-file-4" accept="image/*"></div>
                            </div>
                            <div id="carousel-images-preview-container" style="display:flex; gap:8px; flex-wrap:wrap; margin-top:8px;">
                                <div id="carousel-preview-1-wrapper" style="display:none; position:relative;">
                                    <img id="carousel-preview-1" src="" alt="Carousel 1" style="width:120px; height:120px; object-fit:cover; border-radius:6px; box-shadow:0 2px 8px rgba(0,0,0,0.1);" onerror="document.getElementById('carousel-preview-1-wrapper').style.display='none';">
                                </div>
                                <div id="carousel-preview-2-wrapper" style="display:none; position:relative;">
                                    <img id="carousel-preview-2" src="" alt="Carousel 2" style="width:120px; height:120px; object-fit:cover; border-radius:6px; box-shadow:0 2px 8px rgba(0,0,0,0.1);" onerror="document.getElementById('carousel-preview-2-wrapper').style.display='none';">
                                </div>
                                <div id="carousel-preview-3-wrapper" style="display:none; position:relative;">
                                    <img id="carousel-preview-3" src="" alt="Carousel 3" style="width:120px; height:120px; object-fit:cover; border-radius:6px; box-shadow:0 2px 8px rgba(0,0,0,0.1);" onerror="document.getElementById('carousel-preview-3-wrapper').style.display='none';">
                                </div>
                                <div id="carousel-preview-4-wrapper" style="display:none; position:relative;">
                                    <img id="carousel-preview-4" src="" alt="Carousel 4" style="width:120px; height:120px; object-fit:cover; border-radius:6px; box-shadow:0 2px 8px rgba(0,0,0,0.1);" onerror="document.getElementById('carousel-preview-4-wrapper').style.display='none';">
                                </div>
                            </div>
                        </div>
                        <div class="form-group"><label for="product-description">Description</label><textarea id="product-description" placeholder="Enter product description (optional - AI will generate if blank)" rows="4"></textarea><div id="ai-desc-status" style="font-size:0.85rem; margin-top:5px; font-style:italic;"></div></div>
                        <div class="form-group"><label>Or Upload up to 3 images</label><input type="file" id="product-images" accept="image/*" multiple></div>
                        <div id="product-images-preview" class="images-preview" style="display:flex; gap:8px; margin-top:8px;"></div>
                        <input type="hidden" id="product-thumbnails-hidden">
                        <div class="form-group"><label>Track Stock?</label><input type="checkbox" id="product-stockToggle"></div>
                        <div class="form-group" id="stock-field-group" style="display: none;"><label for="product-stock">Stock Amount</label><input type="number" id="product-stock" value="10" min="0" step="1"></div>
                        ${!isClothesAdmin && !isKidsAdmin && !isFoodAdmin ? `<div class="form-group"><label for="product-condition">Condition</label><select id="product-condition"><option value="new">New</option><option value="second-hand">Second-Hand</option></select></div>` : ''}
                        
                        <div class="form-group" style="display: flex; align-items: center; gap: 12px;"><label style="margin: 0;">Enable Color Variations?</label><input type="checkbox" id="enable-product-colors"></div>
                        
                        <div id="product-colors-section" style="display:none; margin-top:1.5rem; padding:1rem; background-color:#f9f9f9; border-radius:8px;">
                            <label style="display:block; margin-bottom:8px; font-weight:600;">Product Colors (Add infinite variations)</label>
                            <div style="display:flex; gap:8px; margin-bottom:10px;">
                                <input type="text" id="new-color-input" placeholder="e.g. Red, Blue, #00FF00" style="flex:1; padding:8px; border:1px solid #ddd; border-radius:4px;">
                                <button type="button" id="add-color-btn" style="padding:8px 16px; background-color:var(--corporate-blue); color:white; border:none; border-radius:4px; cursor:pointer; font-weight:600;">Add & Save Color</button>
                            </div>
                            <div id="product-colors-preview" style="display:flex; gap:12px; flex-wrap:wrap; margin-top:10px;"></div>
                            <input type="hidden" id="product-colors-hidden" name="colors">
                        </div>

                        <div class="form-group">
                            <label for="product-exploreMoreReseller">Explore More Reseller Assignment</label>
                            <select id="product-exploreMoreReseller" style="width:100%; padding:10px; border-radius:8px; border:1px solid var(--border-color);">
                                <option value="">-- None (Defaults to current seller) --</option>
                                ${allUsers.filter(u => u.sellerType && u.sellerType !== 'customer' && u.sellerType !== 'admin').map(u => `
                                    <option value="${u._id}">${u.businessName || u.name} (${u.sellerType})</option>
                                `).join('')}
                            </select>
                        </div>
                        
                        ${isClothesAdmin ? `
                        <div id="clothing-size-section" style="margin-top: 1.5rem; padding: 1rem; background-color: #f9f9f9; border-radius: 8px;">
                            <label style="display:block; margin-bottom: 10px; font-weight: 600;">Available Clothing Sizes (Select multiple)</label>
                            <select id="product-sizes-select" multiple class="admin-input" style="width: 100%; height: 150px; padding: 10px; border: 1px solid var(--border-color); border-radius: 8px;">
                                ${STANDARD_SIZES.map(size => `<option value="${size}">${size}</option>`).join('')}
                            </select>
                            <small style="display:block; margin-top:5px; color:#666;">Hold Ctrl (Windows) or Cmd (Mac) to select multiple sizes.</small>
                        </div>
                        ` : ''}

                        <!-- Transport & Delivery Details with Region support -->
                        <div class="form-group full-width" style="margin-top:1.5rem; padding:1rem; background:#fafafa; border-radius:8px; display:flex; flex-direction:column; gap:10px;">
                            <label style="display:flex; align-items:center; gap:8px; cursor:pointer; font-weight:700;">
                                <input type="checkbox" id="product-freeTransport" style="width:18px; height:18px;">
                                Eligible for Free Delivery
                            </label>
                            <div id="delivery-pricing-section" style="display:block; margin-top:5px;">
                                <label style="display:block; margin-bottom:5px; font-weight:600;">Delivery Price by Region / Distance</label>
                                <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
                                    <div>
                                        <label for="product-deliveryPriceWindhoek">Delivery to Windhoek (N$)</label>
                                        <input type="number" id="product-deliveryPriceWindhoek" value="49" min="0" style="width:100%;">
                                    </div>
                                    <div>
                                        <label for="product-deliveryPriceOutside">Delivery Outside Windhoek (N$)</label>
                                        <input type="number" id="product-deliveryPriceOutside" value="79" min="0" style="width:100%;">
                                    </div>
                                </div>
                            </div>
                            <label style="display:flex; align-items:center; gap:8px; cursor:pointer; margin-top:10px;">
                                <input type="checkbox" id="product-cashOnDelivery" style="width:18px; height:18px;">
                                Offer Cash on Delivery (COD)
                            </label>
                        </div>

                        <!-- Safe Delivery Insurance Config Panel -->
                        <div class="form-group full-width" style="margin-top:1rem; padding:1rem; background:#fafafa; border-radius:8px; display:flex; flex-direction:column; gap:10px;">
                            <label style="display:flex; align-items:center; gap:8px; cursor:pointer; font-weight:700;">
                                <input type="checkbox" id="product-safeInsuranceEnabled" style="width:18px; height:18px;">
                                Enable Safe Delivery Insurance for this product
                            </label>
                            <div id="safe-insurance-price-group" style="display:none; margin-top:5px;">
                                <label for="product-safeInsurancePrice">Safe Delivery Insurance Price (N$)</label>
                                <input type="number" id="product-safeInsurancePrice" value="49" min="0" style="width:100%;">
                            </div>
                        </div>

                        <!-- Warranty Selector dynamically typed input -->
                        <div class="form-group full-width" style="margin-top:1.5rem;">
                            <label for="product-warrantyDuration">Warranty Duration Selection (Dynamically Typed)</label>
                            <input type="text" id="product-warrantyDuration" placeholder="e.g. 1 Year Brand Warranty" style="padding:10px; border-radius:8px; border:1px solid var(--border-color); width:100%;">
                        </div>

                        <!-- Promotion status advertising dropdown -->
                        <div class="form-group full-width" style="margin-top:1.5rem;">
                            <label for="product-promotionStatus">Status Advertising ribbon (Pro Package)</label>
                            <select id="product-promotionStatus" style="padding:10px; border-radius:8px; border:1px solid var(--border-color); width:100%;">
                                <option value="None">None</option>
                                <option value="Hot Deal">Hot Deal</option>
                                <option value="Limited Offer">Limited Offer</option>
                                <option value="WhatsApp Promo">WhatsApp Promo</option>
                                <option value="Countdown Special">Countdown Special</option>
                            </select>
                        </div>

                        ${isMainAdmin ? `
                        <div id="ai-features-section" style="margin-top:1.5rem; padding:1rem; background-color:#f0f7ff; border-radius:8px; border-left:4px solid var(--primary-blue);">
                            <h3 style="margin-top:0; margin-bottom:1rem; color:var(--primary-blue);">🤖 AI-Generated Features</h3>
                            <div style="margin-bottom:1rem;">
                                <label style="display:block; margin-bottom:0.5rem; font-weight:600;">Product Features</label>
                                <p style="margin:0.5rem 0 0.5rem 0; font-size:0.9rem; color:#666;">Features are generated automatically from the product title.</p>
                                <div id="product-features-container" style="display:flex; flex-direction:column; gap:8px; margin-top:8px;"></div>
                                <button type="button" id="ai-generate-features-btn" style="margin-top:10px; padding:8px 16px; background-color:var(--primary-blue); color:white; border:none; border-radius:4px; cursor:pointer; font-weight:600;">Regenerate Features</button>
                                <button type="button" id="ai-clear-features-btn" style="margin-top:10px; margin-left:8px; padding:8px 16px; background-color:#ccc; color:#333; border:none; border-radius:4px; cursor:pointer;">Clear All</button>
                                <div id="ai-features-status" style="margin-top:10px; font-size:0.9rem; color:#666; display:none;"></div>
                                <div id="ai-images-status" style="margin-top:10px; font-size:0.9rem; color:#666; display:none;"></div>
                            </div>
                        </div>
                        ` : `
                        <div id="manual-features-section" style="margin-top:1.5rem; padding:1rem; background-color:#f9f9f9; border-radius:8px; border-left:4px solid #999;">
                            <h3 style="margin-top:0; margin-bottom:1rem; color:#333;">Manual Product Features</h3>
                            <div style="margin-bottom:1rem;">
                                <label style="display:block; margin-bottom:0.5rem; font-weight:600;">Product Features</label>
                                <p style="margin:0.5rem 0 0.5rem 0; font-size:0.9rem; color:#666;">Add / edit feature bullets manually.</p>
                                <input type="text" id="manual-feature-input" placeholder="Enter a new feature" style="width:100%; padding:8px; border:1px solid #ddd; border-radius:4px; margin-bottom:8px;" />
                                <div id="product-features-container" style="display:flex; flex-direction:column; gap:8px; margin-top:8px;"></div>
                                <button type="button" id="manual-add-feature-btn" style="margin-top:10px; padding:8px 16px; background-color:var(--secondary-blue); color:white; border:none; border-radius:4px; cursor:pointer; font-weight:600;">Add Feature</button>
                                <button type="button" id="ai-clear-features-btn" style="margin-top:10px; margin-left:8px; padding:8px 16px; background-color:#ccc; color:#333; border:none; border-radius:4px; cursor:pointer;">Clear All</button>
                            </div>
                        </div>
                        `}

                        <div class="form-group full-width" style="margin-top: 1.5rem; padding: 1rem; background-color: #f9f9f9; border-radius: 8px;">
                            <label style="font-weight: 600;">Manage Product Filter Tags (For Sorting & Category Filters)</label>
                            <p style="font-size: 0.85rem; color: #666; margin: 4px 0 10px 0;">Add, update, or remove filter tags for this product. These determine how the product is classified in the Sort & Category filter dropdowns (e.g. tops, bottoms, bakkies, suvs, traditional, fiction, nonfiction, hotmeals, etc.).</p>
                            <div style="display: flex; gap: 8px; margin-bottom: 10px;">
                                <input type="text" id="new-filter-tag-input" placeholder="e.g. tops, bottoms, suvs, forsale" style="flex: 1; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                                <button type="button" id="add-filter-tag-btn" style="padding: 8px 16px; background-color: var(--corporate-blue); color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: 600;">Add Tag</button>
                            </div>
                            <div id="product-filter-tags-container" style="display: flex; gap: 8px; flex-wrap: wrap; min-height: 35px; padding: 8px; background: white; border: 1px solid #ddd; border-radius: 6px;">
                                <span style="color:#999; font-size:12px;">No active tags</span>
                            </div>
                            <input type="hidden" id="product-clothing-filters-hidden" name="clothingFilters">
                        </div>
                        
                        <div class="form-group"><label>On Sale?</label><input type="checkbox" id="product-onSale"></div>
                    </div>
                    
                    <!-- Trust Visibility Config Panel -->
                    <h3 style="margin-top: 1.5rem; margin-bottom: 1rem;">Trust Section Badges Visibility</h3>
                    <div class="form-grid">
                        <div class="form-group"><label>Display Trade-In Badge <input type="checkbox" id="product-showTradeIn" class="product-curate-toggle" checked></label></div>
                        <div class="form-group"><label>Display Lay-Bye Badge <input type="checkbox" id="product-showLayBye" class="product-curate-toggle" checked></label></div>
                        <div class="form-group"><label>Display Deposit Badge <input type="checkbox" id="product-showDeposit" class="product-curate-toggle" checked></label></div>
                        <div class="form-group"><label>Display Delivery Nationwide Badge <input type="checkbox" id="product-showDeliveryNationwide" class="product-curate-toggle" checked></label></div>
                        <div class="form-group"><label>Display 1-Year Warranty Badge <input type="checkbox" id="product-showOneYearWarranty" class="product-curate-toggle" checked></label></div>
                        <div class="form-group"><label>Display 15-Day Returns Badge <input type="checkbox" id="product-showFifteenDayReturns" class="product-curate-toggle" checked></label></div>
                    </div>

                    <div id="sale-dates-section" style="display:none; margin-top:1.5rem; padding:1rem; background-color:#f9f9f9; border-radius:8px;">
                        <h3 style="margin-bottom:1rem;">Sale Duration</h3>
                        <div class="form-grid">
                            <div class="form-group"><label for="product-saleStartDate">Sale Start Date & Time</label><input type="datetime-local" id="product-saleStartDate"></div>
                            <div class="form-group"><label for="product-saleEndDate">Sale End Date & Time</label><input type="datetime-local" id="product-saleEndDate"></div>
                        </div>
                    </div>
                    <h3 style="margin-top: 1.5rem; margin-bottom: 1rem;">Assign to Curated Pages</h3>
                    ${isMainAdmin ? `
                    <div class="form-grid">
                        <div class="form-group"><label>Trending Now <input type="checkbox" id="product-curate-trending" class="product-curate-toggle"></label></div>
                        <div class="form-group"><label>New Releases <input type="checkbox" id="product-curate-new-arrivals" class="product-curate-toggle"></label></div>
                        <div class="form-group"><label>Super Combos <input type="checkbox" id="product-curate-combos" class="product-curate-toggle"></label></div>
                    </div>
                    ` : `
                    <div class="form-grid">
                        ${isKidsAdmin ? `
                        <div class="form-group"><label>Kids Electronics <input type="checkbox" id="product-curate-kids-electronics" class="product-curate-toggle"></label></div>
                        <div class="form-group"><label>Kids Clothing <input type="checkbox" id="product-curate-kids-clothing" class="product-curate-toggle"></label></div>
                        <div class="form-group"><label>Kids Toys <input type="checkbox" id="product-curate-kids-toys" class="product-curate-toggle"></label></div>
                        ` : `
                        ${isFashionAdmin ? `
                        <div class="form-group"><label>Women's Clothes Page <input type="checkbox" id="product-curate-womens" class="product-curate-toggle"></label></div>
                        <div class="form-group"><label>Men's Clothes Page <input type="checkbox" id="product-curate-mens" class="product-curate-toggle"></label></div>
                        ` : ''}
                        ${isFurnitureAdmin ? `
                        <div class="form-group"><label>Living Room <input type="checkbox" id="product-curate-livingroom" class="product-curate-toggle"></label></div>
                        <div class="form-group"><label>Bedroom <input type="checkbox" id="product-curate-bedroom" class="product-curate-toggle"></label></div>
                        <div class="form-group"><label>Office <input type="checkbox" id="product-curate-office" class="product-curate-toggle"></label></div>
                        <div class="form-group"><label>Kitchen <input type="checkbox" id="product-curate-kitchen" class="product-curate-toggle"></label></div>
                        ` : ''}
                        `}
                        <div class="form-group"><label>Super Combos <input type="checkbox" id="product-curate-combos" class="product-curate-toggle"></label></div>
                    </div>
                    `}
                    <div id="combo-expiry-section" style="display:none; margin-top:1.5rem; padding:1rem; background-color:#fffbe6; border-radius:8px; border-left: 4px solid var(--corporate-gold);">
                        <div class="form-group">
                            <label for="product-comboEndDate">Combo Sale End Date</label>
                            <input type="datetime-local" id="product-comboEndDate">
                        </div>
                    </div>
                    <div id="combo-builder-section" class="admin-form" style="display:none; margin-top:1.5rem; padding:1.5rem; background-color:#eaf5ff; border-radius:12px; border-left: 4px solid var(--corporate-blue);">
                        <h3 style="margin-top:0; margin-bottom: 1rem; color: var(--corporate-blue);">Combo Product Builder</h3>
                        <p style="margin-top:0; margin-bottom:1rem; font-size: 0.9rem; color: #555;">Select up to 5 products to create a visual combo. The generated image will become this product's main image.</p>
                        <div class="form-group">
                            <label for="combo-product-search">Search products to add</label>
                            <input type="text" id="combo-product-search" placeholder="Type to filter product list...">
                        </div>
                        <div id="combo-product-list" style="max-height: 200px; overflow-y: auto; border: 1px solid #d2d2d7; background: white; padding: 10px; margin-bottom: 1rem; border-radius: 8px;">
                        </div>
                        <p style="font-weight: 600;">Selected Products (<span id="combo-selected-count">0</span>/5):</p>
                        <div id="combo-selected-preview" style="display:flex; flex-wrap:wrap; gap:10px; margin-bottom: 1.5rem; min-height: 50px; background: #dfeffc; padding: 10px; border-radius: 8px;">
                        </div>
                        <h4 style="margin-bottom: 0.5rem;">Generated Combo Image Preview:</h4>
                        <canvas id="combo-image-canvas" width="500" height="500" style="width: 250px; height: 250px; border: 2px dashed #ccc; background: #f9f9f9; border-radius: 8px;"></canvas>
                        <div id="combo-total-display" style="margin-top:10px; font-weight:700;">Calculated Total (Old Price): N$<span id="combo-total-value">0</span></div>
                        <div class="form-group" style="margin-top: 1rem;">
                            <label for="product-comboSalePrice"><strong>Combo Sale Price (Current Price)</strong></label>
                            <input type="number" id="product-comboSalePrice">
                        </div>
                        <input type="hidden" id="combo-product-ids-hidden">
                    </div>
                    
                    ${isMainAdmin || (sellerType && sellerType !== 'customer') ? `
                    <h3 style="margin-top: 1.5rem; margin-bottom: 1rem;">Rewards & Promotions</h3>
                    <div class="form-grid">
                       <div class="form-group">
                           <label>Enable Gift Card Reward <input type="checkbox" id="product-giftCardEnabled" class="product-curate-toggle"></label>
                       </div>
                    </div>
                    <div id="gift-card-config-section" style="display:none; margin-top:1rem; padding:1rem; background-color:#f0f7ff; border-radius:8px; border-left:4px solid var(--corporate-blue);">
                       <div class="form-grid">
                           <div class="form-group">
                               <label for="product-giftCardType">Reward Type</label>
                               <select id="product-giftCardType">
                                   <option value="percent">Percentage</option>
                                   <option value="fixed">Fixed Amount</option>
                               </select>
                           </div>
                           <div class="form-group">
                               <label for="product-giftCardValue" id="gift-card-value-label">Value (%)</label>
                               <input type="number" id="product-giftCardValue" value="5" min="0" step="0.01">
                           </div>
                       </div>
                    </div>
                    ` : ''}
                    <div id="product-validation-msg" style="color:#b71c1c; margin:8px 0; display:none; font-weight:600;"></div>
                    <button id="product-save-btn" type="submit" class="btn btn-primary">Save Product</button>
                    <button type="reset" id="clear-form-btn" class="btn btn-outline">Clear Form</button>
                    <button type="button" id="cancel-edit-btn" class="btn btn-outline" style="display:none;">Cancel</button>
                </form>
            </section>
            <section class="admin-section">
                <h2>Manage Products</h2>
                <div id="product-list-admin"><ul>${productListHTML}</ul></div>
            </section>
        </div>
        
        <div id="transactions" class="admin-tab-content">
            <section class="admin-section">
                <h2>${isMainAdmin ? 'All Transactions' : 'Your Transactions'}</h2>
                <div id="transaction-list-admin">${transactionsListHTML}</div>
            </section>
        </div>

        ${isMainAdmin ? `
            <div id="sellers" class="admin-tab-content">
                <section class="admin-section">
                    <h2>Manage Resellers</h2>
                    <ul>${sellerListHTML || '<li>No resellers accounts found.</li>'}</ul>
                </section>
            </div>
            <div id="competitions-manager" class="admin-tab-content">
                <section class="admin-section">
                    <h2>Competitions Manager</h2>
                    <form id="create-comp-form" style="margin-bottom:20px; background:#f9f9f9; padding:20px; border-radius:8px;">
                        <div class="form-group"><label>Title</label><input type="text" id="comp-title" required style="width:100%; padding:8px;"></div>
                        <div class="form-group"><label>Description</label><textarea id="comp-desc" required style="width:100%; padding:8px;"></textarea></div>
                        <div class="form-group"><label>Prizes to be Won</label><input type="text" id="comp-prize" required style="width:100%; padding:8px;"></div>
                        <div class="form-group"><label>End Date</label><input type="date" id="comp-end" required style="width:100%; padding:8px;"></div>
                        <button type="submit" class="btn btn-primary" style="margin-top:10px;">Launch Competition</button>
                    </form>
                    <ul>${activeCompsListHTML || '<li>No competitions launched yet.</li>'}</ul>
                </section>
            </div>
            <div id="add-viewer" class="admin-tab-content"><section class="admin-section"><h3>Add New Viewer</h3><div id="viewers-message" style="display: none;"></div><form id="add-viewers-form"><div class="form-group"><label for="viewers-product">Select Product</label><select id="viewers-product" required>${productOptions}</select></div><div class="form-group"><label for="viewer-name">Viewer Name (optional)</label><input type="text" id="viewer-name" placeholder="e.g. John Doe"></div><div class="form-group"><label>Also add a review for this viewer <input type="checkbox" id="add-review-now" class="product-curate-toggle"></label></div><div id="add-review-fields" style="display:none; margin-top:8px;"><div class="form-group"><label for="review-rating">Rating</label><select id="review-rating"><option value="5">5</option><option value="4">4</option><option value="3">3</option><option value="2">2</option><option value="1">1</option></select></div><div class="form-group"><label for="review-text">Review Text</label><input type="text" id="review-text" placeholder="Write the review here"></div></div><div class="form-group"><label>Select Peak Time</label><div id="peak-times-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 10px;"></div></div><button type="submit" class="btn btn-primary">Add Viewer</button></form></section></div>
            <div id="manage-viewers" class="admin-tab-content"><section class="admin-section"><h2>Manage Viewers</h2><div id="viewer-list-admin"><ul>${viewerListHTML}</ul></div></section></div>
            <div id="users" class="admin-tab-content"><section class="admin-section"><h2>Manage Users</h2><div id="user-list-admin"><ul>${userListHTML}</ul></div></section></div>
            <div id="faqs" class="admin-tab-content">
                <section class="admin-section">
                    <h2>Add / Edit FAQ</h2>
                    <form id="faq-form" class="admin-form">
                        <input type="hidden" id="faq-id-hidden">
                        <div class="form-group full-width"><label for="faq-question">Question</label><input type="text" id="faq-question" required></div>
                        <div class="form-group full-width"><label interpreter="faq-answer">Answer</label><textarea id="faq-answer" required></textarea></div>
                        <button id="faq-save-btn" type="submit" class="btn btn-primary">Save FAQ</button>
                        <button type="reset" id="clear-faq-form-btn" class="btn btn-outline">Clear</button>
                    </form>
                </section>
                <section class="admin-section">
                    <h2>Manage FAQs</h2>
                    <div id="faq-list-admin"><ul>${faqListHTML}</ul></div>
                </section>
            </div>
            <div id="brands" class="admin-tab-content">
                <section class="admin-section">
                    <h2>Add / Edit Brand</h2>
                    <form id="brand-form" class="admin-form">
                        <input type="hidden" id="brand-id-hidden">
                        <div class="form-group full-width">
                            <label for="brand-name">Brand Name</label>
                            <input type="text" id="brand-name" required placeholder="e.g., Nike, Adidas, Gucci...">
                        </div>
                        <button id="brand-save-btn" type="submit" class="btn btn-primary">Save Brand</button>
                        <button type="reset" id="clear-brand-form-btn" class="btn btn-outline" onclick="document.getElementById('brand-id-hidden').value=''; document.getElementById('brand-save-btn').textContent='Save Brand';">Clear</button>
                    </form>
                </section>
                <section class="admin-section">
                    <h2>Manage Brands</h2>
                    <div id="brand-list-admin"><ul>${brandListHTML}</ul></div>
                </section>
            </div>
            <div id="site-settings" class="admin-tab-content"><section class="admin-section"><h2>Site Settings & Hero Images</h2>
                <p>Update homepage hero carousel images and category hero images used across the site.</p>
                <form id="site-settings-form">
                    <h3>Homepage Heroes (4 slides)</h3>
                    <div class="form-grid">
                        ${[1,2,3,4].map(i => `
                            <div class="form-group">
                                <label for="home-hero-url-${i}">Hero ${i} URL</label>
                                <input type="text" id="home-hero-url-${i}" name="home_hero_${i}" placeholder="Image URL" value="${(settings && Array.isArray(settings) ? (settings.find(s=>s.key==='home_hero_' + i)?.value || '') : '')}">
                                <label for="home-hero-file-${i}">Or upload file</label>
                                <input type="file" id="home-hero-file-${i}" accept="image/*">
                            </div>
                        `).join('')}
                    </div>
                    
                    <h3 style="margin-top: 2rem; border-top: 1px solid var(--border-color); padding-top: 1.5rem;">Page Heros Editor (4 Slides each)</h3>
                    <div style="margin-bottom: 1.5rem;">
                        <label for="edit-hero-page-select" style="font-weight:600; display:block; margin-bottom:8px;">Select Website Page to Edit:</label>
                        <select id="edit-hero-page-select" style="width:100%; padding:12px; border-radius:8px; border:1px solid var(--border-color); font-size:1rem; font-weight:600;">
                            <option value="home">Home Page</option>
                            <option value="about">About Us</option>
                            <option value="how-to-sell">Become a Seller</option>
                            <option value="trade-in">Trade-In Program</option>
                            <option value="faqs">Frequently Asked Questions (FAQs)</option>
                            <option value="shipping">Delivery & Shipping</option>
                            <option value="returns">Returns & Warranty</option>
                            <option value="terms">Terms & Conditions</option>
                            <option value="privacy">Privacy Policy</option>
                            <option value="contact">Contact Us</option>
                            <option value="payment">Choose Payment Method</option>
                            <optgroup label="Main Categories">
                                ${Object.keys(categoryData).map(k => `<option value="${k}">${categoryData[k].name}</option>`).join('')}
                            </optgroup>
                        </select>
                    </div>
                    <div id="page-hero-slides-editor" style="background:#fafafa; border:1px solid var(--border-color); border-radius:12px; padding:20px; margin-bottom: 2rem;">
                    </div>
                    
                    <!-- Homepage Under-Hero custom page assignment lists dropdown (Requirement 8) -->
                    <h3 style="margin-top: 2rem; border-top: 1px solid var(--border-color); padding-top: 1.5rem;">Home Page Under-Hero Category Cards</h3>
                    <p style="margin-bottom: 1rem; font-size: 0.9rem; color: #555;">Manage the items displayed directly under the home page hero section. You can add new cards, update their text, links, upload images, or delete cards entirely.</p>
                    <div id="under-hero-cards-manager-container" style="background: #fafafa; border: 1px solid var(--border-color); border-radius: 12px; padding: 25px; margin: 30px 0; box-shadow:var(--shadow-soft);"></div>
                    
                    <h3 style="margin-top:2rem; border-top:1px solid var(--border-color); padding-top:1.5rem;">Reseller Document Requirements</h3>
                    <p style="color:#666;">View or modify custom configuration values.</p>

                    <h3 style="margin-top: 1rem; border-top: 1px solid var(--border-color); padding-top: 1.5rem;">Category Hero Images</h3>
                    <div style="margin-bottom: 1rem;">Set hero image URL or upload for each category.</div>
                    <div class="form-grid" id="category-hero-grid">
                        ${Object.keys(categoryData).filter(k => categoryData[k] && categoryData[k].heroImage).map(k => `
                            <div class="form-group">
                                <label for="cat-hero-url-${k}">${categoryData[k].name}</label>
                                <input type="text" id="cat-hero-url-${k}" name="heroImage_${k}" placeholder="Image URL" value="${(settings && Array.isArray(settings) ? (settings.find(s=>s.key==='heroImage_' + k)?.value || '') : '')}">
                                <label for="cat-hero-file-${k}">Or Upload</label>
                                <input type="file" class="dynamic-hero-file-input" data-setting-key="heroImage_${k}" accept="image/*">
                            </div>
                        `).join('')}
                    </div>

                    <h3 style="margin-top: 1rem; border-top: 1px solid var(--border-color); padding-top: 1.5rem;">Custom Reseller Sidebar Icons</h3>
                    <div class="form-grid">
                        <div class="form-group">
                            <label>Tops Category Icon</label>
                            <input type="text" name="clothes_sidebar_icon_tops" value="${(settings && Array.isArray(settings) ? (settings.find(s=>s.key==='clothes_sidebar_icon_tops')?.value || '') : '')}">
                            <input type="file" class="dynamic-hero-file-input" data-setting-key="clothes_sidebar_icon_tops" accept="image/*">
                        </div>
                        <div class="form-group">
                            <label>Bottoms Category Icon</label>
                            <input type="text" name="clothes_sidebar_icon_bottoms" value="${(settings && Array.isArray(settings) ? (settings.find(s=>s.key==='clothes_sidebar_icon_bottoms')?.value || '') : '')}">
                            <input type="file" class="dynamic-hero-file-input" data-setting-key="clothes_sidebar_icon_bottoms" accept="image/*">
                        </div>
                        <div class="form-group">
                            <label>Official Category Icon</label>
                            <input type="text" name="clothes_sidebar_icon_official" value="${(settings && Array.isArray(settings) ? (settings.find(s=>s.key==='clothes_sidebar_icon_official')?.value || '') : '')}">
                            <input type="file" class="dynamic-hero-file-input" data-setting-key="clothes_sidebar_icon_official" accept="image/*">
                        </div>
                        <div class="form-group">
                            <label>Traditional Category Icon</label>
                            <input type="text" name="clothes_sidebar_icon_traditional" value="${(settings && Array.isArray(settings) ? (settings.find(s=>s.key==='clothes_sidebar_icon_traditional')?.value || '') : '')}">
                            <input type="file" class="dynamic-hero-file-input" data-setting-key="clothes_sidebar_icon_traditional" accept="image/*">
                        </div>
                        <div class="form-group">
                            <label>Shoes Category Icon</label>
                            <input type="text" name="clothes_sidebar_icon_shoes" value="${(settings && Array.isArray(settings) ? (settings.find(s=>s.key==='clothes_sidebar_icon_shoes')?.value || '') : '')}">
                            <input type="file" class="dynamic-hero-file-input" data-setting-key="clothes_sidebar_icon_shoes" accept="image/*">
                        </div>
                        <div class="form-group">
                            <label>Accessories Category Icon</label>
                            <input type="text" name="clothes_sidebar_icon_accessories" value="${(settings && Array.isArray(settings) ? (settings.find(s=>s.key==='clothes_sidebar_icon_accessories')?.value || '') : '')}">
                            <input type="file" class="dynamic-hero-file-input" data-setting-key="clothes_sidebar_icon_accessories" accept="image/*">
                        </div>
                        <div class="form-group">
                            <label>Glasses Category Icon</label>
                            <input type="text" name="clothes_sidebar_icon_glasses" value="${(settings && Array.isArray(settings) ? (settings.find(s=>s.key==='clothes_sidebar_icon_glasses')?.value || '') : '')}">
                            <input type="file" class="dynamic-hero-file-input" data-setting-key="clothes_sidebar_icon_glasses" accept="image/*">
                        </div>
                        <div class="form-group">
                            <label>Hats Category Icon</label>
                            <input type="text" name="clothes_sidebar_icon_hats" value="${(settings && Array.isArray(settings) ? (settings.find(s=>s.key==='clothes_sidebar_icon_hats')?.value || '') : '')}">
                            <input type="file" class="dynamic-hero-file-input" data-setting-key="clothes_sidebar_icon_hats" accept="image/*">
                        </div>
                    </div>

                    <h3 style="margin-top: 1rem; border-top: 1px solid var(--border-color); padding-top: 1.5rem;">Custom Brand Icons</h3>
                    <p style="color:#666; margin-bottom:15px;">Brands and accessories setup.</p>

                    <h3 style="margin-top: 1rem; border-top: 1px solid var(--border-color); padding-top: 1.5rem;">Active Banners configuration</h3>
                    <p style="color:#666;">Global settings parameters.</p>

                    <h3 style="margin-top: 1rem; border-top: 1px solid var(--border-color); padding-top: 1.5rem;">Under-Hero Landing Cards Settings</h3>
                    <p style="color:#666; margin-bottom: 10px;">Select custom layout options for cards directly beneath the main hero element.</p>

                    <button type="submit" class="btn btn-primary" style="margin-top:20px; padding:12px 30px;">Save Settings</button>
                </form>
            </div>
            <div id="page-settings" class="admin-tab-content">
                <section class="admin-section">
                    <h2>Page-Specific Images</h2>
                    <form id="page-settings-form">
                        <h3>About Us Page Image</h3>
                        <div class="form-group">
                            <label for="about-us-image-file">Upload New Image</label>
                            <input type="file" id="about-us-image-file-tab" accept="image/*">
                            <p style="font-size: 0.9rem; color: #666; margin-top: 5px;">Current Image:</p>
                            <img id="about-us-image-preview-tab" src="${(settings && Array.isArray(settings) ? (settings.find(s => s.key === 'about_us_image')?.value || 'https://via.placeholder.com/150') : 'https://via.placeholder.com/150')}" alt="About Us Preview" style="width: 200px; height: auto; margin-top: 10px; border-radius: 8px; border: 1px solid #ddd;">
                        </div>
                        <button type="submit" class="btn btn-primary">Save Page Settings</button>
                    </form>
                </section>
            </div>
            <div id="simulate-views" class="admin-tab-content">
                <section class="admin-section">
                    <h2>One-Month Traffic Simulation</h2>
                    <p>This tool will simulate one month of user traffic based on predefined personas and peak times. It will create "viewer" entries for various products to make the site look more active. This process can take a minute to complete.</p>
                    <button id="start-simulation-btn" class="btn btn-primary">Start One-Month Simulation</button>
                    <div id="simulation-log" style="margin-top: 20px; background: #f0f0f0; border: 1px solid #ccc; border-radius: 8px; padding: 15px; height: 300px; overflow-y: auto; font-family: monospace; white-space: pre-wrap;">Simulation log will appear here...</div>
                </section>
            </div>
        ` : ''}

        <!-- Reseller Profile setting Leaflet Geocoding integration (Requirement 10) -->
        ${!isMainAdmin ? `
        <div id="reseller-profile" class="admin-tab-content">
            <section class="admin-section">
                <h2>Reseller Profile Settings</h2>
                <form id="reseller-profile-form" enctype="multipart/form-data" class="admin-form">
                    <div class="form-grid">
                        <div class="form-group">
                            <label for="profile-name">Full Name</label>
                            <input type="text" id="profile-name" value="${currentUser.name || ''}" required>
                        </div>
                        <div class="form-group">
                            <label for="profile-business-name">Business Name</label>
                            <input type="text" id="profile-business-name" value="${currentUser.businessName || ''}">
                        </div>
                        <div class="form-group">
                            <label for="profile-phone">Phone Number</label>
                            <input type="text" id="profile-phone" value="${currentUser.phone || ''}">
                        </div>
                        <div class="form-group">
                            <label for="profile-warranty">Default Dynamic Warranty (Requirement 8)</label>
                            <input type="text" id="profile-warranty" value="${currentUser.defaultWarranty || '1-Year Warranty'}">
                        </div>
                        <div class="form-group">
                            <label for="profile-delivery">Default Dynamic Delivery Option (Requirement 8)</label>
                            <input type="text" id="profile-delivery" value="${currentUser.defaultDeliveryOption || 'Delivery Nationwide'}">
                        </div>
                        <div class="form-group">
                            <label for="profile-image-file">Reseller Profile Image</label>
                            <input type="file" id="profile-image-file" accept="image/*">
                            ${currentUser.profileImage ? `<img src="${currentUser.profileImage}" style="width:80px; height:80px; border-radius:50%; object-fit:cover; margin-top:10px; display:block; border:1px solid #ddd;">` : ''}
                        </div>
                        
                        <!-- Interactive map address pinpoint coordinates select picker -->
                        <div class="form-group full-width" style="margin-top: 1rem;">
                            <label><strong>Select Business Location on Map</strong></label>
                            <p style="font-size:0.85rem; color:#666;">Click on the map below to pinpoint your physical business address. A popup will confirm and automatically set the address and coordinates below.</p>
                            <div id="reseller-profile-map" style="width:100%; height:320px; border-radius:8px; border:1px solid #ddd; margin-bottom:10px;"></div>
                            
                            <label for="profile-physical-address">Business Address</label>
                            <input type="text" id="profile-physical-address" value="${currentUser.physicalAddress || ''}" placeholder="Geocoded address will load here...">
                            
                            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px; margin-top:8px;">
                                <div>
                                    <label for="profile-lat">Latitude</label>
                                    <input type="text" id="profile-lat" value="${currentUser.latitude || ''}" readonly>
                                </div>
                                <div>
                                    <label for="profile-lon">Longitude</label>
                                    <input type="text" id="profile-lon" value="${currentUser.longitude || ''}" readonly>
                                </div>
                            </div>
                        </div>
                    </div>
                    <button type="submit" class="btn btn-primary" style="margin-top:1.5rem;">Save Profile Settings</button>
                </form>
            </section>
        </div>

        <!-- Geocoded Pickup Points config manager tab interface (Requirement 9) -->
        <div id="reseller-pickup-points" class="admin-tab-content">
            <section class="admin-section">
                <h2>Manage Custom Pickup Points (for COD Shipping)</h2>
                <p style="margin-bottom:15px; color:#555;">These custom pickup points will be presented as pick-and-pay destinations during checkout when users select Cash on Delivery.</p>
                <div style="display:grid; grid-template-columns: 1fr 1fr; gap: 20px;" class="desktop-only">
                    <div>
                        <h4 style="margin-top:0;">1. Click Map to Select Point Location</h4>
                        <div id="reseller-pickup-map" style="width:100%; height:350px; border-radius:8px; border:1px solid #ddd; margin-bottom:15px;"></div>
                    </div>
                    <div>
                        <h4 style="margin-top:0;">2. Saved Pickup Points</h4>
                        <div id="reseller-pickup-list" style="display:flex; flex-direction:column; gap:10px; max-height:350px; overflow-y:auto; border:1px solid #eee; padding:10px; border-radius:8px; background:#fafafa;">
                            <p style="color:#666; font-style:italic;">No pickup points added yet.</p>
                        </div>
                    </div>
                </div>
                <div class="mobile-only" style="margin-bottom:15px;">
                     <div id="reseller-pickup-map-mobile" style="width:100%; height:280px; border-radius:8px; border:1px solid #ddd; margin-bottom:15px;"></div>
                     <h4>Saved Pickup Points</h4>
                     <div id="reseller-pickup-list-mobile" style="display:flex; flex-direction:column; gap:10px; border:1px solid #eee; padding:10px; border-radius:8px; background:#fafafa; margin-bottom:15px;"></div>
                </div>
                <button type="button" id="btn-save-pickup-points-profile" class="btn btn-primary" style="margin-top:10px;">Apply & Save Pickup Points Changes</button>
            </section>
        </div>
        ` : ''}
    </div>`;
    
    attachAdminEventListeners(isMainAdmin, isFashionAdmin, allProducts, relevantTransactions, allFAQs, allComps);
    if (isMainAdmin) {
        initAdminViewers();
    }
};

const attachAdminEventListeners = (isMainAdmin, isFashionAdmin, allProducts, relevantTransactions, allFAQs, allComps) => {
    // Curated IDs moved to the top of scope to completely prevent the temporal dead zone reference errors (Fix C)
    const allCuratedIds = [
        'product-curate-womens', 'product-curate-mens',
        'product-curate-livingroom', 'product-curate-bedroom', 'product-curate-office', 'product-curate-kitchen',
        'product-curate-kids-electronics', 'product-curate-kids-clothing', 'product-curate-kids-toys',
        'product-curate-trending', 'product-curate-new-arrivals', 'product-curate-combos'
    ];

    const adminContainer = document.querySelector('.admin-container');
    if (!adminContainer) return;

    adminContainer.addEventListener('click', (e) => {
        if (e.target.matches('.admin-tab-btn')) {
            const tab = e.target.dataset.tab;
            adminContainer.querySelectorAll('.admin-tab-btn').forEach(btn => btn.classList.remove('active'));
            e.target.classList.add('active');
            adminContainer.querySelectorAll('.admin-tab-content').forEach(content => content.classList.remove('active'));
            document.getElementById(tab).classList.add('active');

            // Dispatch map refresh event when tabs load
            if (tab === 'reseller-profile') {
                setTimeout(() => { window.resellerProfileMapInstance?.invalidateSize(); }, 200);
            }
            if (tab === 'reseller-pickup-points') {
                setTimeout(() => {
                    window.resellerPickupMapInstance?.invalidateSize();
                    window.resellerPickupMobileMapInstance?.invalidateSize();
                }, 200);
            }
        }
    });

    const pageSelect = document.getElementById('edit-hero-page-select');
    if (pageSelect) {
        pageSelect.addEventListener('change', (e) => {
            populateHeroSlidesEditor(e.target.value);
        });
        populateHeroSlidesEditor(pageSelect.value);
    }

    // Homepage Category Cards Configuration with assigned existent page options (Requirement 8)
    const cardsContainer = document.getElementById('under-hero-cards-manager-container');
    const addCardBtn = document.getElementById('add-under-hero-card-btn');

    let currentCards = [];
    const defaultUnderHeroCards = [
      { title: "Trending Now", link: "#trending", image: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80" },
      { title: "New Arrivals", link: "#new-arrivals", image: "https://images.unsplash.com/photo-1546054454-aa26e2b734c7?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80" },
      { title: "Super Combos", link: "#combos", image: "https://images.unsplash.com/photo-1572594691920-87d1b7b7a8a0?auto=format&fit=crop&w=800&q=60" },
      { title: "Pre-Owned Deals", link: "#second-hand", image: "https://images.unsplash.com/photo-1598327105666-658454354c03?auto=format&fit=crop&w=800&q=60" },
      { title: "On Sale", link: "#on-sale", image: "https://images.unsplash.com/photo-1555774698-0b77e0d5fac6?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80" },
      { title: "Gaming Gear", link: "#category/gaming-accessories", image: "https://images.unsplash.com/photo-1598550476439-6847785fcea6?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80" }
    ];

    if (globalSettingsMap['home_under_hero_cards']) {
        try {
            currentCards = JSON.parse(globalSettingsMap['home_under_hero_cards']);
        } catch (e) {
            currentCards = [...defaultUnderHeroCards];
        }
    } else {
        currentCards = [...defaultUnderHeroCards];
    }

    const availablePageOptions = [
        { value: '#home', text: 'Home Page' },
        { value: '#about', text: 'About Us' },
        { value: '#second-hand', text: 'Second-Hand' },
        { value: '#trending', text: 'Trending' },
        { value: '#on-sale', text: 'On Sale' },
        { value: '#new-arrivals', text: 'New Arrivals' },
        { value: '#combos', text: 'Super Combos' },
        { value: '#trade-in', text: 'Trade-In Program' },
        { value: '#competitions', text: 'Competitions' },
        { value: '#faqs', text: 'FAQs' },
        { value: '#contact', text: 'Contact Us' },
        { value: '#shipping', text: 'Delivery Shipping' },
        { value: '#returns', text: 'Returns Policy' },
        { value: '#terms', text: 'Terms Conditions' },
        { value: '#privacy', text: 'Privacy Policy' },
        { value: '#category/electronics', text: 'Category: Electronics' },
        { value: '#category/phones', text: 'Category: Phones' },
        { value: '#category/tablets', text: 'Category: Tablets' },
        { value: '#category/computers', text: 'Category: Computers' },
        { value: '#category/solar', text: 'Category: Solar' },
        { value: '#category/fashion', text: 'Category: Fashion' },
        { value: '#category/groceries', text: 'Category: Groceries' },
        { value: '#category/appliances', text: 'Category: Appliances' },
        { value: '#category/vehicles', text: 'Category: Vehicles' },
        { value: '#category/crafts', text: 'Category: Crafts' },
        { value: '#category/farm', text: 'Category: Farm' },
        { value: '#category/fuel', text: 'Category: Charcoal' },
        { value: '#category/other', text: 'Category: Other' }
    ];

    const renderCardsManagerList = () => {
        if (!cardsContainer) return;
        cardsContainer.innerHTML = '';
        if (currentCards.length === 0) {
            cardsContainer.innerHTML = '<p style="color: #666; font-style: italic;">No category cards configured. Add one below.</p>';
            return;
        }

        currentCards.forEach((card, idx) => {
            const cardEl = document.createElement('div');
            cardEl.style.cssText = 'border-bottom: 1px dashed var(--border-color); padding-bottom: 1.5rem; margin-bottom: 1.5rem; display: flex; gap: 15px; align-items: flex-start;';
            cardEl.innerHTML = `
                <div style="width: 80px; height: 80px; background-image: url('${card.image || ''}'); background-size: cover; background-position: center; border-radius: 8px; border: 1px solid #ddd; flex-shrink: 0; margin-top: 25px;"></div>
                <div style="flex: 1;" class="form-grid">
                    <div class="form-group">
                        <label>Card Title</label>
                        <input type="text" class="card-title-input" data-index="${idx}" value="${card.title || ''}" placeholder="e.g. Trending Now" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                    </div>
                    <div class="form-group">
                        <label>Assign to Page (Existent Website Location)</label>
                        <select class="card-link-select" data-index="${idx}" style="width:100%; padding:8px; border-radius:4px; border:1px solid #ddd; margin-bottom:5px;">
                            <option value="">-- Custom Input / Enter Below --</option>
                            ${availablePageOptions.map(opt => `<option value="${opt.value}" ${card.link === opt.value ? 'selected' : ''}>${opt.text}</option>`).join('')}
                        </select>
                        <input type="text" class="card-link-input" id="card-link-input-${idx}" data-index="${idx}" value="${card.link || ''}" placeholder="e.g. #trending" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                    </div>
                    <div class="form-group">
                        <label>Image URL</label>
                        <input type="text" class="card-image-url-input" id="card-img-url-${idx}" data-index="${idx}" value="${card.image || ''}" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                    </div>
                    <div class="form-group">
                        <label>Or Upload Image</label>
                        <input type="file" class="card-image-file-input" data-index="${idx}" accept="image/*" style="width: 100%;">
                    </div>
                </div>
                <button type="button" class="remove-card-btn" data-index="${idx}" style="margin-top: 25px; padding: 8px 12px; background: #ff4444; color: white; border: none; border-radius: 4px; cursor: pointer;"><i class="fas fa-trash"></i></button>
            `;
            cardsContainer.appendChild(cardEl);
        });

        window.currentUnderHeroCards = currentCards;
    };

    renderCardsManagerList();

    if (addCardBtn) {
        addCardBtn.addEventListener('click', (e) => {
            e.preventDefault();
            currentCards.push({ title: '', link: '#', image: '' });
            renderCardsManagerList();
        });
    }

    if (cardsContainer) {
        cardsContainer.addEventListener('input', (e) => {
            const index = parseInt(e.target.dataset.index, 10);
            if (isNaN(index)) return;

            if (e.target.classList.contains('card-title-input')) {
                currentCards[index].title = e.target.value;
            } else if (e.target.classList.contains('card-link-input')) {
                currentCards[index].link = e.target.value;
                const selectEl = cardsContainer.querySelector(`.card-link-select[data-index="${index}"]`);
                if (selectEl) {
                    const match = Array.from(selectEl.options).some(opt => opt.value === e.target.value);
                    selectEl.value = match ? e.target.value : "";
                }
            } else if (e.target.classList.contains('card-image-url-input')) {
                currentCards[index].image = e.target.value;
            }
            window.currentUnderHeroCards = currentCards;
        });

        cardsContainer.addEventListener('change', async (e) => {
            const index = parseInt(e.target.dataset.index, 10);
            if (isNaN(index)) return;

            if (e.target.classList.contains('card-link-select')) {
                if (e.target.value !== "") {
                    currentCards[index].link = e.target.value;
                    const inputEl = document.getElementById(`card-link-input-${index}`);
                    if (inputEl) inputEl.value = e.target.value;
                }
            } else {
                const fileInput = e.target.closest('.card-image-file-input');
                if (fileInput && fileInput.files.length > 0) {
                    const file = fileInput.files[0];
                    const fd = new FormData();
                    fd.append('image', file);
                    try {
                        const res = await fetch('/api/upload/hero', { method: 'POST', body: fd });
                        if (!res.ok) throw new Error('Upload failed');
                        const data = await res.json();
                        if (data.image) {
                            currentCards[index].image = data.image;
                            const urlInput = document.getElementById(`card-img-url-${index}`);
                            if (urlInput) urlInput.value = data.image;
                            renderCardsManagerList();
                        }
                    } catch (err) {
                        alert('Upload failed: ' + err.message);
                    }
                }
            }
            window.currentUnderHeroCards = currentCards;
        });

        cardsContainer.addEventListener('click', (e) => {
            const removeBtn = e.target.closest('.remove-card-btn');
            if (removeBtn) {
                e.preventDefault();
                const index = parseInt(removeBtn.dataset.index, 10);
                currentCards.splice(index, 1);
                renderCardsManagerList();
            }
        });
    }

    // Leaflet Maps for Reseller Business address config (Requirement 10)
    const currentUser = getCurrentUser();
    const mapProfileContainer = document.getElementById('reseller-profile-map');
    if (mapProfileContainer && currentUser) {
        setTimeout(() => {
            const defaultLat = currentUser.latitude || -22.5609;
            const defaultLon = currentUser.longitude || 17.0658;
            
            const profileMap = L.map(mapProfileContainer).setView([defaultLat, defaultLon], 13);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; OpenStreetMap contributors'
            }).addTo(profileMap);

            window.resellerProfileMapInstance = profileMap;

            let marker = null;
            if (currentUser.latitude && currentUser.longitude) {
                marker = L.marker([currentUser.latitude, currentUser.longitude]).addTo(profileMap);
                marker.bindPopup(currentUser.physicalAddress || "Business Address").openPopup();
            }

            profileMap.on('click', async (e) => {
                const { lat, lng } = e.latlng;
                
                if (marker) {
                    marker.setLatLng(e.latlng);
                } else {
                    marker = L.marker(e.latlng).addTo(profileMap);
                }

                marker.bindPopup("Resolving address location...").openPopup();

                let resolvedAddr = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
                try {
                    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&limit=1`);
                    if (res.ok) {
                        const parsed = await res.json();
                        resolvedAddr = parsed.display_name || resolvedAddr;
                    }
                } catch (err) {
                    console.warn("Reverse geocode request failed", err);
                }

                marker.setPopupContent(`
                    <div style="font-size:0.85rem; max-width:180px;">
                        <strong>Selected Point:</strong><br>${resolvedAddr}<br><br>
                        <button type="button" id="btn-save-leaflet-addr" style="padding:4px 8px; font-size:11px; background:var(--corporate-blue); color:white; border:none; border-radius:4px; cursor:pointer; width:100%;">Apply Address Location</button>
                    </div>
                `).openPopup();

                setTimeout(() => {
                    const applyBtn = document.getElementById('btn-save-leaflet-addr');
                    if (applyBtn) {
                        applyBtn.addEventListener('click', (ev) => {
                            ev.preventDefault();
                            ev.stopPropagation();
                            
                            const addrField = document.getElementById('profile-physical-address');
                            const latField = document.getElementById('profile-lat');
                            const lonField = document.getElementById('profile-lon');

                            if (addrField) addrField.value = resolvedAddr;
                            if (latField) latField.value = lat.toFixed(6);
                            if (lonField) lonField.value = lng.toFixed(6);
                            
                            marker.bindPopup(`<strong>Business Location Set:</strong><br>${resolvedAddr}`).openPopup();
                        });
                    }
                }, 150);
            });
        }, 300);
    }

    // Geocoded Pickup Points config setup (Requirement 9)
    let resellerPickupPoints = (currentUser && currentUser.pickupPoints) || [];
    const desktopPickupList = document.getElementById('reseller-pickup-list');
    const mobilePickupList = document.getElementById('reseller-pickup-list-mobile');

    const renderPickupPointsListUI = () => {
        const renderHTML = resellerPickupPoints.length > 0
            ? resellerPickupPoints.map((p, idx) => `
                <div style="background:white; border:1px solid #ddd; padding:10px; border-radius:6px; display:flex; justify-content:space-between; align-items:center;">
                    <div style="max-width:80%;">
                        <strong style="color:var(--corporate-blue); font-size:0.9rem;">${p.name}</strong>
                        <div style="font-size:0.8rem; color:#666; margin-top:2px; word-break:break-all;">${p.address}</div>
                    </div>
                    <button type="button" class="btn-remove-pickup-point" data-index="${idx}" style="background:none; border:none; color:var(--corporate-red); font-size:1.1rem; cursor:pointer;"><i class="fas fa-trash-alt"></i></button>
                </div>
            `).join('')
            : '<p style="color:#666; font-style:italic;">No pickup points added yet.</p>';

        if (desktopPickupList) desktopPickupList.innerHTML = renderHTML;
        if (mobilePickupList) mobilePickupList.innerHTML = renderHTML;
    };

    renderPickupPointsListUI();

    const handlePickupMapClick = async (map, e, markerGroup) => {
        const { lat, lng } = e.latlng;
        let resolvedAddr = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
        
        try {
            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&limit=1`);
            if (res.ok) {
                const parsed = await res.json();
                resolvedAddr = parsed.display_name || resolvedAddr;
            }
        } catch (err) {
            console.warn("Reverse geocode request failed", err);
        }

        const popup = L.popup()
            .setLatLng(e.latlng)
            .setContent(`
                <div style="font-size:0.85rem; width:200px; max-width:90%;">
                    <strong>Address:</strong><br>${resolvedAddr}<br><br>
                    <label for="pickup-point-name-inp" style="font-weight:700; display:block; margin-bottom:4px;">Pickup Point Name:</label>
                    <input type="text" id="pickup-point-name-inp" placeholder="e.g. Klein Windhoek Shell Station" style="width:100%; padding:6px; border:1px solid #ccc; border-radius:4px; margin-bottom:8px;">
                    <button type="button" id="btn-save-pickup-point" style="width:100%; padding:6px 12px; background:var(--corporate-blue); color:white; border:none; border-radius:4px; cursor:pointer; font-weight:700;">Save Pickup Location</button>
                </div>
            `)
            .openOn(map);

        setTimeout(() => {
            const saveBtn = document.getElementById('btn-save-pickup-point');
            if (saveBtn) {
                saveBtn.addEventListener('click', (ev) => {
                    ev.preventDefault();
                    const nameInp = document.getElementById('pickup-point-name-inp');
                    const name = nameInp ? nameInp.value.trim() : '';
                    if (!name) {
                        return alert('Please enter a name for the pickup point.');
                    }

                    resellerPickupPoints.push({
                        name: name,
                        address: resolvedAddr,
                        lat: lat,
                        lon: lng
                    });

                    L.marker([lat, lng]).addTo(markerGroup)
                        .bindPopup(`<strong>${name}</strong><br>${resolvedAddr}`)
                        .openPopup();

                    map.closePopup();
                    renderPickupPointsListUI();
                });
            }
        }, 150);
    };

    const desktopPickupMapContainer = document.getElementById('reseller-pickup-map');
    const mobilePickupMapContainer = document.getElementById('reseller-pickup-map-mobile');
    
    let desktopMarkersGroup = null;
    let mobileMarkersGroup = null;

    if (desktopPickupMapContainer && currentUser) {
        setTimeout(() => {
            const defaultLat = currentUser.latitude || -22.5609;
            const defaultLon = currentUser.longitude || 17.0658;
            
            const pMap = L.map(desktopPickupMapContainer).setView([defaultLat, defaultLon], 13);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; OpenStreetMap contributors'
            }).addTo(pMap);

            window.resellerPickupMapInstance = pMap;
            desktopMarkersGroup = L.layerGroup().addTo(pMap);

            resellerPickupPoints.forEach(p => {
                L.marker([p.lat, p.lon]).addTo(desktopMarkersGroup)
                    .bindPopup(`<strong>${p.name}</strong><br>${p.address}`);
            });

            pMap.on('click', (e) => handlePickupMapClick(pMap, e, desktopMarkersGroup));
        }, 300);
    }

    if (mobilePickupMapContainer && currentUser) {
        setTimeout(() => {
            const defaultLat = currentUser.latitude || -22.5609;
            const defaultLon = currentUser.longitude || 17.0658;
            
            const pMapMob = L.map(mobilePickupMapContainer).setView([defaultLat, defaultLon], 13);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; OpenStreetMap contributors'
            }).addTo(pMapMob);

            window.resellerPickupMobileMapInstance = pMapMob;
            mobileMarkersGroup = L.layerGroup().addTo(pMapMob);

            resellerPickupPoints.forEach(p => {
                L.marker([p.lat, p.lon]).addTo(mobileMarkersGroup)
                    .bindPopup(`<strong>${p.name}</strong><br>${p.address}`);
            });

            pMapMob.on('click', (e) => handlePickupMapClick(pMapMob, e, mobileMarkersGroup));
        }, 300);
    }

    const handlePickupListClick = (e) => {
        const removeBtn = e.target.closest('.btn-remove-pickup-point');
        if (removeBtn) {
            e.preventDefault();
            const index = parseInt(removeBtn.dataset.index, 10);
            resellerPickupPoints.splice(index, 1);
            renderPickupPointsListUI();
            
            if (desktopMarkersGroup) {
                desktopMarkersGroup.clearLayers();
                resellerPickupPoints.forEach(p => {
                    L.marker([p.lat, p.lon]).addTo(desktopMarkersGroup)
                        .bindPopup(`<strong>${p.name}</strong><br>${p.address}`);
                });
            }
            if (mobileMarkersGroup) {
                mobileMarkersGroup.clearLayers();
                resellerPickupPoints.forEach(p => {
                    L.marker([p.lat, p.lon]).addTo(mobileMarkersGroup)
                        .bindPopup(`<strong>${p.name}</strong><br>${p.address}`);
                });
            }
        }
    };

    if (desktopPickupList) desktopPickupList.addEventListener('click', handlePickupListClick);
    if (mobilePickupList) mobilePickupList.addEventListener('click', handlePickupListClick);

    const savePickupBtn = document.getElementById('btn-save-pickup-points-profile');
    if (savePickupBtn) {
        savePickupBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            const formData = new FormData();
            formData.append('pickupPoints', JSON.stringify(resellerPickupPoints));
            
            try {
                const updatedUser = await api.updateUserProfile(formData);
                localStorage.setItem('userInfo', JSON.stringify({ ...updatedUser, token: api.getToken() }));
                alert('Pickup points configurations saved successfully!');
                location.reload();
            } catch (err) {
                alert('Failed to save pickup points: ' + err.message);
            }
        });
    }

    const productForm = document.getElementById('product-form');

    const resetForm = () => {
        if (productForm) productForm.reset();
        
        document.getElementById('product-id-hidden').value = '';
        const categoryInput = document.getElementById('product-category');
        if (!isMainAdmin) {
            const st = getSellerType();
            const map = { 
                'electronics': 'electronics', 'solar': 'solar', 'fashion': 'fashion',
                'groceries': 'groceries', 'appliances': 'appliances', 'vehicles': 'vehicles',
                'crafts': 'crafts', 'farm': 'farm', 'fuel': 'fuel', 'other': 'other'
            };
            categoryInput.value = map[st] || st || '';
        }
        
        const stockToggle = document.getElementById('product-stockToggle');
        const stockFieldGroup = document.getElementById('stock-field-group');
        if (stockToggle) stockToggle.checked = false;
        if (stockFieldGroup) stockFieldGroup.style.display = 'none';

        const saleDatesSection = document.getElementById('sale-dates-section');
        if (saleDatesSection) saleDatesSection.style.display = 'none';
        
        document.getElementById('product-saleStartDate').value = '';
        document.getElementById('product-saleEndDate').value = '';
        const imagesPreview = document.getElementById('product-images-preview');
        if (imagesPreview) imagesPreview.innerHTML = '';
        const thumbsHidden = document.getElementById('product-thumbnails-hidden');
        if (thumbsHidden) thumbsHidden.value = '';
        
        const curatedIds = [
            'product-curate-womens', 'product-curate-mens', 'product-curate-livingroom', 'product-curate-bedroom',
            'product-curate-office', 'product-curate-kitchen', 'product-curate-kids-electronics',
            'product-curate-kids-clothing', 'product-curate-kids-toys'
        ];
        curatedIds.forEach(id => { const el = document.getElementById(id); if (el) el.checked = false; });
        
        // Fix B: Safely resolve missing/undefined filtersHidden references
        const filtersHidden = document.getElementById('product-clothing-filters-hidden');
        if (filtersHidden) {
            filtersHidden.value = '[]';
            const filtersContainer = document.getElementById('product-filter-tags-container');
            if (filtersContainer) {
                filtersContainer.innerHTML = '<span style="color:#999; font-size:12px;">No active tags</span>';
            }
        }

        const colorsHidden = document.getElementById('product-colors-hidden');
        if (colorsHidden) colorsHidden.value = '[]';
        const colorsPreview = document.getElementById('product-colors-preview');
        if (colorsPreview) colorsPreview.innerHTML = '';
        const enableColorsToggle = document.getElementById('enable-product-colors');
        const colorsSection = document.getElementById('product-colors-section');
        if (enableColorsToggle) enableColorsToggle.checked = false;
        if (colorsSection) colorsSection.style.display = 'none';
        
        for (let i = 1; i <= 4; i++) {
            const input = document.getElementById(`carousel-url-${i}`);
            if (input) input.value = '';
            const previewWrapper = document.getElementById(`carousel-preview-${i}-wrapper`);
            if (previewWrapper) previewWrapper.style.display = 'none';
        }
        
        const featuresContainer = document.getElementById('product-features-container');
        if (featuresContainer) featuresContainer.innerHTML = '<p style="font-size:0.9rem; color:#999; margin:0;">No features yet. Generate some using the button below.</p>';
        
        const sizeSelect = document.getElementById('product-sizes-select');
        if (sizeSelect) sizeSelect.selectedIndex = -1;

        // Reset transport & safe insurance defaults
        const freeTransport = document.getElementById('product-freeTransport');
        if (freeTransport) freeTransport.checked = false;
        const deliveryPricing = document.getElementById('delivery-pricing-section');
        if (deliveryPricing) deliveryPricing.style.display = 'block';
        const priceWindhoek = document.getElementById('product-deliveryPriceWindhoek');
        if (priceWindhoek) priceWindhoek.value = 49;
        const priceOutside = document.getElementById('product-deliveryPriceOutside');
        if (priceOutside) priceOutside.value = 79;
        const codToggle = document.getElementById('product-cashOnDelivery');
        if (codToggle) codToggle.checked = false;
        const warrantyInp = document.getElementById('product-warrantyDuration');
        if (warrantyInp) warrantyInp.value = 'No Warranty';
        const promoStatusSelect = document.getElementById('product-promotionStatus');
        if (promoStatusSelect) promoStatusSelect.value = 'None';

        const safeInsToggle = document.getElementById('product-safeInsuranceEnabled');
        if (safeInsToggle) safeInsToggle.checked = false;
        const safeInsPriceGroup = document.getElementById('safe-insurance-price-group');
        if (safeInsPriceGroup) safeInsPriceGroup.style.display = 'none';
        const safeInsPriceInp = document.getElementById('product-safeInsurancePrice');
        if (safeInsPriceInp) safeInsPriceInp.value = 0;

        // Reset trust visibility toggles to checked (Requirement 8)
        const trustIds = [
            'product-showTradeIn', 'product-showLayBye', 'product-showDeposit',
            'product-showDeliveryNationwide', 'product-showOneYearWarranty', 'product-showFifteenDayReturns'
        ];
        trustIds.forEach(id => { const el = document.getElementById(id); if (el) el.checked = true; });

        // Reset gift card configuration settings
        const giftToggle = document.getElementById('product-giftCardEnabled');
        if (giftToggle) giftToggle.checked = false;
        const giftConfig = document.getElementById('gift-card-config-section');
        if (giftConfig) giftConfig.style.display = 'none';
    };
    
    resetForm();

    document.getElementById('clear-form-btn')?.addEventListener('click', resetForm);
    
    document.getElementById('cancel-edit-btn')?.addEventListener('click', () => {
        document.getElementById('product-id-hidden').value = '';
        resetForm();
        document.getElementById('cancel-edit-btn').style.display = 'none';
        const formHeader = document.querySelector('form h2');
        if (formHeader) formHeader.textContent = 'Add New Product';
    });

    const stockToggle = document.getElementById('product-stockToggle');
    const stockFieldGroup = document.getElementById('stock-field-group');
    if (stockToggle) {
        stockToggle.addEventListener('change', (e) => {
            stockFieldGroup.style.display = e.target.checked ? 'block' : 'none';
        });
    }

    const imagesInput = document.getElementById('product-images');
    const imagesPreview = document.getElementById('product-images-preview');
    let cropper = null;
    let currentImageIndex = 0;
    let filesToProcess = [];
    let processedImages = [];
    
    if (imagesInput && imagesPreview) {
        imagesInput.addEventListener('change', (e) => {
            filesToProcess = Array.from(e.target.files).slice(0, 3);
            processedImages = [];
            currentImageIndex = 0;
            if (filesToProcess.length > 0) {
                processNextImage();
            }
        });
    }
    
    const processNextImage = () => {
        if (currentImageIndex >= filesToProcess.length) {
            imagesPreview.innerHTML = '';
            processedImages.forEach(imgDataUrl => {
                const img = document.createElement('img');
                img.src = imgDataUrl;
                img.style.width = '64px';
                img.style.height = '64px';
                img.style.objectFit = 'cover';
                img.style.borderRadius = '6px';
                imagesPreview.appendChild(img);
            });
            return;
        }
        
        const file = filesToProcess[currentImageIndex];
        const reader = new FileReader();
        reader.onload = (ev) => {
            showImageCropperModal(ev.target.result);
        };
        reader.readAsDataURL(file);
    };
    
    const showImageCropperModal = (imageSrc) => {
        const modal = document.getElementById('image-cropper-modal');
        const cropperImg = document.getElementById('cropper-image');
        const cropConfirmBtn = document.getElementById('crop-confirm-btn');
        const cropCancelBtn = document.getElementById('crop-cancel-btn');
        
        cropperImg.src = imageSrc;
        modal.classList.add('active');
        
        if (cropper) {
            cropper.destroy();
        }
        
        cropper = new Cropper(cropperImg, {
            aspectRatio: 1,
            viewMode: 1,
            autoCropArea: 1,
            responsive: true,
            restore: true,
            guides: true,
            center: true,
            highlight: true,
            cropBoxMovable: true,
            cropBoxResizable: true,
            toggleDragModeOnDblclick: true,
        });
        
        const handleCropConfirm = () => {
            const canvas = cropper.getCroppedCanvas({
                maxWidth: 500,
                maxHeight: 500,
                fillColor: '#fff',
                imageSmoothingEnabled: true,
                imageSmoothingQuality: 'high',
            });
            
            processedImages.push(canvas.toDataURL());
            currentImageIndex++;
            
            modal.classList.remove('active');
            cropConfirmBtn.removeEventListener('click', handleCropConfirm);
            cropCancelBtn.removeEventListener('click', handleCropCancel);
            
            processNextImage();
        };
        
        const handleCropCancel = () => {
            modal.classList.remove('active');
            cropConfirmBtn.removeEventListener('click', handleCropConfirm);
            cropCancelBtn.removeEventListener('click', handleCropCancel);
            
            filesToProcess = [];
            processedImages = [];
            currentImageIndex = 0;
            imagesInput.value = '';
        };
        
        cropConfirmBtn.addEventListener('click', handleCropConfirm);
        cropCancelBtn.addEventListener('click', handleCropCancel);
    };
    
    const onSaleToggle = document.getElementById('product-onSale');
    const saleDatesSection = document.getElementById('sale-dates-section');
    if (onSaleToggle && saleDatesSection) {
        onSaleToggle.addEventListener('change', (e) => {
            saleDatesSection.style.display = e.target.checked ? 'block' : 'none';
        });
    }

    const enableColorsToggle = document.getElementById('enable-product-colors');
    const colorsSection = document.getElementById('product-colors-section');
    if (enableColorsToggle && colorsSection) {
        enableColorsToggle.addEventListener('change', (e) => {
            colorsSection.style.display = e.target.checked ? 'block' : 'none';
            if (!e.target.checked) {
                const colorsHidden = document.getElementById('product-colors-hidden');
                if (colorsHidden) colorsHidden.value = '[]';
                const colorsPreview = document.getElementById('product-colors-preview');
                if (colorsPreview) colorsPreview.innerHTML = '';
            }
        });
    }

    let colorList = [];
    const addColorBtn = document.getElementById('add-color-btn');
    const newColorInput = document.getElementById('new-color-input');
    const colorsPreviewContainer = document.getElementById('product-colors-preview');
    const colorsHiddenField = document.getElementById('product-colors-hidden');

    const updateColorsUI = () => {
        if (!colorsPreviewContainer || !colorsHiddenField) return;
        colorsPreviewContainer.innerHTML = '';
        if (colorList.length === 0) {
            colorsPreviewContainer.innerHTML = '<span style="color:#999; font-size:12px;">No colors added yet</span>';
            return;
        }
        colorList.forEach((color, idx) => {
            const swatch = document.createElement('div');
            swatch.style.cssText = 'position:relative; width:45px; height:45px; border-radius:50%; border:2px solid #ddd; display:inline-flex; align-items:center; justify-content:center; cursor:pointer;';
            try {
                swatch.style.backgroundColor = color.toLowerCase();
            } catch (e) {
                swatch.style.backgroundColor = '#ccc';
            }
            swatch.title = color;

            const removeBtn = document.createElement('span');
            removeBtn.innerHTML = '&times;';
            removeBtn.style.cssText = 'position:absolute; top:-5px; right:-5px; background:red; color:white; width:16px; height:16px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:10px; font-weight:bold; cursor:pointer;';
            removeBtn.addEventListener('click', (ev) => {
                ev.stopPropagation();
                colorList.splice(idx, 1);
                colorsHiddenField.value = JSON.stringify(colorList);
                updateColorsUI();
            });

            swatch.appendChild(removeBtn);
            colorsPreviewContainer.appendChild(swatch);
        });
        colorsHiddenField.value = JSON.stringify(colorList);
    };

    if (addColorBtn && newColorInput) {
        addColorBtn.addEventListener('click', (e) => {
            e.preventDefault();
            const color = newColorInput.value.trim();
            if (!color) return;
            if (!colorList.includes(color)) {
                colorList.push(color);
                colorsHiddenField.value = JSON.stringify(colorList);
                updateColorsUI();
            }
            newColorInput.value = '';
            newColorInput.focus();
        });
    }

    const updateImagePreview = (inputId, previewId) => {
        const input = document.getElementById(inputId);
        const preview = document.getElementById(previewId);
        if (inputId === 'product-image') {
            const previewContainer = document.getElementById('main-image-preview-container');
            const previewError = document.getElementById('main-image-preview-error');
            if (input && input.value.trim()) {
                preview.src = input.value;
                previewContainer.style.display = 'block';
                previewError.style.display = 'none';
            } else {
                previewContainer.style.display = 'none';
            }
        } else if (previewId.startsWith('carousel-preview-')) {
            const num = previewId.split('-')[2];
            const previewWrapper = document.getElementById(`carousel-preview-${num}-wrapper`);
            if (input && input.value.trim()) {
                preview.src = input.value;
                previewWrapper.style.display = 'block';
            } else {
                previewWrapper.style.display = 'none';
            }
        }
    };

    const uploadImageFile = async (file) => {
        if (!file) return null;
        try {
            const fd = new FormData();
            fd.append('image', file);
            const res = await fetch('/api/upload/product', { method: 'POST', body: fd });
            if (!res.ok) throw new Error('Upload failed');
            const data = await res.json();
            return data.image || null;
        } catch (err) {
            console.error('Image upload failed:', err);
            return null;
        }
    };

    const attachFileUploadToUrlField = (fileInputId, urlInputId, previewId) => {
        const fileInput = document.getElementById(fileInputId);
        if (!fileInput) return;
        fileInput.addEventListener('change', async () => {
            const file = fileInput.files[0];
            if (!file) return;
            const uploadedUrl = await uploadImageFile(file);
            if (uploadedUrl) {
                const urlInput = document.getElementById(urlInputId);
                if (urlInput) urlInput.value = uploadedUrl;
                updateImagePreview(urlInputId, previewId);
            }
        });
    };

    document.getElementById('product-image')?.addEventListener('input', () => updateImagePreview('product-image', 'main-image-preview'));
    document.getElementById('product-image')?.addEventListener('change', () => updateImagePreview('product-image', 'main-image-preview'));
    attachFileUploadToUrlField('product-image-file', 'product-image', 'main-image-preview');

    [1, 2, 3, 4].forEach(num => {
        const input = document.getElementById(`carousel-url-${num}`);
        if (input) {
            input.addEventListener('input', () => updateImagePreview(`carousel-url-${num}`, `carousel-preview-${num}`));
            input.addEventListener('change', () => updateImagePreview(`carousel-url-${num}`, `carousel-preview-${num}`));
        }
        attachFileUploadToUrlField(`carousel-file-${num}`, `carousel-url-${num}`, `carousel-preview-${num}`);
    });

    const featuresContainer = document.getElementById('product-features-container');
    const aiStatusDiv = document.getElementById('ai-features-status');
    const aiGenerateFeaturesBtn = document.getElementById('ai-generate-features-btn');
    const aiClearFeaturesBtn = document.getElementById('ai-clear-features-btn');

    const createFeatureInput = (featureValue = '') => {
        if (!featuresContainer) return;
        const featureDiv = document.createElement('div');
        featureDiv.style.cssText = 'display:flex; gap:8px; margin-bottom:8px; align-items:center;';

        const input = document.createElement('input');
        input.type = 'text';
        input.value = featureValue;
        input.className = 'ai-feature-input';
        input.style.cssText = 'flex:1; padding:8px; border:1px solid #ddd; border-radius:4px; font-size:0.9rem;';

        const removeBtn = document.createElement('button');
        removeBtn.type = 'button';
        removeBtn.textContent = '✕';
        removeBtn.style.cssText = 'padding:6px 12px; background-color:#ff4444; color:white; border:none; border-radius:4px; cursor:pointer; font-weight:bold;';
        removeBtn.onclick = (e) => { e.preventDefault(); featureDiv.remove(); };

        featureDiv.appendChild(input);
        featureDiv.appendChild(removeBtn);
        featuresContainer.appendChild(featureDiv);
    };

    const displayFeatures = (features) => {
        if (!featuresContainer || !Array.isArray(features)) return;
        featuresContainer.innerHTML = '';
        if (features.length === 0) {
            featuresContainer.innerHTML = '<p style="font-size:0.9rem; color:#999; margin:0;">No features generated. Try again.</p>';
            return;
        }
        features.forEach((feature) => createFeatureInput(feature));
    };

    const setStatus = (message, isError = false) => {
        if (!aiStatusDiv) return;
        aiStatusDiv.textContent = message;
        aiStatusDiv.style.display = message ? 'block' : 'none';
        aiStatusDiv.style.color = isError ? '#d32f2f' : '#2e7d32';
    };

    const generateFeatures = async () => {
        const titleInput = document.getElementById('product-title');
        const title = titleInput?.value?.trim();
        if (!title) {
            setStatus('❌ Please enter a product title first', true);
            return;
        }
        try {
            if (!isMainAdmin) return;
            if (aiGenerateFeaturesBtn) aiGenerateFeaturesBtn.disabled = true;
            setStatus('⏳ Generating features using Gemini AI...', false);
            const response = await fetch('/api/ai/generate-features', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title })
            });
            if (!response.ok) {
                const error = await response.json();
                setStatus(`❌ ${error.error || 'Failed to generate features'}`, true);
                return;
            }
            const data = await response.json();
            if (data.success && Array.isArray(data.features)) {
                displayFeatures(data.features);
                setStatus(`✓ Successfully generated ${data.features.length} features!`, false);
            } else {
                setStatus('❌ No features were generated. Try a different product title.', true);
            }
        } catch (error) {
            console.error('Error generating features:', error);
            setStatus(`❌ Error: ${error.message}`, true);
        } finally {
            if (aiGenerateFeaturesBtn) aiGenerateFeaturesBtn.disabled = false;
        }
    };

    if (aiGenerateFeaturesBtn) {
        aiGenerateFeaturesBtn.addEventListener('click', (e) => {
            e.preventDefault();
            generateFeatures();
        });
    }

    if (aiClearFeaturesBtn) {
        aiClearFeaturesBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if (featuresContainer) {
                featuresContainer.innerHTML = '<p style="font-size:0.9rem; color:#999; margin:0;">No features yet. Generate some using the button below.</p>';
            }
            setStatus('');
        });
    }

    const manualAddFeatureBtn = document.getElementById('manual-add-feature-btn');
    if (manualAddFeatureBtn) {
        manualAddFeatureBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if (!featuresContainer) return;

            const manualFeatureInput = document.getElementById('manual-feature-input');
            const featureText = manualFeatureInput?.value?.trim() || '';

            if (!featureText) {
                if (manualFeatureInput) manualFeatureInput.focus();
                return;
            }

            if (featuresContainer.querySelector('p') && featuresContainer.childElementCount === 1) {
                featuresContainer.innerHTML = '';
            }

            createFeatureInput(featureText);
            if (manualFeatureInput) {
                manualFeatureInput.value = '';
                manualFeatureInput.focus();
            }
        });
    }

    const productTitleInput = document.getElementById('product-title');
    const descriptionInput = document.getElementById('product-description');
    const aiDescStatus = document.getElementById('ai-desc-status');
    const aiFeaturesStatus = document.getElementById('ai-features-status');
    const aiImagesStatus = document.getElementById('ai-images-status');
    
    let autoGenTimer;

    if (productTitleInput) {
        productTitleInput.addEventListener('input', (e) => {
            const titleValue = e.target.value.trim();
            if (autoGenTimer) clearTimeout(autoGenTimer);

            if (titleValue.length < 5) {
                 if(aiDescStatus) aiDescStatus.textContent = '';
                 return;
            }
            
            const isDescEmpty = !descriptionInput.value || descriptionInput.dataset.autoGenerated;
            const areImagesEmpty = !document.getElementById('product-image').value;
            const areFeaturesEmpty = !featuresContainer || featuresContainer.querySelectorAll('.ai-feature-input').length === 0;

            if (aiDescStatus && isDescEmpty) {
                aiDescStatus.textContent = 'Typing...';
                aiDescStatus.style.color = '#666';
            }
            if (aiFeaturesStatus && areFeaturesEmpty) {
                aiFeaturesStatus.style.display = 'block';
                aiFeaturesStatus.textContent = 'Typing...';
                aiFeaturesStatus.style.color = '#666';
            }

            autoGenTimer = setTimeout(async () => {
                if (!isMainAdmin) return;

                if (areImagesEmpty) {
                    if (aiImagesStatus) {
                        aiImagesStatus.style.display = 'block';
                        aiImagesStatus.textContent = '✨ Finding images...';
                        aiImagesStatus.style.color = 'var(--corporate-blue)';
                    }
                    try {
                        const res = await fetch('/api/ai/generate-images', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ title: titleValue })
                        });
                        const data = await res.json();
                        if (data.success && data.images && data.images.length > 0) {
                            document.getElementById('product-image').value = data.images[0] || '';
                            const mainImagePreview = document.getElementById('main-image-preview');
                            const mainImagePreviewContainer = document.getElementById('main-image-preview-container');
                            if (mainImagePreview && data.images[0]) {
                                mainImagePreview.src = data.images[0];
                                mainImagePreviewContainer.style.display = 'block';
                            }
                            
                            [1, 2, 3, 4].forEach((num, i) => {
                                const input = document.getElementById(`carousel-url-${num}`);
                                if (input) {
                                    input.value = data.images[i + 1] || '';
                                    const previewWrapper = document.getElementById(`carousel-preview-${num}-wrapper`);
                                    const previewImg = document.getElementById(`carousel-preview-${num}`);
                                    if (data.images[i + 1] && previewImg) {
                                        previewImg.src = data.images[i + 1];
                                        previewWrapper.style.display = 'block';
                                    }
                                }
                            });
                            if (aiImagesStatus) {
                                aiImagesStatus.textContent = `✓ Found ${data.images.length} images!`;
                                aiImagesStatus.style.color = 'green';
                            }
                        } else {
                            if (aiImagesStatus) {
                                aiImagesStatus.textContent = '❌ Could not find images.';
                                aiImagesStatus.style.color = '#d32f2f';
                            }
                        }
                    } catch (err) {
                        console.error('AI Image Error:', err);
                        if (aiImagesStatus) {
                            aiImagesStatus.textContent = '❌ Image search failed.';
                            aiImagesStatus.style.color = '#d32f2f';
                        }
                    }
                }

                if (descriptionInput && isDescEmpty) {
                    if(aiDescStatus) {
                        aiDescStatus.textContent = '✨ Generating unique description...';
                        aiDescStatus.style.color = 'var(--corporate-blue)';
                    }
                    try {
                        const res = await fetch('/api/ai/generate-description', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ title: titleValue })
                        });
                        const data = await res.json();
                        if (data.success && data.description) {
                            descriptionInput.value = data.description;
                            descriptionInput.dataset.autoGenerated = "true";
                            if(aiDescStatus) {
                                aiDescStatus.textContent = '✓ Description generated';
                                aiDescStatus.style.color = 'green';
                            }
                        }
                    } catch (err) {
                        console.error('AI Description Error:', err);
                        if(aiDescStatus) {
                            aiDescStatus.textContent = '❌ Generation failed';
                            aiDescStatus.style.color = '#d32f2f';
                        }
                    }
                }

                if (featuresContainer && areFeaturesEmpty) {
                    if (aiFeaturesStatus) {
                        aiFeaturesStatus.style.display = 'block';
                        aiFeaturesStatus.textContent = '✨ Generating features...';
                        aiFeaturesStatus.style.color = 'var(--corporate-blue)';
                    }
                    await generateFeatures();
                }

                setTimeout(() => {
                    if(aiDescStatus) aiDescStatus.textContent = '';
                    if (aiFeaturesStatus) aiFeaturesStatus.style.display = 'none';
                    if (aiImagesStatus) {
                        aiImagesStatus.textContent = '';
                        aiImagesStatus.style.display = 'none';
                    }
                }, 4000);

            }, 1500);
        });

        if (descriptionInput) {
            descriptionInput.addEventListener('input', () => {
                if (descriptionInput.value.trim().length > 0) {
                    delete descriptionInput.dataset.autoGenerated;
                }
            });
        }
    }

    const exclusiveToggleGroups = [
        ['product-curate-womens', 'product-curate-mens'],
        ['product-curate-livingroom', 'product-curate-bedroom', 'product-curate-office', 'product-curate-kitchen'],
        ['product-curate-kids-electronics', 'product-curate-kids-clothing', 'product-curate-kids-toys']
    ];

    allCuratedIds.forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;

        el.addEventListener('change', (e) => {
            if (isMainAdmin) {
                updateSaveButtonState();
                return;
            }

            if (e.target.checked) {
                const parentGroup = exclusiveToggleGroups.find(group => group.includes(id));
                if (parentGroup) {
                    parentGroup.forEach(otherId => {
                        if (otherId !== id) {
                            const otherEl = document.getElementById(otherId);
                            if (otherEl) otherEl.checked = false;
                        }
                    });
                }
            }
            updateSaveButtonState();
        });
    });

    const saveBtn = document.getElementById('product-save-btn');
    let formInteracted = false; 
    const updateSaveButtonState = () => {
        if (!saveBtn) return;
        const anyCurated = allCuratedIds.some(id => document.getElementById(id)?.checked);
        const validationMsg = document.getElementById('product-validation-msg');
        
        const mainAdminCheck = isMainAdmin === true;
        const fashionAdminCheck = isFashionAdmin === true;
        
        if (mainAdminCheck) {
            saveBtn.disabled = false;
            if (validationMsg) {
                validationMsg.textContent = '';
                validationMsg.style.display = 'none';
            }
        } else if (fashionAdminCheck) {
            const combosChecked = document.getElementById('product-curate-combos')?.checked;
            if (combosChecked) {
                saveBtn.disabled = !anyCurated;
                if (validationMsg) {
                    if (!formInteracted) {
                        validationMsg.textContent = '';
                        validationMsg.style.display = 'none';
                    } else if (!anyCurated) {
                        validationMsg.textContent = 'Please select a curated page before saving the product.';
                        validationMsg.style.display = 'block';
                    } else {
                        validationMsg.textContent = '';
                        validationMsg.style.display = 'none';
                    }
                }
            } else {
                saveBtn.disabled = !anyCurated;
                if (validationMsg) {
                    if (!formInteracted) {
                        validationMsg.textContent = '';
                        validationMsg.style.display = 'none';
                    } else if (!anyCurated) {
                        validationMsg.textContent = 'Please select a curated page before saving the product.';
                        validationMsg.style.display = 'block';
                    } else {
                        validationMsg.textContent = '';
                        validationMsg.style.display = 'none';
                    }
                }
            }
        } else {
            saveBtn.disabled = false;
            if (validationMsg) {
                validationMsg.textContent = '';
                validationMsg.style.display = 'none';
            }
        }
    };

    allCuratedIds.forEach(id => { const el = document.getElementById(id); if (el) el.addEventListener('change', () => { formInteracted = true; updateSaveButtonState(); }); });

    updateSaveButtonState();
    document.getElementById('clear-form-btn')?.addEventListener('click', updateSaveButtonState);
    document.getElementById('cancel-edit-btn')?.addEventListener('click', updateSaveButtonState);
    
    const comboToggle = document.getElementById('product-curate-combos');
    const comboBuilderSection = document.getElementById('combo-builder-section');
    const comboExpirySection = document.getElementById('combo-expiry-section');
    const comboProductList = document.getElementById('combo-product-list');
    const comboProductSearch = document.getElementById('combo-product-search');
    const comboSelectedCount = document.getElementById('combo-selected-count');
    const comboSelectedPreview = document.getElementById('combo-selected-preview');
    const comboCanvas = document.getElementById('combo-image-canvas');
    const comboProductIdsHidden = document.getElementById('combo-product-ids-hidden');
    const comboEndDateInput = document.getElementById('product-comboEndDate');

    const populateComboProductList = (filter = '') => {
        if (!comboProductList) return;
        const lowerFilter = filter.toLowerCase();
        
        const productsHtml = allProducts
            .filter(p => p.title.toLowerCase().includes(lowerFilter))
            .map(p => `
                <div class="combo-switch-row" style="display:flex; align-items:center; justify-content:space-between; padding:5px; border-bottom:1px solid #eee;">
                    <label for="combo-prod-${p.productId}" class="combo-switch-label" style="display:flex; align-items:center; gap:8px; flex:1;">
                        <img src="${p.image}" width="40" height="40" style="object-fit: cover; border-radius: 4px;">
                        <span style="display:inline-block; max-width:420px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${p.title}</span>
                    </label>
                    <label class="switch" style="margin-left:12px;">
                        <input type="checkbox" id="combo-prod-${p.productId}" data-product-id="${p.productId}" class="combo-product-checkbox" ${selectedComboProducts.some(sp => sp.productId === p.productId) ? 'checked' : ''}>
                        <span class="slider round"></span>
                    </label>
                </div>
            `).join('');
        comboProductList.innerHTML = productsHtml || '<p>No products found.</p>';
    };

    const updateComboSelectionDisplay = () => {
        comboSelectedCount.textContent = selectedComboProducts.length;
        comboProductIdsHidden.value = JSON.stringify(selectedComboProducts.map(p => p.productId));
        comboSelectedPreview.innerHTML = selectedComboProducts.map((p, idx) => `
            <div style="position: relative; text-align: center; font-size: 0.8rem; color: #333; border: 2px solid #007bff; padding: 8px; border-radius: 6px; background: white;">
                <img src="${p.image}" width="60" height="60" style="object-fit: cover; border-radius: 4px; border: 1px solid #ccc;">
                <p style="margin: 4px 0; max-width: 60px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${p.title}</p>
                <div style="display: flex; gap: 4px; margin-top: 6px; justify-content: center;">
                    <button type="button" class="combo-remove-btn" data-product-id="${p.productId}" data-index="${idx}" style="padding: 4px 8px; background: #ff6b6b; color: white; border: none; border-radius: 3px; cursor: pointer; font-size: 0.75rem;">Remove</button>
                    <button type="button" class="combo-replace-btn" data-product-id="${p.productId}" data-index="${idx}" style="padding: 4px 8px; background: #4dabf7; color: white; border: none; border-radius: 3px; cursor: pointer; font-size: 0.75rem;">Replace</button>
                </div>
            </div>
        `).join('');

        const comboTotalValue = document.getElementById('combo-total-value');
        const total = selectedComboProducts.reduce((sum, p) => sum + (parseFloat(p.currentPrice) || 0), 0);
        if (comboTotalValue) comboTotalValue.textContent = total.toFixed(2);

        const isComboActive = document.getElementById('product-curate-combos')?.checked;
        setComboUIState(!!isComboActive);
    };

    const drawComboLayout = (ctx, images, width, height) => {
        const count = images.length;
        const gap = 15;
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
        if (count === 0) return;

        const drawImageInBox = (img, x, y, w, h) => {
            const hRatio = w / img.width;
            const vRatio = h / img.height;
            const ratio = Math.min(hRatio, vRatio);
            const scaledWidth = img.width * ratio;
            const scaledHeight = img.height * ratio;
            const centerX = x + (w - scaledWidth) / 2;
            const centerY = y + (h - scaledHeight) / 2;
            ctx.drawImage(img, centerX, centerY, scaledWidth, scaledHeight);
        };

        if (count === 1) {
            drawImageInBox(images[0], 0, 0, width, height);
        } else if (count === 2) {
            const itemWidth = (width - gap * 3) / 2;
            drawImageInBox(images[0], gap, (height - itemWidth) / 2, itemWidth, itemWidth);
            drawImageInBox(images[1], gap * 2 + itemWidth, (height - itemWidth) / 2, itemWidth, itemWidth);
        } else if (count === 3) {
            const itemWidth = (width - gap * 4) / 3;
            drawImageInBox(images[0], gap, (height - itemWidth) / 2, itemWidth, itemWidth);
            drawImageInBox(images[1], gap * 2 + itemWidth, (height - itemWidth) / 2, itemWidth, itemWidth);
            drawImageInBox(images[2], gap * 3 + itemWidth * 2, (height - itemWidth) / 2, itemWidth, itemWidth);
        } else if (count === 4) {
            const itemWidth = (width - gap * 5) / 4;
            drawImageInBox(images[0], gap, (height - itemWidth) / 2, itemWidth, itemWidth);
            drawImageInBox(images[1], gap * 2 + itemWidth, (height - itemWidth) / 2, itemWidth, itemWidth);
            drawImageInBox(images[2], gap * 3 + itemWidth, (height - itemWidth) / 2, itemWidth, itemWidth);
            drawImageInBox(images[3], gap * 4 + itemWidth, (height - itemWidth) / 2, itemWidth, itemWidth);
        } else if (count === 5) {
            const itemWidth = (width - gap * 6) / 5;
            drawImageInBox(images[0], gap, (height - itemWidth) / 2, itemWidth, itemWidth);
            drawImageInBox(images[1], gap * 2 + itemWidth, (height - itemWidth) / 2, itemWidth, itemWidth);
            drawImageInBox(images[2], gap * 3 + itemWidth, (height - itemWidth) / 2, itemWidth, itemWidth);
            drawImageInBox(images[3], gap * 4 + itemWidth, (height - itemWidth) / 2, itemWidth, itemWidth);
            drawImageInBox(images[4], gap * 5 + itemWidth, (height - itemWidth) / 2, itemWidth, itemWidth);
        }
    };

    const generateAndDisplayComboImage = async () => {
        if (!comboCanvas) return;
        const ctx = comboCanvas.getContext('2d');
        ctx.clearRect(0, 0, comboCanvas.width, comboCanvas.height);
        
        if (selectedComboProducts.length === 0) return;

        const imagesToLoad = selectedComboProducts.map(p => {
            return new Promise((resolve) => {
                const img = new Image();
                img.crossOrigin = "anonymous";
                img.onload = () => resolve(img);
                img.onerror = () => {
                    const placeholderImg = new Image();
                    placeholderImg.width = 100;
                    placeholderImg.height = 100;
                    resolve(placeholderImg);
                };
                img.src = p.image;
            });
        });

        try {
            const loadedImages = await Promise.all(imagesToLoad);
            drawComboLayout(ctx, loadedImages, comboCanvas.width, comboCanvas.height);
        } catch (error) {
            console.error("Error generating combo image:", error);
            ctx.fillStyle = '#ccc';
            ctx.font = '14px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('Preview will update when images load', comboCanvas.width / 2, comboCanvas.height / 2);
        }
    };

    const setComboUIState = (enabled) => {
        if (comboBuilderSection) comboBuilderSection.style.display = enabled ? 'block' : 'none';
        if (comboExpirySection) comboExpirySection.style.display = enabled ? 'block' : 'none';
        if (comboEndDateInput) comboEndDateInput.required = enabled;

        const priceGroup = document.getElementById('product-currentPrice')?.closest('.form-group');
        const oldPriceGroup = document.getElementById('product-oldPrice')?.closest('.form-group');
        const imageGroup = document.getElementById('product-image')?.closest('.form-group');
        const imagesUploadGroup = document.getElementById('product-images')?.closest('.form-group');
        const imagesPreviewEl = document.getElementById('product-images-preview');
        const comboSalePriceInput = document.getElementById('product-comboSalePrice')?.closest('.form-group');

        if (priceGroup) priceGroup.style.display = enabled ? 'none' : 'block';
        if (oldPriceGroup) oldPriceGroup.style.display = enabled ? 'none' : 'block';
        if (imageGroup) imageGroup.style.display = enabled ? 'none' : 'block';
        if (imagesUploadGroup) imagesUploadGroup.style.display = enabled ? 'none' : 'block';
        if (imagesPreviewEl) imagesPreviewEl.style.display = enabled ? 'none' : 'flex';
        if (comboSalePriceInput) comboSalePriceInput.style.display = enabled ? 'block' : 'none';
    };

    comboToggle?.addEventListener('change', (e) => {
        const enabled = e.target.checked;
        setComboUIState(enabled);
        if (enabled) {
            populateComboProductList();
        } else {
            selectedComboProducts = [];
            if (comboEndDateInput) comboEndDateInput.value = '';
            updateComboSelectionDisplay();
            generateAndDisplayComboImage();
        }
        updateSaveButtonState();
    });

    if (comboProductSearch) {
        comboProductSearch.addEventListener('input', (e) => populateComboProductList(e.target.value));
    }

    if (comboSelectedPreview) {
        comboSelectedPreview.addEventListener('click', (e) => {
            const removeBtn = e.target.closest('.combo-remove-btn');
            const replaceBtn = e.target.closest('.combo-replace-btn');

            if (removeBtn) {
                e.preventDefault();
                const productId = removeBtn.dataset.productId;
                selectedComboProducts = selectedComboProducts.filter(p => p.productId !== productId);
                const checkbox = document.getElementById(`combo-prod-${productId}`);
                if (checkbox) checkbox.checked = false;
                updateComboSelectionDisplay();
                generateAndDisplayComboImage();
            }

            if (replaceBtn) {
                e.preventDefault();
                const productId = replaceBtn.dataset.productId;
                const index = parseInt(replaceBtn.dataset.index, 10);
                
                comboProductSearch.focus();
                comboProductSearch.value = '';
                populateComboProductList('');
                
                window.comboReplaceIndex = index;
                window.comboReplaceProductId = productId;
                alert('Select a new product from the list below to replace this item.');
            }
        });
    }

    if (comboProductList) {
        comboProductList.addEventListener('change', (e) => {
            if (e.target.classList.contains('combo-product-checkbox')) {
                const productId = e.target.dataset.productId;
                const product = allProducts.find(p => p.productId === productId);

                if (window.comboReplaceIndex !== undefined && e.target.checked) {
                    selectedComboProducts.splice(window.comboReplaceIndex, 1);
                    selectedComboProducts.push(product);
                    window.comboReplaceIndex = undefined;
                    window.comboReplaceProductId = undefined;
                    updateComboSelectionDisplay();
                    generateAndDisplayComboImage();
                    return;
                }

                if (e.target.checked) {
                    if (selectedComboProducts.length < 5 && !selectedComboProducts.some(p => p.productId === productId)) {
                        selectedComboProducts.push(product);
                    } else {
                        e.target.checked = false;
                        if (selectedComboProducts.length >= 5) alert('You can select a maximum of 5 products for a combo.');
                    }
                } else {
                    selectedComboProducts = selectedComboProducts.filter(p => p.productId !== productId);
                }
                updateComboSelectionDisplay();
                generateAndDisplayComboImage();
            }
        });
    }

    const giftCardToggle = document.getElementById('product-giftCardEnabled');
    const giftCardConfigSection = document.getElementById('gift-card-config-section');
    const giftCardTypeSelect = document.getElementById('product-giftCardType');
    const giftCardValueLabel = document.getElementById('gift-card-value-label');
    
    if (giftCardToggle && giftCardConfigSection && giftCardTypeSelect && giftCardValueLabel) {
        giftCardToggle.addEventListener('change', (e) => {
            giftCardConfigSection.style.display = e.target.checked ? 'block' : 'none';
        });

        giftCardTypeSelect.addEventListener('change', (e) => {
            giftCardValueLabel.textContent = e.target.value === 'percent' ? 'Value (%)' : 'Value (N$)';
        });
    }

    // Toggle logic for reseller's custom dynamic transport pricing
    const freeTransportToggle = document.getElementById('product-freeTransport');
    const deliveryPricingSection = document.getElementById('delivery-pricing-section');
    if (freeTransportToggle && deliveryPricingSection) {
        freeTransportToggle.addEventListener('change', (e) => {
            deliveryPricingSection.style.display = e.target.checked ? 'none' : 'block';
        });
    }

    // Toggle logic for reseller's custom safe delivery insurance input
    const safeInsuranceToggle = document.getElementById('product-safeInsuranceEnabled');
    const safeInsurancePriceGroup = document.getElementById('safe-insurance-price-group');
    if (safeInsuranceToggle && safeInsurancePriceGroup) {
        safeInsuranceToggle.addEventListener('change', (e) => {
            safeInsurancePriceGroup.style.display = e.target.checked ? 'block' : 'none';
        });
    }
};

const initAdminViewers = () => {
    const addViewerForm = document.getElementById('add-viewers-form');
    if (!addViewerForm) return;

    const addReviewToggle = document.getElementById('add-review-now');
    const reviewFields = document.getElementById('add-review-fields');
    const peakTimesGrid = document.getElementById('peak-times-grid');
    
    peakTimesGrid.innerHTML = PEAK_ACTIVITY_TIMES.map(time => 
        `<button type="button" class="peak-time-option" data-hour="${time.hour}" data-minute="${time.minute}">${time.label}</button>`
    ).join('');

    addReviewToggle.addEventListener('change', () => {
        reviewFields.style.display = addReviewToggle.checked ? 'block' : 'none';
    });

    peakTimesGrid.addEventListener('click', (e) => {
        if (e.target.classList.contains('peak-time-option')) {
            peakTimesGrid.querySelectorAll('.selected').forEach(btn => btn.classList.remove('selected'));
            e.target.classList.add('selected');
        }
    });

    addViewerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const productId = document.getElementById('viewers-product').value;
        const viewerName = document.getElementById('viewer-name').value.trim();
        const shouldAddReview = addReviewToggle.checked;
        
        let viewTime = null;
        const selectedTimeBtn = peakTimesGrid.querySelector('.selected');
        if (selectedTimeBtn) {
            viewTime = {
                hour: parseInt(selectedTimeBtn.dataset.hour),
                minute: parseInt(selectedTimeBtn.dataset.minute)
            };
        }

        try {
            const addViewerResponse = await api.addViewer(productId, {
                name: viewerName || undefined,
                viewTime: viewTime
            });

            if (!addViewerResponse || !addViewerResponse.viewer || !addViewerResponse.viewer._id) {
                throw new Error('Failed to get viewer ID after creation.');
            }

            const newViewerId = addViewerResponse.viewer._id;
            let successMessage = 'Viewer added successfully!';

            if (shouldAddReview) {
                const rating = parseInt(document.getElementById('review-rating').value);
                const text = document.getElementById('review-text').value.trim();

                if (!text) {
                    throw new Error('Review text is required when adding a review.');
                }

                await api.addReview(productId, {
                    author: viewerName || 'Anonymous',
                    rating: rating,
                    text: text,
                    viewerId: newViewerId
                });
                successMessage += ' Review also added!';
            }
            
            alert(successMessage);
            location.reload();

        } catch (err) {
            console.error('Failed to add viewer/review:', err);
            alert('Error: ' + err.message);
        }
    });
};

export const initMobileNav = () => {
    const navItems = document.querySelectorAll('.mobile-nav-item');
    const navLinks = document.querySelectorAll('.mobile-nav-link');
    const scrollContainer = document.getElementById('mobile-bottom-nav-scroll');
    const arrowLeft = document.getElementById('mobile-nav-arrow-left');
    const arrowRight = document.getElementById('mobile-nav-arrow-right');

    if (arrowLeft && arrowRight && scrollContainer) {
        arrowLeft.addEventListener('click', (e) => {
            e.preventDefault();
            scrollContainer.scrollBy({ left: -160, behavior: 'smooth' });
        });
        arrowRight.addEventListener('click', (e) => {
            e.preventDefault();
            scrollContainer.scrollBy({ left: 160, behavior: 'smooth' });
        });
    }

    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            // Requirement 1: Make parent dropdown items clickable in mobile view to load target page
            const targetHash = link.getAttribute('href');
            if (targetHash && targetHash !== 'javascript:void(0)' && targetHash.startsWith('#')) {
                location.hash = targetHash;
            }

            const parentItem = link.parentElement;
            const dropupMenu = parentItem.querySelector('.mobile-dropup-menu');
            const isOpen = parentItem.classList.contains('open');

            navItems.forEach(item => {
                if (item !== parentItem) {
                    item.classList.remove('open');
                }
            });

            if (!isOpen) {
                parentItem.classList.add('open');
                
                if (dropupMenu) {
                    const rect = link.getBoundingClientRect();
                    const menuWidth = 230; 
                    let leftPos = rect.left + (rect.width / 2) - (menuWidth / 2);

                    if (leftPos < 10) {
                        leftPos = 10;
                    }
                    if (leftPos + menuWidth > window.innerWidth - 10) {
                        leftPos = window.innerWidth - menuWidth - 10;
                    }

                    dropupMenu.style.left = `${leftPos}px`;
                    dropupMenu.style.bottom = `${window.innerHeight - rect.top + 8}px`;
                }
            } else {
                parentItem.classList.remove('open');
            }
        });
    });

    const subToggles = document.querySelectorAll('.mobile-submenu-toggle');
    subToggles.forEach(toggle => {
        toggle.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const parentSubItem = toggle.closest('.mobile-submenu-item');
            const isSubOpen = parentSubItem.classList.contains('open');
            
            const parentMenu = toggle.closest('.mobile-dropup-menu');
            if (parentMenu) {
                parentMenu.querySelectorAll('.mobile-submenu-item').forEach(el => {
                    if (el !== parentSubItem) {
                        el.classList.remove('open');
                    }
                });
            }

            if (!isSubOpen) {
                parentSubItem.classList.add('open');
            } else {
                parentSubItem.classList.remove('open');
            }
        });
    });

    const dropUpLinks = document.querySelectorAll('.mobile-dropup-menu a:not(.mobile-submenu-toggle)');
    dropUpLinks.forEach(link => {
        link.addEventListener('click', () => {
            navItems.forEach(item => item.classList.remove('open'));
            document.querySelectorAll('.mobile-submenu-item').forEach(el => el.classList.remove('open'));
        });
    });

    document.addEventListener('click', (e) => {
        if (!e.target.closest('.mobile-bottom-nav')) {
            navItems.forEach(item => item.classList.remove('open'));
            document.querySelectorAll('.mobile-submenu-item').forEach(el => el.classList.remove('open'));
        }
    });
};

export const initHamburgerMenu = () => {
    const hamburgerBtn = document.querySelector('.hamburger-btn');
    const closeMenuBtn = document.querySelector('.close-menu-btn');
    const sideMenu = document.querySelector('.mobile-side-menu');
    const overlay = document.querySelector('.mobile-side-menu-overlay');
    const menuLinks = document.querySelectorAll('.mobile-menu-links a');

    if (!hamburgerBtn || !sideMenu || !overlay) return;

    const openMenu = () => {
        sideMenu.classList.add('active');
        overlay.classList.add('active');
    };

    const closeMenu = () => {
        sideMenu.classList.remove('active');
        overlay.classList.remove('active');
    };

    hamburgerBtn.addEventListener('click', (e) => {
        e.preventDefault();
        openMenu();
    });

    closeMenuBtn.addEventListener('click', (e) => {
        e.preventDefault();
        closeMenu();
    });

    overlay.addEventListener('click', closeMenu);

    menuLinks.forEach(link => {
        link.addEventListener('click', closeMenu);
    });
};

export const populateProductForm = (productToEdit, allProducts) => {
    document.getElementById('product-id-hidden').value = productToEdit._id || '';
    document.getElementById('product-id').value = productToEdit.productId || '';
    document.getElementById('product-title').value = productToEdit.title || '';
    document.getElementById('product-currentPrice').value = productToEdit.currentPrice || '';
    document.getElementById('product-oldPrice').value = productToEdit.oldPrice || '';
    document.getElementById('product-category').value = productToEdit.category || '';
    document.getElementById('product-image').value = productToEdit.image || '';
    
    const mainImagePreview = document.getElementById('main-image-preview');
    const mainImagePreviewContainer = document.getElementById('main-image-preview-container');
    if (productToEdit.image && mainImagePreview) {
        mainImagePreview.src = productToEdit.image;
        mainImagePreviewContainer.style.display = 'block';
    }
    
    document.getElementById('product-description').value = productToEdit.description || '';
    
    const stockToggle = document.getElementById('product-stockToggle');
    const stockFieldGroup = document.getElementById('stock-field-group');
    if (productToEdit.stock !== undefined && productToEdit.stock !== null) {
        if(stockToggle) stockToggle.checked = true;
        if(stockFieldGroup) {
            stockFieldGroup.style.display = 'block';
            document.getElementById('product-stock').value = productToEdit.stock;
        }
    } else {
        if(stockToggle) stockToggle.checked = false;
        if(stockFieldGroup) stockFieldGroup.style.display = 'none';
    }

    const onSaleToggle = document.getElementById('product-onSale');
    const saleDatesSection = document.getElementById('sale-dates-section');
    if (productToEdit.onSale) {
        if(onSaleToggle) onSaleToggle.checked = true;
        if(saleDatesSection) {
            saleDatesSection.style.display = 'block';
            if (productToEdit.saleStartDate) {
                document.getElementById('product-saleStartDate').value = new Date(productToEdit.saleStartDate).toISOString().slice(0, 16);
            }
            if (productToEdit.saleEndDate) {
                document.getElementById('product-saleEndDate').value = new Date(productToEdit.saleEndDate).toISOString().slice(0, 16);
            }
        }
    } else {
        if(onSaleToggle) onSaleToggle.checked = false;
        if(saleDatesSection) saleDatesSection.style.display = 'none';
    }

    const enableColorsToggle = document.getElementById('enable-product-colors');
    const colorsSection = document.getElementById('product-colors-section');
    const colorsHidden = document.getElementById('product-colors-hidden');
    
    if (productToEdit.colorsEnabled) {
        if (enableColorsToggle) enableColorsToggle.checked = true;
        if (colorsSection) {
            colorsSection.style.display = 'block';
            colorList = Array.isArray(productToEdit.colors) ? [...productToEdit.colors] : [];
            if (colorsHidden) {
                colorsHidden.value = JSON.stringify(colorList);
            }
            const colorsPreview = document.getElementById('product-colors-preview');
            if (colorsPreview) {
                colorsPreview.innerHTML = '';
                colorList.forEach((color, idx) => {
                    const swatch = document.createElement('div');
                    swatch.style.cssText = 'position:relative; width:45px; height:45px; border-radius:50%; border:2px solid #ddd; display:inline-flex; align-items:center; justify-content:center; cursor:pointer;';
                    swatch.style.backgroundColor = color.toLowerCase();
                    swatch.title = color;

                    const removeBtn = document.createElement('span');
                    removeBtn.innerHTML = '&times;';
                    removeBtn.style.cssText = 'position:absolute; top:-5px; right:-5px; background:red; color:white; width:16px; height:16px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:10px; font-weight:bold; cursor:pointer;';
                    removeBtn.addEventListener('click', (ev) => {
                        ev.stopPropagation();
                        colorList.splice(idx, 1);
                        if (colorsHidden) colorsHidden.value = JSON.stringify(colorList);
                        colorsPreview.removeChild(swatch);
                    });

                    swatch.appendChild(removeBtn);
                    colorsPreview.appendChild(swatch);
                });
            }
        }
    } else {
        if (enableColorsToggle) enableColorsToggle.checked = false;
        if (colorsSection) colorsSection.style.display = 'none';
    }

    const sizeSelect = document.getElementById('product-sizes-select');
    if (sizeSelect && productToEdit.sizes) {
        Array.from(sizeSelect.options).forEach(opt => {
            opt.selected = productToEdit.sizes.includes(opt.value);
        });
    }

    const resellerSelect = document.getElementById('product-exploreMoreReseller');
    if (resellerSelect) {
        resellerSelect.value = (productToEdit.exploreMoreReseller && (productToEdit.exploreMoreReseller._id || productToEdit.exploreMoreReseller)) || '';
    }

    if (productToEdit.thumbnails) {
        [1, 2, 3, 4].forEach(i => {
            const urlInput = document.getElementById(`carousel-url-${i}`);

            if (urlInput) {
                const val = productToEdit.thumbnails[i] || '';
                urlInput.value = val;
                const wrapper = document.getElementById(`carousel-preview-${i}-wrapper`);
                const img = document.getElementById(`carousel-preview-${i}`);
                if (val && img) {
                    img.src = val;
                    if (wrapper) wrapper.style.display = 'block';
                } else if (wrapper) {
                    wrapper.style.display = 'none';
                }
            }
        });
    }

    const featuresContainer = document.getElementById('product-features-container');
    if (featuresContainer && productToEdit.features) {
        featuresContainer.innerHTML = '';
        productToEdit.features.forEach(feature => {
            const featureDiv = document.createElement('div');
            featureDiv.style.cssText = 'display:flex; gap:8px; margin-bottom:8px; align-items:center;';

            const input = document.createElement('input');
            input.type = 'text';
            input.value = feature;
            input.className = 'ai-feature-input';
            input.style.cssText = 'flex:1; padding:8px; border:1px solid #ddd; border-radius:4px; font-size:0.9rem;';

            const removeBtn = document.createElement('button');
            removeBtn.type = 'button';
            removeBtn.textContent = '✕';
            removeBtn.style.cssText = 'padding:6px 12px; background-color:#ff4444; color:white; border:none; border-radius:4px; cursor:pointer; font-weight:bold;';
            removeBtn.onclick = (e) => { e.preventDefault(); featureDiv.remove(); };

            featureDiv.appendChild(input);
            featureDiv.appendChild(removeBtn);
            featuresContainer.appendChild(featureDiv);
        });
        if (productToEdit.features.length === 0) {
            featuresContainer.innerHTML = '<p style="font-size:0.9rem; color:#999; margin:0;">No features configured.</p>';
        }
    }

    const filtersContainer = document.getElementById('product-filter-tags-container');
    const filtersHidden = document.getElementById('product-clothing-filters-hidden');
    if (filtersContainer && filtersHidden) {
        filtersContainer.innerHTML = '';
        const tags = productToEdit.clothingFilters || [];
        filtersHidden.value = JSON.stringify(tags);
        if (tags.length === 0) {
            filtersContainer.innerHTML = '<span style="color:#999; font-size:12px;">No active tags</span>';
        } else {
            tags.forEach(tag => {
                const tagEl = document.createElement('span');
                tagEl.style.cssText = 'display:inline-flex; align-items:center; gap:6px; background:var(--corporate-blue); color:white; padding:4px 10px; border-radius:15px; font-size:12px; font-weight:600; margin-right:5px; margin-bottom:5px;';
                tagEl.innerHTML = `${tag} <button type="button" class="remove-tag-btn" data-tag="${tag}" style="border:none; background:none; color:white; cursor:pointer; font-weight:bold; font-size:12px; padding:0 0 0 4px; line-height:1;">&times;</button>`;
                filtersContainer.appendChild(tagEl);
            });
        }
    }

    const curatedPages = productToEdit.curatedPages || [];
    const isMainAdmin = getSellerType() === 'admin';

    if (isMainAdmin) {
        const curateTrending = document.getElementById('product-curate-trending');
        if (curateTrending) curateTrending.checked = curatedPages.includes('trending');
        
        const curateNew = document.getElementById('product-curate-new-arrivals');
        if (curateNew) curateNew.checked = curatedPages.includes('new-arrivals');
        
        const curateCombos = document.getElementById('product-curate-combos');
        if (curateCombos) {
            curateCombos.checked = curatedPages.includes('combos');
            curateCombos.dispatchEvent(new Event('change'));
        }
    } else {
        const st = getSellerType();
        const map = { 
            'electronics': 'electronics', 'solar': 'solar', 'fashion': 'fashion',
            'groceries': 'groceries', 'appliances': 'appliances', 'vehicles': 'vehicles',
            'crafts': 'crafts', 'farm': 'farm', 'fuel': 'fuel', 'other': 'other'
        };
        const mappedSellerCategory = map[st] || st || '';
        const isKidsAdmin = mappedSellerCategory === 'electronics' || mappedSellerCategory === 'kids';
        if (isKidsAdmin) {
            const curateKidsElec = document.getElementById('product-curate-kids-electronics');
            if (curateKidsElec) curateKidsElec.checked = curatedPages.includes('kids-electronics');
            const curateKidsCloth = document.getElementById('product-curate-kids-clothing');
            if (curateKidsCloth) curateKidsCloth.checked = curatedPages.includes('kids-clothing');
            const curateKidsToys = document.getElementById('product-curate-kids-toys');
            if (curateKidsToys) curateKidsToys.checked = curatedPages.includes('kids-toys');
        } else {
            const curateWomens = document.getElementById('product-curate-womens');
            if (curateWomens) curateWomens.checked = curatedPages.includes('womens-clothes');
            const curateMens = document.getElementById('product-curate-mens');
            if (curateMens) curateMens.checked = curatedPages.includes('mens-clothes');

            const curateLiving = document.getElementById('product-curate-livingroom');
            if (curateLiving) curateLiving.checked = curatedPages.includes('living-room');
            const curateBed = document.getElementById('product-curate-bedroom');
            if (curateBed) curateBed.checked = curatedPages.includes('bedroom');
            const curateOffice = document.getElementById('product-curate-office');
            if (curateOffice) curateOffice.checked = curatedPages.includes('office');
            const curateKitchen = document.getElementById('product-curate-kitchen');
            if (curateKitchen) curateKitchen.checked = curatedPages.includes('kitchen');
        }

        const curateCombos = document.getElementById('product-curate-combos');
        if (curateCombos) {
            curateCombos.checked = curatedPages.includes('combos');
            curateCombos.dispatchEvent(new Event('change'));
        }
    }

    if (productToEdit.curatedPages && productToEdit.curatedPages.includes('combos')) {
        const comboToggle = document.getElementById('product-curate-combos');
        if (comboToggle) comboToggle.checked = true;
        
        const comboEndDateInput = document.getElementById('product-comboEndDate');
        if (productToEdit.comboEndDate && comboEndDateInput) {
            comboEndDateInput.value = new Date(productToEdit.comboEndDate).toISOString().slice(0, 16);
        }

        const comboSalePriceInput = document.getElementById('product-comboSalePrice');
        if (comboSalePriceInput) {
            comboSalePriceInput.value = productToEdit.currentPrice || '';
        }

        selectedComboProducts = [];
        if (productToEdit.comboProductIds) {
            const ids = Array.isArray(productToEdit.comboProductIds) ? productToEdit.comboProductIds : [];
            ids.forEach(id => {
                const match = allProducts.find(p => p.productId === id);
                if (match) selectedComboProducts.push(match);
            });
        }
        updateComboSelectionDisplay();
        generateAndDisplayComboImage();
    }

    if (isMainAdmin || (getSellerType() && getSellerType() !== 'customer')) {
        const giftCardToggle = document.getElementById('product-giftCardEnabled');
        if (giftCardToggle) {
            giftCardToggle.checked = !!productToEdit.giftCardEnabled;
            giftCardToggle.dispatchEvent(new Event('change'));
        }
        const giftCardTypeSelect = document.getElementById('product-giftCardType');
        if (giftCardTypeSelect) {
            giftCardTypeSelect.value = productToEdit.giftCardType || 'percent';
            giftCardTypeSelect.dispatchEvent(new Event('change'));
        }
        const giftCardValueInput = document.getElementById('product-giftCardValue');
        if (giftCardValueInput) {
            giftCardValueInput.value = productToEdit.giftCardValue || 5;
        }
    }

    document.getElementById('product-showTradeIn').checked = productToEdit.showTradeIn !== false;
    document.getElementById('product-showLayBye').checked = productToEdit.showLayBye !== false;
    document.getElementById('product-showDeposit').checked = productToEdit.showDeposit !== false;
    document.getElementById('product-showDeliveryNationwide').checked = productToEdit.showDeliveryNationwide !== false;
    document.getElementById('product-showOneYearWarranty').checked = productToEdit.showOneYearWarranty !== false;
    document.getElementById('product-showFifteenDayReturns').checked = productToEdit.showFifteenDayReturns !== false;

    // Load new dashboard input structures
    document.getElementById('product-freeTransport').checked = !!productToEdit.freeTransport;
    const deliveryPricingSection = document.getElementById('delivery-pricing-section');
    if (deliveryPricingSection) {
        deliveryPricingSection.style.display = productToEdit.freeTransport ? 'none' : 'block';
    }
    document.getElementById('product-deliveryPriceWindhoek').value = productToEdit.deliveryPriceWindhoek || 0;
    document.getElementById('product-deliveryPriceOutside').value = productToEdit.deliveryPriceOutside || 0;

    document.getElementById('product-cashOnDelivery').checked = !!productToEdit.cashOnDelivery;
    
    // Populating dynamically typed warranty value (Requirement 7)
    document.getElementById('product-warrantyDuration').value = productToEdit.warrantyDuration || 'No Warranty';
    document.getElementById('product-promotionStatus').value = productToEdit.promotionStatus || 'None';

    // Populating dynamic safe delivery insurance properties (Requirement 20)
    document.getElementById('product-safeInsuranceEnabled').checked = !!productToEdit.safeInsuranceEnabled;
    const safeInsurancePriceGroup = document.getElementById('safe-insurance-price-group');
    if (safeInsurancePriceGroup) {
        safeInsurancePriceGroup.style.display = productToEdit.safeInsuranceEnabled ? 'block' : 'none';
    }
    document.getElementById('product-safeInsurancePrice').value = productToEdit.safeInsurancePrice || 0;

    const productsTabBtn = document.querySelector('.admin-tab-btn[data-tab="products"]');
    if (productsTabBtn) productsTabBtn.click();
    
    const cancelBtn = document.getElementById('cancel-edit-btn');
    if (cancelBtn) cancelBtn.style.display = 'inline-block';
    const formHeader = document.querySelector('form h2');
    if (formHeader) formHeader.textContent = 'Edit Product';

    window.scrollTo({ top: 0, behavior: 'smooth' });
};

export const showTransactionDetailsPopup = (transaction) => {
    const popupHTML = `
        <div class="popup-overlay" id="transaction-details-popup">
            <div class="popup-content">
                <button class="popup-close" id="popup-close-transaction">&times;</button>
                <h2>Transaction Details</h2>
                <div class="transaction-details-content">
                    <p><strong>Customer Name:</strong> ${transaction.customerName}</p>
                    <p><strong>Customer Email:</strong> ${transaction.customerEmail}</p>
                    <p><strong>Customer Address:</strong> ${transaction.customerAddress}</p>
                    <p><strong>Total Amount:</strong> ${formatCurrency(transaction.totalAmount)}</p>
                    <p><strong>Payment Method:</strong> ${transaction.paymentMethod}</p>
                    <p><strong>Gift Card Earned:</strong> ${formatCurrency(transaction.giftCardEarned)}</p>
                    <p><strong>Transaction Date:</strong> ${new Date(transaction.createdAt).toLocaleString()}</p>
                    <h4>Ordered Items:</h4>
                    <ul>
                        ${transaction.items.map(item => `
                            <li>
                                <strong>${item.title}</strong><br>
                                Quantity: ${item.quantity} | Price: ${formatCurrency(item.price)}
                                ${item.selectedColor ? `| Color: ${item.selectedColor}` : ''}
                            </li>
                        `).join('')}
                    </ul>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', popupHTML);
    const popup = document.getElementById('transaction-details-popup');
    setTimeout(() => popup.classList.add('show'), 100);
    const closePopup = () => {
        popup.classList.remove('show');
        setTimeout(() => popup.remove(), 300);
    };
    document.getElementById('popup-close-transaction').addEventListener('click', closePopup);
    popup.addEventListener('click', e => {
        if (e.target === popup) closePopup();
    });
};

export const renderChatPage = (sellerId) => {
    getAppRoot().innerHTML = `
        <div class="page-container">
            <h2>Live Messaging</h2>
            <p>Messaging channel initialized for reseller: <strong>${sellerId}</strong></p>
        </div>
    `;
};
