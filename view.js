'use strict';

function renderSchedule(grid, highlightKeys = new Set()) {
    const tbody = document.querySelector('#schedule-table tbody');
    tbody.innerHTML = '';
    const skip = Array(NUM_COLS).fill(0);

    for (let r = 0; r < NUM_ROWS; r++) {
        const tr = document.createElement('tr');

        const timeCell = document.createElement('th');
        timeCell.className = 'time-slot';
        timeCell.scope = 'row';
        timeCell.textContent = TIME_SLOTS[r].label;
        tr.appendChild(timeCell);

        for (let c = 0; c < NUM_COLS; c++) {
            if (skip[c] > 0) {
                skip[c]--;
                continue;
            }
            const cell = grid[r][c];
            const span = cell ? cell.span : 1;
            const td = document.createElement('td');
            td.className = 'subject-cell';
            td.dataset.day = DAYS[c];
            td.dataset.time = TIME_SLOTS[r].id;
            td.dataset.row = r;
            td.dataset.col = c;
            td.tabIndex = 0;
            if (span > 1) td.rowSpan = span;
            td.textContent = cell ? cell.subject : '';
            if (cell && cell.subject !== '') td.classList.add('has-subject');
            if (span > 1) td.classList.add('merged');
            if (highlightKeys.has(`${r},${c}`)) td.classList.add('just-saved');
            tr.appendChild(td);
            skip[c] = span - 1;
        }

        tbody.appendChild(tr);
    }
}

function darkenColor(hex, factor) {
    const clean = hex.replace('#', '');
    const full = clean.length === 3
        ? clean.split('').map(ch => ch + ch).join('')
        : clean;
    const value = parseInt(full, 16);
    const channels = [(value >> 16) & 255, (value >> 8) & 255, value & 255]
        .map(channel => Math.round(channel * factor).toString(16).padStart(2, '0'));
    return `#${channels.join('')}`;
}

function applyNeonColor(hex) {
    const root = document.documentElement.style;
    root.setProperty('--neon-blue', hex);
    root.setProperty('--neon-blue-darker', darkenColor(hex, 0.55));
    const picker = document.getElementById('color-picker');
    picker.value = hex;
    picker.style.borderColor = hex;
    picker.style.boxShadow = `0 0 5px ${hex}`;
}

function showToast(message, duration = 5000) {
    let toast = document.querySelector('.toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.className = 'toast';
        toast.setAttribute('role', 'status');
        document.body.appendChild(toast);
        const hide = () => {
            clearTimeout(toast._hideTimer);
            toast.classList.remove('visible');
        };
        document.addEventListener('click', hide, true);
        window.addEventListener('scroll', hide, { capture: true, passive: true });
    }
    toast.textContent = message;
    requestAnimationFrame(() => toast.classList.add('visible'));
    clearTimeout(toast._hideTimer);
    toast._hideTimer = setTimeout(() => toast.classList.remove('visible'), duration);
}
