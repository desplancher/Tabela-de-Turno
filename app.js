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

// --- Renderização de Tabelas (AGORA ANUAL) ---
function renderTable(body, fn, teams) {
    if (!body) return;
    body.innerHTML = '';

    // Pega o ano selecionado (ignora o mês para renderizar, faz o ano todo)
    const y = globalCurrentDate.getFullYear();
    const colSpan = teams.length + 2; // Calcula colunas para a linha do mês

    // Loop de 0 (Janeiro) a 11 (Dezembro)
    for (let m = 0; m < 12; m++) {

        // 1. Cria a linha separadora do Mês
        const trMonth = document.createElement('tr');
        trMonth.className = 'month-separator';
        trMonth.innerHTML = `<td colspan="${colSpan}">${MONTH_NAMES[m]} ${y}</td>`;
        body.appendChild(trMonth);

        // 2. Loop dos dias desse mês
        const lastDay = new Date(y, m + 1, 0).getDate();

        for (let i = 1; i <= lastDay; i++) {
            const d = new Date(y, m, i);
            const iso = toISODate(d);
            const w = d.getDay();
            const hol = isHoliday(d);

            const tr = document.createElement('tr');
            // ADICIONA ID NA LINHA PARA PODERMOS ROLAR ATÉ ELA
            tr.id = `date-${iso}`;

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

            // Marca visualmente o dia de hoje
            if (d.getTime() === TODAY.getTime()) {
                tr.style.border = "2px solid #1B5E20";
                tr.style.fontWeight = "bold";
            }

            body.appendChild(tr);
        }
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

// --- Novas Funções de Navegação ---

function scrollToDate(date) {
    const iso = toISODate(date);
    // Tenta encontrar a linha com o ID da data
    const el = document.getElementById(`date-${iso}`);

    if (el) {
        // Rola suavemente até o elemento e o coloca no centro da tela
        el.scrollIntoView({ behavior: "smooth", block: "center" });

        // Adiciona o efeito de flash amarelo
        el.classList.add('highlight-flash');
        setTimeout(() => el.classList.remove('highlight-flash'), 2500);
    }
}

function goToToday() {
    // 1. Atualiza a data global para Hoje
    globalCurrentDate = new Date(TODAY);

    // 2. Atualiza os selects visualmente
    updateSelectors();

    // 3. Renderiza o ano atual (caso esteja em outro ano)
    renderAll();

    // 4. Espera um pouquinho (100ms) para a tabela desenhar e rola até hoje
    setTimeout(() => scrollToDate(TODAY), 100);
}
function jumpToDate() {
    // Pega valores dos selects
    const y = parseInt(document.getElementById('globalYear').value);
    const m = parseInt(document.getElementById('globalMonth').value);

    // Se mudou de ano, precisa renderizar tudo de novo
    if (y !== globalCurrentDate.getFullYear()) {
        globalCurrentDate.setFullYear(y);
        renderAll();
    }

    // Se for o mesmo ano, apenas rola até o dia 1º do mês selecionado
    // (Pequeno delay para garantir que o DOM existe)
    setTimeout(() => {
        const targetDate = new Date(y, m, 1);
        scrollToDate(targetDate);
    }, 100);
}

function updateSelectors() {
    document.getElementById('globalMonth').value = globalCurrentDate.getMonth();
    document.getElementById('globalYear').value = globalCurrentDate.getFullYear();
}

// --- Inicialização ---
// --- Inicialização (Versão Híbrida: Antigo + Novo) ---
function init() {
    // 1. CARREGA O SISTEMA ANTIGO (Hidden)
    const mSel = document.getElementById('globalMonth');
    MONTH_NAMES.forEach((n, i) => mSel.add(new Option(n, i)));

    const ySel = document.getElementById('globalYear');
    for (let y = 2024; y <= 2030; y++) ySel.add(new Option(y, y));

    // 2. CARREGA O SISTEMA NOVO (Modal)
    const modalMSel = document.getElementById('modalMonth');
    MONTH_NAMES.forEach((n, i) => modalMSel.add(new Option(n, i)));

    const modalYSel = document.getElementById('modalYear');
    for (let y = 2024; y <= 2030; y++) modalYSel.add(new Option(y, y));

    // 3. Configurações Comuns
    const cTab1 = document.getElementById('compareTabela1');
    const cTab2 = document.getElementById('compareTabela2');
    [cTab1, cTab2].forEach(s => {
        s.add(new Option('Turno PUMA', 'puma'));
        s.add(new Option('Turno Monte Alegre', 'ma'));
    });

    updateCompareLetras();
    loadSavedSettings();
    setupAutoSave();

    // 4. Inicia
    renderAll();
    updateSelectors(); // Mantém o antigo sincronizado

    // Botão inicial (se existir)
    const btnPuma = document.querySelector('button[onclick*="puma"]');
    if (btnPuma) btnPuma.click();

    setTimeout(() => {
        goToToday();
    }, 500);
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
// --- Navegação Inferior ---
function switchView(viewName) {
    const home = document.getElementById('home-view');
    const settings = document.getElementById('settings-view');
    const navButtons = document.querySelectorAll('.nav-item');

    // 1. Esconde tudo
    home.style.display = 'none';
    settings.style.display = 'none';

    // 2. Remove a classe 'active' dos botões
    navButtons.forEach(btn => btn.classList.remove('active'));

    // 3. Mostra a tela certa e ativa o botão certo
    if (viewName === 'home') {
        home.style.display = 'block';
        navButtons[0].classList.add('active'); // Botão Início
    } else {
        settings.style.display = 'block';
        navButtons[1].classList.add('active'); // Botão Ajustes
    }
}

async function hardReset() {
    if (!confirm("Isso vai apagar os dados salvos e baixar a versão mais nova do app. Continuar?")) return;

    // 1. Remove o Service Worker (para parar de usar a versão velha)
    if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const registration of registrations) {
            await registration.unregister();
        }
    }

    // 2. Apaga o Cache (arquivos antigos: html, css, js)
    if ('caches' in window) {
        const keys = await caches.keys();
        for (const key of keys) {
            await caches.delete(key);
        }
    }

    // 3. Limpa o LocalStorage (suas configurações salvas)
    localStorage.clear();

    // 4. Recarrega a página forçando o download do servidor
    window.location.reload(true);
}

// --- LÓGICA DO NOVO MODAL (Adicionado) ---

function openDateModal() {
    const modal = document.getElementById('date-modal');

    // Pega a data atual do sistema
    const curYear = globalCurrentDate.getFullYear();
    const curMonth = globalCurrentDate.getMonth();
    const curDay = globalCurrentDate.getDate();

    // Preenche os selects do modal
    document.getElementById('modalYear').value = curYear;
    document.getElementById('modalMonth').value = curMonth;

    updateModalDays(); // Calcula os dias (28, 30, 31)
    document.getElementById('modalDay').value = curDay;

    modal.style.display = 'flex';
}

function closeDateModal() {
    document.getElementById('date-modal').style.display = 'none';
}

function updateModalDays() {
    const year = parseInt(document.getElementById('modalYear').value);
    const month = parseInt(document.getElementById('modalMonth').value);
    const daySelect = document.getElementById('modalDay');
    const currentSelection = parseInt(daySelect.value) || 1;

    // Descobre o último dia do mês
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    daySelect.innerHTML = '';
    for (let i = 1; i <= daysInMonth; i++) {
        daySelect.add(new Option(i, i));
    }

    // Mantém o dia selecionado se possível
    if (currentSelection <= daysInMonth) {
        daySelect.value = currentSelection;
    } else {
        daySelect.value = 1;
    }
}

function confirmDate() {
    const y = parseInt(document.getElementById('modalYear').value);
    const m = parseInt(document.getElementById('modalMonth').value);
    const d = parseInt(document.getElementById('modalDay').value);

    // Se mudou de ano, renderiza tudo
    if (y !== globalCurrentDate.getFullYear()) {
        globalCurrentDate.setFullYear(y);
        renderAll();
    }

    globalCurrentDate.setMonth(m);
    globalCurrentDate.setDate(d);

    closeDateModal();

    // Rola até a data
    setTimeout(() => {
        scrollToDate(new Date(y, m, d));
    }, 100);

    // Atualiza os selects antigos (invisíveis) para manter consistência
    updateSelectors();
}

// --- LÓGICA DO CALENDÁRIO VISUAL (NOVO) ---

// --- LÓGICA DO CALENDÁRIO COM SELETORES ---

let calViewDate = new Date();     // Data que está sendo visualizada (Mês/Ano)
let calSelectedDate = new Date(); // Data que o usuário clicou (Dia específico)
let calMode = 'days';             // 'days', 'months', 'years'

function openDateModal() {
    const modal = document.getElementById('date-modal');

    // Inicia com a data atual selecionada
    calSelectedDate = new Date(globalCurrentDate);
    calViewDate = new Date(globalCurrentDate);

    // Começa sempre mostrando os dias
    calMode = 'days';
    renderCalendar();

    modal.style.display = 'flex';
}

// Função Central que decide o que desenhar
function renderCalendar() {
    const titleMonth = document.getElementById('calTitleMonth');
    const titleYear = document.getElementById('calTitleYear');
    const weekdays = document.getElementById('calendarWeekdays');
    const content = document.getElementById('calendarGrid');

    // Atualiza Textos do Cabeçalho
    titleMonth.innerText = MONTH_NAMES[calViewDate.getMonth()];
    titleYear.innerText = calViewDate.getFullYear();

    content.innerHTML = ''; // Limpa conteúdo

    if (calMode === 'days') {
        // MODO DIAS
        weekdays.style.display = 'grid'; // Mostra Seg, Ter, Qua...
        renderDaysGrid(content);

    } else if (calMode === 'months') {
        // MODO MESES
        weekdays.style.display = 'none'; // Esconde dias da semana
        renderMonthsGrid(content);

    } else if (calMode === 'years') {
        // MODO ANOS
        weekdays.style.display = 'none';
        renderYearsGrid(content);
    }
}

// 1. Desenha a grade de Dias (1 a 31)
function renderDaysGrid(container) {
    container.className = 'days-grid'; // Aplica CSS de grid de 7 colunas

    const y = calViewDate.getFullYear();
    const m = calViewDate.getMonth();
    const firstDay = new Date(y, m, 1).getDay();
    const daysInMonth = new Date(y, m + 1, 0).getDate();

    // Espaços vazios
    for (let i = 0; i < firstDay; i++) {
        const div = document.createElement('div');
        div.className = 'calendar-day empty';
        container.appendChild(div);
    }

    // Dias Reais
    for (let d = 1; d <= daysInMonth; d++) {
        const div = document.createElement('div');
        div.className = 'calendar-day';
        div.innerText = d;

        // Selecionado
        if (d === calSelectedDate.getDate() && m === calSelectedDate.getMonth() && y === calSelectedDate.getFullYear()) {
            div.classList.add('selected');
        }
        // Hoje
        const today = new Date();
        if (d === today.getDate() && m === today.getMonth() && y === today.getFullYear()) {
            div.classList.add('today');
        }

        div.onclick = () => {
            calSelectedDate = new Date(y, m, d);
            renderCalendar(); // Redesenha para atualizar bolinha
        };
        container.appendChild(div);
    }
}

// 2. Desenha a grade de Meses (Jan a Dez)
function renderMonthsGrid(container) {
    container.className = 'month-picker-grid'; // Aplica CSS de 3 colunas

    MONTH_NAMES.forEach((name, idx) => {
        const div = document.createElement('div');
        div.className = 'month-picker-item';
        div.innerText = name.substring(0, 3); // "Jan", "Fev"...

        if (idx === calViewDate.getMonth()) {
            div.classList.add('selected');
        }

        div.onclick = () => {
            calViewDate.setMonth(idx); // Muda o mês
            calMode = 'days';          // Volta para ver os dias
            renderCalendar();
        };
        container.appendChild(div);
    });
}

// 3. Desenha a grade de Anos (12 anos ao redor do atual)
function renderYearsGrid(container) {
    container.className = 'year-picker-grid'; // Aplica CSS de 4 colunas

    const currentYear = calViewDate.getFullYear();
    // Mostra 12 anos: 5 antes e 6 depois do atual
    const startYear = currentYear - 5;
    const endYear = currentYear + 6;

    for (let y = startYear; y <= endYear; y++) {
        const div = document.createElement('div');
        div.className = 'year-picker-item';
        div.innerText = y;

        if (y === calViewDate.getFullYear()) {
            div.classList.add('selected');
        }

        div.onclick = () => {
            calViewDate.setFullYear(y); // Muda o ano
            calMode = 'months';         // Vai para seleção de mês (fluxo natural)
            renderCalendar();
        };
        container.appendChild(div);
    }
}

// Funções de Clique nos Títulos
function openMonthPicker() {
    calMode = (calMode === 'months') ? 'days' : 'months'; // Alterna
    renderCalendar();
}

function openYearPicker() {
    calMode = (calMode === 'years') ? 'days' : 'years'; // Alterna
    renderCalendar();
}

// Navegação das Setas (< >)
function changeCalendarPage(delta) {
    if (calMode === 'days') {
        // Avança/Recua Mês
        calViewDate.setMonth(calViewDate.getMonth() + delta);
    } else if (calMode === 'months') {
        // Avança/Recua Ano
        calViewDate.setFullYear(calViewDate.getFullYear() + delta);
    } else if (calMode === 'years') {
        // Avança/Recua Bloco de 12 Anos
        calViewDate.setFullYear(calViewDate.getFullYear() + (delta * 12));
    }
    renderCalendar();
}

// Substitui a função confirmDate antiga para usar as variáveis do calendário visual
function confirmDate() {
    // Se mudou de ano, renderiza tudo
    if (calSelectedDate.getFullYear() !== globalCurrentDate.getFullYear()) {
        globalCurrentDate.setFullYear(calSelectedDate.getFullYear());
        renderAll();
    }

    // Aplica a data selecionada no visual para o sistema global
    globalCurrentDate = new Date(calSelectedDate);

    closeDateModal();

    // Rola até a data
    setTimeout(() => {
        scrollToDate(globalCurrentDate);
    }, 100);

    // Mantém os selects ocultos atualizados (caso decida voltar pro antigo)
    updateSelectors();
}

// Atualização auxiliar para manter compatibilidade com o sistema antigo oculto
function updateSelectors() {
    // Se os elementos existirem (estão ocultos, mas existem), atualiza eles
    const m = document.getElementById('globalMonth');
    const y = document.getElementById('globalYear');
    if (m && y) {
        m.value = globalCurrentDate.getMonth();
        y.value = globalCurrentDate.getFullYear();
    }
}

window.onload = init;