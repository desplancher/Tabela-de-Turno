// ============================================================================
// 1. CONFIGURAÇÕES E CONSTANTES GLOBAIS
// ============================================================================
const MONTH_NAMES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
const DAY_NAMES = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const TEAMS = ['A', 'B', 'C', 'D', 'E'];
const TODAY = new Date(); TODAY.setHours(0, 0, 0, 0);

const MAX_COMPARE = 5;          // Máximo de turmas na comparação
const NEXT_FOLGAS_LIMIT = 8;    // Quantas "próximas folgas juntas" mostrar
const NEXT_FOLGAS_DAYS = 365;   // Até quantos dias à frente procurar

let globalCurrentDate = new Date(TODAY);
let holidayCache = {};

// Dados da Tabela PUMA (Âncora: 20/11/2026 - Início da Letra C e demais letras em intervalos de 7 dias)
const PUMA_ANCHOR_DATE = new Date(2026, 10, 20);
const PUMA_CYCLES = {
    A: ['F', '0', '0', '0', '8', '8', 'F', 'F', 'F', 'F', '16', '16', 'F', '0', '0', '8', '8', '8', 'F', 'F', 'F', '16', '16', '16', 'F', '0', '0', '8', '8', 'F', 'F', 'F', 'F', '16', '16'],
    B: ['F', 'F', 'F', '16', '16', 'F', '0', '0', '8', '8', '8', 'F', 'F', 'F', '16', '16', '16', 'F', '0', '0', '8', '8', 'F', 'F', 'F', 'F', '16', '16', 'F', '0', '0', '0', '8', '8', 'F'],
    C: ['16', '16', '16', 'F', '0', '0', '8', '8', 'F', 'F', 'F', 'F', '16', '16', 'F', '0', '0', '0', '8', '8', 'F', 'F', 'F', 'F', '16', '16', 'F', '0', '0', '8', '8', '8', 'F', 'F', 'F'],
    D: ['8', 'F', 'F', 'F', 'F', '16', '16', 'F', '0', '0', '0', '8', '8', 'F', 'F', 'F', 'F', '16', '16', 'F', '0', '0', '8', '8', '8', 'F', 'F', 'F', '16', '16', '16', 'F', '0', '0', '8'],
    E: ['0', '8', '8', '8', 'F', 'F', 'F', '16', '16', '16', 'F', '0', '0', '8', '8', 'F', 'F', 'F', 'F', '16', '16', 'F', '0', '0', '0', '8', '8', 'F', 'F', 'F', 'F', '16', '16', 'F', '0']
};

// Dados da Tabela Monte Alegre
const MA_ANCHOR_DATE = new Date(2025, 2, 15);
const MA_SHIFT_CYCLE = ['F', 'F', 'F', 'F', '0', '0', '8', '8', '16', '16'];
const MA_TEAM_OFFSETS = { A: 0, B: 8, C: 2, D: 6, E: 4 };

const TABLE_LABELS = { puma: 'PUMA', ma: 'MA' };
const TABLE_NAMES = { puma: 'PUMA', ma: 'Monte Alegre' };

// Mapeia o id da aba para o prefixo usado nos ids das linhas (e vice-versa)
const TAB_PREFIX = { 'puma': 'puma', 'monte-alegre': 'ma', 'comparar': 'compare' };
const TAB_BUTTON = { 'puma': 'btn-puma', 'monte-alegre': 'btn-ma', 'comparar': 'btn-comparar' };

// ============================================================================
// 2. UTILITÁRIOS E LÓGICA DE NEGÓCIO
// ============================================================================

const byId = (id) => document.getElementById(id);

// localStorage pode falhar (aba anônima, armazenamento bloqueado): o app funciona mesmo assim
function loadSetting(key, fallback) {
    try {
        const v = localStorage.getItem(key);
        return v === null ? fallback : v;
    } catch (e) { return fallback; }
}
function saveSetting(key, value) {
    try { localStorage.setItem(key, value); } catch (e) { /* ignora */ }
}

function toISODate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function isoToDate(iso) {
    const [y, m, d] = iso.split('-').map(Number);
    return new Date(y, m - 1, d);
}

function diffDays(d1, d2) { return Math.round((d2 - d1) / (1000 * 60 * 60 * 24)); }

function isWeekend(d) { const w = d.getDay(); return w === 0 || w === 6; }

function getEaster(y) {
    let f = Math.floor, c = f(y / 100), n = y - 19 * f(y / 19), k = f((c - 17) / 25), i = c - f(c / 4) - f((c - k) / 3) + 19 * n + 15;
    i = i - 30 * f(i / 30); i = i - f(i / 28) * (1 - f(i / 28) * f(29 / (i + 1)) * f((21 - n) / 11));
    let j = y + f(y / 4) + i + 2 - c + f(c / 4); j = j - 7 * f(j / 7);
    let l = i - j, m = 3 + f((l + 40) / 44), d = 1 + l - 31 * f(m / 4); return new Date(y, m - 1, d);
}

function getHolidays(y) {
    if (holidayCache[y]) return holidayCache[y];
    const h = {};
    const add = (dt, nm) => h[toISODate(dt)] = nm;

    // --- 1. FERIADOS FIXOS ---
    add(new Date(y, 0, 1), "Confraternização Universal"); // 1 jan
    add(new Date(y, 3, 21), "Tiradentes");               // 21 abr
    add(new Date(y, 4, 1), "Dia do Trabalho");            // 1 mai
    add(new Date(y, 8, 7), "Independência do Brasil");    // 7 set
    add(new Date(y, 9, 12), "Nossa Sra. Aparecida");      // 12 out
    add(new Date(y, 10, 2), "Finados");                   // 2 nov
    add(new Date(y, 10, 15), "Proclamação da República"); // 15 nov
    if (y >= 2024) add(new Date(y, 10, 20), "Consciência Negra"); // 20 nov (Lei 14.759/2023)
    add(new Date(y, 11, 25), "Natal");                    // 25 dez

    // --- 2. FERIADOS MÓVEIS (Baseados na Páscoa) ---
    const pascoa = getEaster(y);
    const offset = (days) => new Date(pascoa.getFullYear(), pascoa.getMonth(), pascoa.getDate() + days);
    add(offset(-47), "Carnaval");          // Terça de Carnaval
    add(offset(-2), "Sexta-feira Santa");
    add(offset(60), "Corpus Christi");

    holidayCache[y] = h;
    return h;
}

function isHoliday(d) { return getHolidays(d.getFullYear())[toISODate(d)] || null; }

function getPumaShift(d, t) {
    const idx = ((diffDays(PUMA_ANCHOR_DATE, d) % 35) + 35) % 35;
    return PUMA_CYCLES[t][idx];
}

function getMaShift(d, t) {
    const idx = ((diffDays(MA_ANCHOR_DATE, d) + MA_TEAM_OFFSETS[t]) % 10 + 10) % 10;
    return MA_SHIFT_CYCLE[idx];
}

const SHIFT_FUNCTIONS = { 'puma': getPumaShift, 'ma': getMaShift };

// Uma "turma" é sempre { tabela: 'puma' | 'ma', letra: 'A'..'E' }
function getShift(team, date) { return SHIFT_FUNCTIONS[team.tabela](date, team.letra); }
function teamKey(team) { return `${team.tabela}:${team.letra}`; }
function formatTeamLabel(team) { return `${TABLE_LABELS[team.tabela]} ${team.letra}`; }
function parseTeam(str) {
    const [tabela, letra] = String(str || '').split(':');
    return (SHIFT_FUNCTIONS[tabela] && TEAMS.includes(letra)) ? { tabela, letra } : null;
}

// ============================================================================
// 3. ESTADO (Minha turma e Comparação)
// ============================================================================

let myTeam = null;          // Turma do usuário (ou null)
let compareSources = [];    // Turmas sendo comparadas (2 a 5)

function loadCompareSources() {
    try {
        const saved = JSON.parse(localStorage.getItem('compareSources'));
        if (Array.isArray(saved)) {
            const valid = saved.map(o => o && parseTeam(`${o.tabela}:${o.letra}`)).filter(Boolean);
            if (valid.length >= 2) return valid.slice(0, MAX_COMPARE);
        }
    } catch (e) { /* ignora e usa o padrão */ }

    // Migra o formato antigo (compareTabela1/compareLetra1/compareTabela2/compareLetra2)
    const old = [1, 2].map(i => parseTeam(`${loadSetting('compareTabela' + i, '')}:${loadSetting('compareLetra' + i, '')}`));
    if (old[0] && old[1]) return old;

    // Padrão: minha turma (se houver) contra a turma A da outra fábrica
    const first = myTeam || { tabela: 'puma', letra: 'A' };
    const second = { tabela: first.tabela === 'puma' ? 'ma' : 'puma', letra: 'A' };
    return [first, second];
}

function saveCompareSources() {
    saveSetting('compareSources', JSON.stringify(compareSources));
}

// ============================================================================
// 4. RENDERIZAÇÃO DAS TABELAS
// ============================================================================

// Intervalo de anos renderizado em CADA tabela ({ first, last } ou null)
const renderedYears = { puma: null, ma: null, compare: null };
let isLoadingMore = false;

// Configuração de cada tabela, em um só lugar
function getTableConfig(prefix) {
    if (prefix === 'compare') return { body: byId('compare-table-body'), sources: compareSources };
    if (prefix === 'puma' || prefix === 'ma') {
        return { body: byId(`${prefix}-table-body`), sources: TEAMS.map(letra => ({ tabela: prefix, letra })) };
    }
    return null;
}

function getActivePrefix() {
    const activeTab = document.querySelector('.tab-content.active');
    return activeTab ? TAB_PREFIX[activeTab.id] : null;
}

function getActiveContainer() {
    return document.querySelector('.tab-content.active .table-container');
}

function createYearFragment(year, sources, prefix) {
    const fragment = document.createDocumentFragment();
    const colSpan = sources.length + 2;
    const isCompare = prefix === 'compare';
    const myKey = myTeam ? teamKey(myTeam) : null;

    for (let m = 0; m < 12; m++) {
        const trMonth = document.createElement('tr');
        trMonth.className = 'month-separator';
        trMonth.innerHTML = `<td colspan="${colSpan}">${MONTH_NAMES[m]} ${year}</td>`;
        fragment.appendChild(trMonth);

        const lastDay = new Date(year, m + 1, 0).getDate();
        for (let i = 1; i <= lastDay; i++) {
            const d = new Date(year, m, i);
            const w = d.getDay();
            const hol = isHoliday(d);
            const weekend = isWeekend(d);

            const tr = document.createElement('tr');
            tr.id = `${prefix}-date-${toISODate(d)}`;

            // Coluna DATA: só feriado fica vermelho. Coluna DIA: feriado ou fim de semana.
            let html = `<td class="${hol ? 'dia-feriado' : ''}"${hol ? ` title="${hol}"` : ''}>${d.toLocaleDateString('pt-BR')}</td>`;
            html += `<td class="${(hol || weekend) ? 'dia-feriado' : ''}">${DAY_NAMES[w]}</td>`;

            const shifts = sources.map(s => getShift(s, d));
            shifts.forEach((s, idx) => {
                const mine = myKey && teamKey(sources[idx]) === myKey ? ' my-team-col' : '';
                html += `<td class="shift-${s.toLowerCase()}${mine}">${s}</td>`;
            });
            tr.innerHTML = html;

            // Comparação: destaca os dias em que TODAS as turmas estão de folga
            if (isCompare && shifts.every(s => s === 'F')) {
                tr.classList.add('folga-comum');
                if (hol || weekend) tr.classList.add('folga-fds');
            }

            if (d.getTime() === TODAY.getTime()) tr.classList.add('row-today');
            fragment.appendChild(tr);
        }
    }
    return fragment;
}

// Limpa a tabela e renderiza os anos de "first" até "last"
function renderYearRange(prefix, first, last) {
    const config = getTableConfig(prefix);
    if (!config || !config.body) return;
    config.body.innerHTML = '';
    for (let y = first; y <= last; y++) {
        config.body.appendChild(createYearFragment(y, config.sources, prefix));
    }
    renderedYears[prefix] = { first, last };
}

// Re-renderiza mantendo os anos já carregados (usado ao mudar "minha turma")
function rerenderKeepingRange(prefix) {
    const range = renderedYears[prefix];
    if (range) renderYearRange(prefix, range.first, range.last);
}

// Garante que a linha da data exista na tabela; se não existir, renderiza o ano dela
function ensureDateRendered(prefix, date) {
    const id = `${prefix}-date-${toISODate(date)}`;
    let row = byId(id);
    if (!row) {
        renderYearRange(prefix, date.getFullYear(), date.getFullYear());
        row = byId(id);
    }
    return row;
}

// Guarda qual data está no topo da tela e a distância dela até o topo
function getScrollAnchor(container) {
    if (!container) return null;
    const rows = container.querySelectorAll('tr[id*="-date-"]');
    for (const row of rows) {
        const relativeTop = row.offsetTop - container.scrollTop;
        if (relativeTop >= 0 && relativeTop < container.clientHeight) {
            const match = row.id.match(/date-(\d{4}-\d{2}-\d{2})/);
            if (match) return { iso: match[1], offset: relativeTop };
        }
    }
    return null;
}

function restoreScrollAnchor(container, prefix, anchor) {
    if (!container || !anchor) return;
    const row = byId(`${prefix}-date-${anchor.iso}`);
    if (row) container.scrollTop = row.offsetTop - anchor.offset;
}

// Anexa ano passado (início da tabela) sem a tela "pular"
function prependYearToTable(year, body, sources, prefix, container) {
    const oldHeight = container.scrollHeight;
    const oldScrollTop = container.scrollTop;

    body.insertBefore(createYearFragment(year, sources, prefix), body.firstChild);

    // Compensa a altura do conteúdo novo para manter a mesma data na tela
    container.scrollTop = oldScrollTop + (container.scrollHeight - oldHeight);
}

function setupInfiniteScroll() {
    document.querySelectorAll('.table-container').forEach(container => {
        container.addEventListener('scroll', () => {
            if (isLoadingMore) return;

            // Perto do fim: carrega o próximo ano
            if (container.scrollHeight - container.scrollTop - container.clientHeight < 600) {
                loadYear('next', container);
            }
            // Perto do topo: carrega o ano anterior
            else if (container.scrollTop < 600) {
                loadYear('prev', container);
            }
        });
    });
}

function loadYear(direction, container) {
    // A tabela é identificada pelo container que rolou
    const tab = container.closest('.tab-content');
    const prefix = tab ? TAB_PREFIX[tab.id] : null;
    const range = prefix ? renderedYears[prefix] : null;
    const config = prefix ? getTableConfig(prefix) : null;
    if (!range || !config || !config.body) return;

    isLoadingMore = true;

    if (direction === 'next') {
        range.last++;
        config.body.appendChild(createYearFragment(range.last, config.sources, prefix));
    } else {
        range.first--;
        prependYearToTable(range.first, config.body, config.sources, prefix, container);
    }

    // Libera no próximo quadro, depois que o navegador aplicou a nova rolagem
    requestAnimationFrame(() => { isLoadingMore = false; });
}

// Cabeçalhos das 3 tabelas (marca "minha turma" com ★)
function renderHeaders() {
    const myKey = myTeam ? teamKey(myTeam) : null;
    ['puma', 'ma', 'compare'].forEach(prefix => {
        const row = byId(`${prefix}-head`);
        const config = getTableConfig(prefix);
        if (!row || !config) return;
        row.innerHTML = '<th>Data</th><th>Dia</th>' + config.sources.map(s => {
            const label = prefix === 'compare' ? formatTeamLabel(s) : s.letra;
            const mine = myKey && teamKey(s) === myKey;
            return `<th class="${mine ? 'my-team-col' : ''}">${mine ? '★ ' : ''}${label}</th>`;
        }).join('');
    });

    const title = byId('compare-header-title');
    if (title) title.textContent = 'Comparar: ' + compareSources.map(formatTeamLabel).join(', ');
}

// ============================================================================
// 5. COMPARAÇÃO
// ============================================================================

function findNextCommonDaysOff(sources, from, limit, maxDays) {
    const result = [];
    for (let i = 0; i < maxDays && result.length < limit; i++) {
        const d = new Date(from.getFullYear(), from.getMonth(), from.getDate() + i);
        if (sources.every(s => getShift(s, d) === 'F')) result.push(d);
    }
    return result;
}

function renderNextDaysOff() {
    const el = byId('compare-next');
    if (!el) return;
    el.innerHTML = '';

    const days = findNextCommonDaysOff(compareSources, TODAY, NEXT_FOLGAS_LIMIT, NEXT_FOLGAS_DAYS);
    const label = document.createElement('span');
    label.className = 'next-label';
    label.textContent = days.length ? 'Próximas folgas juntas:' : 'Nenhuma folga em comum nos próximos 12 meses';
    el.appendChild(label);

    days.forEach(d => {
        const special = isWeekend(d) || isHoliday(d);
        const chip = document.createElement('button');
        chip.className = 'next-chip' + (special ? ' fds' : '');
        chip.textContent = `${DAY_NAMES[d.getDay()]} ${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
        chip.title = d.toLocaleDateString('pt-BR') + (isHoliday(d) ? ` (${isHoliday(d)})` : '');
        chip.onclick = () => scrollToDate(d);
        el.appendChild(chip);
    });
}

// preservePosition = true: ao trocar as turmas, mantém os mesmos anos e a mesma data na tela
function renderTableCompare(preservePosition = true) {
    renderHeaders();
    renderNextDaysOff();

    const container = document.querySelector('#comparar .table-container');
    const range = renderedYears.compare;
    const anchor = (preservePosition && range) ? getScrollAnchor(container) : null;

    if (anchor) {
        renderYearRange('compare', range.first, range.last);
        restoreScrollAnchor(container, 'compare', anchor);
    } else {
        const y = globalCurrentDate.getFullYear();
        renderYearRange('compare', y, y);
    }
}

function onCompareChanged() {
    saveCompareSources();
    renderTableCompare(true);
}

// Monta a lista de turmas dentro do modal de comparação
function renderCompareEditor() {
    const list = byId('compare-sources');
    list.innerHTML = '';

    compareSources.forEach((src, i) => {
        const row = document.createElement('div');
        row.className = 'source-row';

        const num = document.createElement('span');
        num.className = 'source-num';
        num.textContent = i + 1;

        const tabSel = document.createElement('select');
        tabSel.className = 'modal-select';
        tabSel.setAttribute('aria-label', `Tabela da turma ${i + 1}`);
        Object.entries(TABLE_NAMES).forEach(([value, name]) => tabSel.add(new Option(name, value)));
        tabSel.value = src.tabela;
        tabSel.onchange = () => { src.tabela = tabSel.value; onCompareChanged(); };

        const letraSel = document.createElement('select');
        letraSel.className = 'modal-select select-letra';
        letraSel.setAttribute('aria-label', `Letra da turma ${i + 1}`);
        TEAMS.forEach(l => letraSel.add(new Option(l, l)));
        letraSel.value = src.letra;
        letraSel.onchange = () => { src.letra = letraSel.value; onCompareChanged(); };

        const rm = document.createElement('button');
        rm.className = 'btn-remove';
        rm.textContent = '✕';
        rm.setAttribute('aria-label', `Remover turma ${i + 1}`);
        rm.disabled = compareSources.length <= 2;
        rm.onclick = () => {
            compareSources.splice(i, 1);
            renderCompareEditor();
            onCompareChanged();
        };

        row.append(num, tabSel, letraSel, rm);
        list.appendChild(row);
    });

    byId('btn-add-source').disabled = compareSources.length >= MAX_COMPARE;
}

function addCompareSource() {
    if (compareSources.length >= MAX_COMPARE) return;
    // Sugere a primeira turma que ainda não está na lista
    const used = new Set(compareSources.map(teamKey));
    let next = { tabela: 'puma', letra: 'A' };
    outer: for (const tabela of Object.keys(TABLE_LABELS)) {
        for (const letra of TEAMS) {
            if (!used.has(`${tabela}:${letra}`)) { next = { tabela, letra }; break outer; }
        }
    }
    compareSources.push(next);
    renderCompareEditor();
    onCompareChanged();
}

function openCompareModal() {
    renderCompareEditor();
    byId('compare-modal').style.display = 'flex';
}

function closeCompareModal() {
    byId('compare-modal').style.display = 'none';
}

function renderAll() {
    const y = globalCurrentDate.getFullYear();
    renderYearRange('puma', y, y);
    renderYearRange('ma', y, y);
    renderTableCompare(false);
}

// ============================================================================
// 6. MODAL DE DATA (CALENDÁRIO)
// ============================================================================

let calViewDate = new Date();
let calSelectedDate = new Date();
let calMode = 'days';

function openDateModal() {
    calSelectedDate = new Date(globalCurrentDate);
    calViewDate = new Date(globalCurrentDate);
    calMode = 'days';
    renderCalendar();
    byId('date-modal').style.display = 'flex';
}

function closeDateModal() {
    byId('date-modal').style.display = 'none';
}

function renderCalendar() {
    const weekdays = byId('calendarWeekdays');
    const content = byId('calendarGrid');

    byId('calTitleMonth').innerText = MONTH_NAMES[calViewDate.getMonth()];
    byId('calTitleYear').innerText = calViewDate.getFullYear();
    content.innerHTML = '';

    weekdays.style.display = calMode === 'days' ? 'grid' : 'none';
    if (calMode === 'days') renderDaysGrid(content);
    else if (calMode === 'months') renderMonthsGrid(content);
    else renderYearsGrid(content);
}

function renderDaysGrid(container) {
    container.className = 'calendar-content days-grid';
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
        if (d === TODAY.getDate() && m === TODAY.getMonth() && y === TODAY.getFullYear()) {
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
    container.className = 'calendar-content month-picker-grid';
    MONTH_NAMES.forEach((name, idx) => {
        const div = document.createElement('div');
        div.className = 'month-picker-item';
        div.innerText = name.substring(0, 3);
        if (idx === calViewDate.getMonth()) div.classList.add('selected');
        div.onclick = () => {
            calViewDate.setDate(1); // evita pular mês (ex.: 31/01 -> fevereiro)
            calViewDate.setMonth(idx);
            calMode = 'days';
            renderCalendar();
        };
        container.appendChild(div);
    });
}

function renderYearsGrid(container) {
    container.className = 'calendar-content year-picker-grid';
    const currentYear = calViewDate.getFullYear();

    for (let y = currentYear - 5; y <= currentYear + 6; y++) {
        const div = document.createElement('div');
        div.className = 'year-picker-item';
        div.innerText = y;
        if (y === currentYear) div.classList.add('selected');
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
    if (calMode === 'days') { calViewDate.setDate(1); calViewDate.setMonth(calViewDate.getMonth() + delta); }
    else if (calMode === 'months') calViewDate.setFullYear(calViewDate.getFullYear() + delta);
    else calViewDate.setFullYear(calViewDate.getFullYear() + (delta * 12));
    renderCalendar();
}

function confirmDate() {
    globalCurrentDate = new Date(calSelectedDate);
    closeDateModal();
    scrollToDate(globalCurrentDate);
}

// ============================================================================
// 7. NAVEGAÇÃO E INTERFACE
// ============================================================================

function scrollToDate(date, highlight = true) {
    const prefix = getActivePrefix();
    const container = getActiveContainer();
    if (!prefix || !container) return;

    // Se o ano da data não estiver na tabela, renderiza
    const el = ensureDateRendered(prefix, date);
    if (!el) return;

    // Centraliza a linha na tela
    container.scrollTop = el.offsetTop - (container.clientHeight / 2) + (el.clientHeight / 2);

    if (highlight) {
        // Reinicia a animação de destaque
        el.classList.remove('highlight-flash');
        void el.offsetWidth;
        el.classList.add('highlight-flash');
        el.addEventListener('animationend', () => el.classList.remove('highlight-flash'), { once: true });
    }
}

function goToToday() {
    globalCurrentDate = new Date(TODAY);
    renderAll();
    scrollToDate(TODAY);
}

function updateTabSlider() {
    const activeBtn = document.querySelector('.tab-button.active');
    const slider = document.querySelector('.tab-slider');
    if (activeBtn && slider) {
        slider.style.width = `${activeBtn.offsetWidth}px`;
        slider.style.left = `${activeBtn.offsetLeft}px`;
    }
}

// Troca de aba, mantendo a mesma data na tela
function openTab(nm) {
    const anchor = getScrollAnchor(getActiveContainer());

    document.querySelectorAll('.tab-content').forEach(c => c.classList.toggle('active', c.id === nm));
    document.querySelectorAll('.tab-button').forEach(b => b.classList.toggle('active', b.id === TAB_BUTTON[nm]));
    updateTabSlider();

    const prefix = TAB_PREFIX[nm];
    const fabCompare = byId('fab-compare');
    if (fabCompare) fabCompare.style.display = prefix === 'compare' ? 'flex' : 'none';

    if (anchor && ensureDateRendered(prefix, isoToDate(anchor.iso))) {
        restoreScrollAnchor(getActiveContainer(), prefix, anchor);
    }
}

// Ao ir para Ajustes a tabela fica escondida e perde a rolagem; guardamos a data para voltar nela
let homeAnchor = null;

function switchView(viewName) {
    const home = byId('home-view');
    const settings = byId('settings-view');
    const fabContainer = byId('fab-container');
    const showHome = viewName === 'home';

    if (!showHome && home.style.display !== 'none') {
        homeAnchor = getScrollAnchor(getActiveContainer());
    }

    home.style.display = showHome ? '' : 'none';
    settings.style.display = showHome ? 'none' : '';
    byId('nav-home').classList.toggle('active', showHome);
    byId('nav-settings').classList.toggle('active', !showHome);
    if (fabContainer) fabContainer.style.display = showHome ? '' : 'none';

    if (showHome) {
        updateTabSlider();
        const prefix = getActivePrefix();
        if (homeAnchor && prefix && ensureDateRendered(prefix, isoToDate(homeAnchor.iso))) {
            restoreScrollAnchor(getActiveContainer(), prefix, homeAnchor);
        }
    }
}

// ============================================================================
// 8. AJUSTES (Minha turma, Tema) E INICIALIZAÇÃO
// ============================================================================

function applyTheme(value) {
    if (value === 'light' || value === 'dark') document.documentElement.setAttribute('data-theme', value);
    else document.documentElement.removeAttribute('data-theme');
}

function setupSettings() {
    // --- Minha turma ---
    const teamSel = byId('setting-my-team');
    if (teamSel) {
        teamSel.add(new Option('Nenhuma', ''));
        Object.entries(TABLE_NAMES).forEach(([tabela, name]) => {
            const group = document.createElement('optgroup');
            group.label = name;
            TEAMS.forEach(letra => group.appendChild(new Option(`${TABLE_LABELS[tabela]} ${letra}`, `${tabela}:${letra}`)));
            teamSel.appendChild(group);
        });
        teamSel.value = myTeam ? teamKey(myTeam) : '';
        teamSel.onchange = () => {
            myTeam = parseTeam(teamSel.value);
            saveSetting('myTeam', myTeam ? teamKey(myTeam) : '');
            renderHeaders();
            ['puma', 'ma', 'compare'].forEach(rerenderKeepingRange);
        };
    }

    // --- Tema ---
    const themeSel = byId('setting-theme');
    if (themeSel) {
        const saved = loadSetting('theme', 'auto');
        themeSel.value = ['light', 'dark'].includes(saved) ? saved : 'auto';
        themeSel.onchange = () => {
            saveSetting('theme', themeSel.value);
            applyTheme(themeSel.value);
        };
    }
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
    try { localStorage.clear(); } catch (e) { /* ignora */ }
    window.location.reload();
}

function init() {
    myTeam = parseTeam(loadSetting('myTeam', ''));
    compareSources = loadCompareSources();

    setupSettings();
    renderHeaders();
    renderAll();
    setupInfiniteScroll();

    Object.entries(TAB_BUTTON).forEach(([tab, btnId]) => {
        const btn = byId(btnId);
        if (btn) btn.addEventListener('click', () => openTab(tab));
    });

    openTab('puma');
    scrollToDate(TODAY, false);

    // A fonte Inter muda a altura das linhas quando termina de carregar: centraliza de novo em "hoje"
    if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(() => {
            updateTabSlider();
            scrollToDate(TODAY);
        });
    }

    window.addEventListener('resize', updateTabSlider);
}

init();
