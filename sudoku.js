const oSudoku = document.getElementById("sudoku");
const bDrawSolutions = true;

let oAllRows = {}, oAllColumns = {}, oAllBoxes = {};
let iCurrentRow = null, iCurrentCol = null, iCurrentBox = null;
let aAllFields = [];

let bShowSolutions = bDrawSolutions && true;
let bDrawSolutionsOnShow = false;

// Hashing stuff
Hash = {
    alphabet : "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz$",
    encode : function(string) {
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
    decode : function(rixits) {
        let result = 0,
            base = this.alphabet.length;

        rixits = rixits.split("");
        for (let e = 0; e < rixits.length; e++) {
            result = (result * base) + this.alphabet.indexOf(rixits[e]);
        }
        return result;
    }
}

// Init sudoku
document.body.onload = (function() {
    createGrid();
    loadFromHash();

    // General hotkeys
    document.onkeydown = e => {
        // Ctrl + Delete or Ctrl + Backspace deletes all values
        if (e.ctrlKey && (e.key == "Delete" || e.key == "Backspace")) {
            clearFields();
        }

        // Space toggles solutions
        if (e.key == " ") {
            bShowSolutions = !bShowSolutions;
            if (bShowSolutions && bDrawSolutionsOnShow) {
                drawSolutions();
            }
            else {
                const oSolutions = document.querySelectorAll(".solutions");
                oSolutions.forEach(oSolution => {
                    oSolution.style.display = "none";
                });
                aAllFields.forEach(oField => {
                    oField.removeHighlight();
                });
            }
        }
    }

    function createGrid() {
        const oGrid = document.createElement("div");
        oGrid.setAttribute("id", "grid");
        oSudoku.appendChild(oGrid);

        // Create grid of boxes
        for (let iGridRow = 1; iGridRow <=3; iGridRow++) {
            for (let iGridCol = 1; iGridCol <=3; iGridCol++) {
                const oBox = document.createElement("div");
                oBox.classList.add("box");
                oGrid.appendChild(oBox);

                createFields(oBox, iGridRow, iGridCol);
            }
        }
    }

    function createFields(oBox, iGridRow, iGridCol) {
        // Create each box inputs
        for (let iBoxRow = 1; iBoxRow <= 3; iBoxRow++) {
            for (let iBoxCol = 1; iBoxCol <= 3; iBoxCol++) {
                const iRow = 3 * (iGridRow - 1) + iBoxRow;
                const iCol = 3 * (iGridCol - 1) + iBoxCol;
                const iBox = 3 * (iGridRow - 1) + iGridCol;

                // Init collections
                oAllRows[iRow] = oAllRows[iRow] || [];
                oAllColumns[iCol] = oAllColumns[iCol] || [];
                oAllBoxes[iBox] = oAllBoxes[iBox] || [];

                const oField = document.createElement("input");
                oField.type = "text";
                oField.setAttribute("maxlength", 1);
                oBox.appendChild(oField);

                initFieldActions(oField);

                oAllRows[iRow].push(oField);
                oAllColumns[iCol].push(oField);
                oAllBoxes[iBox].push(oField);
                aAllFields.push(oField);
            }
        }
    }

    function initFieldActions(oField) {
        oField.onfocus = function() {
            // Get coordinates
            [iCurrentRow] = this.getRow();
            [iCurrentCol] = this.getColumn();
            [iCurrentBox] = this.getBox();

            this.highlightSame();
        }

        oField.onblur = function() {
            aAllFields.forEach(oField => {
                oField.removeHighlight();
            });
        }

        let bSolveGrid = false;
        oField.onkeydown = e => {
            const sKey = e.key;
            let bNavigate = false;

            // What do you want?
            switch (sKey) {
                // Navigation
                case "ArrowRight":
                    iCurrentCol = Math.min(9, iCurrentCol + 1);
                    bNavigate = true;
                    break;
                case "ArrowLeft":
                    iCurrentCol = Math.max(1, iCurrentCol - 1);
                    bNavigate = true;
                    break;
                case "ArrowDown":
                    iCurrentRow = Math.min(9, iCurrentRow + 1);
                    bNavigate = true;
                    break;
                case "ArrowUp":
                    iCurrentRow = Math.max(1, iCurrentRow - 1);
                    bNavigate = true;
                    break;

                // Actions
                case "Delete":
                case "Backspace":
                case  "0":
                    // Super delete?
                    if (e.ctrlKey) {
                        clearFields();
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
                        //console.log("Only numbers!");
                        return false;
                    }
            }

            if (bNavigate) {
                const oTargetField = getFieldAt(iCurrentRow, iCurrentCol);
                oTargetField.focus();
            }
        };

        oField.onkeyup = function() {
            if (bSolveGrid) {
                solveGrid();
                bSolveGrid = false;
            }
        }

        oField.getRow = function() {
            let iRow, aRow;
            for(iRow in oAllRows) {
                aRow = oAllRows[iRow];
                if (aRow.indexOf(this) >= 0) {
                    break;
                }
            }
            return [parseInt(iRow), aRow];
        }
        oField.getColumn = function() {
            let iColumn, aColumn;
            for(iColumn in oAllColumns) {
                aColumn = oAllColumns[iColumn];
                if (aColumn.indexOf(this) >= 0) {
                    break;
                }
            }
            return [parseInt(iColumn), aColumn];
        }

        oField.getBox = function() {
            let iBox, aBox;
            for(iBox in oAllBoxes) {
                aBox = oAllBoxes[iBox];
                if (aBox.indexOf(this) >= 0) {
                    break;
                }
            }
            return [parseInt(iBox), aBox];
        }

        oField.setValue = function(sValue) {
            this.value = parseInt(sValue);
            this.hideSolutions();
            this.highlightSame();
            this.classList.remove("suggestion");
        }

        oField.hideSolutions = function() {
            const oSolutionsDiv = this.soltionsDiv;
            if (oSolutionsDiv) {
                oSolutionsDiv.parentNode.removeChild(oSolutionsDiv);
            }
        };

        oField.highlightSame = function() {
            // Highlight fields with same value
            const sSameClassName = "same";
            const sSeesClassName = "sees";
            const iNumber = this.value;

            aAllFields.forEach(oField => {
                oField.removeHighlight();
            });

            if (!bShowSolutions) {
                return;
            }

            aAllFields.forEach(oField => {
                // Skip fields without or not the same value
                if (!iNumber || oField.value != iNumber) {
                    return;
                }

                oField.classList.add(sSameClassName);

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
            });
        }

        oField.removeHighlight = function() {
            this.classList.remove("sees");
            this.classList.remove("same");
        }
    }

    function getFieldAt(iRow, iColumn) {
        // Row inputs start counting at 0 so we have to substract one
        return oAllRows[iRow][iColumn - 1];
    }

    // Returns array of missing numbers in a set of fields
    function getMissingNumbersOf(oSet) {
        let aMissing = [1,2,3,4,5,6,7,8,9];
        oSet.forEach(oField => {
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
    }

    // Returns unique solution in a oGroup of fields e.g. suggest only once
    function getHiddenSingle(oGroup) {
        let oCountSolutions = {};
        oGroup.forEach(oField => {
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
    }

    function getNakedPairs(oGroup) {
        let aPairs = [];
        let oCountPairs = [];
        oGroup.forEach(oField => {
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
    }

    function getPointingPairs(aBoxFields) {
        let oPointingPairs = {rows: {}, cols: {}};
        let oRowSolutions = {};
        let oColSolutions = {};

        aBoxFields.forEach(function(oField, i) {
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

    function clearFields() {
        aAllFields.forEach(oField => {
            oField.value = "";
            oField.removeHighlight();
        });

        // Remove old solutions
        const oOldSolutions = document.querySelectorAll(".solutions");
        oOldSolutions.forEach(oSolution => oSolution.parentNode.removeChild(oSolution));

        updateHash();
    }

    function solveGrid() {
        calcSolutions();
        drawSolutions();
        updateHash();
    }

    // Central method to suggest field solutions
    function calcSolutions() {
        // Reset field solutions
        aAllFields.forEach(oField => {
            if (!oField.value) {
                oField.solutions = [1,2,3,4,5,6,7,8,9];
            }
        });

        // Check each group of fields for missing numbers
        [oAllRows, oAllColumns, oAllBoxes].forEach(oGroup => {
            for (iKey in oGroup) {
                const aMissingNumbers = getMissingNumbersOf(oGroup[iKey]);
                oGroup[iKey].forEach(oField => {
                    if (!oField.value) {
                        // Merge missing numbers into field solutions
                        oField.solutions = oField.solutions.filter(iSolution => {
                            return aMissingNumbers.includes(iSolution);
                        });
                    }
                });
            }
        });

        // Check each group of fields for unique solutions
        [oAllRows, oAllColumns, oAllBoxes].forEach(oGroups => {
            for (iKey in oGroups) {
                const oGroup = oGroups[iKey];

                // Any hidden singles in this group?
                const iHiddenSingle = getHiddenSingle(oGroup);
                if (iHiddenSingle) {
                    oGroup.forEach(oField => {
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
                const aNakedPairs = getNakedPairs(oGroup);
                if (aNakedPairs.length) {
                    oGroup.forEach(oField => {
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

        // Check boxes for pointing pairs/tripples
        for (iBox in oAllBoxes) {
            const aBoxFields = oAllBoxes[iBox];
            const oPointingPairs = getPointingPairs(aBoxFields);
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
                    const oSet = sGroup == "rows" ? oAllRows : oAllColumns;

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
    }

    function drawSolutions() {
        // Remove old solutions on redraw
        const oOldSolutions = document.querySelectorAll(".solutions");
        oOldSolutions.forEach(oSolution => oSolution.parentNode.removeChild(oSolution));

        aAllFields.forEach(oField => {
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
            if (oField.value || aSolutions.length == 9 || !bDrawSolutions) {
                return;
            }

            // Don't draw solutions just yet
            if (!bShowSolutions) {
                bDrawSolutionsOnShow = true;
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

    function loadFromHash() {
        const  sUrlHash = window.location.hash;
        if (sUrlHash) {
            const aHashes = sUrlHash.slice(1).split(".");
            let iBox = 1;
            aHashes.forEach(sHash => {
                let sValues = (Hash.decode(sHash) + "").padStart(9, "0");
                oAllBoxes[iBox].forEach(oField => {
                    const sFieldValue = sValues.charAt(0);
                    if (sFieldValue != "0") {
                        oField.value = sFieldValue;
                    }
                    sValues = sValues.slice(1);
                });
                iBox++;
            });
            solveGrid();
        }
    }

    function updateHash() {
        let aHashes = [];
        for (let iBox in oAllBoxes) {
            let aBoxValues = "";
            oAllBoxes[iBox].forEach(oField => {
                aBoxValues += oField.value || 0;
            });
            aHashes.push(Hash.encode(aBoxValues));
        }
        window.location.hash = aHashes.join(".");
    }
})();