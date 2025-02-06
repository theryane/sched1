class PDFProcessor {
    constructor() {
        this.columns = [
            { name: 'Activity ID', startX: 0, endX: 100 },
            { name: 'Activity Name', startX: 100, endX: 300 },
            { name: 'Original Duration', startX: 300, endX: 400 },
            { name: 'Remaining Duration', startX: 400, endX: 500 },
            { name: 'Start', startX: 500, endX: 600 },
            { name: 'Finish', startX: 600, endX: 700 }
        ];
    }

    async processPDF(pdfData) {
        try {
            const pdf = await pdfjsLib.getDocument(pdfData).promise;
            const numPages = pdf.numPages;
            let allData = [];

            for (let pageNum = 1; pageNum <= numPages; pageNum++) {
                const page = await pdf.getPage(pageNum);
                const textContent = await page.getTextContent();
                const pageData = this.processPage(textContent);
                allData = allData.concat(pageData);
            }

            return this.structureData(allData);
        } catch (error) {
            console.error('Error processing PDF:', error);
            throw new Error('Failed to process PDF');
        }
    }

    processPage(textContent) {
        const items = textContent.items;
        const rows = {};

        // Group items by their vertical position (y-coordinate)
        items.forEach(item => {
            const y = Math.round(item.transform[5]); // Vertical position
            if (!rows[y]) {
                rows[y] = [];
            }
            rows[y].push({
                text: item.str,
                x: item.transform[4], // Horizontal position
                width: item.width
            });
        });

        // Sort rows by y-coordinate (top to bottom)
        const sortedYPositions = Object.keys(rows)
            .map(Number)
            .sort((a, b) => b - a);

        const processedRows = [];
        let currentRow = {};

        sortedYPositions.forEach(y => {
            const rowItems = rows[y].sort((a, b) => a.x - b.x);
            
            // Determine which column each item belongs to
            rowItems.forEach(item => {
                const column = this.findColumn(item.x);
                if (column) {
                    if (!currentRow[column.name]) {
                        currentRow[column.name] = item.text;
                    } else {
                        currentRow[column.name] += ' ' + item.text;
                    }
                }
            });

            // Check if row is complete
            if (this.isRowComplete(currentRow)) {
                processedRows.push({...currentRow});
                currentRow = {};
            }
        });

        return processedRows;
    }

    findColumn(x) {
        return this.columns.find(col => x >= col.startX && x < col.endX);
    }

    isRowComplete(row) {
        // Check if row has an Activity ID and at least one other field
        return row['Activity ID'] && Object.keys(row).length > 1;
    }

    structureData(rows) {
        // Filter out header rows and empty rows
        const validRows = rows.filter(row => {
            return row['Activity ID'] && 
                   !row['Activity ID'].includes('Activity ID') && // Filter out header rows
                   row['Activity Name']; // Ensure there's an activity name
        });

        // Group related activities
        const groupedActivities = {};
        let currentGroup = null;

        validRows.forEach(row => {
            // Check if this is a main activity or sub-activity
            if (!row['Activity ID'].startsWith(' ')) {
                currentGroup = row['Activity ID'];
                groupedActivities[currentGroup] = {
                    main: row,
                    subActivities: []
                };
            } else if (currentGroup) {
                groupedActivities[currentGroup].subActivities.push(row);
            }
        });

        return {
            headers: this.columns.map(col => col.name),
            activities: validRows,
            groupedActivities: groupedActivities
        };
    }

    static cleanText(text) {
        return text.trim().replace(/\s+/g, ' ');
    }

    static parseDate(dateStr) {
        if (!dateStr) return null;
        
        // Handle various date formats
        const cleanDateStr = dateStr.trim();
        
        // Check for 'A' suffix (actual dates)
        const isActual = cleanDateStr.endsWith('A');
        const dateWithoutSuffix = isActual ? cleanDateStr.slice(0, -1) : cleanDateStr;
        
        try {
            const date = new Date(dateWithoutSuffix);
            return {
                date: date,
                isActual: isActual,
                formatted: date.toISOString().split('T')[0]
            };
        } catch (e) {
            return null;
        }
    }

    static validateDuration(duration) {
        const num = parseInt(duration);
        return !isNaN(num) ? num : null;
    }
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PDFProcessor;
}