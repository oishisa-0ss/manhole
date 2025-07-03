class FileManager {
    constructor() {
        this.manholeFile = 'data/manholes.json';
        this.inspectorFile = 'data/inspectors.json';
    }

    async loadJSONFile(filename) {
        try {
            const response = await fetch(filename);
            if (!response.ok) {
                if (response.status === 404) {
                    console.log(`File ${filename} not found, trying LocalStorage fallback`);
                    return this.loadFromLocalStorage(filename);
                }
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            console.log(`Loaded ${filename} successfully`);
            return data;
        } catch (error) {
            console.warn(`Failed to load ${filename}:`, error.message, 'trying LocalStorage fallback');
            return this.loadFromLocalStorage(filename);
        }
    }

    loadFromLocalStorage(filename) {
        try {
            const key = `fileManager_${filename.replace(/[\/\\]/g, '_')}`;
            const stored = localStorage.getItem(key);
            if (stored) {
                const data = JSON.parse(stored);
                console.log(`Loaded ${filename} from LocalStorage with key: ${key}`);
                return Array.isArray(data) ? data : [];
            }
            console.log(`No data found in LocalStorage for ${filename}`);
            return [];
        } catch (error) {
            console.error(`Failed to load ${filename} from LocalStorage:`, error);
            return [];
        }
    }

    async saveJSONFile(filename, data) {
        console.warn(`FileManager.saveJSONFile: ブラウザ環境ではファイルを直接保存できません。LocalStorageにフォールバックします。`);
        
        try {
            // LocalStorageに保存（フォールバック）
            const key = `fileManager_${filename.replace(/[\/\\]/g, '_')}`;
            localStorage.setItem(key, JSON.stringify(data));
            console.log(`Saved ${filename} to LocalStorage with key: ${key}`);
            return true;
        } catch (error) {
            console.error(`Failed to save ${filename} to LocalStorage:`, error);
            throw error;
        }
    }

    async loadManholes() {
        const manholes = await this.loadJSONFile(this.manholeFile);
        return Array.isArray(manholes) ? manholes : [];
    }

    async saveManholes(manholes) {
        return await this.saveJSONFile(this.manholeFile, manholes);
    }

    async loadInspectors() {
        const inspectors = await this.loadJSONFile(this.inspectorFile);
        return Array.isArray(inspectors) ? inspectors : [];
    }

    async saveInspectors(inspectors) {
        return await this.saveJSONFile(this.inspectorFile, inspectors);
    }

    // エクスポート用（日付付きファイル名）
    async exportManholes(manholes) {
        const date = new Date().toISOString().split('T')[0];
        const filename = `manholes_${date}.json`;
        
        try {
            const blob = new Blob([JSON.stringify(manholes, null, 2)], { 
                type: 'application/json' 
            });
            
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            console.log(`Exported manholes to ${filename}`);
            return true;
        } catch (error) {
            console.error(`Failed to export manholes:`, error);
            throw error;
        }
    }

    async exportInspectors(inspectors) {
        const date = new Date().toISOString().split('T')[0];
        const filename = `inspectors_${date}.json`;
        
        try {
            const blob = new Blob([JSON.stringify(inspectors, null, 2)], { 
                type: 'application/json' 
            });
            
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            console.log(`Exported inspectors to ${filename}`);
            return true;
        } catch (error) {
            console.error(`Failed to export inspectors:`, error);
            throw error;
        }
    }

    async uploadJSONFile(fileInput) {
        return new Promise((resolve, reject) => {
            const file = fileInput.files[0];
            if (!file) {
                reject(new Error('ファイルが選択されていません'));
                return;
            }

            if (!file.name.endsWith('.json')) {
                reject(new Error('JSONファイルを選択してください'));
                return;
            }

            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = JSON.parse(e.target.result);
                    resolve(data);
                } catch (error) {
                    reject(new Error('無効なJSONファイルです'));
                }
            };
            reader.onerror = () => reject(new Error('ファイル読み込みエラー'));
            reader.readAsText(file);
        });
    }

    async createDataDirectory() {
        console.log('Note: Data directory creation is handled by the server or manually');
        return true;
    }
}