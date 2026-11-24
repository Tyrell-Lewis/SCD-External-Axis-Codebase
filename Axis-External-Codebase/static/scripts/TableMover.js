class TableMover {
    #leftTable;
    #rightTable;

    constructor(leftTable = null, rightTable = null) {
        this.init(leftTable, rightTable);
    }

    init(leftTable, rightTable) {
        this.setLeftTable(leftTable);
        this.setRightTable(rightTable);
    }

    setLeftTable(tableEle) {
        this.#leftTable = tableEle;
        this.#initTable(this.#leftTable);
    }

    setRightTable(tableEle) {
        this.#rightTable = tableEle;
        this.#initTable(this.#rightTable);
    }

    #initTable(tableEle) {
        if (!tableEle) return;

        // Create an array of all header names
        tableEle.theaders = [];
        const theaders = tableEle.querySelectorAll("thead > tr th");
        theaders.forEach(theader => {
            tableEle.theaders.push(theader.textContent);
        });

        this.#updateTRows(tableEle);
    }

    #updateTRows(tableEle) {
        // Create an array of rows such as trow[0] = {"header1": "table_data", "header2": "table_data", ...}
        // Can only match named headers
        tableEle.trows = [];
        const trows = tableEle.querySelectorAll("tbody tr:not(.no-results-row)");
        trows.forEach(trow => {
            let newRow = trow;
            const tds = trow.querySelectorAll("td"); // Assumed to be equal to the number of ths above
            let i = 0;
            tds.forEach(td => {
                const corrTH = tableEle.theaders[i++];
                if (corrTH != "") {
                    newRow[corrTH] = td;
                }
            });
            tableEle.trows.push(newRow);
        });
    }

    #rowObjectToTableRow(rowObj, tableEle) {
        let newRowEle = document.createElement("tr");
        newRowEle.classList.add("new-row");

        tableEle.theaders.forEach(theader => {
            let newTD = document.createElement("td");
            if (rowObj.hasOwnProperty(theader)) {
                newTD.innerHTML = rowObj[theader].innerHTML;
            } else {
                newTD = document.createElement("td");
            }
            newRowEle.appendChild(newTD);
        });
        return newRowEle;
    }

    copy(rowNumber, fromTable, toTable, toPosition = -1, toDelete = false) {
        if (rowNumber < 0 || rowNumber >= fromTable.trows.length) {
            console.error("Row number out of bounds!");
            return;
        }

        const sourceRow = fromTable.trows[rowNumber];

        let copyRowEle = this.#rowObjectToTableRow(sourceRow, toTable);
        if (toPosition >= 0 && toPosition < toTable.trows.length) {
            let trows = Array.from(toTable.trows);
            let beforeInsertedRow = trows.slice(0, toPosition);
            let afterInsertedRow = trows.slice(toPosition);
            trows = beforeInsertedRow.concat(copyRowEle).concat(afterInsertedRow);
            trows.forEach(trow => {
                toTable.querySelector("tbody").appendChild(trow);
            })
        } else {
            toTable.querySelector("tbody").appendChild(copyRowEle);
        }

        if (toDelete) {
            sourceRow.remove();
        }

        this.#updateTRows(this.#leftTable);
        this.#updateTRows(this.#rightTable);
        return copyRowEle;
    }

    copyLR(rowNumber, toPosition = -1) {
        return this.copy(rowNumber, this.#leftTable, this.#rightTable, toPosition);
    }

    copyRL(rowNumber, toPosition = -1) {
        return this.copy(rowNumber, this.#rightTable, this.#leftTable, toPosition);
    }

    copyAll(fromTable, toTable) {
        const fromTRows = Array.from(fromTable.trows);
        let result = [];
        fromTRows.map((trow, index) =>{
            result.push(this.copy(index, fromTable, toTable));
        })
        return result;
    }

    copyAllLR() {
        return this.copyAll(this.#leftTable, this.#rightTable);
    }

    copyAllRL() {
        return this.copyAll(this.#rightTable, this.#leftTable);
    }

    move(rowNumber, fromTable, toTable, toPosition = -1) {
        return this.copy(rowNumber, fromTable, toTable, toPosition, true);
    }

    moveLR(rowNumber, toPosition = -1) {
        return this.move(rowNumber, this.#leftTable, this.#rightTable, toPosition);
    }

    moveRL(rowNumber, toPosition = -1) {
        return this.move(rowNumber, this.#rightTable, this.#leftTable, toPosition);
    }

    moveAll(fromTable, toTable) {
        const fromTRows = Array.from(fromTable.trows);
        let result = [];
        fromTRows.map((trow, index) =>{
            result.push(this.move(index, fromTable, toTable));
        })
        return result;
    }

    moveAllLR() {
        return this.moveAll(this.#leftTable, this.#rightTable);
    }

    moveAllRL() {
        return this.moveAll(this.#rightTable, this.#leftTable);
    }
}