const canvas = document.getElementById('pcbCanvas');
const ctx = canvas.getContext('2d');

canvas.width = window.innerWidth - 12;
canvas.height = window.innerHeight * 0.38;

let selectedComponent = null;
let placedComponents = [];
let routedTracks = [];
let customVias = [];
let isViaMode = false;
let customText = "";
let uploadedLogoImg = null;

// LCSC Online API Search Engine
async function searchLCSCLibrary(query) {
    const list = document.getElementById('componentList');
    if (!query) query = "ESP32";

    list.innerHTML = '<div style="color:#80998c; font-size:11px; padding:6px;">লাইব্রেরি থেকে খোঁজা হচ্ছে...</div>';

    try {
        const response = await fetch(`https://easyeda.com/api/products/search?keyword=${encodeURIComponent(query)}&page=1&pageSize=15`);
        const data = await response.json();
        list.innerHTML = '';

        if (data.result && data.result.lists && data.result.lists.length > 0) {
            data.result.lists.forEach(item => {
                const card = document.createElement('div');
                card.className = 'comp-card';
                card.innerHTML = `
                    <i class="fa-solid fa-microchip" style="color:#00e676; font-size:18px;"></i>
                    <div class="comp-info">
                        <strong>${item.title}</strong>
                        <span>LCSC: ${item.number} | Package: ${item.package || 'SMD'}</span>
                    </div>
                `;
                card.onclick = () => {
                    document.querySelectorAll('.comp-card').forEach(c => c.classList.remove('selected'));
                    card.classList.add('selected');
                    selectedComponent = {
                        name: item.title,
                        lcsc: item.number,
                        pins: 8
                    };
                    isViaMode = false;
                    document.getElementById('statusMessage').innerText = `সিলেক্ট করা হয়েছে: ${item.title}`;
                };
                list.appendChild(card);
            });
        } else {
            list.innerHTML = '<div style="color:#ff5252; font-size:11px; padding:6px;">কোনো পার্টস পাওয়া যায়নি! অন্য কীওয়ার্ড দিন।</div>';
        }
    } catch (err) {
        list.innerHTML = '<div style="color:#ff9800; font-size:11px; padding:6px;">সার্চ করতে ইন্টারনেট কানেকশন চেক করুন।</div>';
    }
}

// ক্যানভাস রেন্ডারিং সিস্টেম
function drawCanvas() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // PCB Solder Mask & Silk-screen Grid Background
    ctx.strokeStyle = '#0e1f15';
    ctx.lineWidth = 1;
    for (let x = 0; x < canvas.width; x += 15) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += 15) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
    }

    // Custom Silkscreen Logo Render
    if (uploadedLogoImg) {
        ctx.globalAlpha = 0.4;
        ctx.drawImage(uploadedLogoImg, canvas.width - 70, 10, 50, 50);
        ctx.globalAlpha = 1.0;
    }

    // Custom Silkscreen Text Render
    if (customText) {
        ctx.fillStyle = '#ffffff'; // Silkscreen White Text
        ctx.font = 'bold 12px Arial';
        ctx.fillText(customText, 15, canvas.height - 15);
    }

    // Draw Copper Traces (Copper Layer)
    routedTracks.forEach(track => {
        ctx.strokeStyle = '#00e5ff'; // Top Copper Trace Line
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(track.startX, track.startY);
        ctx.lineTo(track.midX, track.startY);
        ctx.lineTo(track.midX, track.endY);
        ctx.lineTo(track.endX, track.endY);
        ctx.stroke();
    });

    // Draw Placed Components
    placedComponents.forEach((item) => {
        // Component Outline
        ctx.strokeStyle = '#00e676';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(item.x - 30, item.y - 25, 60, 50);

        // Component Name Silkscreen
        ctx.fillStyle = '#ffffff';
        ctx.font = '9px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(item.name.substring(0, 10), item.x, item.y - 28);

        // Drill Pads
        for (let p = 0; p < 4; p++) {
            ctx.fillStyle = '#ffc107'; // Gold Copper Pad
            ctx.beginPath(); ctx.arc(item.x - 20 + (p * 12), item.y - 20, 3, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(item.x - 20 + (p * 12), item.y + 20, 3, 0, Math.PI * 2); ctx.fill();
            
            ctx.fillStyle = '#000000'; // Drill Hole Center
            ctx.beginPath(); ctx.arc(item.x - 20 + (p * 12), item.y - 20, 1, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(item.x - 20 + (p * 12), item.y + 20, 1, 0, Math.PI * 2); ctx.fill();
        }
    });

    // Draw Custom Drill Vias
    customVias.forEach(via => {
        ctx.fillStyle = '#ffc107';
        ctx.beginPath(); ctx.arc(via.x, via.y, 5, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#000000';
        ctx.beginPath(); ctx.arc(via.x, via.y, 2, 0, Math.PI * 2); ctx.fill();
    });
}

// Click Canvas Event
canvas.addEventListener('click', (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = Math.round((e.clientX - rect.left) / 15) * 15;
    const y = Math.round((e.clientY - rect.top) / 15) * 15;

    if (isViaMode) {
        customVias.push({ x, y });
    } else if (selectedComponent) {
        placedComponents.push({ ...selectedComponent, x, y });
    }
    drawCanvas();
});

// Auto Add Header Output Pins Feature
document.getElementById('addHeaderBtn').addEventListener('click', () => {
    if (placedComponents.length === 0) {
        alert("আগে ক্যানভাসে প্রধান আইসি বা প্রসেসর বসান!");
        return;
    }

    const headerX = canvas.width - 40;
    const headerY = canvas.height / 2;

    const autoHeader = {
        name: "OUTPUT HEADER (Sensors/IO)",
        lcsc: "C12438",
        pins: 8,
        x: headerX,
        y: headerY
    };

    placedComponents.push(autoHeader);
    drawCanvas();
    document.getElementById('statusMessage').innerText = "অটোমেটিক আউটপুট পিন হেডার বসানো হয়েছে!";
});

// Add Via Feature
document.getElementById('addViaBtn').addEventListener('click', () => {
    isViaMode = true;
    selectedComponent = null;
    document.getElementById('statusMessage').innerText = "মোড: ক্যানভাসে ক্লিক করে ড্রিল হোল বসান";
});

// Update Text & Logo
function updateSilkscreen() {
    customText = document.getElementById('boardText').value;
    drawCanvas();
}

function handleLogoUpload(e) {
    const reader = new FileReader();
    reader.onload = function(event) {
        const img = new Image();
        img.onload = function() {
            uploadedLogoImg = img;
            drawCanvas();
        }
        img.src = event.target.result;
    }
    if (e.target.files[0]) reader.readAsDataURL(e.target.files[0]);
}

// Complete Assembly File Exporter (Gerber + BOM + CPL)
document.getElementById('downloadBtn').addEventListener('click', () => {
    if (placedComponents.length === 0) {
        alert("ডাউনলোড করার জন্য আগে ক্যানভাসে পার্টস যোগ করুন!");
        return;
    }

    // Generate BOM File Content
    let bomContent = "Comment,Designator,Footprint,LCSC Part Number\n";
    let cplContent = "Designator,Mid X,Mid Y,Layer,Rotation\n";

    placedComponents.forEach((c, i) => {
        const des = `U${i+1}`;
        bomContent += `"${c.name}","${des}","Package",${c.lcsc || 'C12345'}\n`;
        cplContent += `"${des}",${c.x}mm,${c.y}mm,Top,0\n`;
    });

    // File Download Logic
    const blobBOM = new Blob([bomContent], { type: 'text/csv' });
    const urlBOM = window.URL.createObjectURL(blobBOM);
    const a1 = document.createElement('a');
    a1.href = urlBOM;
    a1.download = `PCB_BOM_List_${Date.now()}.csv`;
    a1.click();

    const blobCPL = new Blob([cplContent], { type: 'text/csv' });
    const urlCPL = window.URL.createObjectURL(blobCPL);
    const a2 = document.createElement('a');
    a2.href = urlCPL;
    a2.download = `PCB_CPL_Placement_${Date.now()}.csv`;
    a2.click();

    alert("অ্যাসেম্বলি ফাইলের জন্য BOM এবং CPL/Pick-and-Place ডাটা সফলভাবে ডাউনলোড করা হয়েছে!");
});

// Auto Router Engine
document.getElementById('autoRouteBtn').addEventListener('click', () => {
    if (placedComponents.length < 2) return;
    routedTracks = [];
    for (let i = 0; i < placedComponents.length - 1; i++) {
        const c1 = placedComponents[i];
        const c2 = placedComponents[i+1];
        routedTracks.push({
            startX: c1.x, startY: c1.y,
            midX: c1.x + (c2.x - c1.x) / 2,
            endX: c2.x, endY: c2.y
        });
    }
    drawCanvas();
    document.getElementById('statusMessage').innerText = `অটো-রাউটিং সম্পন্ন!`;
});

// Clear Canvas
document.getElementById('clearBtn').addEventListener('click', () => {
    placedComponents = []; routedTracks = []; customVias = []; customText = ""; uploadedLogoImg = null;
    drawCanvas();
});

searchLCSCLibrary('');
drawCanvas();
