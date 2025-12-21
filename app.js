// ============================================================================
// 1. CONFIGURAÇÕES E CONSTANTES GLOBAIS
// ============================================================================
const MONTH_NAMES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
const DAY_NAMES = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const TODAY = new Date(); TODAY.setHours(0, 0, 0, 0);

let globalCurrentDate = new Date();
let holidayCache = {};

// Dados da Tabela PUMA
const PUMA_ANCHOR_DATE = new Date(2025, 0, 1);
const PUMA_CYCLES = {
    A: ['F', '0', '0', '8', '8', '8', 'F', 'F', 'F', '16', '16', '16', 'F', '0', '0', '8', '8', 'F', 'F', 'F', 'F', '16', '16', 'F', '0', '0', '0', '8', '8', 'F', 'F', 'F', 'F', '16', '16'],
    B: ['F', 'F', '16', '16', '16', 'F', '0', '0', '8', '8', 'F', 'F', 'F', 'F', '16', '16', 'F', '0', '0', '0', '8', '8', 'F', 'F', 'F', 'F', '16', '16', 'F', '0', '0', '8', '8', '8', 'F'],
    C: ['16', '16', 'F', '0', '0', '0', '8', '8', 'F', 'F', 'F', 'F', '16', '16', 'F', '0', '0', '8', '8', '8', 'F', 'F', 'F', '16', '16', '16', 'F', '0', '0', '8', '8', 'F', 'F', 'F', 'F'],
    D: ['8', 'F', 'F', 'F', 'F', '16', '16', 'F', '0', '0', '8', '8', '8', 'F', 'F', 'F', '16', '16', '16', 'F', '0', '0', '8', '8', 'F', 'F', 'F', 'F', '16', '16', 'F', '0', '0', '0', '8'],
    E: ['0', '8', '8', 'F', 'F', 'F', 'F', '16', '16', 'F', '0', '0', '0', '8', '8', 'F', 'F', 'F', 'F', '16', '16', 'F', '0', '0', '8', '8', '8', 'F', 'F', 'F', '16', '16', '16', 'F', '0']
};

// Dados da Tabela Monte Alegre
const MA_ANCHOR_DATE = new Date(2025, 2, 15);
const MA_SHIFT_CYCLE = ['F', 'F', 'F', 'F', '0', '0', '8', '8', '16', '16'];
const MA_TEAM_OFFSETS = { A: 0, B: 4, C: 8, D: 6, E: 2 };

// ============================================================================
// 2. UTILITÁRIOS E LÓGICA DE NEGÓCIO
// ============================================================================

function toISODate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function diffDays(d1, d2) { return Math.floor((d2 - d1) / (1000 * 60 * 60 * 24)); }

function getEaster(y) {
    let f = Math.floor, c = f(y / 100), n = y - 19 * f(y / 19), k = f((c - 17) / 25), i = c - f(c / 4) - f((c - k) / 3) + 19 * n + 15;
    i = i - 30 * f(i / 30); i = i - f(i / 28) * (1 - f(i / 28) * f(29 / (i + 1)) * f((21 - n) / 11));
    let j = y + f(y / 4) + i + 2 - c + f(c / 4); j = j - 7 * f(j / 7);
    let l = i - j, m = 3 + f((l + 40) / 44), d = l + 28 - 31 * f(m / 4); return new Date(y, m - 1, d);
}

function getHolidays(y) {
    if (holidayCache[y]) return holidayCache[y];
    const h = {}; const add = (dt, nm) => h[toISODate(dt)] = nm;
    const e = getEaster(y);
    add(new Date(y, 0, 1), "Ano Novo");
    add(new Date(y, 11, 25), "Natal");
    add(new Date(y, 4, 1), "Trabalho");
    add(new Date(y, 8, 7), "Independência");
    holidayCache[y] = h; return h;
}

function isHoliday(d) { return getHolidays(d.getFullYear())[toISODate(d)] || null; }

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

// ============================================================================
// 3. RENDERIZAÇÃO DAS TABELAS
// ============================================================================

function renderTable(body, fn, teams, prefix) {
    if (!body) return;
    body.innerHTML = '';

    const y = globalCurrentDate.getFullYear();
    const colSpan = teams.length + 2;

    for (let m = 0; m < 12; m++) {
        const trMonth = document.createElement('tr');
        trMonth.className = 'month-separator';
        trMonth.innerHTML = `<td colspan="${colSpan}">${MONTH_NAMES[m]} ${y}</td>`;
        body.appendChild(trMonth);

        const lastDay = new Date(y, m + 1, 0).getDate();
        for (let i = 1; i <= lastDay; i++) {
            const d = new Date(y, m, i);
            const iso = toISODate(d);
            const w = d.getDay();
            const hol = isHoliday(d);

            const tr = document.createElement('tr');
            tr.id = `${prefix}-date-${iso}`;

            let html = `<td class="${hol ? 'dia-feriado' : (w == 0 || w == 6 ? 'dia-dom' : '')}">${d.toLocaleDateString('pt-BR')}</td>`;
            html += `<td class="${hol ? 'dia-feriado' : (w == 0 || w == 6 ? 'dia-dom' : '')}">${DAY_NAMES[w]}</td>`;

            teams.forEach(t => {
                let s;
                if (typeof t === 'object') {
                    const shiftFn = SHIFT_FUNCTIONS[t.tabela];
                    s = shiftFn(d, t.letra);
                } else {
                    s = fn(d, t);
                }
                html += `<td class="shift-${s.toLowerCase()}">${s}</td>`;
            });

            tr.innerHTML = html;

            if (d.getTime() === TODAY.getTime()) {
                tr.style.border = "2px solid #1B5E20";
                tr.style.fontWeight = "bold";
            }
            body.appendChild(tr);
        }
    }
}

function renderTableCompare() {
    // --- LÓGICA DO MODAL ---
    // Pega os valores dos selects dentro do modal
    const t1 = document.getElementById('compareTabela1').value;
    const l1 = document.getElementById('compareLetra1').value;
    const t2 = document.getElementById('compareTabela2').value;
    const l2 = document.getElementById('compareLetra2').value;

    const comparisonSources = [
        { tabela: t1, letra: l1 },
        { tabela: t2, letra: l2 }
    ];
    renderTable(document.getElementById('compare-table-body'), null, comparisonSources, 'compare');
}

function renderAll() {
    renderTable(document.getElementById('puma-table-body'), getPumaShift, ['A', 'B', 'C', 'D', 'E'], 'puma');
    renderTable(document.getElementById('ma-table-body'), getMaShift, ['A', 'B', 'C', 'D', 'E'], 'ma');

    // Se a aba comparar estiver ativa, renderiza ela também
    if (document.getElementById('comparar').classList.contains('active')) {
        renderTableCompare();
    }
    updateSelectors();
}

// ============================================================================
// 4. MODAIS (DATA E CONFIGURAÇÃO)
// ============================================================================

// --- Modal de Data ---
let calViewDate = new Date();
let calSelectedDate = new Date();
let calMode = 'days';

function openDateModal() {
    const modal = document.getElementById('date-modal');
    calSelectedDate = new Date(globalCurrentDate);
    calViewDate = new Date(globalCurrentDate);
    calMode = 'days';
    renderCalendar();
    modal.style.display = 'flex';
}

function closeDateModal() {
    document.getElementById('date-modal').style.display = 'none';
}

// --- NOVO: Modal de Comparação (AQUI ESTAVA FALTANDO) ---
function openCompareModal() {
    document.getElementById('compare-modal').style.display = 'flex';
}

function closeCompareModal() {
    document.getElementById('compare-modal').style.display = 'none';
    renderTableCompare(); // Atualiza a tabela ao fechar o modal
}

// --- Lógica do Calendário ---
function renderCalendar() {
    const titleMonth = document.getElementById('calTitleMonth');
    const titleYear = document.getElementById('calTitleYear');
    const weekdays = document.getElementById('calendarWeekdays');
    const content = document.getElementById('calendarGrid');

    titleMonth.innerText = MONTH_NAMES[calViewDate.getMonth()];
    titleYear.innerText = calViewDate.getFullYear();
    content.innerHTML = '';

    if (calMode === 'days') {
        weekdays.style.display = 'grid';
        renderDaysGrid(content);
    } else if (calMode === 'months') {
        weekdays.style.display = 'none';
        renderMonthsGrid(content);
    } else if (calMode === 'years') {
        weekdays.style.display = 'none';
        renderYearsGrid(content);
    }
}

function renderDaysGrid(container) {
    container.className = 'days-grid';
    const y = calViewDate.getFullYear();
    const m = calViewDate.getMonth();
    const firstDay = new Date(y, m, 1).getDay();
    const daysInMonth = new Date(y, m + 1, 0).getDate();

    for (let i = 0; i < firstDay; i++) {
        const div = document.createElement('div');
        div.className = 'calendar-day empty';
        container.appendChild(div);
    }

    for (let d = 1; d <= daysInMonth; d++) {
        const div = document.createElement('div');
        div.className = 'calendar-day';
        div.innerText = d;

        if (d === calSelectedDate.getDate() && m === calSelectedDate.getMonth() && y === calSelectedDate.getFullYear()) {
            div.classList.add('selected');
        }

        const today = new Date();
        if (d === today.getDate() && m === today.getMonth() && y === today.getFullYear()) {
            div.classList.add('today');
        }

        div.onclick = () => {
            calSelectedDate = new Date(y, m, d);
            renderCalendar();
        };
        container.appendChild(div);
    }
}

function renderMonthsGrid(container) {
    container.className = 'month-picker-grid';
    MONTH_NAMES.forEach((name, idx) => {
        const div = document.createElement('div');
        div.className = 'month-picker-item';
        div.innerText = name.substring(0, 3);
        if (idx === calViewDate.getMonth()) div.classList.add('selected');
        div.onclick = () => {
            calViewDate.setMonth(idx);
            calMode = 'days';
            renderCalendar();
        };
        container.appendChild(div);
    });
}

function renderYearsGrid(container) {
    container.className = 'year-picker-grid';
    const currentYear = calViewDate.getFullYear();
    const startYear = currentYear - 5;
    const endYear = currentYear + 6;

    for (let y = startYear; y <= endYear; y++) {
        const div = document.createElement('div');
        div.className = 'year-picker-item';
        div.innerText = y;
        if (y === calViewDate.getFullYear()) div.classList.add('selected');
        div.onclick = () => {
            calViewDate.setFullYear(y);
            calMode = 'months';
            renderCalendar();
        };
        container.appendChild(div);
    }
}

function openMonthPicker() { calMode = (calMode === 'months') ? 'days' : 'months'; renderCalendar(); }
function openYearPicker() { calMode = (calMode === 'years') ? 'days' : 'years'; renderCalendar(); }

function changeCalendarPage(delta) {
    if (calMode === 'days') calViewDate.setMonth(calViewDate.getMonth() + delta);
    else if (calMode === 'months') calViewDate.setFullYear(calViewDate.getFullYear() + delta);
    else if (calMode === 'years') calViewDate.setFullYear(calViewDate.getFullYear() + (delta * 12));
    renderCalendar();
}

function confirmDate() {
    const y = calSelectedDate.getFullYear();
    const m = calSelectedDate.getMonth();
    const d = calSelectedDate.getDate();

    if (y !== globalCurrentDate.getFullYear()) {
        globalCurrentDate.setFullYear(y);
        renderAll();
    }

    globalCurrentDate = new Date(calSelectedDate);
    closeDateModal();

    setTimeout(() => { scrollToDate(globalCurrentDate); }, 100);
    updateSelectors();
}

// ============================================================================
// 5. NAVEGAÇÃO E INTERFACE
// ============================================================================

function getVisibleDateIso() {
    const activeContainer = document.querySelector('.tab-content.active .table-container');
    if (!activeContainer) return null;

    const targetY = activeContainer.scrollTop + (activeContainer.clientHeight / 2);
    const rows = activeContainer.querySelectorAll('tr[id*="date-"]');

    let bestRow = null;
    let minDiff = Infinity;

    for (let row of rows) {
        const diff = Math.abs(row.offsetTop - targetY);
        if (diff < minDiff) {
            minDiff = diff;
            bestRow = row;
        }
    }

    if (bestRow) {
        const match = bestRow.id.match(/date-(\d{4}-\d{2}-\d{2})/);
        return match ? match[1] : null;
    }
    return null;
}

function scrollToDate(date, highlight = true) {
    const iso = toISODate(date);

    const activeTab = document.querySelector('.tab-content.active');
    if (!activeTab) return;

    let prefix = '';
    if (activeTab.id === 'puma') prefix = 'puma';
    else if (activeTab.id === 'monte-alegre') prefix = 'ma';
    else if (activeTab.id === 'comparar') prefix = 'compare';

    const el = document.getElementById(`${prefix}-date-${iso}`);

    if (el) {
        el.scrollIntoView({ behavior: "auto", block: "center" });

        if (highlight) {
            el.classList.add('highlight-flash');
            setTimeout(() => el.classList.remove('highlight-flash'), 2500);
        }
    }
}

function goToToday() {
    globalCurrentDate = new Date(TODAY);
    updateSelectors();
    renderAll();
    setTimeout(() => scrollToDate(TODAY), 100);
}

function jumpToDate() {
    const y = parseInt(document.getElementById('globalYear').value);
    const m = parseInt(document.getElementById('globalMonth').value);

    if (y !== globalCurrentDate.getFullYear()) {
        globalCurrentDate.setFullYear(y);
        renderAll();
    }
    setTimeout(() => {
        scrollToDate(new Date(y, m, 1));
    }, 100);
}

function updateSelectors() {
    const m = document.getElementById('globalMonth');
    const y = document.getElementById('globalYear');
    if (m && y) {
        m.value = globalCurrentDate.getMonth();
        y.value = globalCurrentDate.getFullYear();
    }
}

function updateTabSlider() {
    const activeBtn = document.querySelector('.tab-button.active');
    const slider = document.querySelector('.tab-slider');

    if (activeBtn && slider) {
        slider.style.width = `${activeBtn.offsetWidth}px`;
        slider.style.left = `${activeBtn.offsetLeft}px`;
    }
}

// Troca de Aba
function openTab(e, nm) {
    const currentIso = getVisibleDateIso();

    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    document.querySelectorAll('.tab-button').forEach(b => b.classList.remove('active'));

    document.getElementById(nm).classList.add('active');

    if (e && e.currentTarget) {
        e.currentTarget.classList.add('active');
    } else {
        const btn = document.querySelector(`button[onclick*="'${nm}'"]`);
        if (btn) btn.classList.add('active');
    }

    updateTabSlider();

    // --- LÓGICA DO BOTÃO FAB DE COMPARAÇÃO ---
    const fabCompare = document.getElementById('fab-compare');
    if (nm === 'comparar') {
        renderTableCompare();
        if (fabCompare) fabCompare.style.display = 'flex'; // Mostra o botão
    } else {
        if (fabCompare) fabCompare.style.display = 'none'; // Esconde o botão
    }

    if (currentIso) {
        const [y, m, d] = currentIso.split('-').map(Number);
        const dateObj = new Date(y, m - 1, d);
        scrollToDate(dateObj, false);
    }
}

function switchView(viewName) {
    const home = document.getElementById('home-view');
    const settings = document.getElementById('settings-view');
    const navButtons = document.querySelectorAll('.nav-item');
    const fabContainer = document.getElementById('fab-container');

    home.style.display = 'none';
    settings.style.display = 'none';
    navButtons.forEach(btn => btn.classList.remove('active'));

    if (viewName === 'home') {
        home.style.display = 'block';
        navButtons[0].classList.add('active');
        if (fabContainer) fabContainer.style.display = 'block';
    } else {
        settings.style.display = 'block';
        navButtons[1].classList.add('active');
        if (fabContainer) fabContainer.style.display = 'none';
    }
}

// ============================================================================
// 6. PERSISTÊNCIA E INICIALIZAÇÃO
// ============================================================================

const STORAGE_KEYS = ['globalMonth', 'globalYear', 'compareTabela1', 'compareLetra1', 'compareTabela2', 'compareLetra2'];

function setupAutoSave() {
    STORAGE_KEYS.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('change', () => localStorage.setItem(id, el.value));
        }
    });
}

function loadSavedSettings() {
    STORAGE_KEYS.forEach(id => {
        const savedValue = localStorage.getItem(id);
        const el = document.getElementById(id);
        if (savedValue && el) el.value = savedValue;
    });

    const savedM = localStorage.getItem('globalMonth');
    const savedY = localStorage.getItem('globalYear');
    if (savedM !== null && savedY !== null) {
        globalCurrentDate.setMonth(parseInt(savedM));
        globalCurrentDate.setFullYear(parseInt(savedY));
    }
}

function updateCompareLetras() {
    ['compareLetra1', 'compareLetra2'].forEach(id => {
        const sel = document.getElementById(id);
        if (sel && sel.options.length === 0) {
            ['A', 'B', 'C', 'D', 'E'].forEach(l => sel.add(new Option(l, l)));
        }
    });
}

async function hardReset() {
    if (!confirm("Isso vai apagar os dados salvos e baixar a versão mais nova do app. Continuar?")) return;
    if ('serviceWorker' in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        for (const reg of regs) await reg.unregister();
    }
    if ('caches' in window) {
        const keys = await caches.keys();
        for (const key of keys) await caches.delete(key);
    }
    localStorage.clear();
    window.location.reload(true);
}

// --- FUNÇÃO MAIN ---
function init() {
    // Esses selects antigos podem não existir mais no HTML, então verificamos
    const mSel = document.getElementById('globalMonth');
    const ySel = document.getElementById('globalYear');
    if (mSel && ySel) {
        MONTH_NAMES.forEach((n, i) => mSel.add(new Option(n, i)));
        for (let y = 2024; y <= 2030; y++) ySel.add(new Option(y, y));
    }

    const cTab1 = document.getElementById('compareTabela1');
    const cTab2 = document.getElementById('compareTabela2');
    [cTab1, cTab2].forEach(s => {
        s.add(new Option('Turno PUMA', 'puma'));
        s.add(new Option('Turno Monte Alegre', 'ma'));
    });

    updateCompareLetras();
    loadSavedSettings();
    setupAutoSave();

    renderAll();
    updateSelectors();

    const btnPuma = document.querySelector('button[onclick*="puma"]');
    if (btnPuma) btnPuma.click();

    setTimeout(() => {
        goToToday();
        updateTabSlider();
    }, 500);

    window.addEventListener('resize', updateTabSlider);
}

window.onload = init;