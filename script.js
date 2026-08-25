let products = JSON.parse(localStorage.getItem('smartProducts')) || [
    { id: 1, name: "ESP32 Wi-Fi & Bluetooth Module", price: "৫৫০ টাকা", icon: "🎛️", status: "available", desc: "High performance IoT module." },
    { id: 2, name: "DHT11 Temperature Sensor", price: "১৮০ টাকা", icon: "🌡️", status: "available", desc: "Digital temperature sensor." },
    { id: 3, name: "3D Printed Robot Chassis", price: "৩৫০ টাকা", icon: "🤖", status: "stockout", desc: "Sturdy robotic frame." }
];

let selectedProductForOrder = null;

function displayProducts(items) {
    const container = document.getElementById('productContainer');
    if(!container) return;
    if(items.length === 0) {
        container.innerHTML = `<div class="no-result">কোনো পণ্য পাওয়া যায়নি।</div>`;
        return;
    }
    container.innerHTML = items.map(p => {
        let isStockOut = p.status === 'stockout';
        return `
            <div class="product-card">
                <span class="stock-badge ${isStockOut ? '' : 'active'}">${isStockOut ? 'স্টক আউট' : 'ইন স্টক'}</span>
                <div class="product-img">${p.icon}</div>
                <div class="product-info">
                    <h3>${p.name}</h3>
                    <p class="price">৳ ${p.price}</p>
                    <button class="btn" ${isStockOut ? 'disabled' : ''} onclick="startQuickOrder(${p.id})">
                        ${isStockOut ? 'পণ্যটি নেই' : 'অর্ডার করুন'}
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

displayProducts(products);

// Load Custom Announcement
window.onload = function() {
    const savedAnnounce = localStorage.getItem('siteAnnouncement');
    if(savedAnnounce) {
        document.getElementById('announcementText').innerText = savedAnnounce;
    }
}

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
    let pass = prompt("এডমিন পাসওয়ার্ড দিন:");
    if(pass === "1234") {
        closeModals();
        const adm = document.getElementById('adminModal');
        if(adm) adm.style.display = 'flex';
    } else if(pass !== null) {
        alert("ভুল পাসওয়ার্ড!");
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
    if(!name || !price) { alert("দয়া করে সকল তথ্য পূরণ করুন।"); return; }
    alert("আপনার পণ্যটি এডমিন রিভিউয়ের জন্য সফলভাবে জমা হয়েছে!");
    closeModals();
}

let generatedOtp = "", savedEmail = "";
function sendOtp() {
    const emailInput = document.getElementById('userEmail');
    if(!emailInput) return;
    const email = emailInput.value.trim();
    if(!email.includes('@')) { alert("সঠিক ইমেইল দিন"); return; }
    
    generatedOtp = Math.floor(1000 + Math.random() * 9000).toString();
    savedEmail = email;
    
    alert(`📱 [নোটিফিকেশন পপ-আপ]: আপনার Smart Tech এক্টিভেশন কোড হলো: ${generatedOtp}`);
    
    document.getElementById('accountStep1').style.display = 'none';
    document.getElementById('accountStep2').style.display = 'block';
}

function verifyOtp() {
    const otpInput = document.getElementById('otpCode');
    if(!otpInput) return;
    if(otpInput.value.trim() === generatedOtp) {
        localStorage.setItem('smartTechEmail', savedEmail);
        let defaultName = savedEmail.split('@')[0];
        if(!localStorage.getItem('profileName')) {
            localStorage.setItem('profileName', defaultName);
        }
        checkLoginState();
    } else { alert("ভুল কোড দেওয়া হয়েছে!"); }
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
        document.getElementById('loggedInEmail').innerText = `লগইন আছে: ${email}`;
        document.getElementById('profileName').value = localStorage.getItem('profileName') || '';
        document.getElementById('profilePhone').value = localStorage.getItem('profilePhone') || '+8809658777230';
        document.getElementById('profileCity').value = localStorage.getItem('profileCity') || 'ময়মনসিংহ';
        document.getElementById('profileAddress').value = localStorage.getItem('profileAddress') || 'সয়াইটপুর বাজার, ফুলবাড়িয়া';
    } else {
        step1.style.display = 'block';
        step2.style.display = 'none';
        step3.style.display = 'none';
    }
}

function saveProfile() {
    localStorage.setItem('profileName', document.getElementById('profileName').value);
    localStorage.setItem('profilePhone', document.getElementById('profilePhone').value);
    localStorage.setItem('profileCity', document.getElementById('profileCity').value);
    localStorage.setItem('profileAddress', document.getElementById('profileAddress').value);
    alert("প্রোফাইল সফলভাবে সেভ করা হয়েছে!");
    closeModals();
}

function logout() {
    localStorage.removeItem('smartTechEmail');
    checkLoginState();
}

function startQuickOrder(productId) {
    const email = localStorage.getItem('smartTechEmail');
    if(!email) {
        alert("আগে আপনার জিমেইল দিয়ে অ্যাকাউন্ট লগইন করুন!");
        openAccountModal();
        return;
    }
    const address = localStorage.getItem('profileAddress');
    if(!address) {
        alert("অ্যাকাউন্টে আপনার ডেলিভারি ঠিকানা সেভ করা নেই!");
        openAccountModal();
        return;
    }
    selectedProductForOrder = products.find(p => p.id === productId);
    document.getElementById('checkoutDetails').innerHTML = `
        <b>পণ্য:</b> ${selectedProductForOrder.name}<br>
        <b>মূল্য:</b> ${selectedProductForOrder.price}<br>
        <b>প্রাপক:</b> ${localStorage.getItem('profileName')} (${localStorage.getItem('profilePhone')})<br>
        <b>ঠিকানা:</b> ${localStorage.getItem('profileAddress')}, ${localStorage.getItem('profileCity')}
    `;
    document.getElementById('checkoutModal').style.display = 'flex';
}

function confirmFinalOrder() {
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
    alert("অভিনন্দন! আপনার অর্ডার সফলভাবে সাবমিট হয়েছে। ২৪ ঘণ্টার মধ্যে আপনাকে কল করে কনফার্ম করা হবে।");
    closeModals();
    
    document.getElementById('trackingModal').style.display = 'flex';
    renderTrackingInfo();
}

// ভুল অর্ডার বা এন্ট্রি ডিলিট করার ফাংশন
function deleteCurrentOrder() {
    if(confirm("আপনি কি নিশ্চিতভাবে এই ভুল অর্ডারটি ডিলিট বা বাতিল করতে চান?")) {
        localStorage.removeItem('lastOrder');
        alert("অর্ডারটি সফলভাবে মুছে ফেলা হয়েছে!");
        renderTrackingInfo();
    }
}

function renderTrackingInfo() {
    const order = JSON.parse(localStorage.getItem('lastOrder'));
    const box = document.getElementById('trackingBody');
    if(!box) return;

    if(!order) { 
        box.innerHTML = `<p style="text-align:center; color:#64748b; padding:20px;">কোনো সক্রিয় অর্ডার পাওয়া যায়নি।</p>`; 
        return; 
    }
    box.innerHTML = `
        <p><b>অর্ডার আইডি:</b> ${order.id}</p>
        <p><b>পণ্য:</b> ${order.product} (${order.price})</p>
        <p><b>সময়:</b> ${order.date}</p>
        <div class="tracking-step" style="margin-top:8px;"><i class="fa-solid fa-circle-check"></i><div><b>অর্ডার গ্রহণ করা হয়েছে</b></div></div>
        <div class="tracking-step"><i class="fa-solid fa-phone-volume"></i><div><b>২৪ ঘণ্টার মধ্যে ফোন কল ও কনফার্মেশন</b></div></div>
        <div class="tracking-step"><i class="fa-solid fa-box-archive"></i><div><b>প্যাকিং ও ডেলিভারি প্রসেস</b></div></div>
        <div class="tracking-step"><i class="fa-solid fa-truck-fast"></i><div><span style="color:#f85606; font-weight:bold;">ডেলিভারির পথে রয়েছে!</span></div></div>
        
        <hr style="margin: 10px 0; border:0; border-top:1px solid #e2e8f0;">
        <button onclick="deleteCurrentOrder()" style="width:100%; background:#ef4444; color:white; border:none; padding:8px; border-radius:4px; font-weight:bold; cursor:pointer; font-size:11px;">
            <i class="fa-solid fa-trash"></i> ভুল অর্ডার বা এন্ট্রি ডিলিট করুন
        </button>
    `;
}

function addNewProduct() {
    const name = document.getElementById('admName').value.trim();
    const price = document.getElementById('admPrice').value.trim();
    const icon = document.getElementById('admIcon').value.trim() || "📦";
    const status = document.getElementById('admStockStatus').value;
    const desc = document.getElementById('admDesc').value.trim();
    
    if(!name || !price) { alert("নাম ও মূল্য লিখুন।"); return; }
    products.push({ id: Date.now(), name, price, icon, status, desc });
    localStorage.setItem('smartProducts', JSON.stringify(products));
    displayProducts(products);
    alert("নতুন পণ্য সফলভাবে যুক্ত হয়েছে!");
    closeModals();
}

function updateAdminSettings() {
    const newAnnounce = document.getElementById('admAnnounce').value.trim();
    if(newAnnounce) {
        localStorage.setItem('siteAnnouncement', newAnnounce);
        document.getElementById('announcementText').innerText = newAnnounce;
        alert("নোটিফিকেশন বার আপডেট করা হয়েছে!");
    }
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
        chatBody.innerHTML += `<div style="background:#e2e8f0; padding:5px; border-radius:4px; margin-bottom:5px;">মেসেজের জন্য ধন্যবাদ! জরুরী প্রয়োজনে কল করুন: +8809658777230</div>`;
        chatBody.scrollTop = chatBody.scrollHeight;
    }, 500);
}
