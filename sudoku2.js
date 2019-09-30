Sudoku = {
    container: document.getElementById("sudoku"),
    drawSolutions: true, showSolutions: true,
    fields: [],
    rows: {}, columns: {}, boxes: {},
    currentRow: null, currentColumn: null, currentBox: null,

    init: function() {
        this.showSolutions = this.drawSolutions && this.showSolutions;
        Painter.paintSudoku(this);

        this.fields.forEach(oField => {
            this.initFieldActions(oField);
        });

        this.loadFromHash();
    },

    initFieldActions: function(oField) {
        const self = this;
        this.clearOnBlur = false;
        this.triggerSolve = false;

        oField.onfocus = function() {
            [self.currentRow] = this.getRow();
            [self.currentColumn] = this.getColumn();
            [self.currentBox] = this.getBox();

            Painter.highlightSameValuesAs(this);
        }

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
                    Painter.removeFromAll("sees", "collision");
                    oField.triggerSolve = true;
                    return false;
                case "Enter":
                    // Super solve?
                    if (e.ctrlKey) {
                        Sudoku.fields.forEach(oField => {
                            const aSolutions = oField.solutions;
                            if (!aSolutions || aSolutions.length != 1) {
                                return;
                            }
                            oField.setValue(aSolutions[0]);
                        });
                        break;
                    }

                    // Single solve
                    const aSolutions = oField.solutions;
                    if (aSolutions.length != 1) {
                        return false;
                    }

                    oField.setValue(aSolutions[0]);
                    break;

                case " ":
                    self.showSolutions = !self.showSolutions;
                    if (self.showSolutions) {
                        Painter.drawSolutions();
                    }
                    else {
                        Painter.hideAllSolutions();
                    }

                    break;

                default:
                    // Got a number to insert?
                    if (sKey >>> 0 === parseFloat(sKey)) {
                        oField.setValue(sKey);
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
            Painter.removeFromAll("sees", "collision");
            Painter.hideSolutionsOf(this);

            this.value = parseInt(sValue);
            this.clearOnBlur = false;
            this.triggerSolve = true;

            const aCollisions = Sudoku.getCollisionsWith(this);
            if (aCollisions.length) {
                Painter.highlightCollisions(aCollisions);
                this.clearOnBlur = true;
                this.triggerSolve = false;
                return;
            }

            Painter.highlightSameValuesAs(this);
            this.classList.remove("suggestion");
        }

        oField.onkeyup = function() {
            if (this.triggerSolve) {
                Solver.solve();
            }
            this.triggerSolve = false;
        }

        oField.onblur = function() {
            self.fields.forEach(oField => {
                Painter.removeHighlightOf(oField);
            });

            if (this.clearOnBlur) {
                this.value = null;
                this.clearOnBlur = false;
                Painter.removeFromAll("collision");
            }
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

        Painter.hideAllSolutions();
        Sudoku.updateHash();
    },

    getCollisionsWith: function(oField) {
        let aCollisions = [];
        if (!oField.value) {
            return aCollisions;
        }

        [iRow, aRow] = oField.getRow();
        [iColumn, aColumn] = oField.getColumn();
        [iBox, aBox] = oField.getBox();

        [aRow, aColumn, aBox].forEach(aGroup => {
            aGroup.forEach(oCheck => {
                if (oCheck == oField || !oCheck.value || !oField.value) {
                    return;
                }
                if (oCheck.value == oField.value && !aCollisions.includes(oCheck)) {
                    aCollisions.push(oCheck);
                    return;
                }
            });
        });

        return aCollisions;
    },

    updateHash: function() {
        const aBoxes = this.boxes;
        let aHashes = [];

        for (let iBox in aBoxes) {
            let aBoxValues = "";
            aBoxes[iBox].forEach(oField => {
                aBoxValues += oField.value || 0;
            });
            aHashes.push(Hash.encode(aBoxValues));
        }
        window.location.hash = aHashes.join(".");
    },

    loadFromHash: function() {
        const self = this;
        const sUrlHash = window.location.hash;
        if (!sUrlHash) {
            return;
        }

        const aHashes = sUrlHash.slice(1).split(".");
        let iBox = 1;
        aHashes.forEach(sHash => {
            let sValues = (Hash.decode(sHash) + "").padStart(9, "0");
            self.boxes[iBox].forEach(oField => {
                const sFieldValue = sValues.charAt(0);
                if (sFieldValue != "0") {
                    oField.value = sFieldValue;
                }
                sValues = sValues.slice(1);
            });
            iBox++;
        });
        Solver.solve();
    }
}

Painter = {
    drawSolutionsOnShow: false,

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

    highlightCollisions: function(aCollisions) {
        aCollisions.forEach(oField => {
            oField.classList.add("collision");
        });
    },

    removeHighlightOf: function(oField) {
        oField.classList.remove("sees");
        oField.classList.remove("same");
    },

    removeFromAll: function() {
        if (!arguments || arguments.length == 0) {
            return;
        }

        Sudoku.fields.forEach(oField => {
            for (i in arguments) {
                oField.classList.remove(arguments[i]);
            }
        });
    },

    hideAllSolutions: function() {
        const oOldSolutions = document.querySelectorAll(".solutions");
        oOldSolutions.forEach(oSolution =>
            oSolution.parentNode.removeChild(oSolution)
        );
    },

    hideSolutionsOf: function(oField) {
        const oSolutionsDiv = oField.soltionsDiv;
        if (oSolutionsDiv && oSolutionsDiv.length) {
            oSolutionsDiv.parentNode.removeChild(oSolutionsDiv);
        }
    },

    drawSolutions: function() {
        // Remove old solutions on redraw
        this.hideAllSolutions();

        Sudoku.fields.forEach(oField => {
            const oBox = oField.parentNode;
            const aSolutions = oField.solutions;

            if (!oField.value && aSolutions.length == 1) {
                oField.classList.add("suggestion");
            }
            else {
                oField.classList.remove("suggestion");
            }

            // No need to show solutions if this field already has a value,
            // all values are still possible or we don't even want to show
            // solutions at all..
            if (oField.value || aSolutions.length == 9 || !Sudoku.drawSolutions) {
                return;
            }

            // Don't draw solutions just yet
            if (!Sudoku.showSolutions) {
                Painter.drawSolutionsOnShow = true;
                return;
            }

            const oSolutions = document.createElement("div");
            oSolutions.setAttribute("class", "solutions");
            oSolutions.style.top = oField.offsetTop + "px";
            oSolutions.style.left = oField.offsetLeft + "px";

            // Fill in empty slots
            for (let i = 1; i <= 9; i++) {
                const sValue = aSolutions.indexOf(i) >= 0 ? i : "&nbsp;";
                oSolutions.innerHTML += "<span>" + sValue + "</span>";
            }

            oSolutions.onclick = function() {
                oField.focus();
            };
            oBox.appendChild(oSolutions);
            oField.soltionsDiv = oSolutions;
        });
    }
}

Solver = {
    solve: function() {
        this.calculcateSolutions();
        Painter.drawSolutions();
        Sudoku.updateHash();
    },

    // Central method to suggest field solutions
    calculcateSolutions: function() {
        // Reset field solutions
        Sudoku.fields.forEach(oField => {
            if (!oField.value) {
                oField.solutions = [1,2,3,4,5,6,7,8,9];
            }
        });

        // Check each group of fields for missing numbers
        [Sudoku.rows, Sudoku.columns, Sudoku.boxes].forEach(oGroup => {
            for (iKey in oGroup) {
                const aGroup = oGroup[iKey];
                const aMissingNumbers = Solver.getMissingNumbersOf(aGroup);

                aGroup.forEach(oField => {
                    if (oField.value) {
                        return;
                    }

                    // Merge missing numbers into field solutions
                    oField.solutions = oField.solutions.filter(iSolution => {
                        return aMissingNumbers.includes(iSolution);
                    });
                });
            }
        });

        // Check each group of fields for unique solutions
        [Sudoku.rows, Sudoku.columns, Sudoku.boxes].forEach(oGroups => {
            for (iKey in oGroups) {
                const aGroup = oGroups[iKey];
                const iHiddenSingle = Solver.getHiddenSingleOf(aGroup);

                // Any hidden singles in this group?
                if (iHiddenSingle) {
                    aGroup.forEach(oField => {
                        if (oField.value) {
                            return;
                        }
                        if (oField.solutions.includes(iHiddenSingle)) {
                            //console.log(oField, oField.solutions, iHiddenSingle);
                            oField.solutions = [iHiddenSingle];
                        }
                    });
                }

                // Any naked pairs in this group?
                const aNakedPairs = Solver.getNakedPairsOf(aGroup);
                if (aNakedPairs.length) {
                    aGroup.forEach(oField => {
                        if (oField.value) {
                            return;
                        }
                        aNakedPairs.forEach(aPair => {
                            let bPairMatches = oField.solutions.every(iSolution => {
                                return aPair.includes(iSolution)
                            });
                            if (bPairMatches) {
                                return;
                            }
                            oField.solutions = oField.solutions.filter(iSolution => {
                                return !aPair.includes(iSolution);
                            });
                        });
                    });
                }
            }
        });

        return;

        // Check boxes for pointing pairs/tripples
        for (iBox in Sudoku.boxes) {
            const aBox = Sudoku.boxes[iBox];
            const oPointingPairs = Solver.getPointingPairsOf(aBox);

            for (sGroup in oPointingPairs) {
                const oPairs = oPointingPairs[sGroup];
                if (Object.entries(oPairs).length < 1) {
                    continue;
                }

                for (iBoxPosition in oPairs) {
                    iBoxPosition = parseInt(iBoxPosition);
                    // Get absolute row/column of this pair within to whole sudoku
                    const iRealPosition = iBoxPosition + (sGroup == "rows" ? Math.floor((iBox - 1) / 3) : Math.floor((iBox - 1) % 3)) * 3;

                    const aPairs = oPairs[iBoxPosition];
                    const oSet = sGroup == "rows" ? Sudoku.rows : Sudoku.columns;

                    oSet[iRealPosition].forEach(oField => {
                        // Skip fields that already have a value
                        if (oField.value) {
                            return;
                        }

                        // Skip fields in the same box as the found pair
                        [iFieldBox] = oField.getBox();
                        if (iFieldBox == iBox) {
                            return;
                        }

                        aPairs.forEach(iPairSolution => {
                            const iIndex = oField.solutions.indexOf(parseInt(iPairSolution));
                            if (iIndex > -1) {
                                oField.solutions.splice(iIndex, 1);
                            }
                        });
                    });
                }
            }
        }
    },

    // Returns array of missing numbers in a group of fields
    getMissingNumbersOf: function(aGroup) {
        let aMissing = [1,2,3,4,5,6,7,8,9];
        aGroup.forEach(oField => {
            if (!oField.value) {
                return;
            }

            // Remove field value from list of missing numbers
            iSolution = parseInt(oField.value);
            const iIndex = aMissing.indexOf(iSolution);
            if (iIndex > -1) {
                aMissing.splice(iIndex, 1);
            }
        });
        return aMissing;
    },

    // Returns unique solution in a oGroup of fields e.g. suggest only once
    getHiddenSingleOf: function(aGroup) {
        let oCountSolutions = {};
        aGroup.forEach(oField => {
            if (oField.value) {
                //const iSolution = parseInt(oField.value);
                //oCountSolutions[iSolution] = (oCountSolutions[iSolution] || 0) + 1;
            }
            else {
                oField.solutions.forEach(iSolution => {
                    oCountSolutions[iSolution] = (oCountSolutions[iSolution] || 0) + 1;
                });
            }
        });
        for (iSolution in oCountSolutions) {
            if (oCountSolutions[iSolution] == 1) {
                return parseInt(iSolution);
            }
        }
        return null;
    },

    getNakedPairsOf: function(aGroup) {
        let aPairs = [], oCountPairs = [];

        aGroup.forEach(oField => {
            if (oField.value) {
                return;
            }
            if (oField.solutions.length == 2) {
                const sPair = oField.solutions.join("");
                oCountPairs[sPair] = (oCountPairs[sPair] || 0) + 1;
            }
        });
        for (let sPair in oCountPairs) {
            if (oCountPairs[sPair] < 2) {
                continue;
            }
            let aPair = sPair.split("").map(Number);
            aPairs.push(aPair);
        }

        return aPairs;
    },

    getPointingPairsOf: function(aBox) {
        let oPointingPairs = {rows: {}, cols: {}};
        let oRowSolutions = {};
        let oColSolutions = {};

        aBox.forEach(function(oField, i) {
            if (oField.value) {
                return;
            }

            const iRow = Math.floor(i/3) + 1;
            const iCol = i%3 + 1;

            oRowSolutions[iRow] = oRowSolutions[iRow] || {};
            oColSolutions[iCol] = oColSolutions[iCol] || {};

            // Count row and column solutions
            oField.solutions.forEach(iSolution => {
                oRowSolutions[iRow][iSolution] = (oRowSolutions[iRow][iSolution] || 0) + 1;
            });
            oField.solutions.forEach(iSolution => {
                oColSolutions[iCol][iSolution] = (oColSolutions[iCol][iSolution] || 0) + 1;
            });
        });

        [oRowSolutions, oColSolutions].forEach(oGroup => {
            for (iCheck in oGroup) {
                for (iSolution in oGroup[iCheck]) {
                    for (iCompare in oGroup) {
                        if (iCompare == iCheck) {
                            continue;
                        }

                        // Remove solutions that occure in different rows/cols of this box
                        if (oGroup[iCompare][iSolution]) {
                            delete oGroup[iCompare][iSolution];
                            delete oGroup[iCheck][iSolution];
                        }
                    }
                }
            }
        });

        const oGroups = {"rows": oRowSolutions, "cols": oColSolutions};
        for (sGroup in oGroups) {
            oGroup = oGroups[sGroup];
            for (iCheck in oGroup) {
                // No solutions in this row?
                if (Object.entries(oGroup[iCheck]).length < 1) {
                    continue;
                }

                for (iSolution in oGroup[iCheck]) {
                    const iCount = oGroup[iCheck][iSolution];
                    if (iCount < 2) {
                        continue;
                    }

                    oPointingPairs[sGroup][iCheck] = oPointingPairs[sGroup][iCheck] || [];
                    oPointingPairs[sGroup][iCheck].push(parseInt(iSolution));
                }
            }
        }

        return oPointingPairs;
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