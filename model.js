'use strict';

const DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

const TIME_SLOTS = [
    { id: 1, label: '07:50 A 8:40' },
    { id: 2, label: '8:45 A 9:35' },
    { id: 3, label: '9:35 A 10:25' },
    { id: 4, label: '10:30 A 11:20' },
    { id: 5, label: '11:20 A 12:10' },
    { id: 6, label: '12:15 A 1:10' },
    { id: 7, label: '1:10 A 2:00' },
    { id: 8, label: '2:00 A 2:50' },
    { id: 9, label: '2:55 A 3:45' },
    { id: 10, label: '3:45 A 5:10' },
    { id: 11, label: '5:10 A 6:30' }
];

const NUM_ROWS = TIME_SLOTS.length;
const NUM_COLS = DAYS.length;
const STORAGE_KEY = 'horario-uneg-v2';
const COLOR_KEY = 'horario-uneg-color';
const DEFAULT_COLOR = '#6600ff';

function createEmptyGrid() {
    return Array.from({ length: NUM_ROWS }, () => Array(NUM_COLS).fill(null));
}

function resolveCell(grid, row, col) {
    const cell = grid[row][col];
    if (cell) return { row, col, cell };
    for (let r = row - 1; r >= 0; r--) {
        const candidate = grid[r][col];
        if (candidate && candidate.span > row - r) {
            return { row: r, col, cell: candidate };
        }
    }
    return null;
}

function applyEdit(grid, selections, subject) {
    const next = grid.map(row => row.slice());
    const byColumn = new Map();

    for (const { row, col } of selections) {
        if (!byColumn.has(col)) byColumn.set(col, []);
        byColumn.get(col).push(row);
        const cell = grid[row][col];
        const span = cell ? cell.span : 1;
        for (let r = row + 1; r < row + span; r++) {
            byColumn.get(col).push(r);
        }
    }

    byColumn.forEach((rows, col) => {
        rows.sort((a, b) => a - b);
        const blocks = [];
        let start = rows[0];
        let end = rows[0];
        for (let i = 1; i < rows.length; i++) {
            if (rows[i] === end + 1) {
                end = rows[i];
            } else {
                blocks.push([start, end]);
                start = end = rows[i];
            }
        }
        blocks.push([start, end]);

        for (const [blockStart, blockEnd] of blocks) {
            const top = resolveCell(next, blockStart, col);
            const oldSpan = top ? top.cell.span : 1;
            const clearEnd = Math.max(blockEnd, blockStart + oldSpan - 1);
            for (let r = blockStart; r <= clearEnd; r++) next[r][col] = null;
            if (subject !== '') {
                next[blockStart][col] = { subject, span: blockEnd - blockStart + 1 };
            }
        }
    });

    return next;
}

function validateGrid(data) {
    if (!Array.isArray(data) || data.length !== NUM_ROWS) return createEmptyGrid();
    return data.map((row, r) => {
        if (!Array.isArray(row)) return Array(NUM_COLS).fill(null);
        return Array.from({ length: NUM_COLS }, (_, col) => {
            const cell = row[col];
            if (!cell || typeof cell !== 'object') return null;
            const span = Math.max(1, parseInt(cell.span, 10) || 1);
            const subject = cell.subject === undefined || cell.subject === null ? '' : String(cell.subject);
            return { subject, span: Math.min(span, NUM_ROWS - r) };
        });
    });
}

function loadGrid() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? validateGrid(JSON.parse(raw)) : createEmptyGrid();
    } catch (error) {
        return createEmptyGrid();
    }
}

function saveGrid(grid) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(grid));
    } catch (error) {
        console.error('No se pudo guardar el horario:', error);
    }
}

function loadColor() {
    try {
        const saved = localStorage.getItem(COLOR_KEY);
        return saved && /^#[0-9a-fA-F]{6}$/.test(saved) ? saved : DEFAULT_COLOR;
    } catch (error) {
        return DEFAULT_COLOR;
    }
}

function saveColor(hex) {
    try {
        localStorage.setItem(COLOR_KEY, hex);
    } catch (error) {
        console.error('No se pudo guardar el color:', error);
    }
}
