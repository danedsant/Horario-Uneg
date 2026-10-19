'use strict';

const SUBJECT_MAX_LENGTH = 40;

document.addEventListener('DOMContentLoaded', () => {
    const modal = document.getElementById('add-subject-modal');
    const closeModalButton = modal.querySelector('.close-button');
    const selectedCellInfo = document.getElementById('selected-cell-info');
    const subjectInput = document.getElementById('subject-name');
    const confirmButton = document.getElementById('confirm-add-subject');
    const tableBody = document.querySelector('#schedule-table tbody');
    const addSubjectButton = document.getElementById('add-subject-btn');
    const selectionCounter = document.getElementById('selection-counter');
    const tableHint = document.getElementById('table-hint');
    const autosaveIndicator = document.getElementById('autosave-indicator');
    const containerToExport = document.querySelector('.schedule-area');
    const colorPicker = document.getElementById('color-picker');
    const exportPngButton = document.getElementById('export-png-btn');
    const exportJsonButton = document.getElementById('export-json-btn');
    const importJsonButton = document.getElementById('import-json-btn');
    const importJsonInput = document.getElementById('import-json-input');
    const clearScheduleButton = document.getElementById('clear-schedule-btn');
    const undoButton = document.getElementById('undo-btn');
    const redoButton = document.getElementById('redo-btn');

    const confirmClearModal = document.getElementById('confirm-clear-modal');
    const confirmClearButton = document.getElementById('confirm-clear-btn');
    const cancelClearButton = document.getElementById('cancel-clear-btn');
    const closeConfirmClearButton = confirmClearModal.querySelector('.close-button');

    let grid = loadGrid();
    let selectedCells = new Set();
    let anchorCell = null;
    let isModalOpen = false;
    let isClearModalOpen = false;
    let lastFocusedElement = null;
    let autosaveTimer = null;

    const historyLimit = 50;
    let history = [grid];
    let historyIndex = 0;

    renderSchedule(grid);
    applyNeonColor(loadColor());
    updateSelectionUi();
    updateHistoryButtons();

    function updateSelectionUi() {
        addSubjectButton.disabled = selectedCells.size === 0;
        selectionCounter.hidden = selectedCells.size === 0;
        if (selectedCells.size > 0) {
            selectionCounter.textContent = selectedCells.size === 1
                ? '1 seleccionada'
                : `${selectedCells.size} seleccionadas`;
            tableHint.textContent = 'Pulsa «Añadir Materia» para editarlas · Esc para quitar la selección';
            tableHint.classList.add('active');
        } else {
            tableHint.textContent = 'Selecciona celdas con clic (Ctrl o Shift + clic para varias) · Doble clic o Enter editan una celda.';
            tableHint.classList.remove('active');
        }
    }

    function toggleSelection(cell, additive) {
        if (!additive) {
            selectedCells.forEach(current => {
                if (current !== cell) current.classList.remove('selected');
            });
            selectedCells.clear();
            if (!cell.classList.contains('selected')) cell.classList.add('selected');
            selectedCells.add(cell);
        } else if (selectedCells.has(cell)) {
            cell.classList.remove('selected');
            selectedCells.delete(cell);
        } else {
            cell.classList.add('selected');
            selectedCells.add(cell);
        }
        updateSelectionUi();
    }

    function selectRange(fromCell, toCell) {
        const r1 = Math.min(+fromCell.dataset.row, +toCell.dataset.row);
        const r2 = Math.max(+fromCell.dataset.row, +toCell.dataset.row);
        const c1 = Math.min(+fromCell.dataset.col, +toCell.dataset.col);
        const c2 = Math.max(+fromCell.dataset.col, +toCell.dataset.col);
        tableBody.querySelectorAll('.subject-cell').forEach(td => {
            const r = +td.dataset.row;
            const c = +td.dataset.col;
            if (r >= r1 && r <= r2 && c >= c1 && c <= c2) {
                td.classList.add('selected');
                selectedCells.add(td);
            }
        });
        updateSelectionUi();
    }

    function clearSelection() {
        selectedCells.forEach(cell => cell.classList.remove('selected'));
        selectedCells.clear();
        anchorCell = null;
        updateSelectionUi();
    }

    function editCell(cell) {
        clearSelection();
        toggleSelection(cell, false);
        anchorCell = cell;
        openModal();
    }

    function openModal() {
        if (selectedCells.size === 0 || isModalOpen || isClearModalOpen) return;
        isModalOpen = true;
        lastFocusedElement = document.activeElement;

        if (selectedCells.size === 1) {
            const cell = selectedCells.values().next().value;
            const row = Number(cell.dataset.row);
            const col = Number(cell.dataset.col);
            const slot = TIME_SLOTS[row];
            const entry = grid[row][col];
            const span = entry ? entry.span : 1;

            if (span > 1) {
                const lastSlot = TIME_SLOTS[Math.min(row + span - 1, NUM_ROWS - 1)];
                selectedCellInfo.textContent = `Editando: ${DAYS[col]} - Hora ${slot.id} a ${lastSlot.id} (${slot.label})`;
            } else {
                selectedCellInfo.textContent = `Editando: ${DAYS[col]} - Hora ${slot.id} (${slot.label})`;
            }
            subjectInput.value = entry ? entry.subject : '';
        } else {
            const byDay = new Map();
            selectedCells.forEach(cell => {
                const day = cell.dataset.day;
                byDay.set(day, (byDay.get(day) || 0) + 1);
            });
            const summary = [...byDay.entries()].map(([day, count]) => `${day} (${count})`).join(', ');
            selectedCellInfo.textContent = `Editando ${selectedCells.size} celdas: ${summary}`;
            subjectInput.value = '';
        }

        modal.style.display = 'block';
        subjectInput.focus();
        subjectInput.select();
    }

    function closeModal() {
        modal.style.display = 'none';
        subjectInput.value = '';
        selectedCellInfo.textContent = '';
        isModalOpen = false;
        if (lastFocusedElement) lastFocusedElement.focus();
    }

    function applySubject() {
        if (selectedCells.size === 0) return;
        const subject = subjectInput.value.trim().slice(0, SUBJECT_MAX_LENGTH);
        const selections = [...selectedCells].map(cell => ({
            row: Number(cell.dataset.row),
            col: Number(cell.dataset.col)
        }));

        grid = applyEdit(grid, selections, subject);

        const highlighted = new Set();
        selections.forEach(({ row, col }) => {
            const entry = grid[row][col];
            if (entry) {
                highlighted.add(`${row},${col}`);
            } else {
                const parent = resolveCell(grid, row, col);
                if (parent) highlighted.add(`${parent.row},${parent.col}`);
            }
        });

        commitHistory();
        renderSchedule(grid, highlighted);
        saveGrid(grid);
        showAutosave();
        setTimeout(() => {
            tableBody.querySelectorAll('.just-saved').forEach(td => td.classList.remove('just-saved'));
        }, 900);
        clearSelection();
        closeModal();
    }

    function commitHistory() {
        history = history.slice(0, historyIndex + 1);
        history.push(grid);
        if (history.length > historyLimit) history.shift();
        historyIndex = history.length - 1;
        updateHistoryButtons();
    }

    function undo() {
        if (historyIndex <= 0) return;
        historyIndex--;
        grid = history[historyIndex];
        renderSchedule(grid);
        saveGrid(grid);
        showAutosave();
        clearSelection();
        updateHistoryButtons();
        showToast('Cambio deshecho');
    }

    function redo() {
        if (historyIndex >= history.length - 1) return;
        historyIndex++;
        grid = history[historyIndex];
        renderSchedule(grid);
        saveGrid(grid);
        showAutosave();
        clearSelection();
        updateHistoryButtons();
        showToast('Cambio rehecho');
    }

    function updateHistoryButtons() {
        undoButton.disabled = historyIndex <= 0;
        redoButton.disabled = historyIndex >= history.length - 1;
    }

    function showAutosave() {
        autosaveIndicator.textContent = '● Guardado automáticamente';
        autosaveIndicator.classList.add('visible');
        clearTimeout(autosaveTimer);
        autosaveTimer = setTimeout(() => autosaveIndicator.classList.remove('visible'), 2200);
    }

    function openClearConfirm() {
        if (isModalOpen || isClearModalOpen) return;
        isClearModalOpen = true;
        lastFocusedElement = document.activeElement;
        confirmClearModal.style.display = 'block';
        confirmClearButton.focus();
    }

    function closeClearConfirm() {
        confirmClearModal.style.display = 'none';
        isClearModalOpen = false;
        if (lastFocusedElement) lastFocusedElement.focus();
    }

    function confirmClear() {
        closeClearConfirm();
        grid = createEmptyGrid();
        commitHistory();
        renderSchedule(grid);
        saveGrid(grid);
        showAutosave();
        clearSelection();
        showToast('Horario borrado. Usa Ctrl+Z para deshacer.');
    }

    function getSemesterTitle() {
        const now = new Date();
        const month = now.getMonth();
        const period = month >= 3 && month <= 6 ? 1 : 2;
        return `Semestre ${now.getFullYear()}-${period}`;
    }

    tableBody.addEventListener('click', event => {
        const cell = event.target.closest('.subject-cell');
        if (!cell || isModalOpen || isClearModalOpen) return;
        if (event.shiftKey) {
            if (anchorCell && anchorCell !== cell) {
                selectRange(anchorCell, cell);
            } else {
                anchorCell = cell;
                toggleSelection(cell, false);
            }
            return;
        }
        anchorCell = cell;
        toggleSelection(cell, event.ctrlKey || event.metaKey);
    });

    tableBody.addEventListener('dblclick', event => {
        const cell = event.target.closest('.subject-cell');
        if (!cell || isModalOpen || isClearModalOpen) return;
        editCell(cell);
    });

    tableBody.addEventListener('keydown', event => {
        const cell = event.target;
        if (!cell.classList.contains('subject-cell') || isModalOpen || isClearModalOpen) return;
        if (event.key === 'Enter') {
            event.preventDefault();
            editCell(cell);
        } else if (event.key === ' ') {
            event.preventDefault();
            toggleSelection(cell, true);
            anchorCell = cell;
        } else if (event.key === 'Escape') {
            clearSelection();
        }
    });

    addSubjectButton.addEventListener('click', openModal);
    closeModalButton.addEventListener('click', closeModal);
    closeModalButton.addEventListener('keydown', event => {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            closeModal();
        }
    });
    confirmButton.addEventListener('click', applySubject);
    subjectInput.addEventListener('keydown', event => {
        if (event.key === 'Enter') {
            event.preventDefault();
            confirmButton.click();
        }
    });
    undoButton.addEventListener('click', undo);
    redoButton.addEventListener('click', redo);

    document.addEventListener('keydown', event => {
        if (event.key === 'Escape' && isClearModalOpen) {
            closeClearConfirm();
            return;
        }
        if (event.key === 'Escape' && isModalOpen) {
            closeModal();
            return;
        }
        if (isModalOpen || isClearModalOpen) return;
        const active = document.activeElement;
        if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA')) return;
        const isModifier = event.ctrlKey || event.metaKey;
        if (!isModifier) return;
        const key = event.key.toLowerCase();
        if (key === 'z') {
            event.preventDefault();
            if (event.shiftKey) redo();
            else undo();
        } else if (key === 'y') {
            event.preventDefault();
            redo();
        }
    });

    window.addEventListener('click', event => {
        if (event.target === modal) closeModal();
        if (event.target === confirmClearModal) closeClearConfirm();
    });

    colorPicker.addEventListener('input', event => {
        applyNeonColor(event.target.value);
        saveColor(event.target.value);
    });

    exportPngButton.addEventListener('click', exportPng);
    exportJsonButton.addEventListener('click', exportJson);
    importJsonButton.addEventListener('click', () => importJsonInput.click());
    importJsonInput.addEventListener('change', importJson);
    clearScheduleButton.addEventListener('click', openClearConfirm);
    confirmClearButton.addEventListener('click', confirmClear);
    cancelClearButton.addEventListener('click', closeClearConfirm);
    closeConfirmClearButton.addEventListener('click', closeClearConfirm);
    closeConfirmClearButton.addEventListener('keydown', event => {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            closeClearConfirm();
        }
    });

    showToast('Selecciona celdas con clic (Ctrl o Shift + clic para varias). Doble clic o Enter edita una celda.');

    async function exportPng() {
        if (typeof html2canvas === 'undefined') {
            showToast('La librería de exportación aún no está cargada. Reintenta en un momento.');
            return;
        }
        const width = containerToExport.offsetWidth;
        try {
            const canvas = await html2canvas(containerToExport, {
                backgroundColor: getComputedStyle(document.body).backgroundColor || '#282828',
                scale: 2,
                logging: false,
                width,
                windowWidth: width,
                onclone: (doc) => {
                    const area = doc.querySelector('.schedule-area');
                    area.querySelectorAll('.selected').forEach(td => td.classList.remove('selected'));
                    area.querySelector('.toolbar').style.display = 'none';
                    area.querySelector('.table-hint').style.display = 'none';
                    area.querySelector('.autosave-indicator').style.display = 'none';

                    const scrollContainer = doc.querySelector('.table-scroll');
                    scrollContainer.style.overflow = 'visible';
                    doc.querySelector('#schedule-table').style.minWidth = '0';

                    const header = doc.createElement('div');
                    header.className = 'export-header';
                    const img = doc.createElement('img');
                    img.src = 'assets/logo.png';
                    img.alt = 'Logo de la UNEG';
                    img.className = 'export-header-logo';
                    const title = doc.createElement('h1');
                    title.className = 'neon-text export-header-title';
                    title.textContent = getSemesterTitle();
                    header.append(img, title);
                    area.insertBefore(header, area.firstChild);
                }
            });
            const link = document.createElement('a');
            link.download = 'Horario.png';
            link.href = canvas.toDataURL('image/png');
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (error) {
            console.error('Error al exportar:', error);
            showToast('Hubo un error al intentar exportar la imagen.');
        }
    }

    function exportJson() {
        const blob = new Blob([JSON.stringify(grid, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'horario.json';
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
        showToast('Horario exportado como JSON.');
    }

    async     function importJson() {
        const file = importJsonInput.files[0];
        importJsonInput.value = '';
        if (!file) return;
        try {
            const data = JSON.parse(await file.text());
            grid = validateGrid(data);
            commitHistory();
            renderSchedule(grid);
            saveGrid(grid);
            showAutosave();
            clearSelection();
            showToast('Horario importado correctamente.');
        } catch (error) {
            console.error('Error al importar:', error);
            showToast('El archivo no es un horario válido.');
        }
    }
});
