Sudoku = {
    container: document.getElementById("sudoku"),
    showSolutions: true,
    fields: [],
    rows: {},
    columns: {},
    boxes: {},
    currentRow: null,
    currentColumn: null,
    currentBox: null,

    init: function() {
        Painter.paintSudoku(this);

        this.fields.forEach(oField => {
            this.initFieldActions(oField);
        });
    },

    initFieldActions: function(oField) {
        const self = this;

        oField.onfocus = function() {
            [self.currentRow] = this.getRow();
            [self.currentColumn] = this.getColumn();
            [self.currentBox] = this.getBox();

            Painter.highlightSameValuesAs(this);
        }

        let bSolveGrid = false;
        oField.onkeydown = function(e) {
            const sKey = e.key;
            let bNavigate = false;

            // What do you want?
            switch (sKey) {
                // Navigation
                case "ArrowRight":
                    self.currentColumn = Math.min(9, self.currentColumn + 1);
                    bNavigate = true;
                    break;
                case "ArrowLeft":
                    self.currentColumn = Math.max(1, self.currentColumn - 1);
                    bNavigate = true;
                    break;
                case "ArrowDown":
                    self.currentRow = Math.min(9, self.currentRow + 1);
                    bNavigate = true;
                    break;
                case "ArrowUp":
                    self.currentRow = Math.max(1, self.currentRow - 1);
                    bNavigate = true;
                    break;

                // Actions
                case "Delete":
                case "Backspace":
                case  "0":
                    // Super delete?
                    if (e.ctrlKey) {
                        self.clearFields();
                    }

                    // Normal delete..
                    oField.value = "";
                    bSolveGrid = true;
                    return false;
                case "Enter":
                    // Super solve?
                    if (e.ctrlKey) {
                        aAllFields.forEach(oField => {
                            const aSolutions = oField.solutions;
                            if (!aSolutions || aSolutions.length != 1) {
                                return;
                            }
                            oField.setValue(aSolutions[0]);
                        });
                        break;
                    }

                    const aSolutions = oField.solutions;
                    if (aSolutions.length != 1) {
                        return false;
                    }

                    oField.setValue(aSolutions[0]);
                    bSolveGrid = true;
                    break;

                default:
                    // Got a number to insert?
                    if (sKey >>> 0 === parseFloat(sKey)) {
                        oField.setValue(sKey);
                        bSolveGrid = true;
                        break;
                    }

                    // Is it a letter?
                    if (sKey.length == 1 && sKey.match(/[a-z]/i)) {
                        return false;
                    }
            }

            if (bNavigate) {
                const oTargetField = self.getFieldAt(self.currentRow, self.currentColumn);
                oTargetField.focus();
            }
        }

        oField.setValue = function(sValue) {
            this.value = parseInt(sValue);
            Painter.hideSolutionsOf(this);
            Painter.highlightSameValuesAs(this);
            this.classList.remove("suggestion");
        }

        oField.onkeyup = function() {
            if (bSolveGrid) {
                Solver.solve();
            }
            bSolveGrid = false;
        }

        oField.onblur = function() {
            self.fields.forEach(oField => {
                Painter.removeHighlightOf(oField);
            });
        }

        oField.getRow = function() {
            let iRow, aRow, oAllRows = self.rows;
            for(iRow in oAllRows) {
                aRow = oAllRows[iRow];
                if (aRow.indexOf(this) >= 0) {
                    break;
                }
            }
            return [parseInt(iRow), aRow];
        }
        oField.getColumn = function() {
            let iColumn, aColumn, oAllColumns = self.columns;
            for(iColumn in oAllColumns) {
                aColumn = oAllColumns[iColumn];
                if (aColumn.indexOf(this) >= 0) {
                    break;
                }
            }
            return [parseInt(iColumn), aColumn];
        }
        oField.getBox = function() {
            let iBox, aBox, oAllBoxes = self.boxes;
            for(iBox in oAllBoxes) {
                aBox = oAllBoxes[iBox];
                if (aBox.indexOf(this) >= 0) {
                    break;
                }
            }
            return [parseInt(iBox), aBox];
        }
    },

    getFieldAt: function(iRow, iColumn) {
        // Row inputs start counting at 0 so we have to substract one
        return this.rows[iRow][iColumn - 1];
    },

    clearFields: function() {
        this.fields.forEach(oField => {
            oField.value = "";
            Painter.removeHighlightOf(oField);
        });

        // Remove old solutions
        const oOldSolutions = document.querySelectorAll(".solutions");
        oOldSolutions.forEach(oSolution => oSolution.parentNode.removeChild(oSolution));

        updateHash();
    }
}

Painter = {
    paintSudoku: function() {
        const oGrid = document.createElement("div");
        oGrid.setAttribute("id", "grid");
        Sudoku.container.appendChild(oGrid);

        this.paintBoxes(oGrid);
    },

    paintBoxes: function(oGrid) {
        for (let iGridRow = 1; iGridRow <=3; iGridRow++) {
            for (let iGridCol = 1; iGridCol <=3; iGridCol++) {
                const oBox = document.createElement("div");
                oBox.classList.add("box");
                oGrid.appendChild(oBox);

                this.paintFields(oBox, iGridRow, iGridCol);
            }
        }
    },

    paintFields: function(oBox, iGridRow, iGridCol) {
        // Create each box inputs
        for (let iBoxRow = 1; iBoxRow <= 3; iBoxRow++) {
            for (let iBoxCol = 1; iBoxCol <= 3; iBoxCol++) {
                const iRow = 3 * (iGridRow - 1) + iBoxRow;
                const iCol = 3 * (iGridCol - 1) + iBoxCol;
                const iBox = 3 * (iGridRow - 1) + iGridCol;

                // Init collections
                Sudoku.rows[iRow] = Sudoku.rows[iRow] || [];
                Sudoku.columns[iCol] = Sudoku.columns[iCol] || [];
                Sudoku.boxes[iBox] = Sudoku.boxes[iBox] || [];

                const oField = document.createElement("input");
                oField.type = "text";
                oField.setAttribute("maxlength", 1);
                oBox.appendChild(oField);

                // Add field to all the different collections
                Sudoku.rows[iRow].push(oField);
                Sudoku.columns[iCol].push(oField);
                Sudoku.boxes[iBox].push(oField);
                Sudoku.fields.push(oField);
            }
        }
    },

    highlightSameValuesAs: function(oField) {
        const self = this;

        // First reset all highlights
        Sudoku.fields.forEach(oField => {
            self.removeHighlightOf(oField);
        });

        // Does this field even have a values?
        const iNumber = parseInt(oField.value);
        if (isNaN(iNumber)) {
            return;
        }

        Sudoku.fields.forEach(oField => {
            // Skip fields that dont have the same value
            const iFieldValue = parseInt(oField.value);
            if (isNaN(iFieldValue) || iFieldValue != iNumber) {
                return;
            }

            oField.classList.add("same");
            self.highlightSightOf(oField);
        });
    },

    highlightSightOf: function(oField) {
        // Only do this when solutions are shown
        if (!Sudoku.showSolutions) {
            return;
        }

        const sSeesClassName = "sees";

        // Highlight fields in the same row, column and box
        [iRow, aRowFields] = oField.getRow();
        [iCol, aColFields] = oField.getColumn();
        [iBox, aBoxFields] = oField.getBox();
        aRowFields.forEach(oField => {
            oField.classList.add(sSeesClassName);
        });
        aColFields.forEach(oField => {
            oField.classList.add(sSeesClassName);
        });
        aBoxFields.forEach(oField => {
            oField.classList.add(sSeesClassName);
        });
    },

    removeHighlightOf: function(oField) {
        oField.classList.remove("sees");
        oField.classList.remove("same");
    },

    hideSolutionsOf: function(oField) {
        const oSolutionsDiv = oField.soltionsDiv;
        if (oSolutionsDiv) {
            oSolutionsDiv.parentNode.removeChild(oSolutionsDiv);
        }
    }
}

Solver = {
    solve: function() {

    }
}

// Hashing stuff
Hash = {
    alphabet: "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz$",
    encode: function(string) {
        number = parseInt(string);

        if (isNaN(Number(number)) || number === null || number === Number.POSITIVE_INFINITY)
            throw "The input is not valid";
        if (number < 0)
            throw "Can't represent negative numbers";

        let base = this.alphabet.length,
            rixit,
            residual = Math.floor(number),
            result = "";

        while (true) {
            rixit = residual % base;
            result = this.alphabet.charAt(rixit) + result;
            residual = Math.floor(residual / base);
            if (residual == 0)
                break;
            }
        return result;
    },
    decode: function(rixits) {
        let result = 0,
            base = this.alphabet.length;

        rixits = rixits.split("");
        for (let e = 0; e < rixits.length; e++) {
            result = (result * base) + this.alphabet.indexOf(rixits[e]);
        }
        return result;
    }
}

Sudoku.init();