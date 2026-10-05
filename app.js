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
// EASYEDA STYLE MASTER LIBRARY WITH PIN NAMES & LABELS
// =========================================================
const EASYEDA_MASTER_LIBRARY = [
    // --- MICROCONTROLLERS & FLASH MEMORY ICs ---
    {
        name: "ESP32 DevKit V1 (30-Pin)",
        type: "esp32_board",
        category: "Microcontroller",
        pins: [
            { left: "EN", right: "CLK" }, { left: "VP", right: "SD0" }, { left: "VN", right: "SD1" },
            { left: "D34", right: "SD2" }, { left: "D35", right: "SD3" }, { left: "D32", right: "CMD" },
            { left: "D33", right: "5V" }, { left: "D25", right: "GND" }, { left: "D26", right: "3V3" },
            { left: "D27", right: "TX0" }, { left: "D14", right: "RX0" }, { left: "D12", right: "D22" },
            { left: "D13", right: "D21" }, { left: "GND", right: "D19" }, { left: "VIN", right: "D18" }
        ]
    },
    {
        name: "W25Q64 Flash Memory IC (SOIC-8)",
        type: "ic_dip8",
        category: "IC / Memory",
        label: "FLASH IC",
        pinLabels: ["/CS", "DO", "/WP", "GND", "DI", "CLK", "/HOLD", "VCC"]
    },
    {
        name: "USB Type-A Male Connector",
        type: "usb_a",
        category: "Connector",
        label: "USB A",
        pinLabels: ["VBUS", "D-", "D+", "GND"]
    },
    {
        name: "USB Type-C (16-Pin / 4-Pin Module)",
        type: "usb_c",
        category: "Connector",
        label: "TYPE-C",
        pinLabels: ["GND", "VBUS", "D-", "D+"]
    },
    {
        name: "ATmega328P DIP-28 IC",
        type: "ic_dip28",
        category: "Microcontroller IC",
        label: "ATmega328P",
        pinLabels: [
            "RESET", "RXD", "TXD", "INT0", "INT1", "XCK", "VCC", "GND", "XTAL1", "XTAL2", "OC1A", "OC1B", "OC2A", "VCC",
            "GND", "PB1", "PB2", "PB3", "PB4", "PB5", "AVCC", "ADC7", "GND", "AREF", "ADC0", "ADC1", "ADC2", "ADC3"
        ]
    },
    {
        name: "0.96 OLED Display I2C",
        type: "display_i2c",
        category: "Display",
        label: "OLED 0.96",
        pinLabels: ["GND", "VCC", "SCL", "SDA"]
    },
    {
        name: "5V Relay Module",
        type: "relay_module",
        category: "Module",
        label: "5V RELAY",
        pinLabels: ["VCC", "GND", "IN", "NO", "COM", "NC"]
    }
];

function getCombinedLibrary() {
    const customSaved = JSON.parse(localStorage.getItem('my_custom_pcb_components') || '[]');
    return [...customSaved, ...EASYEDA_MASTER_LIBRARY];
}

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
// INSTANT SEARCH WITH DETAILED COMPONENT INFO
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
    const filtered = library.filter(item => 
        item.name.toLowerCase().includes(query) || 
        item.category.toLowerCase().includes(query)
    );

    if (filtered.length > 0) {
        dropdown.style.display = 'block';
        filtered.slice(0, 15).forEach(item => {
            const div = document.createElement('div');
            div.className = 'search-item';
            div.innerHTML = `
                <span><b>[${item.category}]</b> ${item.name}</span>
                <small style="color:#00ffaa">${item.isCustom ? 'Custom' : 'Footprint'}</small>
            `;
            
            div.onclick = () => {
                if (item.isCustom) {
                    loadCustomCircuit(item.elements);
                } else {
                    renderComponentFootprint(item);
                }
                dropdown.style.display = 'none';
                document.getElementById('componentSearch').value = '';
            };
            dropdown.appendChild(div);
        });
    } else {
        dropdown.style.display = 'block';
        dropdown.innerHTML = `<div class="search-item" style="color:#e63946;">❌ কোনো পার্টস বা মডিউল পাওয়া যায়নি</div>`;
    }
}

// Save Custom Design Logic
function saveDesignToLibrary() {
    if (elements.length === 0) {
        alert("ক্যানভাসে কোনো প্রজেক্ট নেই!");
        return;
    }

    const designName = prompt("সার্কিট বা মডিউলটির নাম দিন:", "USB_Flash_Module");
    if (!designName) return;

    const customSaved = JSON.parse(localStorage.getItem('my_custom_pcb_components') || '[]');
    const newComponent = {
        name: designName,
        category: "Custom Module",
        isCustom: true,
        elements: JSON.parse(JSON.stringify(elements))
    };

    customSaved.unshift(newComponent);
    localStorage.setItem('my_custom_pcb_components', JSON.stringify(customSaved));
    alert(`"${designName}" কাস্টম লাইব্রেরিতে সেভ হয়েছে!`);
}

function loadCustomCircuit(savedElements) {
    const cx = snap(canvas.width / 2);
    const cy = snap(canvas.height / 2);
    
    savedElements.forEach(el => {
        let cloned = { ...el, id: Date.now() + Math.random() };
        if (cloned.type === 'pad' || cloned.type === 'label' || cloned.type === 'box') {
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

// Touch & Mouse Drawing Event Listeners
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
        elements.push({ id: Date.now(), type: 'pad', x: startX, y: startY, r: 8, name: "PAD" });
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
    if (confirm("সমস্ত ড্রয়িং মুছে ফেলতে চান?")) {
        elements = [];
        draw();
    }
}

// =========================================================
// RENDER COMPONENT FOOTPRINTS WITH SILKSCREEN & PIN NAMES
// =========================================================
function renderComponentFootprint(item) {
    const cx = snap(canvas.width / 2);
    const cy = snap(canvas.height / 2);

    if (item.type === 'esp32_board') {
        const pinGap = 16;
        const widthGap = 100;
        const totalPins = item.pins.length;

        // Draw Board Border Line
        elements.push({
            type: 'box',
            x: cx - widthGap / 2 - 25,
            y: cy - (totalPins * pinGap) / 2 - 15,
            w: widthGap + 50,
            h: totalPins * pinGap + 30,
            label: item.name
        });

        item.pins.forEach((p, i) => {
            let yPos = cy - (totalPins * pinGap) / 2 + (i * pinGap);

            // Left Pins
            elements.push({ type: 'pad', x: cx - widthGap / 2, y: yPos, r: 5, name: p.left, align: 'right' });
            // Right Pins
            elements.push({ type: 'pad', x: cx + widthGap / 2, y: yPos, r: 5, name: p.right, align: 'left' });
        });
    } else if (item.pinLabels) {
        const count = item.pinLabels.length;
        const half = Math.ceil(count / 2);

        elements.push({
            type: 'box',
            x: cx - 50,
            y: cy - (half * 20) / 2 - 10,
            w: 100,
            h: half * 20 + 20,
            label: item.label || item.name
        });

        for (let i = 0; i < half; i++) {
            let yPos = cy - (half * 20) / 2 + (i * 20);
            if (item.pinLabels[i]) {
                elements.push({ type: 'pad', x: cx - 35, y: yPos, r: 5, name: item.pinLabels[i], align: 'right' });
            }
            if (item.pinLabels[count - 1 - i]) {
                elements.push({ type: 'pad', x: cx + 35, y: yPos, r: 5, name: item.pinLabels[count - 1 - i], align: 'left' });
            }
        }
    }
    draw();
}

// =========================================================
// RENDER CANVAS ENGINE (PIN LABELS & TEXT DRAWING)
// =========================================================
function draw() {
    ctx.fillStyle = '#090d12';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw Grid Lines
    ctx.strokeStyle = '#161b22';
    ctx.lineWidth = 1;
    for (let x = 0; x < canvas.width; x += gridSize) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += gridSize) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
    }

    // Render Canvas Elements
    elements.forEach(el => {
        if (el.type === 'box') {
            // Silkscreen Border
            ctx.strokeStyle = '#00a8ff';
            ctx.lineWidth = 1.5;
            ctx.strokeRect(el.x, el.y, el.w, el.h);
            
            ctx.fillStyle = '#00a8ff';
            ctx.font = 'bold 11px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(el.label, el.x + el.w / 2, el.y + 15);
        } else if (el.type === 'wire') {
            ctx.strokeStyle = '#ffb703';
            ctx.lineWidth = el.width;
            ctx.beginPath();
            ctx.moveTo(el.x1, el.y1);
            ctx.lineTo(el.x2, el.y2);
            ctx.stroke();
        } else if (el.type === 'pad') {
            // Copper Pad
            ctx.fillStyle = '#ffb703';
            ctx.beginPath();
            ctx.arc(el.x, el.y, el.r, 0, Math.PI * 2);
            ctx.fill();

            // Hole
            ctx.fillStyle = '#090d12';
            ctx.beginPath();
            ctx.arc(el.x, el.y, 2.5, 0, Math.PI * 2);
            ctx.fill();

            // Render Pin Name / Label
            if (el.name) {
                ctx.fillStyle = '#00ffaa';
                ctx.font = '9px Consolas, monospace';
                if (el.align === 'right') {
                    ctx.textAlign = 'right';
                    ctx.fillText(el.name, el.x - 8, el.y + 3);
                } else if (el.align === 'left') {
                    ctx.textAlign = 'left';
                    ctx.fillText(el.name, el.x + 8, el.y + 3);
                } else {
                    ctx.textAlign = 'center';
                    ctx.fillText(el.name, el.x, el.y - 8);
                }
            }
        }
    });

    const brand = document.getElementById('brandText').value;
    if (brand) {
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 14px Arial';
        ctx.fillText(brand, 20, canvas.height - 20);
    }
}

// Export Engines
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

// Initialize
resizeCanvas();
