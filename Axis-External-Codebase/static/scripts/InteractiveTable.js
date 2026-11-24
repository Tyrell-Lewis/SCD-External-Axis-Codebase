class ElementTextSearch {
    static #replaceableWordsRegex = /(?:(?<=>)[^<>\s]+(?=<\/{0,1}))|(?<!<\/{0,1}[^<>]*)(?:[^<>\s]+)(?![<>]*>)/g;

    static search(element, searchFor) {
        const html = element.innerHTML;
        const words = html.matchAll(ElementTextSearch.#replaceableWordsRegex);
        let fullText = "";
        let firstIndex = -1;
        let found = [];
        const searchKey = searchFor.toLowerCase();
        words.forEach(word => {
            if (firstIndex === -1) {
                firstIndex = word.index;
            }
            const text = word[0].toLowerCase();
            fullText += text + " ";
            if (text.includes(searchKey)) {
                const index = word.index + text.indexOf(searchKey);
                found.push({
                    "startIndex": index,
                    "endIndex": index + searchKey.length,
                    "textInEle": html.substr(index, searchKey.length)
                });
            }
        })
        if (found.length === 0) {
            fullText = fullText.trim().toLowerCase();
            if (fullText.includes(searchKey)) {
                const index = firstIndex + fullText.indexOf(searchKey)
                found = [{
                    "startIndex": index,
                    "endIndex": index + searchKey.length,
                    "textInEle": html.substr(index, searchKey.length)
                }];
            }
        }
        return found;
    }
}

// Get an HTML element and highlight matching text in it
class Highlighter {
    static #element = null;
    static #offset;
    static #currentOffset = 0;

    static highlight(element, startIndex, endIndex) {
        if (Highlighter.#element !== element) {
            Highlighter.#element = element;
            Highlighter.#currentOffset = 0;
        }
        if (startIndex < 0 || endIndex > element.innerHTML.length) {
            return;
        }
        const result = Highlighter.#buildHTML(element, startIndex + Highlighter.#currentOffset, endIndex + Highlighter.#currentOffset);
        Highlighter.#offset = result.length - element.innerHTML.length;
        Highlighter.#currentOffset += Highlighter.#offset;
        element.innerHTML = result;
    }
    
    static #buildHTML(element, startIndex, endIndex) {
        const html = element.innerHTML;
        const beforeResult = html.slice(0, startIndex);
        const result = html.slice(startIndex, endIndex);
        const afterResult = html.slice(endIndex);
        return beforeResult + "<mark>" + result + "</mark>" + afterResult;

    }

    static clear(element) {
        Highlighter.#currentOffset = 0;
        if (element.children.length > 0) {
            const childrenCopy = Array.from(element.children);
            childrenCopy.forEach(child => {
                Highlighter.clear(child);
            })
        }
        const markRegEx = /<\/{0,1}mark>/g;
        const match = element.innerHTML.match(markRegEx);
        if (match) {
            element.innerHTML = element.innerHTML.replaceAll(/<\/{0,1}mark>/g, '');
        }
    }
}

// Searchable, sortable table
class InteractiveTable {
    #tableEle;
    #tbodyEle;
    #theaders;
    #trows;
    #searchInputEle;
    #numericSortHeaders = [];
    #alphabeticSortHeaders = [];
    #currentSort;
    #rowCountEle;
    #noResultsEle;
    #activeFilters = [];

    constructor(tableEle = null, searchInputEle = null, rowCountEle = null) {
        this.init(tableEle, searchInputEle, rowCountEle);
    }

    init(tableEle, searchInputEle, rowCountEle = null) {
        this.#currentSort = { "sortParam": null, "sortOrder": 1 }; // sortOrder = 1 for ascending; -1 for descending
        this.#activeFilters = [];
        this.setTableEle(tableEle);
        this.setSearchInputEle(searchInputEle);
        this.setRowCountEle(rowCountEle);
    }

    setTableEle(tableEle = null) {
        if (tableEle) {
            this.#tableEle = tableEle;
            this.#tbodyEle = this.#tableEle.querySelector("tbody")
            this.#theaders = this.#tableEle.querySelectorAll("th");
            this.#trows = Array.from(this.#tbodyEle.querySelectorAll("tr:not(.no-results-row)"));
            this.#setupSortHeaders();
            this.#noResultsEle = this.#tableEle.querySelector(".no-results-row");
        }
    }

    setSearchInputEle(searchInputEle = null) {
        if (searchInputEle) {
            this.#searchInputEle = searchInputEle;
            this.#setupSearchInput();
        }
    }

    setRowCountEle(rowCountEle = null) {
        if (rowCountEle) {
            this.#rowCountEle = rowCountEle;
        }
    }

    #setupSortHeaders() {
        let firstSortHeader = null;
        this.#theaders.forEach(theader => {
            if (theader.dataset.sortParam && !firstSortHeader) {
                firstSortHeader = theader.dataset.sortParam;
            }
            const sortParam = theader.dataset.sortParam
            if (sortParam) {
                const sortWithHeader = this.#sortHandler(sortParam, this)
                theader.addEventListener("click", sortWithHeader);
                if (theader.dataset.sortType === "numeric") {
                    this.#numericSortHeaders.push(sortParam);
                }
                if (theader.dataset.sortType === "alphabetic") {
                    this.#alphabeticSortHeaders.push(sortParam);
                }
            }
        })
        if (firstSortHeader) {
            this.sort(firstSortHeader);
        }
    }

    #setupSearchInput() {
        const instance = this;
        this.#searchInputEle.addEventListener("input", () => instance.filterTable(instance));
        this.addFilter(this.#searchFilter())
    }

    #hideAllRows() {
        this.#trows.forEach(trow => {
            trow.style.display = "none";
        })
    }

    #showAllRows() {
        this.#trows.forEach(trow => {
            const searchable_td = trow.querySelector("td[data-searchable]");
            if (searchable_td) {
                trow.style.display = "table-row";
            }
        })
    }

    #hideEle(ele) {
        if (ele) {
            ele.style.display = "none";
        }
    }

    #showEle(ele, displayValue = "block") {
        if (ele) {
            ele.style.display = displayValue;
        }
    }

    #unsearch() {
        this.#showAllRows();
        this.#hideEle(this.#noResultsEle);
        this.#hideEle(this.#rowCountEle);   
    }

    #searchFilter() {
        const instance = this;
        return function (trow) {
            const query = instance.#searchInputEle.value.toLowerCase().trim();
            if (query === "") {
                const td = trow.querySelector("*[data-searchable]");
                if (td.nodeName === "TD") {
                    return true;
                }
                return false;
            }

            let visible = false;

            const tds = trow.querySelectorAll("*[data-searchable]");
            if (tds.length === 0) {
                console.warn("No data-searchable cells in " + trow.nodeName + " (id='" + trow.id + "').");
                return false;
            }
            tds.forEach(td => {
                const whereFound = ElementTextSearch.search(td, query);
                if (whereFound.length > 0) {
                    visible = true;
                    whereFound.forEach(result => {
                        Highlighter.highlight(td, result.startIndex, result.endIndex);
                    })
                }
            })

            return visible;
        }
    }

    filterBy(trowCheck) {
        this.#activeFilters.push(trowCheck);
        this.filterTable();
        this.#activeFilters.pop();
    }

    filterTable(instance = this) {
        Highlighter.clear(instance.#tbodyEle);

        instance.#trows.forEach(row => {
            let visible = true;
            instance.#activeFilters.forEach(filter => {
                if (!filter(row)) {
                    visible = false;
                }
            })
            if (visible) {
                row.style.display = "table-row";
            } else {
                row.style.display = "none";
            }
        });
        
        const visibleRows = instance.#trows.filter(trow => trow.style.display !== "none" && !trow.classList.contains("no-count-row"));
        const totalRows = instance.#trows.filter(trow => !trow.classList.contains("no-count-row"));
        if (visibleRows.length === 0) {
            instance.#showEle(instance.#noResultsEle, "table-row");
        } else {
            instance.#hideEle(instance.#noResultsEle);
        }
        if (instance.#rowCountEle) {
            if (visibleRows.length == totalRows.length) {
                instance.#rowCountEle.style.display = "none";
            } else {
                instance.#rowCountEle.style.display = "unset";
                instance.#rowCountEle.textContent = `${visibleRows.length} item${visibleRows.length !== 1 ? 's' : ''} matching (out of ${totalRows.length})`;
            }
        }
    }

    addFilter(trowCheck) {
        this.#activeFilters.push(trowCheck);
    }

    // Returns a trowCheck that filters based on an inputEle's value and a row.dataset[datasetKey].
    // allValue is the inputEle value that should 'unset' the filter to show all rows
    static createFilter(inputEle, datasetKey, allValue = "All") { 
        return function (row) {
            return inputEle.value == row.dataset[datasetKey] || inputEle.value === allValue;
        }
    } 
    

    sort(sortParam) {
        this.#sortHandler(sortParam)();
    }

    #sortHandler(sortParam, interactiveTableInstance = this) {
        return function () {
            if (!interactiveTableInstance.#trows) {
                console.warn("No rows to sort. Maybe forgot to initialize table?");
                return;
            }
            
            if (interactiveTableInstance.#currentSort.sortParam !== sortParam) {
                interactiveTableInstance.#currentSort.sortParam = sortParam;
                interactiveTableInstance.#currentSort.sortOrder = 1;
            } else {
                interactiveTableInstance.#currentSort.sortOrder = interactiveTableInstance.#currentSort.sortOrder * -1;
            }
            
            interactiveTableInstance.#setMarker();

            interactiveTableInstance.#trows.sort((trowA, trowB) => {
                let cmp;
                if (interactiveTableInstance.#numericSortHeaders.includes(sortParam))
                    cmp = parseInt(trowA.dataset[sortParam]) - parseInt(trowB.dataset[sortParam])
                else
                    cmp = trowA.dataset[sortParam].localeCompare(trowB.dataset[sortParam]);
                return interactiveTableInstance.#currentSort.sortOrder * cmp;
            });
    
            interactiveTableInstance.#trows.forEach(trow => {
                interactiveTableInstance.#tbodyEle.appendChild(trow);
            });
        }
    }

    #clearSortMarkers() {
        this.#theaders.forEach(theader => {
            if (theader.childElementCount === 1) // if the header element has a child element (assumed it will at most only have one — the marker)
                theader.removeChild(theader.childNodes[1]);
        })
    }

    #setMarker() {
        const marker = document.createElement("i");
        const sortDir = this.#currentSort.sortOrder === 1 ? "asc" : "desc";
        marker.classList.add("material-icons", "sort", sortDir);
        const sortHeader = this.#currentSortedHeader();
        this.#clearSortMarkers();
        if (sortHeader.childElementCount === 1)
            sortHeader.replaceChild(marker, sortHeader.childNodes[1]);
        else
            sortHeader.appendChild(marker);
    }

    #getSortedHeader(sortParam) {
        let header = null;
        this.#theaders.forEach(theader => {
            if (theader.dataset.sortParam === sortParam) {
                header = theader;
            }
        })
        return header;
    }

    #currentSortedHeader() {
        return this.#getSortedHeader(this.#currentSort.sortParam);
    }
}