// --- Configurações Globais ---
const MONTH_NAMES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
const DAY_NAMES = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const TODAY = new Date(); TODAY.setHours(0, 0, 0, 0);

let globalCurrentDate = new Date();


let holidayCache = {};

const PUMA_ANCHOR_DATE = new Date(2025, 0, 1);
const PUMA_CYCLES = {
    A: ['F', '0', '0', '8', '8', '8', 'F', 'F', 'F', '16', '16', '16', 'F', '0', '0', '8', '8', 'F', 'F', 'F', 'F', '16', '16', 'F', '0', '0', '0', '8', '8', 'F', 'F', 'F', 'F', '16', '16'],
    B: ['F', 'F', '16', '16', '16', 'F', '0', '0', '8', '8', 'F', 'F', 'F', 'F', '16', '16', 'F', '0', '0', '0', '8', '8', 'F', 'F', 'F', 'F', '16', '16', 'F', '0', '0', '8', '8', '8', 'F'],
    C: ['16', '16', 'F', '0', '0', '0', '8', '8', 'F', 'F', 'F', 'F', '16', '16', 'F', '0', '0', '8', '8', '8', 'F', 'F', 'F', '16', '16', '16', 'F', '0', '0', '8', '8', 'F', 'F', 'F', 'F'],
    D: ['8', 'F', 'F', 'F', 'F', '16', '16', 'F', '0', '0', '8', '8', '8', 'F', 'F', 'F', '16', '16', '16', 'F', '0', '0', '8', '8', 'F', 'F', 'F', 'F', '16', '16', 'F', '0', '0', '0', '8'],
    E: ['0', '8', '8', 'F', 'F', 'F', 'F', '16', '16', 'F', '0', '0', '0', '8', '8', 'F', 'F', 'F', 'F', '16', '16', 'F', '0', '0', '8', '8', '8', 'F', 'F', 'F', '16', '16', '16', 'F', '0']
};

const MA_ANCHOR_DATE = new Date(2025, 2, 15);
const MA_SHIFT_CYCLE = ['F', 'F', 'F', 'F', '0', '0', '8', '8', '16', '16'];
const MA_TEAM_OFFSETS = { A: 0, B: 4, C: 8, D: 6, E: 2 };

// --- Utilitários ---
function toISODate(date) {
    const year = date.getFullYear();
    // getMonth() começa em 0, por isso +1. padStart garante "05" em vez de "5"
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}
function formatCurrency(val) { return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }); }
function diffDays(d1, d2) { return Math.floor((d2 - d1) / (1000 * 60 * 60 * 24)); }

// --- Feriados ---
function getEaster(y) {
    let f = Math.floor, c = f(y / 100), n = y - 19 * f(y / 19), k = f((c - 17) / 25), i = c - f(c / 4) - f((c - k) / 3) + 19 * n + 15;
    i = i - 30 * f(i / 30); i = i - f(i / 28) * (1 - f(i / 28) * f(29 / (i + 1)) * f((21 - n) / 11));
    let j = y + f(y / 4) + i + 2 - c + f(c / 4); j = j - 7 * f(j / 7);
    let l = i - j, m = 3 + f((l + 40) / 44), d = l + 28 - 31 * f(m / 4); return new Date(y, m - 1, d);
}
function getHolidays(y) {
    if (holidayCache[y]) return holidayCache[y];
    const h = {}; const add = (dt, nm) => h[toISODate(dt)] = nm;
    const e = getEaster(y); add(new Date(y, 0, 1), "Ano Novo"); add(new Date(y, 11, 25), "Natal");
    add(new Date(y, 4, 1), "Trabalho"); add(new Date(y, 8, 7), "Independência");
    holidayCache[y] = h; return h;
}
function isHoliday(d) { return getHolidays(d.getFullYear())[toISODate(d)] || null; }

// --- Lógica das Escalas ---
function getPumaShift(d, t) {
    const dDiff = diffDays(PUMA_ANCHOR_DATE, d);
    const idx = ((dDiff % 35) + 35) % 35;
    return PUMA_CYCLES[t][idx];
}
function getMaShift(d, t) {
    const dDiff = diffDays(MA_ANCHOR_DATE, d);
    const idx = ((dDiff + MA_TEAM_OFFSETS[t]) % 10 + 10) % 10;
    return MA_SHIFT_CYCLE[idx];
}

const SHIFT_FUNCTIONS = { 'puma': getPumaShift, 'ma': getMaShift };

// --- Renderização de Tabelas ---
function renderTable(body, fn, teams) {
    if (!body) return; body.innerHTML = '';
    const y = globalCurrentDate.getFullYear(), m = globalCurrentDate.getMonth();
    const last = new Date(y, m + 1, 0).getDate();

    for (let i = 1; i <= last; i++) {
        const d = new Date(y, m, i); const iso = toISODate(d);
        const tr = document.createElement('tr'); 
        const hol = isHoliday(d); const w = d.getDay();

        let html = `<td class="${hol ? 'dia-feriado' : (w == 0 || w == 6 ? 'dia-dom' : '')} ">${d.toLocaleDateString('pt-BR')}</td>`;
        html += `<td class="${hol ? 'dia-feriado' : (w == 0 || w == 6 ? 'dia-dom' : '')}">${DAY_NAMES[w]}</td>`;

        // CORREÇÃO: Lógica para diferenciar modo normal e modo comparação
        teams.forEach(t => {
            let s;
            if (typeof t === 'object') {
                // Modo Comparação: t é {tabela: 'puma', letra: 'A'}
                const shiftFn = SHIFT_FUNCTIONS[t.tabela];
                s = shiftFn(d, t.letra);
            } else {
                // Modo Normal: t é apenas a letra 'A', 'B', etc.
                s = fn(d, t);
            }
            html += `<td class="shift-${s.toLowerCase()}">${s}</td>`;
        });

        tr.innerHTML = html;
        if (d.getTime() === TODAY.getTime()) tr.style.background = "#e0f2f1";
        body.appendChild(tr);
    }
}

// --- Função de Comparação ---
function renderTableCompare() {
    const t1 = document.getElementById('compareTabela1').value;
    const l1 = document.getElementById('compareLetra1').value;
    const t2 = document.getElementById('compareTabela2').value;
    const l2 = document.getElementById('compareLetra2').value;

    const comparisonSources = [
        { tabela: t1, letra: l1 },
        { tabela: t2, letra: l2 }
    ];

    renderTable(document.getElementById('compare-table-body'), null, comparisonSources);
}

function updateCompareLetras() {
    // Apenas garante que as opções A-E existam nos seletores
    const selects = ['compareLetra1', 'compareLetra2'];
    selects.forEach(id => {
        const sel = document.getElementById(id);
        if (sel && sel.options.length === 0) {
            ['A', 'B', 'C', 'D', 'E'].forEach(l => sel.add(new Option(l, l)));
        }
    });
}

function renderAll() {
    renderTable(document.getElementById('puma-table-body'), getPumaShift, ['A', 'B', 'C', 'D', 'E']);
    renderTable(document.getElementById('ma-table-body'), getMaShift, ['A', 'B', 'C', 'D', 'E']);
    if (document.getElementById('comparar').classList.contains('active')) {
        renderTableCompare();
    }
    
    updateSelectors();
}

// --- Abas e Navegação ---
function openTab(e, nm) {
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    document.querySelectorAll('.tab-button').forEach(b => b.classList.remove('active'));
    document.getElementById(nm).classList.add('active');
    e.currentTarget.classList.add('active');
    if (nm === 'comparar') renderTableCompare();
}

function changeMonth(d) { globalCurrentDate.setMonth(globalCurrentDate.getMonth() + d); renderAll(); }
function goToToday() { globalCurrentDate = new Date(TODAY); renderAll(); }
function jumpToDate() {
    globalCurrentDate = new Date(document.getElementById('globalYear').value, document.getElementById('globalMonth').value, 1);
    renderAll();
}

function updateSelectors() {
    document.getElementById('globalMonth').value = globalCurrentDate.getMonth();
    document.getElementById('globalYear').value = globalCurrentDate.getFullYear();
}

// --- Inicialização ---
function init() {
    // 1. Preenche os Selects de Data
    const mSel = document.getElementById('globalMonth');
    MONTH_NAMES.forEach((n, i) => mSel.add(new Option(n, i)));

    const ySel = document.getElementById('globalYear');
    for (let y = 2024; y <= 2030; y++) ySel.add(new Option(y, y));

    // 2. Preenche os Selects de Comparação
    const cTab1 = document.getElementById('compareTabela1');
    const cTab2 = document.getElementById('compareTabela2');
    [cTab1, cTab2].forEach(s => {
        s.add(new Option('Turno PUMA', 'puma'));
        s.add(new Option('Turno Monte Alegre', 'ma'));
    });

    // 3. Garante que as letras (A, B, C...) existam antes de tentar carregar valores
    updateCompareLetras();

    // === NOVO: Carrega as configurações salvas ===
    loadSavedSettings();
    setupAutoSave();
    // =============================================

    // 4. Renderiza tudo com os dados carregados
    renderAll();

    // Atualiza visualmente os seletores de data caso a data tenha mudado no loadSavedSettings
    updateSelectors();

    // Botão inicial (mantido do seu código original)
    const btnPuma = document.querySelector('button[onclick*="puma"]');
    if (btnPuma) {
        // Opcional: Você pode salvar a aba ativa no localStorage também se quiser futuramente
        btnPuma.click();
    }
}

// --- Persistência de Dados (Salvar Escolhas) ---
const STORAGE_KEYS = [
    'globalMonth',
    'globalYear',
    'compareTabela1',
    'compareLetra1',
    'compareTabela2',
    'compareLetra2'
];

function setupAutoSave() {
    STORAGE_KEYS.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            // Toda vez que mudar, salva no localStorage
            el.addEventListener('change', () => {
                localStorage.setItem(id, el.value);
            });
        }
    });
}

function loadSavedSettings() {
    STORAGE_KEYS.forEach(id => {
        const savedValue = localStorage.getItem(id);
        const el = document.getElementById(id);
        // Se existir valor salvo e o elemento existir na tela, aplica o valor
        if (savedValue && el) {
            el.value = savedValue;
        }
    });

    // Ajusta a data global para bater com o que foi recuperado dos selects
    const savedM = localStorage.getItem('globalMonth');
    const savedY = localStorage.getItem('globalYear');

    if (savedM !== null && savedY !== null) {
        // Atualiza a variável principal de data com o que foi salvo
        globalCurrentDate.setMonth(parseInt(savedM));
        globalCurrentDate.setFullYear(parseInt(savedY));
    }
}

window.onload = init;