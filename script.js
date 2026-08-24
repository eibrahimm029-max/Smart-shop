let products = JSON.parse(localStorage.getItem('smartProducts')) || [
    { id: 1, name: "ESP32 Wi-Fi & Bluetooth Module", price: "550 BDT", icon: "🎛️", desc: "High performance IoT module." },
    { id: 2, name: "DHT11 Temperature Sensor", price: "180 BDT", icon: "🌡️", desc: "Digital temperature and humidity sensor." },
    { id: 3, name: "3D Printed Robot Chassis", price: "350 BDT", icon: "🤖", desc: "Sturdy 3D printed robotic frame." }
];

let selectedProductForOrder = null;

function displayProducts(items) {
    const container = document.getElementById('productContainer');
    if(!container) return;
    if(items.length === 0) {
        container.innerHTML = `<div class="no-result">No products found.</div>`;
        return;
    }
    container.innerHTML = items.map(p => `
        <div class="product-card">
            <div class="product-img">${p.icon}</div>
            <div class="product-info">
                <h3>${p.name}</h3>
                <p class="price">৳ ${p.price}</p>
                <button class="btn" onclick="startQuickOrder(${p.id})">Order Now</button>
            </div>
        </div>
    `).join('');
}

displayProducts(products);

function searchProducts() {
    const searchInput = document.getElementById('searchInput');
    if(!searchInput) return;
    const q = searchInput.value.toLowerCase().trim();
    const filtered = products.filter(p => p.name.toLowerCase().includes(q));
    displayProducts(filtered);
}

function closeModals() {
    document.querySelectorAll('.modal-screen').forEach(m => m.style.display = 'none');
}

function setActiveNav(element) {
    if(!element) return;
    document.querySelectorAll('.nav-item').forEach(btn => btn.classList.remove('active'));
    element.classList.add('active');
}

function switchTab(tabName, element) {
    setActiveNav(element);
    closeModals();
    window.scrollTo({top: 0, behavior: 'smooth'});
}

function openAccountModal(element) {
    setActiveNav(element);
    closeModals();
    const modal = document.getElementById('accountModal');
    if(modal) modal.style.display = 'flex';
    checkLoginState();
}

function requestAdminAccess() {
    let pass = prompt("Enter Admin Password:");
    if(pass === "1234") {
        closeModals();
        const adm = document.getElementById('adminModal');
        if(adm) adm.style.display = 'flex';
    } else if(pass !== null) {
        alert("Incorrect Password!");
    }
}

function openTrackingModal(element) {
    setActiveNav(element);
    closeModals();
    const trk = document.getElementById('trackingModal');
    if(trk) trk.style.display = 'flex';
    renderTrackingInfo();
}

function openChatModal(element) {
    setActiveNav(element);
    closeModals();
    const chat = document.getElementById('chatModal');
    if(chat) chat.style.display = 'flex';
}

function openCustomerSellModal() {
    closeModals();
    const sell = document.getElementById('customerSellModal');
    if(sell) sell.style.display = 'flex';
}

function submitCustomerProduct() {
    const name = document.getElementById('custProdName').value.trim();
    const price = document.getElementById('custProdPrice').value.trim();
    if(!name || !price) { alert("Please fill details."); return; }
    alert("Your product has been submitted for admin review!");
    closeModals();
}

let generatedOtp = "", savedEmail = "";
function sendOtp() {
    const emailInput = document.getElementById('userEmail');
    if(!emailInput) return;
    const email = emailInput.value.trim();
    if(!email.includes('@')) { alert("Enter valid email"); return; }
    generatedOtp = Math.floor(1000 + Math.random() * 9000).toString();
    savedEmail = email;
    alert(`[Simulation OTP]: Code is ${generatedOtp}`);
    document.getElementById('accountStep1').style.display = 'none';
    document.getElementById('accountStep2').style.display = 'block';
}

function verifyOtp() {
    const otpInput = document.getElementById('otpCode');
    if(!otpInput) return;
    if(otpInput.value.trim() === generatedOtp) {
        localStorage.setItem('smartTechEmail', savedEmail);
        checkLoginState();
    } else { alert("Invalid Code"); }
}

function checkLoginState() {
    const email = localStorage.getItem('smartTechEmail');
    const step1 = document.getElementById('accountStep1');
    const step2 = document.getElementById('accountStep2');
    const step3 = document.getElementById('accountStep3');
    if(!step1 || !step2 || !step3) return;

    if(email) {
        step1.style.display = 'none';
        step2.style.display = 'none';
        step3.style.display = 'block';
        document.getElementById('loggedInEmail').innerText = `Logged in: ${email}`;
        document.getElementById('profileName').value = localStorage.getItem('profileName') || '';
        document.getElementById('profilePhone').value = localStorage.getItem('profilePhone') || '+8809658777230';
        document.getElementById('profileAddress').value = localStorage.getItem('profileAddress') || 'Soyaitpur Bazar, Phulbaria, Mymensingh';
    } else {
        step1.style.display = 'block';
        step2.style.display = 'none';
        step3.style.display = 'none';
    }
}

function saveProfile() {
    localStorage.setItem('profileName', document.getElementById('profileName').value);
    localStorage.setItem('profilePhone', document.getElementById('profilePhone').value);
    localStorage.setItem('profileAddress', document.getElementById('profileAddress').value);
    alert("Profile saved successfully!");
    closeModals();
}

function logout() {
    localStorage.removeItem('smartTechEmail');
    checkLoginState();
}

function startQuickOrder(productId) {
    const email = localStorage.getItem('smartTechEmail');
    if(!email) {
        alert("Please login with your Gmail first!");
        const acc = document.getElementById('accountModal');
        if(acc) acc.style.display = 'flex';
        checkLoginState();
        return;
    }
    const address = localStorage.getItem('profileAddress');
    if(!address) {
        alert("Please save your address in Account first!");
        const acc = document.getElementById('accountModal');
        if(acc) acc.style.display = 'flex';
        checkLoginState();
        return;
    }
    selectedProductForOrder = products.find(p => p.id === productId);
    document.getElementById('checkoutDetails').innerHTML = `
        <b>Product:</b> ${selectedProductForOrder.name}<br>
        <b>Price:</b> ${selectedProductForOrder.price}<br>
        <b>Deliver To:</b> ${localStorage.getItem('profileName')} (${localStorage.getItem('profilePhone')})
    `;
    document.getElementById('checkoutModal').style.display = 'flex';
}

function confirmFinalOrder() {
    const trx = document.getElementById('trxId').value.trim();
    const sender = document.getElementById('senderNum').value.trim();
    if(!trx || !sender) { alert("Please provide Transaction ID and Sender Number."); return; }
    
    const orderId = 'ORD-' + Math.floor(100000 + Math.random() * 900000);
    const userEmail = localStorage.getItem('smartTechEmail');
    
    const orderData = {
        id: orderId,
        product: selectedProductForOrder.name,
        price: selectedProductForOrder.price,
        email: userEmail,
        date: new Date().toLocaleString()
    };
    
    localStorage.setItem('lastOrder', JSON.stringify(orderData));
    alert("Order placed successfully!");
    closeModals();
    
    document.getElementById('trackingModal').style.display = 'flex';
    renderTrackingInfo();
    triggerAIEmailSimulation(orderData);
}

function triggerAIEmailSimulation(order) {
    const aiBox = document.getElementById('aiNotifyBox');
    const statusText = document.getElementById('aiEmailStatusText');
    if(!aiBox || !statusText) return;
    aiBox.style.display = 'block';
    statusText.innerHTML = `AI System is processing... (Analyzing order & securing seal stamp)`;

    setTimeout(() => {
        statusText.innerHTML = `
            <b>✅ AI Verified & Dispatched!</b><br>
            📧 Email sent to: <b>${order.email}</b><br>
            🆔 Order ID: <b>${order.id}</b> | Price: <b>${order.price}</b><br>
            🔒 <i>Official AI Stamp & Percentage Back-end Locked.</i>
        `;
    }, 1500);
}

function renderTrackingInfo() {
    const order = JSON.parse(localStorage.getItem('lastOrder'));
    const box = document.getElementById('trackingBody');
    const aiBox = document.getElementById('aiNotifyBox');
    if(!box) return;

    if(!order) { 
        box.innerHTML = `<p style="text-align:center; color:#64748b; padding:20px;">No active orders found.</p>`; 
        if(aiBox) aiBox.style.display = 'none';
        return; 
    }
    box.innerHTML = `
        <p><b>Order ID:</b> ${order.id || 'ORD-982143'}</p>
        <p><b>Product:</b> ${order.product} (${order.price})</p>
        <div class="tracking-step" style="margin-top:8px;"><i class="fa-solid fa-circle-check"></i><div><b>Order Confirmed</b></div></div>
        <div class="tracking-step"><i class="fa-solid fa-box-archive"></i><div><b>Packed & Ready</b></div></div>
        <div class="tracking-step"><i class="fa-solid fa-truck-fast"></i><div><span style="color:#f85606; font-weight:bold;">On the way!</span></div></div>
    `;
    if(aiBox) {
        aiBox.style.display = 'block';
        document.getElementById('aiEmailStatusText').innerHTML = `
            <b>✅ AI Auto-Email Sent Successfully!</b><br>
            Recipient: <b>${order.email}</b> | ID: <b>${order.id}</b><br>
            🔒 <i>System AI Verified & Sealed.</i>
        `;
    }
}

function addNewProduct() {
    const name = document.getElementById('admName').value.trim();
    const price = document.getElementById('admPrice').value.trim();
    const icon = document.getElementById('admIcon').value.trim() || "📦";
    const desc = document.getElementById('admDesc').value.trim();
    if(!name || !price) { alert("Enter name and price."); return; }
    products.push({ id: Date.now(), name, price, icon, desc });
    localStorage.setItem('smartProducts', JSON.stringify(products));
    displayProducts(products);
    alert("Product uploaded successfully!");
    closeModals();
}

function sendChatMessage() {
    const input = document.getElementById('chatInput');
    const chatBody = document.getElementById('chatBody');
    if(!input || !chatBody) return;
    const text = input.value.trim();
    if(!text) return;
    chatBody.innerHTML += `<div style="text-align:right; background:#f85606; color:white; padding:5px; border-radius:4px; margin-bottom:5px;">${text}</div>`;
    input.value = '';
    setTimeout(() => {
        chatBody.innerHTML += `<div style="background:#e2e8f0; padding:5px; border-radius:4px; margin-bottom:5px;">Thanks for messaging! Call +8809658777230 for urgent help.</div>`;
        chatBody.scrollTop = chatBody.scrollHeight;
    }, 500);
}
