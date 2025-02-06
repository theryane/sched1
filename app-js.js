// Initialize PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

// Initialize PDF Processor
const pdfProcessor = new PDFProcessor();

// DOM Elements
const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
const status = document.getElementById('status');
const preview = document.getElementById('preview');
const downloadBtn = document.getElementById('downloadBtn');

// Event Listeners
dropZone.addEventListener('dragover', handleDragOver);
dropZone.addEventListener('dragleave', handleDragLeave);
dropZone.addEventListener('drop', handleDrop);
fileInput.addEventListener('change', handleFileSelect);
downloadBtn.addEventListener('click', handleDownload);

// Drag and Drop Handlers
function handleDragOver(e) {
    e.preventDefault();
    dropZone.classList.add('drag-over');
}

function handleDragLeave(e) {
    e.preventDefault();
    dropZone.classList.remove('drag-over');
}

function handleDrop(e) {
    e.preventDefault();
    dropZone.classList.remove('drag-over');
    
    const file = e.dataTransfer.files[0];
    if (file && file.type === 'application/pdf') {
        processFile(file);
    } else {
        showStatus('Please upload a PDF file.', 'error');
    }
}

function handleFileSelect(e) {
    const file = e.target.files[0];
    if (file) {
        processFile(file);
    }
}

// Status Display
function showStatus(message, type) {
    status.textContent = message;
    status.className = type;
    status.style.display = 'block';
}

// Main PDF Processing
async function processFile(file) {
    try {
        showStatus('Reading PDF file...', 'success');
        
        const arrayBuffer = await file.arrayBuffer();
        const processedData = await pdfProcessor.processPDF(arrayBuffer);
        
        // Display preview
        showPreview(processedData);
        
        // Enable download
        downloadBtn.style.display = 'block';
        
        showStatus('PDF processed successfully!', 'success');
    } catch (error) {
        console.error('Error processing PDF:', error);
        showStatus('Error processing PDF. Please try again.', 'error');
    }
}

// Preview Data
function showPreview(data) {
    preview.style.display = 'block';
    preview.innerHTML = ''; // Clear previous content

    // Create tabs for different views
    const tabContainer = document.createElement('div');
    tabContainer.className = 'tab-container';
    
    const flatViewTab = createTab('Flat View', true);
    const hierarchyViewTab = createTab('Hierarchy View', false);
    
    tabContainer.appendChild(flatViewTab);
    tabContainer.appendChild(hierarchyViewTab);
    preview.appendChild(tabContainer);

    // Create content containers
    const flatViewContent = createTabContent('flat-view', true);
    const hierarchyViewContent = createTabContent('hierarchy-view', false);
    
    // Create and populate tables
    const flatTable = createDataTable(data.headers, data.activities);
    flatViewContent.appendChild(flatTable);

    const hierarchyTable = createHierarchyTable(data.groupedActivities);
    hierarchyViewContent.appendChild(hierarchyTable);

    preview.appendChild(flatViewContent);
    preview.appendChild(hierarchyViewContent);

    // Add tab switching functionality
    flatViewTab.addEventListener('click', () => switchTab('flat-view'));
    hierarchyViewTab.addEventListener('click', () => switchTab('hierarchy-view'));
}

function createTab(text, isActive) {
    const tab = document.createElement('button');
    tab.className = `tab ${isActive ? 'active' : ''}`;
    tab.textContent = text;
    return tab;
}

function createTabContent(id, isActive) {
    const content = document.createElement('div');
    content.id = id;
    content.className = `tab-content ${isActive ? 'active' : ''}`;
    return content;
}

function switchTab(tabId) {
    const tabs = document.querySelectorAll('.tab');
    const contents = document.querySelectorAll('.tab-content');
    
    tabs.forEach(tab => tab.classList.remove('active'));
    contents.forEach(content => content.classList.remove('active'));
    
    const selectedTab = document.querySelector(`.tab:nth-child(${tabId === 'flat-view' ? '1' : '2'})`);
    const selectedContent = document.getElementById(tabId);
    
    selectedTab.classList.add('active');
    selectedContent.classList.add('active');
}

function createDataTable(headers, data) {
    const table = document.createElement('table');
    table.className = 'data-table';
    
    // Add headers
    const headerRow = document.createElement('tr');
    headers.forEach(header => {
        const th = document.createElement('th');
        th.textContent = header;
        headerRow.appendChild(th);
    });
    table.appendChild(headerRow);
    
    // Add data rows
    data.forEach(row => {
        const tr = document.createElement('tr');
        headers.forEach(header => {
            const td = document.createElement('td');
            td.textContent = row[header] || '';
            tr.appendChild(td);
        });
        table.appendChild(tr);
    });
    
    return table;
}

function createHierarchyTable(groupedData) {
    const table = document.createElement('table');
    table.className = 'hierarchy-table';
    
    // Add headers
    const headers = ['Activity ID', 'Activity Name', 'Duration', 'Start', 'Finish'];
    const headerRow = document.createElement('tr');
    headers.forEach(header => {
        const th = document.createElement('th');
        th.textContent = header;
        headerRow.appendChild(th);
    });
    table.appendChild(headerRow);
    
    // Add grouped data
    Object.entries(groupedData).forEach(([groupId, group]) => {
        // Add main activity
        const mainRow = createActivityRow(group.main, 'main-activity');
        table.appendChild(mainRow);
        
        // Add sub-activities
        group.subActivities.forEach(subActivity => {
            const subRow = createActivityRow(subActivity, 'sub-activity');
            table.appendChild(subRow);
        });
    });
    
    return table;
}

function createActivityRow(activity, className) {
    const tr = document.createElement('tr');
    tr.className = className;
    
    const cells = [
        activity['Activity ID'],
        activity['Activity Name'],
        activity['Original Duration'],
        activity['Start'],
        activity['Finish']
    ];
    
    cells.forEach(cellText => {
        const td = document.createElement('td');
        td.textContent = cellText || '';
        tr.appendChild(td);
    });
    
    return tr;
}

// Handle Download
function handleDownload() {
    const activeView = document.querySelector('.tab-content.active');
    const table = activeView.querySelector('table');
    
    // Convert table to CSV
    const rows = Array.from(table.querySelectorAll('tr'));
    const csvContent = rows.map(row => {
        return Array.from(row.cells)
            .map(cell => `"${cell.textContent.replace(/"/g, '""')}"`)
            .join(',');
    }).join('\n');
    
    // Create and trigger download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = 'schedule_data.csv';
    
    document.body.appendChild(a);
    a.click();
    
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
}