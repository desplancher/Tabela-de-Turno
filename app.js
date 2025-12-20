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
function init() {
    // 1. Cria as opções de Mês e Ano
    const mSel = document.getElementById('globalMonth');
    MONTH_NAMES.forEach((n, i) => mSel.add(new Option(n, i)));

    const ySel = document.getElementById('globalYear');
    for (let y = 2024; y <= 2030; y++) ySel.add(new Option(y, y));

    // 2. Cria as opções de Tabelas (PUMA/Monte Alegre)
    const cTab1 = document.getElementById('compareTabela1');
    const cTab2 = document.getElementById('compareTabela2');
    [cTab1, cTab2].forEach(s => {
        s.add(new Option('Turno PUMA', 'puma'));
        s.add(new Option('Turno Monte Alegre', 'ma'));
    });

    // 3. CRÍTICO: Cria as letras (A, B, C...) ANTES de carregar os dados
    updateCompareLetras();

    // 4. AGORA carrega os dados salvos (porque as opções já existem)
    loadSavedSettings();
    setupAutoSave();

    // 5. Renderiza a tela final
    renderAll();
    updateSelectors();

    // Botão inicial (mantido do seu código original)
    const btnPuma = document.querySelector('button[onclick*="puma"]');
    if (btnPuma) {
        // Opcional: Você pode salvar a aba ativa no localStorage também se quiser futuramente
        btnPuma.click();
    }
    // 6. Vai para hoje após meio segundo (para garantir que tudo carregou)
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
window.onload = init;