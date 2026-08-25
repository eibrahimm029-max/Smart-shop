let products = JSON.parse(localStorage.getItem('smartProducts')) || [];
let notifications = JSON.parse(localStorage.getItem('siteNotifications')) || [
    "🤖 এআই সিস্টেম সক্রিয়: যেকোনো পণ্যে ইনস্ট্যান্ট এআই কনফার্মেশন সুবিধা।"
];

let allCustomerOrders = JSON.parse(localStorage.getItem('allCustomerOrders')) || [];
let selectedProductForOrder = null;
let isOwnerLoggedIn = false;

function displayProducts(items) {
    const container = document.getElementById('productContainer');
    if(!container) return;
    if(items.length === 0) {
        container.innerHTML = `<div class="no-result" style="grid-column: span 2; text-align:center; color:#64748b; padding:20px; font-size:11px;">কোনো পণ্য পাওয়া যায়নি। নতুন পণ্য যোগ করুন।</div>`;
        return;
    }
    
    container.innerHTML = items.map(p => {
        let isStockOut = p.status === 'stockout';
        let ownerControls = isOwnerLoggedIn ? `
            <div class="owner-action-box" onclick="event.stopPropagation()">
                <button class="edit-btn" onclick="openEditProduct(${p.id})">এডিট</button>
                <button class="del-btn" onclick="deleteProduct(${p.id})">ডিলিট</button>
            </div>
        ` : '';

        let discountBadge = '';
        let oldPriceHtml = '';
        if(p.oldPrice && Number(p.oldPrice) > Number(p.price)) {
            let diff = Number(p.oldPrice) - Number(p.price);
            let percent = Math.round((diff / Number(p.oldPrice)) * 100);
            discountBadge = `<span class="discount-badge">-${percent}%</span>`;
            oldPriceHtml = `<span class="old-price">৳ ${p.oldPrice}</span>`;
        }

        let imageHtml = p.imageSrc ? `<img src="${p.imageSrc}" alt="${p.name}">` : `<span>📦</span>`;

        return `
            <div class="product-card" onclick="openDarazProductDetails(${p.id})">
                ${discountBadge}
                <span class="stock-badge ${isStockOut ? '' : 'active'}">${isStockOut ? 'স্টক আউট' : 'ইন স্টক'}</span>
                <div class="product-img">${imageHtml}</div>
                <div class="product-info">
                    <h3>${p.name}</h3>
                    <div class="price-box">
                        <span class="price">৳ ${p.price}</span>
                        ${oldPriceHtml}
                    </div>
                    ${ownerControls}
                    <button class="btn" ${isStockOut ? 'disabled' : ''} onclick="event.stopPropagation(); startQuickOrder(${p.id})">
                        ${isStockOut ? 'পণ্যটি নেই' : 'অর্ডার করুন'}
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

displayProducts(products);

window.onload = function() {
    renderNotifications();
    updateOwnerOrderBadge();
}

function openDarazProductDetails(productId) {
    const p = products.find(item => item.id === productId);
    if(!p) return;

    if(!p.reviews) {
        p.reviews = [
            { name: "রহিম উদ্দিন", rating: "⭐⭐⭐⭐⭐", comment: "খুব চমৎকার এবং অরিজিনাল পণ্য! সময়মতো পেয়েছি।" },
            { name: "ফাহিম আহমেদ", rating: "⭐⭐⭐⭐", comment: "ভালো কাজ করে, তবে ডেলিভারি একটু লেট হয়েছিল।" }
        ];
    }

    let discountBadge = '';
    let oldPriceHtml = '';
    if(p.oldPrice && Number(p.oldPrice) > Number(p.price)) {
        let diff = Number(p.oldPrice) - Number(p.price);
        let percent = Math.round((diff / Number(p.oldPrice)) * 100);
        discountBadge = `<span style="background:#f85606; color:white; font-size:10px; padding:2px 6px; border-radius:4px; font-weight:bold;">-${percent}% ছাড়</span>`;
        oldPriceHtml = `<span style="text-decoration:line-through; color:#94a3b8; font-size:12px; margin-left:6px;">৳ ${p.oldPrice}</span>`;
    }

    let imageHtml = p.imageSrc ? `<img src="${p.imageSrc}" alt="${p.name}" style="width:100%; height:180px; object-fit:cover; border-radius:6px;">` : `<div style="height:140px; background:#f1f5f9; display:flex; align-items:center; justify-content:center; font-size:25px;">📦</div>`;

    let reviewsHtml = p.reviews.map(r => `
        <div style="background:#f8fafc; border:1px solid #e2e8f0; padding:6px; border-radius:6px; margin-bottom:6px; font-size:10px;">
            <div style="display:flex; justify-content:space-between; font-weight:bold; color:#1e293b;">
                <span>${r.name}</span>
                <span style="color:#f59e0b;">${r.rating}</span>
            </div>
            <p style="color:#475569; margin-top:2px;">${r.comment}</p>
        </div>
    `).join('');

    const modalBody = document.getElementById('darazModalBody');
    modalBody.innerHTML = `
        ${imageHtml}
        <div style="padding: 6px 0;">
            <div style="display:flex; gap:6px; align-items:center; margin-bottom:4px;">
                ${discountBadge}
                <span style="font-size:10px; color:${p.status === 'stockout' ? '#ef4444' : '#22c55e'}; font-weight:bold;">${p.status === 'stockout' ? '● স্টক আউট' : '● ইন স্টক'}</span>
            </div>
            <h2 style="font-size:13px; color:#1e293b; margin-bottom:6px;">${p.name}</h2>
            <div style="display:flex; align-items:center; margin-bottom:8px;">
                <span style="font-size:16px; font-weight:bold; color:#f85606;">৳ ${p.price}</span>
                ${oldPriceHtml}
            </div>
            
            <div style="background:#f1f5f9; padding:8px; border-radius:6px; font-size:10px; margin-bottom:10px;">
                <b style="color:#2563eb; display:block; margin-bottom:3px;">📝 পণ্যের বিবরণ:</b>
                <p style="color:#334155; line-height:1.4;">${p.desc || 'কোনো বিস্তারিত বিবরণ দেওয়া হয়নি।'}</p>
            </div>

            <button class="form-btn" style="background:#f85606; margin-bottom:10px;" onclick="closeModals(); startQuickOrder(${p.id})">
                <i class="fa-solid fa-bag-shopping"></i> এখনই অর্ডার করুন
            </button>

            <hr style="border:0; border-top:1px solid #e2e8f0; margin-bottom:8px;">
            <b style="font-size:11px; color:#1e293b; display:block; margin-bottom:6px;">⭐ গ্রাহকদের রিভিউ ও রেটিং</b>
            <div style="max-height:110px; overflow-y:auto; margin-bottom:8px;" id="reviewListContainer">
                ${reviewsHtml}
            </div>

            <div style="background:#f8fafc; padding:8px; border-radius:6px; border:1px solid #cbd5e1;">
                <b style="font-size:10px; color:#2563eb; display:block; margin-bottom:4px;">আপনার রিভিউ লিখুন:</b>
                <input type="text" id="newReviewerName" placeholder="আপনার নাম" class="form-input" style="margin-bottom:4px; padding:4px;">
                <textarea id="newReviewComment" placeholder="পণ্যটি কেমন লেগেছে..." class="form-input" style="margin-bottom:4px; height:35px; padding:4px; resize:none;"></textarea>
                <button onclick="addCustomerReview(${p.id})" style="background:#10b981; color:white; border:none; padding:5px; font-size:10px; border-radius:4px; cursor:pointer; font-weight:bold; width:100%;">রিভিউ সাবমিট করুন</button>
            </div>
        </div>
    `;

    document.getElementById('productDetailsModal').style.display = 'flex';
}

function addCustomerReview(productId) {
    const nameInput = document.getElementById('newReviewerName').value.trim();
    const commentInput = document.getElementById('newReviewComment').value.trim();

    if(!nameInput || !commentInput) {
        alert("আপনার নাম এবং রিভিউয়ের মন্তব্য লিখুন।");
        return;
    }

    const p = products.find(item => item.id === productId);
    if(p) {
        if(!p.reviews) p.reviews = [];
        p.reviews.push({
            name: nameInput,
            rating: "⭐⭐⭐⭐⭐",
            comment: commentInput
        });
        localStorage.setItem('smartProducts', JSON.stringify(products));
        alert("আপনার রিভিউ সফলভাবে যুক্ত হয়েছে!");
        openDarazProductDetails(productId);
    }
}

function toggleNotificationDropdown() {
    const dropdown = document.getElementById('notifDropdown');
    dropdown.style.display = (dropdown.style.display === 'block') ? 'none' : 'block';
}

function renderNotifications() {
    const listContainer = document.getElementById('notifListContainer');
    const badge = document.getElementById('notifBadge');
    if(!listContainer) return;
    
    badge.innerText = notifications.length;
    listContainer.innerHTML = notifications.map(n => `<div class="notif-item">🤖 ${n}</div>`).join('');
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
    let pass = prompt("মালিকের পাসওয়ার্ড দিন:");
    if(pass === "1234") {
        isOwnerLoggedIn = true;
        displayProducts(products);
        closeModals();
        
        document.getElementById('editProductId').value = '';
        document.getElementById('admName').value = '';
        document.getElementById('admPrice').value = '';
        document.getElementById('admOldPrice').value = '';
        document.getElementById('admDesc').value = '';
        document.getElementById('admImageFile').value = '';
        document.getElementById('adminModalTitle').innerText = "নতুন পণ্য যোগ করুন (মালিক)";
        document.getElementById('saveProductBtn').innerText = "নতুন পণ্য যুক্ত করুন";

        const adm = document.getElementById('adminModal');
        if(adm) adm.style.display = 'flex';
    } else if(pass !== null) {
        alert("ভুল পাসওয়ার্ড!");
    }
}

function openEditProduct(id) {
    const p = products.find(item => item.id === id);
    if(!p) return;

    document.getElementById('editProductId').value = p.id;
    document.getElementById('admName').value = p.name;
    document.getElementById('admPrice').value = p.price;
    document.getElementById('admOldPrice').value = p.oldPrice || '';
    document.getElementById('admDesc').value = p.desc || '';
    document.getElementById('admStockStatus').value = p.status || 'available';
    document.getElementById('adminModalTitle').innerText = "পণ্যের দাম বা বিবরণ পরিবর্তন করুন";
    document.getElementById('saveProductBtn').innerText = "পরিবর্তন সেভ করুন";

    closeModals();
    document.getElementById('adminModal').style.display = 'flex';
}

function deleteProduct(id) {
    if(confirm("আপনি কি নিশ্চিতভাবে এই পণ্যটি ডিলিট করতে চান?")) {
        products = products.filter(item => item.id !== id);
        localStorage.setItem('smartProducts', JSON.stringify(products));
        displayProducts(products);
        alert("পণ্যটি সফলভাবে মুছে ফেলা হয়েছে!");
    }
}

function saveAdminProduct() {
    const editId = document.getElementById('editProductId').value;
    const name = document.getElementById('admName').value.trim();
    const price = document.getElementById('admPrice').value.trim();
    const oldPrice = document.getElementById('admOldPrice').value.trim();
    const status = document.getElementById('admStockStatus').value;
    const desc = document.getElementById('admDesc').value.trim();
    const imageInput = document.getElementById('admImageFile');

    if(!name || !price) { alert("পণ্যের নাম ও বর্তমান মূল্য দিতে হবে।"); return; }

    if(imageInput && imageInput.files && imageInput.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
            let imageSrc = e.target.result;
            processProductSave(editId, name, price, oldPrice, status, desc, imageSrc);
        };
        reader.readAsDataURL(imageInput.files[0]);
    } else {
        let existingImg = "";
        let existingReviews = [];
        if(editId) {
            let existingProd = products.find(item => item.id == editId);
            if(existingProd) {
                existingImg = existingProd.imageSrc || "";
                existingReviews = existingProd.reviews || [];
            }
        }
        processProductSave(editId, name, price, oldPrice, status, desc, existingImg, existingReviews);
    }
}

function processProductSave(editId, name, price, oldPrice, status, desc, imageSrc, existingReviews = []) {
    if(editId) {
        let p = products.find(item => item.id == editId);
        if(p) {
            p.name = name;
            p.price = price;
            p.oldPrice = oldPrice;
            p.status = status;
            p.desc = desc;
            if(imageSrc) p.imageSrc = imageSrc;
        }
        alert("পণ্য সফলভাবে আপডেট করা হয়েছে!");
    } else {
        const newProd = {
            id: Date.now(),
            name,
            price,
            oldPrice,
            status,
            desc,
            imageSrc,
            reviews: existingReviews
        };
        products.push(newProd);
        alert("নতুন পণ্য সফলভাবে যুক্ত হয়েছে!");
    }

    localStorage.setItem('smartProducts', JSON.stringify(products));
    displayProducts(products);
    closeModals();
}

function sendAdminBroadcast() {
    const text = document.getElementById('admAnnounce').value.trim();
    if(!text) { alert("নোটিফিকেশনের টেক্সট লিখুন।"); return; }

    notifications.unshift(text);
    localStorage.setItem('siteNotifications', JSON.stringify(notifications));
    renderNotifications();
    alert("নোটিফিকেশন পাঠানো হয়েছে!");
    document.getElementById('admAnnounce').value = '';
    closeModals();
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

let generatedOtp = "", savedEmail = "";
function sendOtp() {
    const emailInput = document.getElementById('userEmail');
    if(!emailInput) return;
    const email = emailInput.value.trim();
    if(!email.includes('@')) { alert("সঠিক ইমেইল দিন"); return; }
    
    generatedOtp = Math.floor(1000 + Math.random() * 9000).toString();
    savedEmail = email;
    
    alert(`🤖 [এআই নোটিফিকেশন]: আপনার ভেরিফিকেশন কোড হলো: ${generatedOtp}`);
    
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
    } else { alert("ভুল কোড!"); }
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
        
        // প্রোফাইল ফর্মটি একদম ফাঁকা রাখা হলো যাতে কাস্টমার নিজের তথ্য নিজে বসাতে পারে
        document.getElementById('profileName').value = localStorage.getItem('profileName') || '';
        document.getElementById('profilePhone').value = localStorage.getItem('profilePhone') || '';
        document.getElementById('profileCity').value = localStorage.getItem('profileCity') || '';
        document.getElementById('profileAddress').value = localStorage.getItem('profileAddress') || '';
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
    alert("প্রোফাইল সেভ করা হয়েছে!");
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
        <b>মূল্য:</b> ৳ ${selectedProductForOrder.price}<br>
        <b>গ্রাহক:</b> ${localStorage.getItem('profileName')} (${localStorage.getItem('profilePhone')})<br>
        <b>ঠিকানা:</b> ${localStorage.getItem('profileAddress')}, ${localStorage.getItem('profileCity')}
    `;
    document.getElementById('checkoutModal').style.display = 'flex';
}

function confirmFinalOrder() {
    const orderId = 'AI-ORD-' + Math.floor(100000 + Math.random() * 900000);
    const userEmail = localStorage.getItem('smartTechEmail');
    const userName = localStorage.getItem('profileName') || 'গ্রাহক';
    const userPhone = localStorage.getItem('profilePhone') || '+880...';
    const userAddress = localStorage.getItem('profileAddress') + ', ' + localStorage.getItem('profileCity');

    const orderData = {
        id: orderId,
        product: selectedProductForOrder.name,
        price: '৳ ' + selectedProductForOrder.price,
        customerName: userName,
        customerPhone: userPhone,
        customerAddress: userAddress,
        email: userEmail,
        status: 'AI Confirmed',
        date: new Date().toLocaleString()
    };
    
    localStorage.setItem('lastOrder', JSON.stringify(orderData));

    allCustomerOrders.unshift(orderData);
    localStorage.setItem('allCustomerOrders', JSON.stringify(allCustomerOrders));
    updateOwnerOrderBadge();

    let aiNotificationText = `প্রিয় ${userName}, আপনার অর্ডারটি (${orderId}) এআই সিস্টেম দ্বারা কনফার্ম হয়েছে! পণ্যের নাম: ${selectedProductForOrder.name}, দাম: ৳ ${selectedProductForOrder.price}, ঠিকানা: ${userAddress}. ২৪ ঘণ্টার মধ্যে হটলাইন থেকে কল দেওয়া হবে।`;
    
    notifications.unshift(aiNotificationText);
    localStorage.setItem('siteNotifications', JSON.stringify(notifications));
    renderNotifications();

    alert(`🤖 [এআই অটো-মেসেজ]:\n\n${aiNotificationText}`);
    closeModals();
    
    document.getElementById('trackingModal').style.display = 'flex';
    renderTrackingInfo();
}

function updateOwnerOrderBadge() {
    const badge = document.getElementById('ownerOrderCount');
    if(badge) {
        badge.innerText = allCustomerOrders.length;
    }
}

function openOwnerOrdersModal() {
    let pass = prompt("মালিকের পাসওয়ার্ড দিন:");
    if(pass === "1234") {
        closeModals();
        renderOwnerOrdersList();
        document.getElementById('ownerOrdersModal').style.display = 'flex';
    } else if(pass !== null) {
        alert("ভুল পাসওয়ার্ড!");
    }
}

function renderOwnerOrdersList() {
    const container = document.getElementById('ownerOrdersContainer');
    if(!container) return;

    if(allCustomerOrders.length === 0) {
        container.innerHTML = `<p style="text-align:center; color:#64748b; padding:20px; font-size:11px;">কোনো অর্ডার নেই।</p>`;
        return;
    }

    container.innerHTML = allCustomerOrders.map((ord, index) => `
        <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:6px; padding:8px; margin-bottom:8px; font-size:10px;">
            <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
                <b>অর্ডার আইডি: ${ord.id}</b>
                <span style="color:#2563eb; font-weight:bold;">🤖 ${ord.status}</span>
            </div>
            <p><b>পণ্য:</b> ${ord.product} (${ord.price})</p>
            <p><b>ক্রেতা:</b> ${ord.customerName} - 📞 <a href="tel:${ord.customerPhone}" style="color:#f85606; font-weight:bold;">${ord.customerPhone}</a></p>
            <p><b>ঠিকানা:</b> ${ord.customerAddress}</p>
            <p style="color:#64748b; font-size:9px; margin-top:2px;">সময়: ${ord.date}</p>
            
            <div style="display:flex; gap:5px; margin-top:6px;">
                <a href="tel:${ord.customerPhone}" style="flex:1; background:#22c55e; color:white; text-align:center; padding:4px; border-radius:3px; text-decoration:none; font-weight:bold;">
                    <i class="fa-solid fa-phone"></i> হটলাইন কল
                </a>
                <button onclick="deleteOwnerOrder(${index})" style="background:#ef4444; color:white; border:none; padding:4px 8px; border-radius:3px; cursor:pointer;">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </div>
        </div>
    `).join('');
}

function deleteOwnerOrder(index) {
    if(confirm("আপনি কি এই অর্ডারটি মুছে ফেলতে চান?")) {
        allCustomerOrders.splice(index, 1);
        localStorage.setItem('allCustomerOrders', JSON.stringify(allCustomerOrders));
        renderOwnerOrdersList();
        updateOwnerOrderBadge();
    }
}

function renderTrackingInfo() {
    const order = JSON.parse(localStorage.getItem('lastOrder'));
    const box = document.getElementById('trackingBody');
    if(!box) return;

    if(!order) { 
        box.innerHTML = `<p style="text-align:center; color:#64748b; padding:20px;">কোনো অর্ডার নেই।</p>`; 
        return; 
    }
    
    box.innerHTML = `
        <p><b>অর্ডার আইডি:</b> ${order.id}</p>
        <p><b>পণ্য:</b> ${order.product} (${order.price})</p>
        <p><b>সময়:</b> ${order.date}</p>
        <div class="tracking-step" style="margin-top:8px;"><i class="fa-solid fa-robot"></i><div><b>এআই দ্বারা স্বয়ংক্রিয়ভাবে কনফার্ম হয়েছে</b></div></div>
        <div class="tracking-step"><i class="fa-solid fa-phone-volume"></i><div><b>হটলাইন থেকে ২৪ ঘণ্টার মধ্যে ফোন করা হবে</b></div></div>
        <div class="tracking-step"><i class="fa-solid fa-truck-fast"></i><div><span style="color:#f85606; font-weight:bold;">ডেলিভারি প্রসেস চলছে!</span></div></div>
        <p style="font-size: 10px; color: #16a34a; margin-top: 10px; text-align: center; font-weight: bold;">
            ℹ️ অর্ডার কনফার্ম হয়ে গেছে। কোনো পরিবর্তনের জন্য হটলাইনে যোগাযোগ করুন।
        </p>
    `;
}

function sendChatMessage() {
    const input = document.getElementById('chatInput');
    const chatBody = document.getElementById('chatBody');
    if(!input || !chatBody) return;
    const text = input.value.trim();
    if(!text) return;
    chatBody.innerHTML += `<div style="text-align:right; background:#2563eb; color:white; padding:5px; border-radius:4px; margin-bottom:5px;">${text}</div>`;
    input.value = '';
    setTimeout(() => {
        chatBody.innerHTML += `<div style="background:#e2e8f0; padding:5px; border-radius:4px; margin-bottom:5px;">🤖 এআই উত্তর: আপনার অর্ডারটি এআই প্যানেলে সংরক্ষিত আছে। ২৪ ঘণ্টার মধ্যে হটলাইন থেকে কল দেওয়া হবে।</div>`;
        chatBody.scrollTop = chatBody.scrollHeight;
    }, 600);
}
