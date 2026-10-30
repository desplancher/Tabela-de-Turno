// ============================================================================
// 1. CONFIGURAÇÕES E CONSTANTES GLOBAIS
// ============================================================================
const MONTH_NAMES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
const DAY_NAMES = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const TODAY = new Date(); TODAY.setHours(0, 0, 0, 0);

let globalCurrentDate = new Date();
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

// ============================================================================
// 2. UTILITÁRIOS E LÓGICA DE NEGÓCIO
// ============================================================================

function toISODate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function diffDays(d1, d2) { return Math.round((d2 - d1) / (1000 * 60 * 60 * 24)); }

function getEaster(y) {
    let f = Math.floor, c = f(y / 100), n = y - 19 * f(y / 19), k = f((c - 17) / 25), i = c - f(c / 4) - f((c - k) / 3) + 19 * n + 15;
    i = i - 30 * f(i / 30); i = i - f(i / 28) * (1 - f(i / 28) * f(29 / (i + 1)) * f((21 - n) / 11));
    let j = y + f(y / 4) + i + 2 - c + f(c / 4); j = j - 7 * f(j / 7);
    let l = i - j, m = 3 + f((l + 40) / 44), d = 1 + l - 31 * f(m / 4); return new Date(y, m - 1, d);
}

function getHolidays(y) {
    if (holidayCache[y]) return holidayCache[y];
    const h = {};

    // Função auxiliar para formatar e adicionar na lista
    const add = (dt, nm) => h[toISODate(dt)] = nm;

    // --- 1. FERIADOS FIXOS ---
    add(new Date(y, 0, 1), "Confraternização Universal"); // 1 jan
    add(new Date(y, 3, 21), "Tiradentes");               // 21 abr
    add(new Date(y, 4, 1), "Dia do Trabalho");            // 1 mai
    add(new Date(y, 8, 7), "Independência do Brasil");    // 7 set
    add(new Date(y, 9, 12), "Nossa Sra. Aparecida");      // 12 out
    add(new Date(y, 10, 2), "Finados");                   // 2 nov
    add(new Date(y, 10, 15), "Proclamação da República"); // 15 nov
    add(new Date(y, 11, 25), "Natal");                    // 25 dez

    // --- 2. FERIADOS MÓVEIS (Baseados na Páscoa) ---
    const pascoa = getEaster(y);

    // Carnaval (Terça-feira): 47 dias antes da Páscoa
    const carnaval = new Date(pascoa);
    carnaval.setDate(pascoa.getDate() - 47);
    add(carnaval, "Carnaval");

    // Sexta-feira Santa: 2 dias antes da Páscoa
    const sextaSanta = new Date(pascoa);
    sextaSanta.setDate(pascoa.getDate() - 2);
    add(sextaSanta, "Sexta-feira Santa");

    // Corpus Christi: 60 dias após a Páscoa
    const corpus = new Date(pascoa);
    corpus.setDate(pascoa.getDate() + 60);
    add(corpus, "Corpus Christi");

    holidayCache[y] = h;
    return h;
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

let lastRenderedYear = new Date().getFullYear();
let firstRenderedYear = new Date().getFullYear();
let isLoadingMore = false;

// Função Principal de Renderização (Limpa e inicia)
function renderTable(body, fn, teams, prefix) {
    if (!body) return;
    body.innerHTML = '';

    // Reseta os limites
    lastRenderedYear = globalCurrentDate.getFullYear();
    firstRenderedYear = lastRenderedYear;

    // Renderiza o ano inicial
    const frag = createYearFragment(lastRenderedYear, fn, teams, prefix);
    body.appendChild(frag);
}

function createYearFragment(year, fn, teams, prefix) {
    const fragment = document.createDocumentFragment();
    const colSpan = teams.length + 2;

    for (let m = 0; m < 12; m++) {
        const trMonth = document.createElement('tr');
        trMonth.className = 'month-separator';
        trMonth.innerHTML = `<td colspan="${colSpan}">${MONTH_NAMES[m]} ${year}</td>`;
        fragment.appendChild(trMonth);

        const lastDay = new Date(year, m + 1, 0).getDate();
        for (let i = 1; i <= lastDay; i++) {
            const d = new Date(year, m, i);
            const iso = toISODate(d);
            const w = d.getDay();
            const hol = isHoliday(d);

            const tr = document.createElement('tr');
            tr.id = `${prefix}-date-${iso}`;

            // --- LÓGICA DE CORES SEPARADA ---

            // Regra 1: Coluna DATA (Só feriado fica vermelho)
            const classData = hol ? 'dia-feriado' : '';

            // Regra 2: Coluna DIA (Feriado OU Fim de semana fica vermelho)
            const isWeekend = (w === 0 || w === 6);
            const classDia = (hol || isWeekend) ? 'dia-feriado' : '';

            // Monta o HTML
            let html = `<td class="${classData}">${d.toLocaleDateString('pt-BR')}</td>`;
            html += `<td class="${classDia}">${DAY_NAMES[w]}</td>`;

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
                // Removemos o style.border antigo e adicionamos a classe CSS
                tr.classList.add('row-today');
            }
            fragment.appendChild(tr);
        }
    }
    return fragment;
}

// Nova Função: Apenas cria as linhas de um ano e adiciona ao final
function appendYearToTable(year, body, fn, teams, prefix) {
    const frag = createYearFragment(year, fn, teams, prefix);
    body.appendChild(frag);
}

// Anexa ano passado (Início da tabela)
function prependYearToTable(year, body, fn, teams, prefix, container) {
    // 1. Salva a altura e a posição atual exata
    const oldHeight = container.scrollHeight;
    const oldScrollTop = container.scrollTop;

    // 2. Cria e insere o novo ano no topo
    const frag = createYearFragment(year, fn, teams, prefix);
    body.insertBefore(frag, body.firstChild);

    // 3. Calcula a diferença de altura criada pelo novo conteúdo
    const newHeight = container.scrollHeight;
    const heightDifference = newHeight - oldHeight;

    // 4. Ajusta a rolagem: Posição Antiga + Altura do Novo Conteúdo
    container.scrollTop = oldScrollTop + heightDifference;
}

function setupInfiniteScroll() {
    const containers = document.querySelectorAll('.table-container');

    containers.forEach(container => {
        container.addEventListener('scroll', () => {
            if (isLoadingMore) return;

            // Detecta fim da página (Futuro)
            const scrollBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
            if (scrollBottom < 600) { // Aumentei um pouco a margem
                loadYear('next', container);
            }

            // Detecta topo da página (Passado)
            if (container.scrollTop < 600) {
                loadYear('prev', container);
            }
        });
    });
}

function loadYear(direction, container) {
    isLoadingMore = true;

    // Identifica parâmetros baseados na aba ativa
    const activeTab = document.querySelector('.tab-content.active');
    let targetBody, fn, teams, prefix;

    if (activeTab.id === 'puma') {
        targetBody = document.getElementById('puma-table-body');
        fn = getPumaShift;
        teams = ['A', 'B', 'C', 'D', 'E'];
        prefix = 'puma';
    } else if (activeTab.id === 'monte-alegre') {
        targetBody = document.getElementById('ma-table-body');
        fn = getMaShift;
        teams = ['A', 'B', 'C', 'D', 'E'];
        prefix = 'ma';
    } else if (activeTab.id === 'comparar') {
        targetBody = document.getElementById('compare-table-body');
        const t1 = document.getElementById('compareTabela1').value;
        const l1 = document.getElementById('compareLetra1').value;
        const t2 = document.getElementById('compareTabela2').value;
        const l2 = document.getElementById('compareLetra2').value;

        fn = null; // Comparação usa lógica interna
        teams = [{ tabela: t1, letra: l1 }, { tabela: t2, letra: l2 }];
        prefix = 'compare';
    }

    if (direction === 'next') {
        lastRenderedYear++;
        appendYearToTable(lastRenderedYear, targetBody, fn, teams, prefix);
    } else {
        firstRenderedYear--;
        // Passamos o container também para fazer o cálculo de scroll
        prependYearToTable(firstRenderedYear, targetBody, fn, teams, prefix, container);
    }

    // Delay para evitar disparos múltiplos
    setTimeout(() => {
        isLoadingMore = false;
    }, 100);
}

function formatCompareLabel(tabela, letra) {
    const map = { 'puma': 'PUMA', 'ma': 'MA' };
    const nomeTabela = map[tabela] || String(tabela).toUpperCase();
    return `${nomeTabela} ${letra}`;
}

function updateCompareHeaders() {
    const t1El = document.getElementById('compareTabela1');
    const l1El = document.getElementById('compareLetra1');
    const t2El = document.getElementById('compareTabela2');
    const l2El = document.getElementById('compareLetra2');
    if (!t1El || !l1El || !t2El || !l2El) return;

    const label1 = formatCompareLabel(t1El.value, l1El.value);
    const label2 = formatCompareLabel(t2El.value, l2El.value);

    const th1 = document.getElementById('compare-th-1');
    const th2 = document.getElementById('compare-th-2');
    const headerTitle = document.getElementById('compare-header-title');

    if (th1) th1.innerText = label1;
    if (th2) th2.innerText = label2;
    if (headerTitle) headerTitle.innerText = `${label1}, ${label2}`;
}

function renderTableCompare() {
    updateCompareHeaders();
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
    const container = document.querySelector('#comparar .table-container');
    const savedScroll = container ? container.scrollTop : 0;
    renderTable(document.getElementById('compare-table-body'), null, comparisonSources, 'compare');
    if (container && savedScroll > 0) container.scrollTop = savedScroll;
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
    const rows = activeContainer.querySelectorAll('tr[id*="-date-"]');

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

    // Pegamos o container que tem a barra de rolagem
    const container = activeTab.querySelector('.table-container');

    if (el && container) {
        // --- CÁLCULO MANUAL (Substitui o scrollIntoView) ---
        // Pega a posição da linha (offsetTop)
        // Subtrai metade da altura da tela (container.clientHeight / 2)
        // Soma metade da altura da linha (el.clientHeight / 2) para centralizar perfeito
        const scrollPosition = el.offsetTop - (container.clientHeight / 2) + (el.clientHeight / 2);

        // Aplica o scroll instantaneamente
        container.scrollTop = scrollPosition;

        if (highlight) {
            // Se for para destacar, remove a classe antiga e adiciona novamente para reiniciar animação
            el.classList.remove('highlight-flash');
            void el.offsetWidth; // Truque para reiniciar animação CSS
            el.classList.add('highlight-flash');

            // Remove a classe depois de 2.5s
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
    // 1. ANTES DE TROCAR: Captura a posição visual exata da aba ATUAL
    const activeTab = document.querySelector('.tab-content.active');
    let savedIso = null;
    let savedOffset = 0;

    if (activeTab) {
        const container = activeTab.querySelector('.table-container');
        if (container) {
            const rows = container.querySelectorAll('tr[id*="date-"]');
            for (let row of rows) {
                const relativeTop = row.offsetTop - container.scrollTop;
                // Pega a primeira linha que está visível na tela
                if (relativeTop >= 0 && relativeTop < container.clientHeight) {
                    const match = row.id.match(/date-(\d{4}-\d{2}-\d{2})/);
                    if (match) {
                        savedIso = match[1];
                        savedOffset = relativeTop;
                        break;
                    }
                }
            }
        }
    }

    // 2. TROCA DE ABAS (Visual)
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    document.querySelectorAll('.tab-button').forEach(b => b.classList.remove('active'));

    if (e && e.currentTarget) e.currentTarget.classList.add('active');
    else {
        const btnId = nm === 'puma' ? 'btn-puma' : (nm === 'monte-alegre' ? 'btn-ma' : 'btn-comparar');
        const btn = document.getElementById(btnId);
        if (btn) btn.classList.add('active');
    }

    const newTab = document.getElementById(nm);
    newTab.classList.add('active');
    updateTabSlider();

    // Lógica do botão flutuante e Renderização Inicial da Comparação
    const fabCompare = document.getElementById('fab-compare');
    if (nm === 'comparar') {
        updateCompareHeaders();
        // SÓ renderiza o padrão se NÃO tivermos uma data salva para sincronizar.
        // Se tiver savedIso, deixamos a lógica de sincronização (passo 3) cuidar disso para não piscar a tela.
        if (!savedIso) {
            renderTableCompare();
        }
        if (fabCompare) fabCompare.style.display = 'flex';
    } else {
        if (fabCompare) fabCompare.style.display = 'none';
    }

    // 3. SINCRONIZAÇÃO INTELIGENTE (Agora funciona para TODAS as abas)
    if (savedIso) {
        const targetYear = parseInt(savedIso.split('-')[0]);

        let prefix = '';
        let targetBody = null;
        let fn = null;
        let teams = null;

        // Configura as variáveis dependendo da aba de destino
        if (nm === 'puma') {
            prefix = 'puma';
            targetBody = document.getElementById('puma-table-body');
            fn = getPumaShift;
            teams = ['A', 'B', 'C', 'D', 'E'];
        } else if (nm === 'monte-alegre') {
            prefix = 'ma';
            targetBody = document.getElementById('ma-table-body');
            fn = getMaShift;
            teams = ['A', 'B', 'C', 'D', 'E'];
        } else if (nm === 'comparar') {
            // Configuração Especial para Comparar
            prefix = 'compare';
            targetBody = document.getElementById('compare-table-body');
            fn = null; // Comparação não usa função única, usa o array de objetos

            // Pega os valores atuais dos selects para montar a tabela correta
            const t1 = document.getElementById('compareTabela1').value;
            const l1 = document.getElementById('compareLetra1').value;
            const t2 = document.getElementById('compareTabela2').value;
            const l2 = document.getElementById('compareLetra2').value;
            teams = [{ tabela: t1, letra: l1 }, { tabela: t2, letra: l2 }];
        }

        if (targetBody) {
            let targetRow = document.getElementById(`${prefix}-date-${savedIso}`);

            // SE A DATA NÃO EXISTE (ou se é a aba comparar precisando renderizar o ano certo)
            if (!targetRow) {
                targetBody.innerHTML = '';

                // Atualiza variáveis globais de scroll
                lastRenderedYear = targetYear;
                firstRenderedYear = targetYear;

                // Cria o ano específico
                const frag = createYearFragment(targetYear, fn, teams, prefix);
                targetBody.appendChild(frag);

                // Tenta pegar a linha novamente
                targetRow = document.getElementById(`${prefix}-date-${savedIso}`);
            }

            // Aplica a rolagem exata
            if (targetRow) {
                const newContainer = newTab.querySelector('.table-container');
                setTimeout(() => {
                    newContainer.scrollTop = targetRow.offsetTop - savedOffset;
                }, 0);
            }
        }
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
    // 1. Configuração dos Selects (Mês/Ano)
    const mSel = document.getElementById('globalMonth');
    const ySel = document.getElementById('globalYear');
    if (mSel && ySel) {
        // Limpa opções antigas para não duplicar se o init rodar 2x
        mSel.innerHTML = '';
        ySel.innerHTML = '';

        MONTH_NAMES.forEach((n, i) => mSel.add(new Option(n, i)));
        for (let y = 2024; y <= 2030; y++) ySel.add(new Option(y, y));
    }

    // 2. Configuração dos Selects de Comparação
    const cTab1 = document.getElementById('compareTabela1');
    const cTab2 = document.getElementById('compareTabela2');
    [cTab1, cTab2].forEach(s => {
        if (s) {
            s.innerHTML = ''; // Limpa antes de adicionar
            s.add(new Option('Turno PUMA', 'puma'));
            s.add(new Option('Turno Monte Alegre', 'ma'));
        }
    });

    updateCompareLetras();
    loadSavedSettings();
    updateCompareHeaders();
    setupAutoSave();

    renderAll();
    updateSelectors();
    setupInfiniteScroll();

    // ===================================================
    // CORREÇÃO AQUI: Adicionando os cliques via JS e Iniciando
    // ===================================================

    // Pegamos os botões pelos IDs novos que você colocou no HTML
    const btnPuma = document.getElementById('btn-puma');
    const btnMa = document.getElementById('btn-ma');
    const btnCompare = document.getElementById('btn-comparar');

    // Adicionamos os eventos (Ouvintes)
    if (btnPuma) btnPuma.addEventListener('click', (e) => openTab(e, 'puma'));
    if (btnMa) btnMa.addEventListener('click', (e) => openTab(e, 'monte-alegre'));
    if (btnCompare) btnCompare.addEventListener('click', (e) => openTab(e, 'comparar'));

    // AUTO-START: Clicamos no botão PUMA para abrir a primeira aba
    // Antes o código buscava por 'onclick', agora usamos a variável direta
    if (btnPuma) {
        btnPuma.click();
    }

    setTimeout(() => {
        goToToday();
        updateTabSlider();
    }, 500);

    window.addEventListener('resize', updateTabSlider);
}

window.onload = init;
