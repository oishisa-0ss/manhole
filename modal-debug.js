// Modal Debug Script - Run this in browser console to test modal functionality

console.log('=== Modal Debug Analysis ===');

// Check if all required buttons exist
const requiredButtons = [
    'master-edit-btn',
    'data-export-btn', 
    'manage-inspectors-btn',
    'qr-scan-btn'
];

console.log('\n1. Checking button elements:');
requiredButtons.forEach(buttonId => {
    const button = document.getElementById(buttonId);
    console.log(`${buttonId}: ${button ? '✓ Found' : '✗ Missing'}`);
    if (button) {
        console.log(`  - Visible: ${getComputedStyle(button).display !== 'none'}`);
        console.log(`  - Click listeners: ${getEventListeners(button).click?.length || 0}`);
    }
});

// Check if all required modals exist
const requiredModals = [
    'master-modal',
    'export-modal',
    'inspector-management-modal',
    'qr-scan-modal',
    'manhole-edit-modal'
];

console.log('\n2. Checking modal elements:');
requiredModals.forEach(modalId => {
    const modal = document.getElementById(modalId);
    console.log(`${modalId}: ${modal ? '✓ Found' : '✗ Missing'}`);
    if (modal) {
        console.log(`  - Classes: ${modal.className}`);
        console.log(`  - Display: ${getComputedStyle(modal).display}`);
        console.log(`  - Z-index: ${getComputedStyle(modal).zIndex}`);
    }
});

// Check CSS rules
console.log('\n3. Checking modal CSS:');
const styleSheets = Array.from(document.styleSheets);
let modalCSSFound = false;
styleSheets.forEach(sheet => {
    try {
        Array.from(sheet.cssRules).forEach(rule => {
            if (rule.selectorText && rule.selectorText.includes('.modal')) {
                modalCSSFound = true;
                console.log(`CSS Rule: ${rule.selectorText}`);
            }
        });
    } catch (e) {
        console.log('Cannot access stylesheet:', e.message);
    }
});
console.log(`Modal CSS found: ${modalCSSFound ? '✓' : '✗'}`);

// Test modal opening functions
console.log('\n4. Testing modal functions:');
if (window.app) {
    console.log('App instance found ✓');
    
    // Test each modal opening function
    const modalFunctions = [
        'openMasterModal',
        'openExportModal', 
        'openInspectorModal'
    ];
    
    modalFunctions.forEach(funcName => {
        if (typeof app[funcName] === 'function') {
            console.log(`${funcName}: ✓ Function exists`);
        } else {
            console.log(`${funcName}: ✗ Function missing`);
        }
    });
} else {
    console.log('App instance not found ✗');
}

// Manual test function
console.log('\n5. Manual test functions available:');
console.log('Run testModal("master") to test master modal');
console.log('Run testModal("export") to test export modal');
console.log('Run testModal("inspector") to test inspector modal');

window.testModal = function(type) {
    const modalMap = {
        'master': 'master-modal',
        'export': 'export-modal', 
        'inspector': 'inspector-management-modal'
    };
    
    const modalId = modalMap[type];
    if (!modalId) {
        console.log('Invalid modal type. Use: master, export, or inspector');
        return;
    }
    
    const modal = document.getElementById(modalId);
    if (!modal) {
        console.log(`Modal ${modalId} not found`);
        return;
    }
    
    console.log(`Testing ${type} modal...`);
    modal.classList.add('active');
    console.log(`Modal should now be visible. Classes: ${modal.className}`);
    
    setTimeout(() => {
        modal.classList.remove('active');
        console.log('Modal closed');
    }, 3000);
};

console.log('\n=== Debug Complete ===');