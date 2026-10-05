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

// =========================================================
// EASYEDA STYLE COMPONENT & CIRCUIT SYSTEM DATABASE (OFFLINE)
// =========================================================
const EASYEDA_MASTER_LIBRARY = [
    // --- CATEGORY 1: SYSTEM CIRCUITS / MODULES (সার্কিট ডিজাইন) ---
    { name: "ESP32 DevKit V1 Module Circuit", type: "esp32_board", category: "Circuit", pins: 30 },
    { name: "Arduino Uno R3 Schematic Board", type: "arduino_uno", category: "Circuit", pins: 28 },
    { name: "4-Channel Relay Control Board", type: "relay_4ch_board", category: "Circuit", pins: 8 },
    { name: "LM2596 DC-DC Buck Converter Circuit", type: "lm2596_board", category: "Circuit", pins: 4 },
    { name: "TP4056 LiPo Battery Charger Circuit", type: "tp4056_board", category: "Circuit", pins: 4 },
    { name: "L298N Motor Driver Module Circuit", type: "l298n_board", category: "Circuit", pins: 10 },

    // --- CATEGORY 2: COMPONENTS & ICs (কম্পোনেন্টস) ---
    // Microcontrollers & ICs
    { name: "ESP32-WROOM-32 Pinout", type: "ic30", category: "Component", pins: 30 },
    { name: "ESP8266 ESP-12F IC", type: "ic16", category: "Component", pins: 16 },
    { name: "ATmega328P-PU DIP-28", type: "ic28", category: "Component", pins: 28 },
    { name: "ATTiny85 DIP-8", type: "ic8", category: "Component", pins: 8 },
    { name: "NE555 Timer IC", type: "ic8", category: "Component", pins: 8 },
    { name: "LM358 Op-Amp IC", type: "ic8", category: "Component", pins: 8 },
    { name: "L7805 Voltage Regulator", type: "ic3", category: "Component", pins: 3 },
    
    // Displays & Sensors
    { name: "0.96 OLED Display I2C (128x64)", type: "display4", category: "Component", pins: 4 },
    { name: "LCD 1602 I2C Display Module", type: "display4", category: "Component", pins: 4 },
    { name: "HC-SR04 Ultrasonic Sensor", type: "sensor4", category: "Component", pins: 4 },
    { name: "DHT11 Temp & Humidity Sensor", type: "sensor4", category: "Component", pins: 4 },
    { name: "MPU6050 Gyro Sensor", type: "sensor8", category: "Component", pins: 8 },
    
    // Passives & Semiconductors
    { name: "Resistor (AXIAL / SMD)", type: "passive2", category: "Component", pins: 2 },
    { name: "Capacitor Ceramic/Radial", type: "passive2", category: "Component", pins: 2 },
    { name: "LED 5mm Red/Green/Blue", type: "passive2", category: "Component", pins: 2 },
    { name: "Diode 1N4007 / 1N4148", type: "passive2", category: "Component", pins: 2 },
    { name: "NPN Transistor BC547 / 2N2222", type: "ic3", category: "Component", pins: 3 },
    { name: "Mosfet IRFZ44N / N-Channel", type: "ic3", category: "Component", pins: 3 }
];

// Combine Saved Local Designs with Built-in Library
function getCombinedLibrary() {
    const customSaved = JSON.parse(localStorage.getItem('my_custom_pcb_components') || '[]');
    return [...customSaved, ...EASYEDA_MASTER_LIBRARY];
}

// Screen Resize Handler
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

// =========================================================
// INSTANT SEARCH ENGINE (NO API / NO CORS ISSUES)
// =========================================================
function searchComponents() {
    const query = document.getElementById('componentSearch').value.trim().toLowerCase();
    const dropdown = document.getElementById('searchResults');
    dropdown.innerHTML = '';

    if (!query) {
        dropdown.style.display = 'none';
        return;
    }

    const library = getCombinedLibrary();
    // Fast Filter Logic
    const filtered = library.filter(item => 
        item.name.toLowerCase().includes(query) || 
        item.category.toLowerCase().includes(query)
    );

    if (filtered.length > 0) {
        dropdown.style.display = 'block';
        filtered.slice(0, 15).forEach(item => {
            const div = document.createElement('div');
            
            // Differentiate Category Styles like EasyEDA
            let tagColor = item.category === 'Circuit' ? '#00a8ff' : '#00ffaa';
            if(item.isCustom) tagColor = '#ffb703';

            div.className = 'search-item';
            div.innerHTML = `
                <span><b>[${item.category}]</b> ${item.name}</span>
                <small style="color:${tagColor}">${item.isCustom ? 'Custom' : item.pins ? item.pins + ' Pins' : ''}</small>
            `;
            
            div.onclick = () => {
                if (item.isCustom) {
                    loadCustomCircuit(item.elements);
                } else {
                    renderComponentFootprint(item.type, item.pins);
                }
                dropdown.style.display = 'none';
                document.getElementById('componentSearch').value = '';
            };
            dropdown.appendChild(div);
        });
    } else {
        dropdown.style.display = 'block';
        dropdown.innerHTML = `<div class="search-item" style="color:#e63946;">❌ কোনো কম্পোনেন্ট বা সার্কিট পাওয়া যায়নি</div>`;
    }
}

// =========================================================
// CUSTOM CIRCUIT SAVE TO LIBRARY (PERSISTENT STORAGE)
// =========================================================
function saveDesignToLibrary() {
    if (elements.length === 0) {
        alert("ক্যানভাসে কোনো ডিজাইন বা সার্কিট নেই!");
        return;
    }

    const designName = prompt("সার্কিট বা মডিউলটির একটি নাম দিন:", "My_Custom_Circuit");
    if (!designName) return;

    const customSaved = JSON.parse(localStorage.getItem('my_custom_pcb_components') || '[]');
    const newComponent = {
        name: designName,
        type: 'custom_' + Date.now(),
        category: "Circuit",
        isCustom: true,
        elements: JSON.parse(JSON.stringify(elements))
    };

    customSaved.unshift(newComponent);
    localStorage.setItem('my_custom_pcb_components', JSON.stringify(customSaved));
    alert(`"${designName}" সফলভাবে লাইব্রেরিতে যুক্ত হয়েছে!`);
}

function loadCustomCircuit(savedElements) {
    const cx = snap(canvas.width / 2);
    const cy = snap(canvas.height / 2);
    
    savedElements.forEach(el => {
        let cloned = { ...el, id: Date.now() + Math.random() };
        if (cloned.type === 'pad') {
            cloned.x += (cx - 100);
            cloned.y += (cy - 100);
        } else if (cloned.type === 'wire') {
            cloned.x1 += (cx - 100);
            cloned.y1 += (cy - 100);
            cloned.x2 += (cx - 100);
            cloned.y2 += (cy - 100);
        }
        elements.push(cloned);
    });
    draw();
}

// Canvas Touch & Mouse Drawing Handlers
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

// Dynamic Component & Board Layout Renderer Engine
function renderComponentFootprint(type, pins = 2) {
    const cx = snap(canvas.width / 2);
    const cy = snap(canvas.height / 2);

    if (type === 'passive2') {
        elements.push({ id: Date.now(), type: 'pad', x: cx - 20, y: cy, r: 6 });
        elements.push({ id: Date.now()+1, type: 'pad', x: cx + 20, y: cy, r: 6 });
        elements.push({ id: Date.now()+2, type: 'wire', x1: cx - 20, y1: cy, x2: cx + 20, y2: cy, width: 2 });
    } else if (type === 'ic3') {
        for(let i=0; i<3; i++) {
            elements.push({ id: Date.now()+i, type: 'pad', x: cx - 20 + (i * 20), y: cy, r: 6 });
        }
    } else if (type === 'display4' || type === 'sensor4') {
        for(let i=0; i<4; i++) {
            elements.push({ id: Date.now()+i, type: 'pad', x: cx - 30 + (i * 20), y: cy, r: 6 });
        }
    } else if (type === 'esp32_board') {
        for (let i = 0; i < 15; i++) {
            elements.push({ id: Date.now()+i, type: 'pad', x: cx - 50, y: cy - 140 + (i * 20), r: 5 });
            elements.push({ id: Date.now()+i+20, type: 'pad', x: cx + 50, y: cy - 140 + (i * 20), r: 5 });
        }
        elements.push({ id: Date.now()+50, type: 'wire', x1: cx - 50, y1: cy - 140, x2: cx + 50, y2: cy - 140, width: 2 });
    } else if (type === 'relay_4ch_board') {
        for(let r=0; r<4; r++) {
            let offsetY = cy - 60 + (r * 40);
            elements.push({ id: Date.now()+r, type: 'pad', x: cx - 40, y: offsetY, r: 6 });
            elements.push({ id: Date.now()+r+10, type: 'pad', x: cx + 40, y: offsetY, r: 6 });
            elements.push({ id: Date.now()+r+20, type: 'wire', x1: cx - 40, y1: offsetY, x2: cx + 40, y2: offsetY, width: 3 });
        }
    } else {
        // Generic DIP IC (Dual Inline Pin) Calculation Engine
        const halfPins = Math.ceil(pins / 2);
        for (let i = 0; i < halfPins; i++) {
            elements.push({ id: Date.now() + i, type: 'pad', x: cx - 30, y: cy - (halfPins * 10) + (i * 20), r: 5 });
            elements.push({ id: Date.now() + i + 50, type: 'pad', x: cx + 30, y: cy - (halfPins * 10) + (i * 20), r: 5 });
        }
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

// Export G-Code Engine
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

// Gerber ZIP File Engine
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

// Initialize Screen
resizeCanvas();
