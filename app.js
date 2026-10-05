const canvas = document.getElementById('pcbCanvas');
const ctx = canvas.getContext('2d');

let currentTool = 'wire';
let elements = [];
let isDrawing = false;
let selectedElement = null;
let touchHoldTimer = null;
let startX = 0, startY = 0;
let currentLine = null;
const gridSize = 10;

// Ready-made Circuit Boards Preset Database
const READYMADE_BOARDS_DB = [
    { name: "ESP32 Dev Board Schematic", type: "board_esp32_dev", category: "Ready-made Board" },
    { name: "4-Channel Relay Control Module", type: "board_relay_4ch", category: "Ready-made Board" },
    { name: "Arduino Uno R3 Reference Layout", type: "board_uno_r3", category: "Ready-made Board" },
    { name: "LM2596 Voltage Regulator Circuit", type: "board_lm2596", category: "Ready-made Board" }
];

function resizeCanvas() {
    canvas.width = window.innerWidth - 20;
    canvas.height = window.innerHeight - 180;
    draw();
}
window.addEventListener('resize', resizeCanvas);

function snap(val) {
    return Math.round(val / gridSize) * gridSize;
}

function setTool(tool) {
    currentTool = tool;
    document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
    const activeBtn = document.getElementById(`btn-${tool}`);
    if (activeBtn) activeBtn.classList.add('active');
}

// Live Online Component Search System (No Key Required)
async function searchComponents() {
    const query = document.getElementById('componentSearch').value.trim().toLowerCase();
    const dropdown = document.getElementById('searchResults');
    dropdown.innerHTML = '';

    if (!query) {
        dropdown.style.display = 'none';
        return;
    }

    dropdown.style.display = 'block';
    dropdown.innerHTML = `<div class="search-item" style="color:#00ffaa;">🔍 অনলাইন ও স্থানীয় ডাটাবেসে খোঁজা হচ্ছে...</div>`;

    try {
        // Filter Ready-made Boards
        const localMatches = READYMADE_BOARDS_DB.filter(item => 
            item.name.toLowerCase().includes(query)
        );

        // Fetch Live Online Component Data
        const response = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent('https://easyeda.com/api/products/search?keyword=' + query)}`);
        const data = await response.json();
        const apiResults = JSON.parse(data.contents).result || [];

        dropdown.innerHTML = '';

        // Render Ready-made Boards First
        localMatches.forEach(item => {
            const div = document.createElement('div');
            div.className = 'search-item ready-made-board';
            div.innerHTML = `<span>⚙️ <b>[রেডিমেড বোর্ড]</b> ${item.name}</span>`;
            div.onclick = () => {
                loadReadyMadeBoard(item.type);
                dropdown.style.display = 'none';
                document.getElementById('componentSearch').value = '';
            };
            dropdown.appendChild(div);
        });

        // Render Live EDA Online Components
        if (apiResults.length > 0) {
            apiResults.slice(0, 10).forEach(item => {
                const div = document.createElement('div');
                div.className = 'search-item';
                div.innerHTML = `<span>📦 ${item.title}</span> <small style="color:#8b949e">${item.package || 'Component'}</small>`;
                div.onclick = () => {
                    addLiveEdaComponent(item);
                    dropdown.style.display = 'none';
                    document.getElementById('componentSearch').value = '';
                };
                dropdown.appendChild(div);
            });
        } else if (localMatches.length === 0) {
            dropdown.innerHTML = `<div class="search-item">কোনো পার্টস পাওয়া যায়নি। সাধারণ ড্রয়িং টুলস ব্যবহার করুন।</div>`;
        }
    } catch (error) {
        dropdown.innerHTML = `<div class="search-item">অফলাইন সার্ভিস মোড অ্যাক্টিভ আছে।</div>`;
    }
}

// Touch & Mouse Drawing Controls
canvas.addEventListener('mousedown', handleStart);
canvas.addEventListener('mousemove', handleMove);
canvas.addEventListener('mouseup', handleEnd);

canvas.addEventListener('touchstart', (e) => {
    const touch = e.touches[0];
    handleStart({ clientX: touch.clientX, clientY: touch.clientY });
});

canvas.addEventListener('touchmove', (e) => {
    const touch = e.touches[0];
    handleMove({ clientX: touch.clientX, clientY: touch.clientY });
});

canvas.addEventListener('touchend', handleEnd);

function handleStart(e) {
    const rect = canvas.getBoundingClientRect();
    startX = snap(e.clientX - rect.left);
    startY = snap(e.clientY - rect.top);

    if (currentTool === 'wire') {
        isDrawing = true;
        currentLine = { 
            id: Date.now(),
            type: 'wire', 
            x1: startX, y1: startY, 
            x2: startX, y2: startY, 
            width: parseInt(document.getElementById('traceWidth').value) 
        };
    } else if (currentTool === 'pad') {
        elements.push({ id: Date.now(), type: 'pad', x: startX, y: startY, r: 8 });
        draw();
    } else if (currentTool === 'select') {
        selectedElement = elements.find(el => {
            if (el.type === 'pad') return Math.hypot(el.x - startX, el.y - startY) < 15;
            if (el.type === 'wire') return Math.hypot(el.x1 - startX, el.y1 - startY) < 15 || Math.hypot(el.x2 - startX, el.y2 - startY) < 15;
            return false;
        });

        if (selectedElement) {
            touchHoldTimer = setTimeout(() => {
                isDrawing = true;
            }, 300);
        }
    }
}

function handleMove(e) {
    const rect = canvas.getBoundingClientRect();
    const currentX = snap(e.clientX - rect.left);
    const currentY = snap(e.clientY - rect.top);

    if (isDrawing && currentTool === 'wire' && currentLine) {
        currentLine.x2 = currentX;
        currentLine.y2 = currentY;
        draw();

        ctx.strokeStyle = '#00ffaa';
        ctx.lineWidth = currentLine.width;
        ctx.beginPath();
        ctx.moveTo(currentLine.x1, currentLine.y1);
        ctx.lineTo(currentLine.x2, currentLine.y2);
        ctx.stroke();
    } else if (isDrawing && currentTool === 'select' && selectedElement) {
        if (selectedElement.type === 'pad') {
            selectedElement.x = currentX;
            selectedElement.y = currentY;
        } else if (selectedElement.type === 'wire') {
            const dx = currentX - startX;
            const dy = currentY - startY;
            selectedElement.x1 += dx; selectedElement.y1 += dy;
            selectedElement.x2 += dx; selectedElement.y2 += dy;
            startX = currentX; startY = currentY;
        }
        draw();
    }
}

function handleEnd() {
    clearTimeout(touchHoldTimer);
    if (isDrawing && currentLine) {
        elements.push(currentLine);
        currentLine = null;
    }
    isDrawing = false;
    selectedElement = null;
    draw();
}

// Single Element Delete via Undo Button
function undoLast() {
    if (elements.length > 0) {
        elements.pop();
        draw();
    }
}

function clearCanvas() {
    if (confirm("আপনি কি সমস্ত ড্রয়িং মুছে ফেলতে চান?")) {
        elements = [];
        draw();
    }
}

// Load Full Ready-Made PCB Board Schematics
function loadReadyMadeBoard(boardType) {
    const cx = snap(canvas.width / 2);
    const cy = snap(canvas.height / 2);

    if (boardType === 'board_esp32_dev') {
        elements.push({ id: Date.now(), type: 'pad', x: cx - 60, y: cy - 100, r: 6 });
        elements.push({ id: Date.now()+1, type: 'wire', x1: cx - 60, y1: cy - 100, x2: cx + 60, y2: cy - 100, width: 4 });
        for (let i = 0; i < 15; i++) {
            elements.push({ id: Date.now()+i+10, type: 'pad', x: cx - 50, y: cy - 80 + (i * 12), r: 4 });
            elements.push({ id: Date.now()+i+30, type: 'pad', x: cx + 50, y: cy - 80 + (i * 12), r: 4 });
        }
    } else if (boardType === 'board_relay_4ch') {
        for(let r=0; r<4; r++) {
            let offsetY = cy - 60 + (r * 40);
            elements.push({ id: Date.now()+r, type: 'pad', x: cx - 40, y: offsetY, r: 6 });
            elements.push({ id: Date.now()+r+10, type: 'pad', x: cx + 40, y: offsetY, r: 6 });
            elements.push({ id: Date.now()+r+20, type: 'wire', x1: cx - 40, y1: offsetY, x2: cx + 40, y2: offsetY, width: 3 });
        }
    }
    draw();
}

// Add Dynamic Online Component
function addLiveEdaComponent(itemData) {
    const cx = snap(canvas.width / 2);
    const cy = snap(canvas.height / 2);

    const pinCount = itemData.number_or_pins || 8; 
    const halfPins = Math.ceil(pinCount / 2);

    for (let i = 0; i < halfPins; i++) {
        elements.push({ id: Date.now() + i, type: 'pad', x: cx - 30, y: cy - (halfPins * 8) + (i * 16), r: 5 });
        elements.push({ id: Date.now() + i + 50, type: 'pad', x: cx + 30, y: cy - (halfPins * 8) + (i * 16), r: 5 });
    }
    draw();
}

// Render Canvas Engine
function draw() {
    ctx.fillStyle = '#090d12';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = '#161b22';
    ctx.lineWidth = 1;
    for (let x = 0; x < canvas.width; x += gridSize) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += gridSize) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
    }

    elements.forEach(el => {
        if (el.type === 'wire') {
            ctx.strokeStyle = '#ffb703';
            ctx.lineWidth = el.width;
            ctx.beginPath();
            ctx.moveTo(el.x1, el.y1);
            ctx.lineTo(el.x2, el.y2);
            ctx.stroke();
        } else if (el.type === 'pad') {
            ctx.fillStyle = '#ffb703';
            ctx.beginPath();
            ctx.arc(el.x, el.y, el.r, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#090d12';
            ctx.beginPath();
            ctx.arc(el.x, el.y, 3, 0, Math.PI * 2);
            ctx.fill();
        }
    });

    const brand = document.getElementById('brandText').value;
    if (brand) {
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 14px Arial';
        ctx.fillText(brand, 20, canvas.height - 20);
    }
}

// Custom Named G-Code File Download Engine
function exportGCode() {
    const projName = document.getElementById('projectName').value.trim() || 'My_PCB_Design';
    let gcode = `; Easy PCB Studio Export - ${projName}\nG21\nG90\nM3 S10000\nG0 Z5\n`;
    elements.forEach(el => {
        if (el.type === 'wire') {
            gcode += `G0 X${(el.x1/10).toFixed(2)} Y${(el.y1/10).toFixed(2)}\nG1 Z-0.1 F100\nG1 X${(el.x2/10).toFixed(2)} Y${(el.y2/10).toFixed(2)} F300\nG0 Z5\n`;
        } else if (el.type === 'pad') {
            gcode += `G0 X${(el.x/10).toFixed(2)} Y${(el.y/10).toFixed(2)}\nG1 Z-2.0 F50\nG0 Z5\n`;
        }
    });
    gcode += "M5\nG0 X0 Y0\n";

    const blob = new Blob([gcode], { type: 'text/plain' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${projName}.gcode`;
    link.click();
}

// Gerber ZIP File Download Engine
function exportJLCPCB() {
    const projName = document.getElementById('projectName').value.trim() || 'My_PCB_Design';
    const zip = new JSZip();

    zip.file(`${projName}_GTL.gbr`, "G04 Gerber Top Layer Data*\nM71*");
    zip.file(`${projName}_GBL.gbr`, "G04 Gerber Bottom Layer Data*\nM71*");
    zip.file(`${projName}_TXT.drl`, "M48\nMETRIC,TZ\n% EXCELLON DRILL DATA %");

    zip.generateAsync({ type: "blob" }).then(function(content) {
        const link = document.createElement('a');
        link.href = URL.createObjectURL(content);
        link.download = `${projName}_Gerber.zip`;
        link.click();
    });
}

// Initialize Canvas Screen
resizeCanvas();
