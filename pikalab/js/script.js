// --- LOGIC ---
let chart;
let demandShift = 0;
let supplyShift = 0;
const pricePoints = [100, 200, 300, 400, 500, 600, 700, 800, 900, 1000];

function getDemand(price) {
    let q = 110 - (price / 10) + demandShift;
    return Math.max(0, Math.min(100, q));
}

function getSupply(price) {
    let q = (price / 10) - 10 + supplyShift;
    return Math.max(0, Math.min(100, q));
}

function initChart() {
    const ctx = document.getElementById('marketChart').getContext('2d');

    chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: pricePoints,
            datasets: [
                {
                    label: '需要 (客)',
                    data: pricePoints.map(p => getDemand(p)),
                    borderColor: '#3B82F6',
                    backgroundColor: '#3B82F6',
                    borderWidth: 4,
                    pointRadius: 0,
                    pointHoverRadius: 0,
                    tension: 0.3
                },
                {
                    label: '供給 (店)',
                    data: pricePoints.map(p => getSupply(p)),
                    borderColor: '#F97316',
                    backgroundColor: '#F97316',
                    borderWidth: 4,
                    pointRadius: 0,
                    pointHoverRadius: 0,
                    tension: 0.3
                },
                {
                    label: '現在値',
                    data: [],
                    borderColor: '#1e293b',
                    backgroundColor: '#EAB308',
                    pointRadius: 8,
                    pointHoverRadius: 10,
                    pointBorderWidth: 2,
                    type: 'scatter',
                    showLine: false
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            layout: { padding: { left: 10, right: 10, top: 20, bottom: 10 } },
            scales: {
                x: {
                    title: { display: true, text: '価格 (円)', font: { weight: 'bold' } },
                    grid: { color: '#f1f5f9' }
                },
                y: {
                    title: { display: true, text: '数量', font: { weight: 'bold' } },
                    min: 0, max: 100,
                    grid: { color: '#f1f5f9' }
                }
            },
            plugins: {
                tooltip: { enabled: true, backgroundColor: 'rgba(15, 23, 42, 0.9)', titleFont: { family: 'M PLUS Rounded 1c' }, bodyFont: { family: 'M PLUS Rounded 1c' } },
                legend: { display: false }
            },
            animation: { duration: 300 }
        }
    });
}

function updateSimulation() {
    const price = parseInt(document.getElementById('price-slider').value);
    const demandQ = Math.round(getDemand(price));
    const supplyQ = Math.round(getSupply(price));

    // Text Updates
    document.getElementById('current-price-display').innerText = `¥${price}`;
    document.getElementById('slider-val-display').innerText = `¥${price}`;
    document.getElementById('demand-count').innerText = `${demandQ}人`;
    document.getElementById('supply-count').innerText = `${supplyQ}個`;

    // Visuals: Burgers (Grid Layout: 3 Columns, filling from bottom)
    const burgerStack = document.getElementById('burger-stack');
    burgerStack.innerHTML = '';
    const visualSupplyCount = Math.ceil(supplyQ / 3);
    for (let i = 0; i < visualSupplyCount; i++) {
        const burger = document.createElement('div');
        burger.className = "text-xl animate-pop-in w-full text-center";
        burger.style.animationDelay = `${i * 0.01}s`;
        burger.innerText = '🍔';
        burgerStack.appendChild(burger);
    }

    // Visuals: Queue (Wrapping Text Icons)
    const queue = document.getElementById('customer-queue');
    queue.innerHTML = '';
    const visualDemandCount = Math.ceil(demandQ / 2);
    for (let i = 0; i < visualDemandCount; i++) {
        const person = document.createElement('div');
        person.className = "text-2xl animate-pop-in";
        person.style.animationDelay = `${i * 0.01}s`;
        person.innerText = price > 700 ? '😫' : (price < 400 ? '😍' : '🙂');
        queue.appendChild(person);
    }

    // Calculations
    const tradeVol = Math.min(demandQ, supplyQ);
    const surplus = supplyQ - demandQ;
    const revenue = tradeVol * price;
    const cost = 2000 + (supplyQ * 150);
    const profit = revenue - cost;

    document.getElementById('trade-vol').innerText = `${tradeVol} 個`;
    document.getElementById('current-profit-display').innerText = `¥${profit.toLocaleString()}`;

    // Status Logic
    const statusBadge = document.getElementById('market-status-badge');
    const analysisText = document.getElementById('analysis-comment');
    const surplusText = document.getElementById('surplus-shortage');

    if (Math.abs(surplus) <= 5) {
        statusBadge.innerText = "均衡 (ベスト)";
        statusBadge.className = "px-3 py-1 rounded-full bg-green-100 text-green-700 font-bold text-sm inline-block";
        analysisText.innerHTML = `
            <span class="text-green-300 font-bold">素晴らしい！</span><br>
            需要と供給が釣り合っています！<br>
            無駄がなく、最も効率的な状態です。
        `;
        surplusText.innerText = "均衡 (±0)";
        surplusText.className = "font-bold text-green-400 text-lg";
    } else if (surplus > 0) {
        statusBadge.innerText = "売れ残り";
        statusBadge.className = "px-3 py-1 rounded-full bg-blue-100 text-blue-700 font-bold text-sm inline-block";
        analysisText.innerHTML = `
            <span class="text-blue-300 font-bold">もったいない...</span><br>
            価格が高すぎて、${surplus}個のバーガーが廃棄になります。<br>
            価格を下げてみましょう。
        `;
        surplusText.innerText = `${surplus}個 余り`;
        surplusText.className = "font-bold text-blue-400 text-lg";
    } else {
        statusBadge.innerText = "品切れ";
        statusBadge.className = "px-3 py-1 rounded-full bg-red-100 text-red-700 font-bold text-sm inline-block";
        analysisText.innerHTML = `
            <span class="text-red-300 font-bold">チャンスロス！</span><br>
            価格が安すぎて、${Math.abs(surplus)}人が買えずに帰ってしまいます。<br>
            値上げして利益を増やせます！
        `;
        surplusText.innerText = `${Math.abs(surplus)}個 不足`;
        surplusText.className = "font-bold text-red-400 text-lg";
    }

    // Update Chart
    chart.data.datasets[0].data = pricePoints.map(p => getDemand(p));
    chart.data.datasets[1].data = pricePoints.map(p => getSupply(p));
    chart.data.datasets[2].data = [
        { x: price, y: demandQ },
        { x: price, y: supplyQ }
    ];
    chart.update('none');
}

// --- TEACHER FUNCTIONS ---
function toggleTeacherMode() {
    const view = document.getElementById('teacher-view');
    view.classList.toggle('hidden');
}

// --- TOAST NOTIFICATION ---
function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    let icon = 'info';
    if (type === 'success') icon = 'check_circle';
    if (type === 'warning') icon = 'warning';

    toast.innerHTML = `
        <span class="material-symbols-outlined toast-icon">${icon}</span>
        <span>${message}</span>
    `;

    container.appendChild(toast);

    // Trigger animation
    requestAnimationFrame(() => {
        toast.classList.add('show');
    });

    // Auto remove
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            if (toast.parentElement) {
                toast.parentElement.removeChild(toast);
            }
        }, 300);
    }, 4000);
}

function shiftCurve(scenario) {
    if (scenario === 'health_boom') {
        demandShift = 20; supplyShift = 0;
        showToast("ニュース: 健康ブーム到来！需要が増加しました。", "success");
    } else if (scenario === 'potato_famine') {
        supplyShift = -20; demandShift = 0;
        showToast("ニュース: 原材料費高騰！供給が減少しました。", "warning");
    } else if (scenario === 'tech_innovation') {
        supplyShift = 20; demandShift = 0;
        showToast("ニュース: 技術革新！供給が増加しました。", "success");
    } else {
        demandShift = 0; supplyShift = 0;
        showToast("リセットしました。", "info");
    }
    updateSimulation();
    toggleTeacherMode();
}

function printWorksheet(type) {
    const area = document.getElementById('printable-area');
    let content = "";
    if (type === 'intro') {
        content = `
            <h1 class="text-2xl font-bold mb-4 border-b-2 border-black pb-2">バーガー・エコノミー 基礎ワークシート</h1>
            <div class="mb-4">年　　組　　番　氏名：__________________________</div>
            <div class="mb-8"><h3 class="font-bold mb-2">問1. 言葉の確認</h3><p class="mb-2">以下の空欄に適切な言葉を入れなさい。</p><ul class="list-decimal pl-6 space-y-4"><li>消費者が「買いたい」と思う量のことを__________という。</li><li>生産者が「売りたい」と思う量のことを__________という。</li><li>需要と供給が一致する価格のことを__________という。</li></ul></div>
            <div class="mb-8"><h3 class="font-bold mb-2">問2. シミュレーション記録</h3><table class="w-full border-collapse border border-black text-sm"><tr class="bg-gray-200"><th class="border border-black p-2">価格</th><th class="border border-black p-2">需要量(客)</th><th class="border border-black p-2">供給量(店)</th><th class="border border-black p-2">状態 (不足/余り/一致)</th></tr><tr><td class="border border-black p-2">¥200</td><td></td><td></td><td></td></tr><tr><td class="border border-black p-2">¥500</td><td></td><td></td><td></td></tr><tr><td class="border border-black p-2">¥800</td><td></td><td></td><td></td></tr></table></div>
        `;
    } else if (type === 'advanced') {
        content = `
            <h1 class="text-2xl font-bold mb-4 border-b-2 border-black pb-2">バーガー・エコノミー 店長レポート</h1>
            <div class="mb-4">年　　組　　番　氏名：__________________________</div>
            <div class="mb-6"><h3 class="font-bold mb-2">ミッション：均衡価格を見つけよ！</h3><p>需要と供給がぴったり一致する「均衡価格」はいくらか記録しよう。</p><div class="border border-black p-4 rounded mb-4"><div class="font-bold">均衡価格： ¥__________</div></div></div>
            <div class="mb-6"><h3 class="font-bold mb-2">思考実験</h3><p class="text-sm mb-2">もし「健康ブーム」が起きて需要が増えたら、均衡価格はどうなるか？</p><div class="flex gap-8 justify-center my-4 font-bold text-lg"><span>( 上がる )</span><span>( 変わらない )</span><span>( 下がる )</span></div><p class="text-sm">理由：__________________________________________________________</p></div>
        `;
    }
    area.innerHTML = content;
    window.print();
}

function downloadPage() {
    const htmlContent = document.documentElement.outerHTML;
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'burger_economy.html';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

window.onload = () => { initChart(); updateSimulation(); };
