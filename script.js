document.addEventListener('DOMContentLoaded', () => {
    alert("Pulsa la tecla Ctrl mientras eliges las celdas para unir bloques del horario según lo necesites.");

    // --- Referencias a Elementos del DOM ---
    const modal = document.getElementById('add-subject-modal');
    const closeModalButton = modal.querySelector('.close-button');
    const subjectCells = document.querySelectorAll('.subject-cell');
    const selectedCellInfo = document.getElementById('selected-cell-info');
    const subjectInput = document.getElementById('subject-name');
    const confirmButton = document.getElementById('confirm-add-subject');
    const tableBody = document.querySelector('#schedule-table tbody');
    const addSubjectButton = document.getElementById('add-subject-btn');
    const containerToExport = document.getElementById('schedule-container'); // Contenedor a exportar
    const colorPicker = document.getElementById('color-picker'); // Selector de color
    const exportButton = document.getElementById('export-png-btn'); // Botón exportar

    let selectedCells = new Set();
    let isModalOpen = false;

    // --- Funciones del Modal (sin cambios) ---
    function openModal() {
        if (selectedCells.size === 0 || isModalOpen) {
            return;
        }
        isModalOpen = true;

        if (selectedCells.size === 1) {
            const cell = selectedCells.values().next().value;
            const day = cell.dataset.day;
            const timeIndex = cell.dataset.time;
            const timeLabel = document.querySelector(`.time-slot[data-time="${timeIndex}"]`).textContent;
            selectedCellInfo.textContent = `Editando: ${day} - Hora ${timeIndex} (${timeLabel})`;
            const cellText = getEffectiveText(cell);
            subjectInput.value = cellText;
        } else {
            selectedCellInfo.textContent = `Editando ${selectedCells.size} celdas seleccionadas`;
            subjectInput.value = '';
        }

        modal.style.display = 'block';
        subjectInput.focus();
    }

    function closeModal() {
        modal.style.display = 'none';
        subjectInput.value = '';
        selectedCellInfo.textContent = '';
        isModalOpen = false;
    }

     // --- Lógica de Selección (sin cambios) ---
    function handleCellClick(event) {
        const clickedCell = event.target;
        if (!clickedCell.classList.contains('subject-cell') || isModalOpen) return;

        const isCtrlPressed = event.ctrlKey || event.metaKey;

        if (!isCtrlPressed) {
             selectedCells.forEach(cell => {
                 if (cell !== clickedCell) cell.classList.remove('selected');
             });
             selectedCells.clear();
             if (!clickedCell.classList.contains('selected')) {
                 clickedCell.classList.add('selected');
             }
             selectedCells.add(clickedCell);
        } else {
            if (selectedCells.has(clickedCell)) {
                clickedCell.classList.remove('selected');
                selectedCells.delete(clickedCell);
            } else {
                clickedCell.classList.add('selected');
                selectedCells.add(clickedCell);
            }
        }
         updateAddButtonState();
    }

    function clearSelection() {
        selectedCells.forEach(cell => cell.classList.remove('selected'));
        selectedCells.clear();
        updateAddButtonState();
    }

     function updateAddButtonState() {
         if (selectedCells.size > 0) {
             addSubjectButton.disabled = false;
             addSubjectButton.style.opacity = '';
             addSubjectButton.style.cursor = '';
             addSubjectButton.style.animation = '';
             addSubjectButton.style.boxShadow = '';
         } else {
             addSubjectButton.disabled = true;
             addSubjectButton.style.opacity = 0.5;
             addSubjectButton.style.cursor = 'not-allowed';
             addSubjectButton.style.animation = 'none';
             addSubjectButton.style.boxShadow = '0 0 3px rgba(255, 255, 255, 0.5)';
         }
     }

    // --- Lógica de Guardado y Rowspan (sin cambios) ---
     function getEffectiveText(cell) {
        // ... (función getEffectiveText sin cambios) ...
         if (cell.style.display === 'none') {
             let row = cell.parentElement.rowIndex;
             let col = cell.cellIndex;
             for (let i = row - 1; i >= 0; i--) {
                 if (i < tableBody.rows.length && i >= 0) {
                    let potentialParentCell = tableBody.rows[i].cells[col];
                    if (potentialParentCell && potentialParentCell.style.display !== 'none') {
                        let parentRowSpan = parseInt(potentialParentCell.getAttribute('rowspan') || '1', 10);
                        if (parentRowSpan >= (row - i + 1)) {
                            return potentialParentCell.textContent.trim();
                        }
                        break;
                    }
                 } else { break; }
             }
             return '';
         } else {
             return cell.textContent.trim();
         }
     }

    function applySubjectAndRowspan() {
        // ... (función applySubjectAndRowspan sin cambios) ...
        if (selectedCells.size === 0) return;
        const newSubject = subjectInput.value.trim();
        const affectedColumns = new Set();
        const cellsToReset = new Set();

        selectedCells.forEach(cell => {
            affectedColumns.add(cell.cellIndex);
            cellsToReset.add(cell);
             let rowSpan = parseInt(cell.getAttribute('rowspan') || '1', 10);
             if (rowSpan > 1) {
                 let startRowIndex = cell.parentElement.rowIndex;
                 let colIndex = cell.cellIndex;
                 for (let i = 1; i < rowSpan; i++) {
                     // Corregir índice de fila para tbody.rows
                     let tableRowIndex = startRowIndex - (tableBody.parentElement.tHead ? tableBody.parentElement.tHead.rows.length : 0);
                     let nextRow = tableBody.rows[tableRowIndex + i];
                     if (nextRow && nextRow.cells[colIndex]) {
                         cellsToReset.add(nextRow.cells[colIndex]);
                     }
                 }
             }
             if (cell.style.display === 'none') {
                let row = cell.parentElement.rowIndex;
                let col = cell.cellIndex;
                for (let i = row - 1; i >= 0; i--) {
                    // Usar índice relativo al tbody
                    let tableRowIndex = i - (tableBody.parentElement.tHead ? tableBody.parentElement.tHead.rows.length : 0);
                     if (tableRowIndex < tableBody.rows.length && tableRowIndex >= 0) {
                        let potentialParentCell = tableBody.rows[tableRowIndex].cells[col];
                        if (potentialParentCell && potentialParentCell.style.display !== 'none') {
                             let parentRowSpan = parseInt(potentialParentCell.getAttribute('rowspan') || '1', 10);
                            if (parentRowSpan >= (row - i + 1)) {
                                cellsToReset.add(potentialParentCell);
                            }
                            break;
                        }
                     } else { break; }
                }
             }
        });

        cellsToReset.forEach(cell => {
            cell.removeAttribute('rowspan');
            cell.style.display = '';
        });

        const cellsByColumn = new Map();
        selectedCells.forEach(cell => {
             if (cell.style.display !== 'none') {
                const colIndex = cell.cellIndex;
                if (!cellsByColumn.has(colIndex)) {
                    cellsByColumn.set(colIndex, []);
                }
                // Usar índice relativo al tbody para ordenar
                 let cellData = { element: cell, rowIndex: cell.parentElement.rowIndex };
                cellsByColumn.get(colIndex).push(cellData);
             }
        });

        cellsByColumn.forEach(cellsInCol => {
            cellsInCol.sort((a, b) => a.rowIndex - b.rowIndex);
        });

        cellsByColumn.forEach(sortedCellsInColData => {
            let sortedCellsInCol = sortedCellsInColData.map(data => data.element); // Extraer solo los elementos
             let startIndex = 0;
             while (startIndex < sortedCellsInCol.length) {
                let currentCell = sortedCellsInCol[startIndex];
                let blockEndIndex = startIndex;

                for (let j = startIndex + 1; j < sortedCellsInCol.length; j++) {
                     // Usar rowIndex del elemento TR padre para comparar
                    if (sortedCellsInCol[j].parentElement.rowIndex === sortedCellsInCol[j - 1].parentElement.rowIndex + 1) {
                        blockEndIndex = j;
                    } else {
                        break;
                    }
                }

                const blockSize = blockEndIndex - startIndex + 1;
                currentCell.textContent = newSubject;
                if (blockSize > 1) {
                    currentCell.rowSpan = blockSize;
                } else {
                    currentCell.removeAttribute('rowspan');
                }
                currentCell.style.display = '';

                for (let k = startIndex + 1; k <= blockEndIndex; k++) {
                    sortedCellsInCol[k].textContent = newSubject;
                    sortedCellsInCol[k].style.display = 'none';
                    sortedCellsInCol[k].removeAttribute('rowspan');
                }
                startIndex = blockEndIndex + 1;
             }
        });

        clearSelection();
        closeModal();
    }

    // --- NUEVA LÓGICA ---

    // 1. Cambiar Color Neón
    colorPicker.addEventListener('input', (event) => {
        const newColor = event.target.value;
        // Actualizar las variables CSS en el elemento raíz (<html>)
        document.documentElement.style.setProperty('--neon-blue', newColor);
        // Actualizar la versión más oscura también (simple enfoque: usar el mismo color)
        // Para un efecto de pulso más notorio, necesitarías calcular un color más oscuro.
        document.documentElement.style.setProperty('--neon-blue-darker', newColor);

        // Actualizar borde del propio color picker
         event.target.style.borderColor = newColor;
         event.target.style.boxShadow = `0 0 5px ${newColor}`;
    });
     // Inicializar borde del color picker con el valor actual
     colorPicker.style.borderColor = colorPicker.value;
     colorPicker.style.boxShadow = `0 0 5px ${colorPicker.value}`;

    // 2. Exportar a PNG
    exportButton.addEventListener('click', () => {
        // Deseleccionar temporalmente las celdas para que no salgan resaltadas en la imagen
        const currentSelection = new Set(selectedCells); // Guardar selección actual
        clearSelection(); // Limpiar visualmente

        // Ocultar botones/controles que no queremos en la imagen
        const buttonContainer = document.querySelector('.button-container');
        buttonContainer.style.display = 'none';


        // Usar html2canvas
        html2canvas(containerToExport, {
             backgroundColor: getComputedStyle(document.body).backgroundColor || '#282828', // Usar fondo del body
             scale: 2, // Aumentar escala para mejor resolución
             logging: false, // Desactivar logs en consola
             useCORS: true, // Necesario si hubiera imágenes externas o fuentes web complejas
             // Eliminar elementos específicos de la captura si es necesario
             // ignoreElements: (element) => element.id === 'element-to-ignore'
        }).then(canvas => {
            // Crear un enlace temporal para descargar la imagen
            const link = document.createElement('a');
            link.download = 'horario.png'; // Nombre del archivo
            link.href = canvas.toDataURL('image/png'); // Convertir canvas a Data URL PNG
            link.click(); // Simular clic para iniciar descarga

             // Restaurar visibilidad de botones/controles
             buttonContainer.style.display = '';

             // Restaurar la selección visual si había una antes de exportar
             currentSelection.forEach(cell => {
                 cell.classList.add('selected');
                 selectedCells.add(cell); // Re-añadir al set lógico
             });
              updateAddButtonState(); // Actualizar estado del botón por si acaso


        }).catch(err => {
             console.error("Error al exportar con html2canvas:", err);
             alert("Hubo un error al intentar exportar la imagen.");
              // Asegurarse de restaurar la visibilidad incluso si hay error
              buttonContainer.style.display = '';
              currentSelection.forEach(cell => {
                 cell.classList.add('selected');
                  selectedCells.add(cell);
             });
              updateAddButtonState();
        });
    });

    // --- Añadir Event Listeners Generales ---
    tableBody.addEventListener('click', handleCellClick);
    closeModalButton.addEventListener('click', closeModal);
    window.addEventListener('click', (event) => {
        if (event.target === modal) {
            closeModal();
        }
    });
    confirmButton.addEventListener('click', applySubjectAndRowspan);
    subjectInput.addEventListener('keypress', function (e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            confirmButton.click();
        }
    });
    addSubjectButton.addEventListener('click', openModal);

    // Inicializar estado del botón Añadir Materia
    updateAddButtonState();

}); // Fin del addEventListener('DOMContentLoaded')