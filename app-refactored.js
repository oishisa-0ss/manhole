class ManholeInspectionApp {
    constructor() {
        this.dataManager = new DataManager();
        this.uiManager = new UIManager(this);
        this.mapManager = new MapManager(this);
        this.voiceManager = new VoiceManager(this);
        this.qrManager = new QRManager(this);
        this.exportManager = new ExportManager(this);
        
        this.init();
    }

    async init() {
        console.log('Initializing ManholeInspectionApp...');
        
        try {
            await this.dataManager.loadData();
            console.log('Data loaded');
            
            this.setupEventListeners();
            console.log('Event listeners set up');
            
            this.uiManager.formManager.initializeForm();
            console.log('Form initialized');
            
            this.uiManager.formManager.populateManholeSelects();
            console.log('Manhole selects populated');
            
            this.uiManager.formManager.populateInspectorSelect();
            console.log('Inspector select populated');
            
            this.voiceManager.initializeVoiceRecognition();
            console.log('Voice recognition initialized');
            
            this.mapManager.initializeMap();
            console.log('Map initialized');
            
            this.dataManager.setupAutoBackup();
            console.log('Auto backup set up');
            
            await this.registerServiceWorker();
            console.log('Service worker registered');
            
            console.log('ManholeInspectionApp initialization complete');
        } catch (error) {
            console.error('Initialization error:', error);
            this.uiManager.showAlert('アプリケーションの初期化に失敗しました', 'error', error.message);
        }
    }

    setupEventListeners() {
        this.uiManager.setupEventListeners();
        this.mapManager.setupLocationListeners();
        this.voiceManager.setupVoiceInputListeners();
        this.qrManager.setupQRListeners();
        this.exportManager.setupExportListeners();
    }

    async registerServiceWorker() {
        // Service WorkerはHTTPS/HTTPプロトコルでのみ動作するため、file://では登録をスキップ
        if ('serviceWorker' in navigator && 
            (location.protocol === 'https:' || location.protocol === 'http:')) {
            try {
                await navigator.serviceWorker.register('./sw.js');
                console.log('Service Worker registered successfully');
            } catch (error) {
                console.error('Service Worker registration failed:', error);
            }
        } else {
            console.log('Service Worker skipped (file:// protocol or not supported)');
        }
    }

    destroy() {
        if (this.dataManager) {
            this.dataManager.destroy();
        }
        if (this.mapManager) {
            this.mapManager.destroy();
        }
        if (this.voiceManager) {
            this.voiceManager.destroy();
        }
        if (this.qrManager) {
            this.qrManager.destroy();
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM Content Loaded, initializing app...');
    
    if (window.app) {
        window.app.destroy();
    }
    
    window.app = new ManholeInspectionApp();
});

if (document.readyState === 'loading') {
    console.log('DOM is still loading, waiting for DOMContentLoaded...');
    document.addEventListener('DOMContentLoaded', () => {
        if (!window.app) {
            console.log('DOMContentLoaded fired, initializing app...');
            window.app = new ManholeInspectionApp();
        }
    });
} else {
    console.log('DOM already loaded, initializing app immediately...');
    if (window.app) {
        window.app.destroy();
    }
    window.app = new ManholeInspectionApp();
}