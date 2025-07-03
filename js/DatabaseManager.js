class DatabaseManager {
    constructor() {
        this.dbName = 'manholeInspectionDB';
        this.dbVersion = 2;  // 写真機能追加のためバージョンアップ
        this.db = null;
    }

    async initializeDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);

            request.onerror = () => {
                console.error('データベースの初期化に失敗しました:', request.error);
                reject(request.error);
            };

            request.onsuccess = () => {
                this.db = request.result;
                console.log('データベースが正常に初期化されました');
                resolve(this.db);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                
                if (!db.objectStoreNames.contains('inspections')) {
                    const inspectionStore = db.createObjectStore('inspections', { 
                        keyPath: 'id',
                        autoIncrement: false
                    });
                    
                    inspectionStore.createIndex('manholeId', 'manholeId', { unique: false });
                    inspectionStore.createIndex('inspectionDate', 'inspectionDate', { unique: false });
                    inspectionStore.createIndex('inspector', 'inspector', { unique: false });
                    inspectionStore.createIndex('timestamp', 'timestamp', { unique: false });
                    
                    console.log('点検履歴テーブル(inspections)を作成しました');
                }

                if (!db.objectStoreNames.contains('sync_status')) {
                    const syncStore = db.createObjectStore('sync_status', { 
                        keyPath: 'key'
                    });
                    console.log('同期ステータステーブル(sync_status)を作成しました');
                }

                // 写真データ用のオブジェクトストア
                if (!db.objectStoreNames.contains('photos')) {
                    const photoStore = db.createObjectStore('photos', { 
                        keyPath: 'id',
                        autoIncrement: false
                    });
                    
                    photoStore.createIndex('inspectionId', 'inspectionId', { unique: false });
                    photoStore.createIndex('timestamp', 'timestamp', { unique: false });
                    photoStore.createIndex('manholeId', 'manholeId', { unique: false });
                    
                    console.log('写真データテーブル(photos)を作成しました');
                }
            };
        });
    }

    async addInspection(inspection) {
        if (!this.db) {
            throw new Error('データベースが初期化されていません');
        }

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['inspections'], 'readwrite');
            const store = transaction.objectStore('inspections');
            
            const inspectionWithTimestamp = {
                ...inspection,
                id: inspection.id || Date.now(),
                timestamp: inspection.timestamp || new Date().toISOString(),
                syncStatus: 'pending'
            };

            const request = store.add(inspectionWithTimestamp);

            request.onsuccess = () => {
                console.log('点検データをデータベースに追加しました:', inspectionWithTimestamp.id);
                resolve(inspectionWithTimestamp);
            };

            request.onerror = () => {
                console.error('点検データの追加に失敗しました:', request.error);
                reject(request.error);
            };
        });
    }

    async updateInspection(inspection) {
        if (!this.db) {
            throw new Error('データベースが初期化されていません');
        }

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['inspections'], 'readwrite');
            const store = transaction.objectStore('inspections');
            
            const inspectionWithTimestamp = {
                ...inspection,
                updatedAt: new Date().toISOString(),
                syncStatus: 'pending'
            };

            const request = store.put(inspectionWithTimestamp);

            request.onsuccess = () => {
                console.log('点検データを更新しました:', inspection.id);
                resolve(inspectionWithTimestamp);
            };

            request.onerror = () => {
                console.error('点検データの更新に失敗しました:', request.error);
                reject(request.error);
            };
        });
    }

    async deleteInspection(inspectionId) {
        if (!this.db) {
            throw new Error('データベースが初期化されていません');
        }

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['inspections'], 'readwrite');
            const store = transaction.objectStore('inspections');
            
            const request = store.delete(inspectionId);

            request.onsuccess = () => {
                console.log('点検データを削除しました:', inspectionId);
                resolve(true);
            };

            request.onerror = () => {
                console.error('点検データの削除に失敗しました:', request.error);
                reject(request.error);
            };
        });
    }

    async getInspection(inspectionId) {
        if (!this.db) {
            throw new Error('データベースが初期化されていません');
        }

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['inspections'], 'readonly');
            const store = transaction.objectStore('inspections');
            
            const request = store.get(inspectionId);

            request.onsuccess = () => {
                resolve(request.result || null);
            };

            request.onerror = () => {
                console.error('点検データの取得に失敗しました:', request.error);
                reject(request.error);
            };
        });
    }

    async getAllInspections() {
        if (!this.db) {
            throw new Error('データベースが初期化されていません');
        }

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['inspections'], 'readonly');
            const store = transaction.objectStore('inspections');
            
            const request = store.getAll();

            request.onsuccess = () => {
                resolve(request.result || []);
            };

            request.onerror = () => {
                console.error('全点検データの取得に失敗しました:', request.error);
                reject(request.error);
            };
        });
    }

    async getFilteredInspections(manholeId = null, period = 'all') {
        const allInspections = await this.getAllInspections();
        let inspections = allInspections;
        
        if (manholeId) {
            inspections = inspections.filter(i => i.manholeId == manholeId);
        }
        
        if (period !== 'all') {
            const periodDays = {
                '1month': 30,
                '3months': 90,
                '6months': 180,
                '1year': 365
            };
            
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - periodDays[period]);
            
            inspections = inspections.filter(i => 
                new Date(i.inspectionDate) >= cutoffDate
            );
        }
        
        return inspections.sort((a, b) => new Date(b.inspectionDate) - new Date(a.inspectionDate));
    }

    async getMonthlyInspections(year, month) {
        const allInspections = await this.getAllInspections();
        return allInspections.filter(inspection => {
            const date = new Date(inspection.inspectionDate);
            return date.getFullYear() === year && date.getMonth() + 1 === month;
        });
    }

    async migrateFromLocalStorage(localStorageData) {
        if (!localStorageData || !localStorageData.inspections) {
            console.log('LocalStorageに点検データが見つかりません');
            return;
        }

        console.log('LocalStorageからデータベースへ移行を開始します...');
        
        const existingInspections = await this.getAllInspections();
        const existingIds = new Set(existingInspections.map(i => i.id));
        
        let migratedCount = 0;
        
        for (const inspection of localStorageData.inspections) {
            if (!existingIds.has(inspection.id)) {
                try {
                    await this.addInspection(inspection);
                    migratedCount++;
                } catch (error) {
                    console.error('移行エラー:', inspection.id, error);
                }
            }
        }
        
        console.log(`${migratedCount}件の点検データを移行しました`);
        return migratedCount;
    }

    async exportAllInspections() {
        const inspections = await this.getAllInspections();
        return {
            version: '1.0',
            exportDate: new Date().toISOString(),
            dataType: 'inspections',
            totalRecords: inspections.length,
            inspections: inspections
        };
    }

    async exportInspectionsToFile() {
        try {
            const exportData = await this.exportAllInspections();
            const blob = new Blob([JSON.stringify(exportData, null, 2)], { 
                type: 'application/json' 
            });
            
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `点検履歴バックアップ_${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            console.log(`点検履歴をエクスポートしました (${exportData.totalRecords}件)`);
            return true;
        } catch (error) {
            console.error('点検履歴のエクスポートに失敗しました:', error);
            throw error;
        }
    }

    async importInspectionsFromFile(file) {
        if (!file) {
            throw new Error('ファイルが選択されていません');
        }

        try {
            const text = await file.text();
            const backupData = JSON.parse(text);
            
            if (!backupData.inspections || !Array.isArray(backupData.inspections)) {
                throw new Error('無効な点検履歴バックアップファイルです');
            }

            if (backupData.dataType && backupData.dataType !== 'inspections') {
                throw new Error('点検履歴ファイルではありません');
            }

            const existingInspections = await this.getAllInspections();
            const existingIds = new Set(existingInspections.map(i => i.id));
            
            let importedCount = 0;
            let updatedCount = 0;
            let skippedCount = 0;

            for (const inspection of backupData.inspections) {
                if (!inspection.id) {
                    inspection.id = Date.now() + Math.random();
                }

                try {
                    if (existingIds.has(inspection.id)) {
                        // 既存データがある場合は更新
                        await this.updateInspection(inspection);
                        updatedCount++;
                    } else {
                        // 新規データとして追加
                        await this.addInspection(inspection);
                        importedCount++;
                    }
                } catch (error) {
                    console.warn('点検データのインポートをスキップ:', inspection.id, error.message);
                    skippedCount++;
                }
            }

            console.log('点検履歴のインポート完了:', {
                imported: importedCount,
                updated: updatedCount,
                skipped: skippedCount,
                total: backupData.inspections.length
            });

            return {
                imported: importedCount,
                updated: updatedCount,
                skipped: skippedCount,
                total: backupData.inspections.length
            };

        } catch (error) {
            if (error.message.includes('JSON')) {
                throw new Error('無効なJSONファイルです');
            }
            throw error;
        }
    }

    async mergeInspectionsFromFile(file, mergeMode = 'skip') {
        // mergeMode: 'skip' (重複スキップ), 'update' (重複更新), 'duplicate' (重複許可)
        
        if (!file) {
            throw new Error('ファイルが選択されていません');
        }

        try {
            const text = await file.text();
            const backupData = JSON.parse(text);
            
            if (!backupData.inspections || !Array.isArray(backupData.inspections)) {
                throw new Error('無効な点検履歴バックアップファイルです');
            }

            const existingInspections = await this.getAllInspections();
            const existingIds = new Set(existingInspections.map(i => i.id));
            
            let importedCount = 0;
            let updatedCount = 0;
            let skippedCount = 0;

            for (const inspection of backupData.inspections) {
                try {
                    if (existingIds.has(inspection.id)) {
                        switch (mergeMode) {
                            case 'update':
                                await this.updateInspection(inspection);
                                updatedCount++;
                                break;
                            case 'duplicate':
                                // 新しいIDを生成して重複を許可
                                inspection.id = Date.now() + Math.random();
                                inspection.importedAt = new Date().toISOString();
                                await this.addInspection(inspection);
                                importedCount++;
                                break;
                            case 'skip':
                            default:
                                skippedCount++;
                                break;
                        }
                    } else {
                        await this.addInspection(inspection);
                        importedCount++;
                    }
                } catch (error) {
                    console.warn('点検データのマージをスキップ:', inspection.id, error.message);
                    skippedCount++;
                }
            }

            return {
                imported: importedCount,
                updated: updatedCount,
                skipped: skippedCount,
                total: backupData.inspections.length,
                mergeMode: mergeMode
            };

        } catch (error) {
            if (error.message.includes('JSON')) {
                throw new Error('無効なJSONファイルです');
            }
            throw error;
        }
    }

    async setSyncStatus(key, status) {
        if (!this.db) return;

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['sync_status'], 'readwrite');
            const store = transaction.objectStore('sync_status');
            
            const request = store.put({ key, status, timestamp: new Date().toISOString() });

            request.onsuccess = () => resolve(true);
            request.onerror = () => reject(request.error);
        });
    }

    async getSyncStatus(key) {
        if (!this.db) return null;

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['sync_status'], 'readonly');
            const store = transaction.objectStore('sync_status');
            
            const request = store.get(key);

            request.onsuccess = () => resolve(request.result?.status || null);
            request.onerror = () => reject(request.error);
        });
    }

    async clearAllData() {
        if (!this.db) {
            throw new Error('データベースが初期化されていません');
        }

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['inspections'], 'readwrite');
            const store = transaction.objectStore('inspections');
            
            const request = store.clear();

            request.onsuccess = () => {
                console.log('すべての点検データを削除しました');
                resolve(true);
            };

            request.onerror = () => {
                console.error('データ削除に失敗しました:', request.error);
                reject(request.error);
            };
        });
    }

    // 写真データ管理メソッド
    async addPhoto(photo) {
        console.log('DatabaseManager.addPhoto - 写真を追加中:', photo.id);
        
        if (!this.db) throw new Error('データベースが初期化されていません');

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['photos'], 'readwrite');
            const store = transaction.objectStore('photos');
            
            console.log('写真データをストアに追加:', {
                id: photo.id,
                inspectionId: photo.inspectionId,
                name: photo.name
            });
            const request = store.add(photo);

            request.onsuccess = () => {
                console.log('写真データの追加に成功:', photo.id);
                resolve(photo);
            };
            request.onerror = () => {
                console.error('写真データの追加に失敗:', request.error);
                reject(request.error);
            };
        });
    }

    async getPhotosByInspectionId(inspectionId) {
        console.log('DatabaseManager.getPhotosByInspectionId - inspectionId:', inspectionId, 'type:', typeof inspectionId, 'db:', !!this.db);
        
        if (!this.db) {
            console.log('データベースが初期化されていません');
            return [];
        }

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['photos'], 'readonly');
            const store = transaction.objectStore('photos');
            const index = store.index('inspectionId');
            
            // inspectionIdを数値として検索（データベースでは数値として保存されている可能性）
            const searchId = typeof inspectionId === 'string' ? parseInt(inspectionId, 10) : inspectionId;
            console.log('インデックスから写真を検索中:', inspectionId, '→', searchId);
            
            const request = index.getAll(searchId);

            request.onsuccess = () => {
                console.log('写真検索結果:', request.result);
                resolve(request.result || []);
            };
            request.onerror = () => {
                console.error('写真検索エラー:', request.error);
                reject(request.error);
            };
        });
    }

    async deletePhoto(photoId) {
        if (!this.db) return false;

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['photos'], 'readwrite');
            const store = transaction.objectStore('photos');
            
            const request = store.delete(photoId);

            request.onsuccess = () => resolve(true);
            request.onerror = () => reject(request.error);
        });
    }

    async deletePhotosByInspectionId(inspectionId) {
        if (!this.db) return false;

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['photos'], 'readwrite');
            const store = transaction.objectStore('photos');
            const index = store.index('inspectionId');
            
            const request = index.openCursor(inspectionId);

            request.onsuccess = (event) => {
                const cursor = event.target.result;
                if (cursor) {
                    cursor.delete();
                    cursor.continue();
                } else {
                    resolve(true);
                }
            };

            request.onerror = () => reject(request.error);
        });
    }

    async getAllPhotos() {
        if (!this.db) return [];

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['photos'], 'readonly');
            const store = transaction.objectStore('photos');
            
            const request = store.getAll();

            request.onsuccess = () => resolve(request.result || []);
            request.onerror = () => reject(request.error);
        });
    }

    destroy() {
        if (this.db) {
            this.db.close();
            this.db = null;
        }
    }
}