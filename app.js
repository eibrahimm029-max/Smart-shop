const canvas = document.getElementById('pcbCanvas');
const ctx = canvas.getContext('2d');
const compCards = document.querySelectorAll('.comp-card');
const clearBtn = document.getElementById('clearBtn');
const exportBtn = document.getElementById('exportJlcpcbBtn');

// Canvas Dimension
canvas.width = 600;
canvas.height = 500;

let selectedComponent = null;
let placedComponents = [];

// Selected Component Handler
compCards.forEach(card => {
    card.addEventListener('click', () => {
        compCards.forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        selectedComponent = {
            type: card.getAttribute('data-type'),
            lcsc: card.getAttribute('data-lcsc')
        };
    });
});

// Draw Grid Background
function drawGrid() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#18241f';
    ctx.lineWidth = 1;

    const gridSize = 25;
    for (let x = 0; x < canvas.width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
    }

    // Render Placed Components
    placedComponents.forEach(item => {
        ctx.fillStyle = '#00e676';
        ctx.fillRect(item.x - 30, item.y - 20, 60, 40);

        ctx.fillStyle = '#000';
        ctx.font = '10px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(item.type, item.x, item.y + 4);
    });
}

// Click Canvas to Place Component
canvas.addEventListener('click', (e) => {
    if (!selectedComponent) {
        alert('অনুগ্রহ করে ডানপাশের লাইব্রেরি থেকে একটি মডিউল বেছে নিন!');
        return;
    }

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    placedComponents.push({
        type: selectedComponent.type,
        lcsc: selectedComponent.lcsc,
        x: Math.round(x / 25) * 25,
        y: Math.round(y / 25) * 25
    });

    drawGrid();
});

// Clear All
clearBtn.addEventListener('click', () => {
    placedComponents = [];
    drawGrid();
});

// Export JLCPCB BOM & CPL Data
exportBtn.addEventListener('click', () => {
    if (placedComponents.length === 0) {
        alert('ক্যানভাসে কোনো পার্টস নেই!');
        return;
    }

    let bomContent = "Comment,Designator,Footprint,LCSC Part#\n";
    let cplContent = "Designator,Mid X,Mid Y,Layer,Rotation\n";

    placedComponents.forEach((comp, index) => {
        const des = `U${index + 1}`;
        bomContent += `${comp.type},${des},SMD,${comp.lcsc}\n`;
        cplContent += `${des},${comp.x}mm,${comp.y}mm,Top,0\n`;
    });

    // Download BOM File
    downloadFile(`JLCPCB_BOM_${Date.now()}.csv`, bomContent);
    // Download CPL File
    downloadFile(`JLCPCB_CPL_${Date.now()}.csv`, cplContent);

    alert('JLCPCB PCBA এর জন্য BOM এবং CPL ফাইল জেনারেট হয়ে গেছে!');
});

function downloadFile(filename, text) {
    const element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
    element.setAttribute('download', filename);
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
}

// Initial Call
drawGrid();
