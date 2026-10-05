const canvas = document.getElementById('pcbCanvas');
const ctx = canvas.getContext('2d');

let currentTool = 'wire';
let elements = [];
let isDrawing = false;
let startX = 0, startY = 0;
let currentLine = null;
const gridSize = 10;

// EasyEDA Style Library Database
const componentLibrary = [
    { name: "ESP32 NodeMCU (30-Pin)", type: "esp32" },
    { name: "Arduino Nano Board", type: "nano" },
    { name: "ATmega328P / IC-28 Pin", type: "ic28" },
    { name: "NE555 Timer IC (8-Pin)", type: "ic8" },
    { name: "Resistor (Through-Hole/SMD)", type: "resistor" },
    { name: "Capacitor", type: "capacitor" },
    { name: "5V Relay Module", type: "relay" },
    { name: "0.96 inch OLED Display", type: "oled" },
    { name: "HC-05 Bluetooth Module", type: "hc05" }
];

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

// Search Logic
function searchComponents() {
    const query = document.getElementById('componentSearch').value.toLowerCase();
    const dropdown = document.getElementById('searchResults');
    dropdown.innerHTML = '';

    if (!query) {
        dropdown.style.display = 'none';
        return;
    }

    const filtered = componentLibrary.filter(c => c.name.toLowerCase().includes(query));

    if (filtered.length > 0) {
        dropdown.style.display = 'block';
        filtered.forEach(item => {
            const div = document.createElement('div');
            div.className = 'search-item';
            div.innerText = item.name;
            div.onclick = () => {
                addComponent(item.type);
                dropdown.style.display = 'none';
                document.getElementById('componentSearch').value = '';
            };
            dropdown.appendChild(div);
        });
    } else {
        dropdown.style.display = 'none';
    }
}

// Touch & Mouse Drawing Controls
canvas.addEventListener('mousedown', startDraw);
canvas.addEventListener('mousemove', drawMove);
canvas.addEventListener('mouseup', endDraw);

canvas.addEventListener('touchstart', (e) => {
    const touch = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    startDraw({ clientX: touch.clientX, clientY: touch.clientY });
});

canvas.addEventListener('touchmove', (e) => {
    const touch = e.touches[0];
    drawMove({ clientX: touch.clientX, clientY: touch.clientY });
});

canvas.addEventListener('touchend', endDraw);

function startDraw(e) {
    const rect = canvas.getBoundingClientRect();
    startX = snap(e.clientX - rect.left);
    startY = snap(e.clientY - rect.top);

    if (currentTool === 'wire') {
        isDrawing = true;
        currentLine = { 
            type: 'wire', 
            x1: startX, 
            y1: startY, 
            x2: startX, 
            y2: startY, 
            width: parseInt(document.getElementById('traceWidth').value) 
        };
    } else if (currentTool === 'pad') {
        elements.push({ type: 'pad', x: startX, y: startY, r: 8 });
        draw();
    }
}

function drawMove(e) {
    if (!isDrawing) return;
    const rect = canvas.getBoundingClientRect();
    currentLine.x2 = snap(e.clientX - rect.left);
    currentLine.y2 = snap(e.clientY - rect.top);
    draw();

    ctx.strokeStyle = '#00ffaa';
    ctx.lineWidth = currentLine.width;
    ctx.beginPath();
    ctx.moveTo(currentLine.x1, currentLine.y1);
    ctx.lineTo(currentLine.x2, currentLine.y2);
    ctx.stroke();
}

function endDraw() {
    if (isDrawing && currentLine) {
        elements.push(currentLine);
        isDrawing = false;
        currentLine = null;
        draw();
    }
}

function addComponent(type) {
    const cx = snap(canvas.width / 2);
    const cy = snap(canvas.height / 2);

    if (type === 'resistor' || type === 'capacitor') {
        elements.push({ type: 'pad', x: cx - 20, y: cy, r: 6 });
        elements.push({ type: 'pad', x: cx + 20, y: cy, r: 6 });
        elements.push({ type: 'wire', x1: cx - 20, y1: cy, x2: cx + 20, y2: cy, width: 2 });
    } else if (type === 'ic8') {
        for (let i = 0; i < 4; i++) {
            elements.push({ type: 'pad', x: cx - 20, y: cy - 30 + (i * 20), r: 6 });
            elements.push({ type: 'pad', x: cx + 20, y: cy - 30 + (i * 20), r: 6 });
        }
    } else if (type === 'esp32' || type === 'nano') {
        for (let i = 0; i < 15; i++) {
            elements.push({ type: 'pad', x: cx - 40, y: cy - 140 + (i * 20), r: 5 });
            elements.push({ type: 'pad', x: cx + 40, y: cy - 140 + (i * 20), r: 5 });
        }
    } else if (type === 'oled') {
        for (let i = 0; i < 4; i++) {
            elements.push({ type: 'pad', x: cx - 30 + (i * 20), y: cy, r: 6 });
        }
    } else if (type === 'relay' || type === 'hc05') {
        for (let i = 0; i < 6; i++) {
            elements.push({ type: 'pad', x: cx - 50 + (i * 20), y: cy, r: 6 });
        }
    }
    draw();
}

function clearCanvas() {
    elements = [];
    draw();
}

// Render Circuit Engine
function draw() {
    ctx.fillStyle = '#090d12';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Grid System
    ctx.strokeStyle = '#161b22';
    ctx.lineWidth = 1;
    for (let x = 0; x < canvas.width; x += gridSize) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += gridSize) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
    }

    // Render Copper Traces and Pads
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

    // Render Custom Branding Text
    const brand = document.getElementById('brandText').value;
    if (brand) {
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 14px Arial';
        ctx.fillText(brand, 20, canvas.height - 20);
    }
}

// Export ESP32 G-Code Function
function exportGCode() {
    let gcode = "; Easy PCB Studio ESP32 G-Code\nG21\nG90\nM3 S10000\nG0 Z5\n";
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
    link.download = 'circuit.gcode';
    link.click();
}

function exportJLCPCB() {
    alert("JLCPCB অর্ডার প্রস্তুত করার কাজ চলছে! খুব শিগগিরই জিপ ফাইল ডাউনলোড হবে।");
}

// Initialize Canvas
resizeCanvas();
