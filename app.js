// --- Configurações Globais ---
const MONTH_NAMES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
const DAY_NAMES = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const TODAY = new Date(); TODAY.setHours(0, 0, 0, 0);

let globalCurrentDate = new Date();
let calendarEvents = [];
let userSettings = { salario: 0, diaFechamento: 10, horasMensais: 180, dependentes: 0, minhaTabela: 'puma', minhaLetra: 'A' };
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
function toISODate(date) { return date.toISOString().split('T')[0]; }
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
        const tr = document.createElement('tr'); tr.onclick = () => openEventModal(iso);
        const hol = isHoliday(d); const w = d.getDay();

        let html = `<td class="${hol ? 'dia-feriado' : (w == 0 || w == 6 ? 'dia-dom' : '')} ${getEventClass(iso)}">${d.toLocaleDateString('pt-BR')}</td>`;
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
    renderFinancial();
    updateSelectors();
}

// --- Financeiro ---
function saveManualHours() {
    const key = `man_${globalCurrentDate.getFullYear()}_${globalCurrentDate.getMonth()}`;
    const data = {
        an: document.getElementById('manualAN').value,
        h70: document.getElementById('manualHE70').value,
        h100: document.getElementById('manualHE100').value
    };
    localStorage.setItem(key, JSON.stringify(data));
    renderFinancial();
}

function renderFinancial() {
    const key = `man_${globalCurrentDate.getFullYear()}_${globalCurrentDate.getMonth()}`;
    const stored = JSON.parse(localStorage.getItem(key) || '{"an":"","h70":"","h100":""}');
    document.getElementById('manualAN').value = stored.an;
    document.getElementById('manualHE70').value = stored.h70;
    document.getElementById('manualHE100').value = stored.h100;

    const sal = userSettings.salario;
    const hrBase = userSettings.horasMensais || 180;
    const vHr = hrBase > 0 ? sal / hrBase : 0;

    document.getElementById('summarySalarioBase').textContent = formatCurrency(sal);
    document.getElementById('summaryValorHora').textContent = formatCurrency(vHr);
    document.getElementById('summarySalarioLiquido').textContent = formatCurrency(sal * 0.85);
}

function saveSettings() {
    userSettings = {
        salario: parseFloat(document.getElementById('salarioBase').value) || 0,
        diaFechamento: parseInt(document.getElementById('diaFechamento').value) || 10,
        horasMensais: parseInt(document.getElementById('horasMensais').value) || 180,
        dependentes: parseInt(document.getElementById('numDependentes').value) || 0,
        minhaTabela: document.getElementById('minhaTabela').value,
        minhaLetra: document.getElementById('minhaLetra').value
    };
    localStorage.setItem('set_turnos', JSON.stringify(userSettings));
    renderFinancial();
}

// --- Eventos ---
function openEventModal(iso) {
    document.getElementById('eventStartDate').value = iso;
    renderEventList(iso);
    document.getElementById('eventModalOverlay').style.display = 'flex';
}
function closeEventModal() { document.getElementById('eventModalOverlay').style.display = 'none'; }

function addEvent() {
    const type = document.getElementById('eventType').value;
    const start = document.getElementById('eventStartDate').value;
    const hours = parseFloat(document.getElementById('eventHours').value) || 0;
    if (type === 'horas-extras' && hours <= 0) { alert("Insira as horas!"); return; }
    calendarEvents.push({ id: Date.now(), type, start, hours });
    localStorage.setItem('ev_turnos', JSON.stringify(calendarEvents));
    renderAll();
    closeEventModal();
}

function getEventClass(iso) {
    const ev = calendarEvents.find(e => e.start === iso);
    return ev ? `event-${ev.type}` : '';
}

function renderEventList(iso) {
    const cont = document.getElementById('eventListContainer');
    cont.innerHTML = '<h4>Eventos:</h4>';
    calendarEvents.filter(e => e.start === iso).forEach(e => {
        cont.innerHTML += `<div style="padding:5px; margin:5px 0; background:#eee; border-radius:4px; display:flex; justify-content:space-between; align-items:center;">
            <span>${e.type} ${e.hours > 0 ? '(' + e.hours + 'h)' : ''}</span>
            <button onclick="removeEvent(${e.id}, '${iso}')" style="background:red; color:white; border:none; padding:2px 8px; border-radius:4px; cursor:pointer;">X</button>
        </div>`;
    });
}

function removeEvent(id, iso) {
    calendarEvents = calendarEvents.filter(e => e.id !== id);
    localStorage.setItem('ev_turnos', JSON.stringify(calendarEvents));
    renderAll(); renderEventList(iso);
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
    const sets = localStorage.getItem('set_turnos'); if (sets) userSettings = JSON.parse(sets);
    const evs = localStorage.getItem('ev_turnos'); if (evs) calendarEvents = JSON.parse(evs);

    const mSel = document.getElementById('globalMonth');
    MONTH_NAMES.forEach((n, i) => mSel.add(new Option(n, i)));
    const ySel = document.getElementById('globalYear');
    for (let y = 2024; y <= 2030; y++) ySel.add(new Option(y, y));

    const tSel = document.getElementById('minhaTabela');
    tSel.add(new Option('Turno PUMA', 'puma')); tSel.add(new Option('Turno Monte Alegre', 'ma'));
    const lSel = document.getElementById('minhaLetra');
    ['A', 'B', 'C', 'D', 'E'].forEach(l => lSel.add(new Option(l, l)));

    const cTab1 = document.getElementById('compareTabela1');
    const cTab2 = document.getElementById('compareTabela2');
    [cTab1, cTab2].forEach(s => {
        s.add(new Option('Turno PUMA', 'puma'));
        s.add(new Option('Turno Monte Alegre', 'ma'));


    });

    updateCompareLetras();

    document.getElementById('addEventBtn').onclick = addEvent;
    document.getElementById('closeModalBtn').onclick = closeEventModal;
    document.getElementById('eventType').onchange = (e) => {
        document.getElementById('hours-group').style.display = e.target.value === 'horas-extras' ? 'block' : 'none';
        document.getElementById('duration-group').style.display = e.target.value === 'horas-extras' ? 'none' : 'block';
    };

    document.getElementById('salarioBase').value = userSettings.salario;
    document.getElementById('diaFechamento').value = userSettings.diaFechamento;
    document.getElementById('horasMensais').value = userSettings.horasMensais;
    document.getElementById('minhaTabela').value = userSettings.minhaTabela;
    document.getElementById('minhaLetra').value = userSettings.minhaLetra;

    renderAll();

    const btnPuma = document.querySelector('button[onclick*="puma"]');
    if (btnPuma) {
        btnPuma.click();
    }
}

window.onload = init;