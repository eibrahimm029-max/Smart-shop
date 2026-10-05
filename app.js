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

// ==========================================
// 1. INSTANT LOCAL COMPONENT & BOARD DATABASE
// ==========================================
const BUILTIN_LIBRARY = [
    // --- Microcontrollers & Dev Boards ---
    { name: "ESP32 NodeMCU (30-Pin)", type: "esp32", category: "Microcontroller", pins: 30 },
    { name: "ESP32-S3 WROOM Board", type: "esp32_s3", category: "Microcontroller", pins: 44 },
    { name: "ESP8266 NodeMCU V3", type: "esp8266", category: "Microcontroller", pins: 30 },
    { name: "Arduino Uno R3 DIP", type: "arduino_uno", category: "Microcontroller", pins: 28 },
    { name: "Arduino Nano V3 (CH340)", type: "nano", category: "Microcontroller", pins: 30 },
    { name: "Arduino Pro Mini", type: "pro_mini", category: "Microcontroller", pins: 24 },
    { name: "STM32F103C8T6 (Blue Pill)", type: "stm32", category: "Microcontroller", pins: 40 },
    { name: "Raspberry Pi Pico RP2040", type: "pico", category: "Microcontroller", pins: 40 },
    { name: "ATmega328P DIP-28 IC", type: "ic28", category: "IC", pins: 28 },
    { name: "ATTiny85 DIP-8 IC", type: "attiny85", category: "IC", pins: 8 },

    // --- Ready-made Modules & Sensors ---
    { name: "5V Single Relay Module", type: "relay_1ch", category: "Module", pins: 3 },
    { name: "5V 2-Channel Relay Module", type: "relay_2ch", category: "Module", pins: 6 },
    { name: "5V 4-Channel Relay Module", type: "relay_4ch", category: "Module", pins: 10 },
    { name: "0.96 inch I2C OLED Display (128x64)", type: "oled", category: "Display", pins: 4 },
    { name: "16x2 LCD Display with I2C", type: "lcd1602", category: "Display", pins: 4 },
    { name: "HC-05 Bluetooth Module", type: "hc05", category: "Wireless", pins: 6 },
    { name: "HC-06 Bluetooth Module", type: "hc06", category: "Wireless", pins: 4 },
    { name: "NRF24L01 2.4GHz RF Module", type: "nrf24", category: "Wireless", pins: 8 },
    { name: "ESP8266 ESP-01 Wi-Fi Module", type: "esp01", category: "Wireless", pins: 8 },
    { name: "MPU6050 6-Axis Gyro Sensor", type: "mpu6050", category: "Sensor", pins: 8 },
    { name: "DHT11 / DHT22 Temp & Humidity", type: "dht11", category: "Sensor", pins: 4 },
    { name: "HC-SR04 Ultrasonic Sensor", type: "hcsr04", category: "Sensor", pins: 4 },
    { name: "NE555 Timer Precision IC", type: "ic8", category: "IC", pins: 8 },
    { name: "LM358 Dual Op-Amp IC", type: "ic8", category: "IC", pins: 8 },
    { name: "L298N Dual H-Bridge Motor Driver", type: "l298n", category: "Module", pins: 12 },
    { name: "A4988 Stepper Driver (CNC)", type: "a4988", category: "Module", pins: 16 },

    // --- Passives & Power Supply ---
    { name: "Resistor (SMD / Through-Hole)", type: "resistor", category: "Passive", pins: 2 },
    { name: "Capacitor Electrolytic Radial", type: "capacitor", category: "Passive", pins: 2 },
    { name: "LED 5mm (Red/Green/Blue)", type: "led", category: "Discrete", pins: 2 },
    { name: "Diode 1N4007 / 1N4148", type: "diode", category: "Discrete", pins: 2 },
    { name: "LM7805 Voltage Regulator (5V)", type: "lm7805", category: "Power", pins: 3 },
    { name: "LM2596 DC-DC Buck Converter", type: "lm2596", category: "Power", pins: 4 }
];

// Combine Local Storage Custom Circuits with Built-in Library
function getCombinedLibrary() {
    const customSaved = JSON.parse(localStorage.getItem('my_custom_pcb_components') || '[]');
    return [...customSaved, ...BUILTIN_LIBRARY];
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

// ==========================================
// 2. INSTANT SEARCH ENGINE (NO NETWORK DELAY)
// ==========================================
function searchComponents() {
    const query = document.getElementById('componentSearch').value.trim().toLowerCase();
    const dropdown = document.getElementById('searchResults');
    dropdown.innerHTML = '';

    if (!query) {
        dropdown.style.display = 'none';
        return;
    }

    const library = getCombinedLibrary();
    // Ultra-Fast Filter
    const filtered = library.filter(item => 
        item.name.toLowerCase().includes(query) || 
        item.category.toLowerCase().includes(query)
    );

    if (filtered.length > 0) {
        dropdown.style.display = 'block';
        // Max 15 Instant Results
        filtered.slice(0, 15).forEach(item => {
            const div = document.createElement('div');
            div.className = item.isCustom ? 'search-item ready-made-board' : 'search-item';
            div.innerHTML = `<span>${item.isCustom ? '⭐ [কাস্টম ডিজাইন] ' : '📦 '}${item.name}</span> <small style="color:#8b949e">${item.category}</small>`;
            div.onclick = () => {
                if (item.isCustom) {
                    loadCustomCircuit(item.elements);
                } else {
                    addComponent(item.type);
                }
                dropdown.style.display = 'none';
                document.getElementById('componentSearch').value = '';
            };
            dropdown.appendChild(div);
        });
    } else {
        dropdown.style.display = 'none';
    }
}

// ==========================================
// 3. AUTO-SAVE DESIGN TO LIBRARY FUNCTION
// ==========================================
function saveDesignToLibrary() {
    if (elements.length === 0) {
        alert("ক্যানভাসে কোনো ডিজাইন নেই! আগে কিছু আঁকুন।");
        return;
    }

    const designName = prompt("কাস্টম ডিজাইন সার্কিটের একটি নাম দিন:", "My_Custom_Circuit");
    if (!designName) return;

    const customSaved = JSON.parse(localStorage.getItem('my_custom_pcb_components') || '[]');
    const newComponent = {
        name: designName,
        type: 'custom_' + Date.now(),
        category: "Custom Board",
        isCustom: true,
        elements: JSON.parse(JSON.stringify(elements)) // Clone Current Canvas Elements
    };

    customSaved.unshift(newComponent); // Insert at Top
    localStorage.setItem('my_custom_pcb_components', JSON.stringify(customSaved));
    alert(`"${designName}" কাস্টম লাইব্রেরিতে সেভ হয়েছে! এখন থেকে সার্চ করলেই পেয়ে যাবেন।`);
}

function loadCustomCircuit(savedElements) {
    const cx = snap(canvas.width / 2);
    const cy = snap(canvas.height / 2);
    
    // Offset design to center of screen
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

// Component Footprint Placement Logic
function addComponent(type) {
    const cx = snap(canvas.width / 2);
    const cy = snap(canvas.height / 2);

    if (type === 'resistor' || type === 'capacitor' || type === 'led' || type === 'diode') {
        elements.push({ id: Date.now(), type: 'pad', x: cx - 20, y: cy, r: 6 });
        elements.push({ id: Date.now()+1, type: 'pad', x: cx + 20, y: cy, r: 6 });
        elements.push({ id: Date.now()+2, type: 'wire', x1: cx - 20, y1: cy, x2: cx + 20, y2: cy, width: 2 });
    } else if (type === 'ic8' || type === 'attiny85') {
        for (let i = 0; i < 4; i++) {
            elements.push({ id: Date.now()+i, type: 'pad', x: cx - 20, y: cy - 30 + (i * 20), r: 6 });
            elements.push({ id: Date.now()+i+10, type: 'pad', x: cx + 20, y: cy - 30 + (i * 20), r: 6 });
        }
    } else if (type === 'esp32' || type === 'nano' || type === 'pico' || type === 'stm32' || type === 'esp8266') {
        for (let i = 0; i < 15; i++) {
            elements.push({ id: Date.now()+i, type: 'pad', x: cx - 40, y: cy - 140 + (i * 20), r: 5 });
            elements.push({ id: Date.now()+i+20, type: 'pad', x: cx + 40, y: cy - 140 + (i * 20), r: 5 });
        }
    } else if (type === 'oled' || type === 'lcd1602' || type === 'hcsr04' || type === 'dht11') {
        for (let i = 0; i < 4; i++) {
            elements.push({ id: Date.now()+i, type: 'pad', x: cx - 30 + (i * 20), y: cy, r: 6 });
        }
    } else if (type === 'relay_1ch' || type === 'hc05' || type === 'lm7805') {
        for (let i = 0; i < 3; i++) {
            elements.push({ id: Date.now()+i, type: 'pad', x: cx - 20 + (i * 20), r: 6 });
        }
    } else {
        // Generic IC Layout fallback
        for (let i = 0; i < 6; i++) {
            elements.push({ id: Date.now()+i, type: 'pad', x: cx - 30, y: cy - 50 + (i * 20), r: 5 });
            elements.push({ id: Date.now()+i+10, type: 'pad', x: cx + 30, y: cy - 50 + (i * 20), r: 5 });
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
