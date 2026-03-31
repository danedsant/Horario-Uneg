document.addEventListener('DOMContentLoaded', () => {
    alert("La pagina no esta optimizada para telefonos, usala en PC.");
    alert("Pulsa la tecla Ctrl mientras eliges las celdas para unir bloques del horario según lo necesites.");

    const modal = document.getElementById('add-subject-modal');
    const closeModalButton = modal.querySelector('.close-button');
    const subjectCells = document.querySelectorAll('.subject-cell');
    const selectedCellInfo = document.getElementById('selected-cell-info');
    const subjectInput = document.getElementById('subject-name');
    const confirmButton = document.getElementById('confirm-add-subject');
    const tableBody = document.querySelector('#schedule-table tbody');
    const addSubjectButton = document.getElementById('add-subject-btn');
    const containerToExport = document.querySelector('.schedule-area'); 
    const colorPicker = document.getElementById('color-picker'); 
    const exportButton = document.getElementById('export-png-btn'); 

    let selectedCells = new Set();
    let isModalOpen = false;

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

     function getEffectiveText(cell) {
    
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
                
                 let cellData = { element: cell, rowIndex: cell.parentElement.rowIndex };
                cellsByColumn.get(colIndex).push(cellData);
             }
        });

        cellsByColumn.forEach(cellsInCol => {
            cellsInCol.sort((a, b) => a.rowIndex - b.rowIndex);
        });

        cellsByColumn.forEach(sortedCellsInColData => {
            let sortedCellsInCol = sortedCellsInColData.map(data => data.element); 
             let startIndex = 0;
             while (startIndex < sortedCellsInCol.length) {
                let currentCell = sortedCellsInCol[startIndex];
                let blockEndIndex = startIndex;

                for (let j = startIndex + 1; j < sortedCellsInCol.length; j++) {
                     
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

    

    colorPicker.addEventListener('input', (event) => {
        const newColor = event.target.value;
        document.documentElement.style.setProperty('--neon-blue', newColor);
        document.documentElement.style.setProperty('--neon-blue-darker', newColor);
         event.target.style.borderColor = newColor;
         event.target.style.boxShadow = `0 0 5px ${newColor}`;
    });

     colorPicker.style.borderColor = colorPicker.value;
     colorPicker.style.boxShadow = `0 0 5px ${colorPicker.value}`;


    exportButton.addEventListener('click', () => {
       
        const currentSelection = new Set(selectedCells); 
        clearSelection();
        const buttonContainer = document.querySelector('.button-container');
        buttonContainer.style.display = 'none';

        html2canvas(containerToExport, {
             backgroundColor: getComputedStyle(document.body).backgroundColor || '#282828', 
             scale: 2,
             logging: false, 
             useCORS: true,
           
        }).then(canvas => {
           
            const link = document.createElement('a');
            link.download = 'Horario.png'; 
            link.href = canvas.toDataURL('image/png');
            link.click();

             
             buttonContainer.style.display = '';
            
             currentSelection.forEach(cell => {
                 cell.classList.add('selected');
                 selectedCells.add(cell);
             });
              updateAddButtonState(); 


        }).catch(err => {
             console.error("Error al exportar:", err);
             alert("Hubo un error al intentar exportar la imagen.");
        
              buttonContainer.style.display = '';
              currentSelection.forEach(cell => {
                 cell.classList.add('selected');
                  selectedCells.add(cell);
             });
              updateAddButtonState();
        });
    });

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

    updateAddButtonState();

}); // 
