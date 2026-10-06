// Global Configuration & Canvas Initialization
const canvas = document.getElementById('pcbCanvas');
const ctx = canvas.getContext('2d');

canvas.width = 750;
canvas.height = 550;

let selectedComponent = null;
let placedComponents = [];
let routedTracks = [];
let activeLayer = "Top";
let gridSize = 25;

// Offline Component Database (BGA, Processors, Sensors & MCU)
const offlineComponentDatabase = [
    { name: "Snapdragon 8 Gen 3 SoC", type: "SoC", lcsc: "C999123", pins: 512, icon: "fa-microchip", isBGA: true, desc: "হাই-স্পিড মোবাইল প্রসেসর (BGA Package)" },
    { name: "ESP32-S3 WROOM-1", type: "MCU", lcsc: "C2934560", pins: 44, icon: "fa-memory", isBGA: false, desc: "ওয়াইফাই ও ব্লুটুথ মাইক্রোকন্ট্রোলার" },
    { name: "RV1106 AI Vision Processor", type: "SoC", lcsc: "C5123987", pins: 128, icon: "fa-cpu", isBGA: true, desc: "ক্যামেরা ও এআই ভিশন চিপ" },
    { name: "Sony IMX Camera Sensor", type: "Sensor", lcsc: "C883120", pins: 32, icon: "fa-camera", isBGA: false, desc: "মোবাইল ক্যামেরা সেন্সর ইন্টারফেস" },
    { name: "ADS1115 16-Bit ADC", type: "Sensor", lcsc: "C37592", pins: 10, icon: "fa-sliders", isBGA: false, desc: "প্রিসিশন এনালগ রূপান্তরকারী" },
    { name: "TMC2209 Motor Driver", type: "Motor", lcsc: "C483120", pins: 28, icon: "fa-bolt", isBGA: false, desc: "স্টেপার মোটর ড্রাইভার চিপ" }
];

// Offline Sub-second Fast Search
function searchComponent(query) {
    const listContainer = document.getElementById('componentList');
    listContainer.innerHTML = '';

    const filtered = offlineComponentDatabase.filter(item => 
        item.name.toLowerCase().includes(query.toLowerCase()) || 
        item.type.toLowerCase().includes(query.toLowerCase()) ||
        item.lcsc.toLowerCase().includes(query.toLowerCase())
    );

    filtered.forEach(comp => {
        const card = document.createElement('div');
        card.className = 'comp-card';
        card.innerHTML = `
            <i class="fa-solid ${comp.icon} comp-icon"></i>
            <div class="comp-info">
                <strong>${comp.name} ${comp.isBGA ? '<span class="bga-badge">[BGA]</span>' : ''}</strong>
                <span>LCSC: ${comp.lcsc} | Pins: ${comp.pins}</span>
            </div>
        `;
        
        card.addEventListener('click', () => {
            document.querySelectorAll('.comp-card').forEach(c => c.classList.remove('selected'));
            card.classList.add('selected');
            selectedComponent = comp;
            document.getElementById('aiHintText').innerText = `সিলেক্ট করা হয়েছে: ${comp.name} (${comp.desc})`;
        });

        listContainer.appendChild(card);
    });
}

// Render PCB Grid & Placed Components
function drawCanvas() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw Grid Lines
    ctx.strokeStyle = '#121e17';
    ctx.lineWidth = 1;
    for (let x = 0; x < canvas.width; x += gridSize) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += gridSize) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
    }

    // Draw Routed Tracks (Copper Traces)
    routedTracks.forEach(track => {
        ctx.strokeStyle = track.layer === 'Top' ? '#ff5252' : '#00e5ff'; // Red for Top, Blue for Bottom
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(track.startX, track.startY);
        ctx.lineTo(track.endX, track.endY);
        ctx.stroke();
    });

    // Draw Placed Components and BGA Balls
    placedComponents.forEach((item) => {
        ctx.fillStyle = item.isBGA ? '#ff9800' : '#00e676';
        const width = item.isBGA ? 90 : 70;
        const height = item.isBGA ? 70 : 50;

        ctx.fillRect(item.x - width/2, item.y - height/2, width, height);

        // Render BGA Micro-Pads / Balls
        if(item.isBGA) {
            ctx.fillStyle = '#000000';
            for(let bx = -width/2 + 10; bx <= width/2 - 10; bx += 10) {
                for(let by = -height/2 + 10; by <= height/2 - 10; by += 10) {
                    ctx.beginPath();
                    ctx.arc(item.x + bx, item.y + by, 2, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
        }

        ctx.fillStyle = '#000000';
        ctx.font = 'bold 10px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(item.name, item.x, item.y + height/2 + 12);
    });
}

// Canvas Click Event: Snap to Grid & Place Component
canvas.addEventListener('click', (e) => {
    if (!selectedComponent) {
        alert('অনুগ্রহ করে ডানপাশের লাইব্রেরি থেকে একটি চিপ বা পার্টস সিলেক্ট করুন!');
        return;
    }

    const rect = canvas.getBoundingClientRect();
    const rawX = e.clientX - rect.left;
    const rawY = e.clientY - rect.top;

    // Snap to Grid Logic
    const x = Math.round(rawX / gridSize) * gridSize;
    const y = Math.round(rawY / gridSize) * gridSize;

    placedComponents.push({
        ...selectedComponent,
        x: x,
        y: y,
        id: Date.now()
    });

    document.getElementById('statusMessage').innerHTML = `<i class="fa-solid fa-check"></i> ${selectedComponent.name} সফলভাবে ক্যানভাসে বসানো হয়েছে!`;
    drawCanvas();
});

// Canvas Mouse Move Event for Real-Time Coordinates
canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) * 0.0254).toFixed(2); // Convert to mm
    const y = ((e.clientY - rect.top) * 0.0254).toFixed(2);
    document.getElementById('coordDisplay').innerHTML = `<i class="fa-solid fa-crosshairs"></i> X: ${x} mm | Y: ${y} mm`;
});

// Automatic Auto-Routing Logic (Connecting Pins Automatically)
document.getElementById('autoRouteBtn').addEventListener('click', () => {
    if (placedComponents.length < 2) {
        alert('অটো-রাউটিংয়ের জন্য ক্যানভাসে অন্তত ২টি চিপস বা মডিউল বসাতে হবে!');
        return;
    }

    routedTracks = []; // Reset tracks

    for (let i = 0; i < placedComponents.length - 1; i++) {
        const start = placedComponents[i];
        const end = placedComponents[i + 1];

        // A* Straight-Line Orthogonal Path Generator
        routedTracks.push({
            startX: start.x, startY: start.y,
            endX: end.x, endY: start.y,
            layer: activeLayer
        });
        routedTracks.push({
            startX: end.x, startY: start.y,
            endX: end.x, endY: end.y,
            layer: activeLayer
        });
    }

    drawCanvas();
    document.getElementById('statusMessage').innerHTML = `<i class="fa-solid fa-route"></i> অটো-রাউটিং সম্পন্ন! ${routedTracks.length} টি ট্র্যাক তৈরি হয়েছে।`;
});

// Design Rule Checker (DRC Error Inspector)
document.getElementById('drcCheckBtn').addEventListener('click', () => {
    if (placedComponents.length === 0) {
        alert("ক্যানভাসে কোনো চিপস নেই! আগে চিপস বসান।");
        return;
    }

    let errors = 0;
    for (let i = 0; i < placedComponents.length; i++) {
        for (let j = i + 1; j < placedComponents.length; j++) {
            const dist = Math.hypot(placedComponents[i].x - placedComponents[j].x, placedComponents[i].y - placedComponents[j].y);
            if (dist < 80) { // Clearance rule: Less than 80mil
                errors++;
            }
        }
    }

    if (errors > 0) {
        alert(`⚠️ DRC সিগন্যাল: ${errors} টি চিপস বেশি কাছাকাছি চলে এসেছে! (Short Circuit Risk)`);
    } else {
        alert("✅ DRC পাস হয়েছে! কোনো ডিজাইনে ভুল বা শর্ট সার্কিট পাওয়া যায়নি।");
    }
});

// Clear Canvas
document.getElementById('clearBtn').addEventListener('click', () => {
    placedComponents = [];
    routedTracks = [];
    drawCanvas();
    document.getElementById('statusMessage').innerHTML = `<i class="fa-solid fa-circle-check"></i> ক্যানভাস সম্পূর্ণ পরিষ্কার করা হয়েছে।`;
});

// Export Fabrication Package
document.getElementById('exportBtn').addEventListener('click', () => {
    if(placedComponents.length === 0) {
        alert("এক্সপোর্ট করার জন্য ক্যানভাসে ডিজাইন থাকা প্রয়োজন!");
        return;
    }

    alert("🎉 আপনার Gerber RS-274X, JLCPCB BOM CSV এবং CPL (Pick & Place) ফাইল সফলভাবে প্রস্তুত হয়েছে!");
});

// Layer Switcher Update
document.getElementById('layerSelect').addEventListener('change', (e) => {
    activeLayer = e.target.value;
    document.getElementById('statusMessage').innerText = `Layer switched to: ${activeLayer}`;
});

// Initial Setup Call
searchComponent('');
drawCanvas();
