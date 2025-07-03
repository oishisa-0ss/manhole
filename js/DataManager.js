class DataManager {
    constructor() {
        this.data = {
            manholes: [],
            inspections: [],
            photos: [],
            inspectors: []
        };
        this.backupInterval = null;
        this.fileManager = new FileManager();
        this.databaseManager = new DatabaseManager();
        this.useDatabase = true; // 点検履歴はDBを使用
    }

    async loadData() {
        try {
            // データベース初期化
            if (this.useDatabase) {
                await this.databaseManager.initializeDB();
            }

            // JSONファイルからマスタデータを読み込み
            this.data.manholes = await this.fileManager.loadManholes();
            this.data.inspectors = await this.fileManager.loadInspectors();

            // マンホールマスタが空の場合、デフォルト値を設定
            if (this.data.manholes.length === 0) {
                this.data.manholes = this.getDefaultManholes();
                await this.saveManholesToFile();
            } else {
                // 既存マンホールデータに警告範囲を追加（マイグレーション）
                await this.migrateWarningRanges();
            }

            // 点検履歴はデータベースから読み込み
            if (this.useDatabase) {
                this.data.inspections = await this.databaseManager.getAllInspections();
                
                // LocalStorageからの移行処理
                await this.migrateFromLocalStorage();
            } else {
                // フォールバック: LocalStorageから読み込み
                const savedData = localStorage.getItem('manholeInspectionData');
                if (savedData) {
                    const parsedData = JSON.parse(savedData);
                    this.data.inspections = parsedData.inspections || [];
                }
            }

            console.log('データ読み込み完了:', {
                manholes: this.data.manholes.length,
                inspectors: this.data.inspectors.length,
                inspections: this.data.inspections.length
            });

        } catch (error) {
            console.error('データの読み込みに失敗しました:', error);
            // フォールバック処理
            this.data.manholes = this.getDefaultManholes();
            this.data.inspectors = [];
            this.data.inspections = [];
        }
    }

    saveData() {
        // 互換性のため残しておく（従来のLocalStorage保存）
        try {
            localStorage.setItem('manholeInspectionData', JSON.stringify(this.data));
        } catch (error) {
            console.error('LocalStorageの保存に失敗しました:', error);
        }
    }

    async saveManholesToFile() {
        try {
            await this.fileManager.saveManholes(this.data.manholes);
            console.log('マンホールマスタをファイルに保存しました');
        } catch (error) {
            console.error('マンホールマスタの保存に失敗しました:', error);
        }
    }

    async saveInspectorsToFile() {
        try {
            await this.fileManager.saveInspectors(this.data.inspectors);
            console.log('担当者マスタをファイルに保存しました');
        } catch (error) {
            console.error('担当者マスタの保存に失敗しました:', error);
        }
    }

    // エクスポート用（日付付きファイル名でダウンロード）
    async exportManholesToFile() {
        try {
            await this.fileManager.exportManholes(this.data.manholes);
            console.log('マンホールマスタをエクスポートしました');
        } catch (error) {
            console.error('マンホールマスタのエクスポートに失敗しました:', error);
            throw error;
        }
    }

    async exportInspectorsToFile() {
        try {
            await this.fileManager.exportInspectors(this.data.inspectors);
            console.log('担当者マスタをエクスポートしました');
        } catch (error) {
            console.error('担当者マスタのエクスポートに失敗しました:', error);
            throw error;
        }
    }

    async migrateFromLocalStorage() {
        try {
            const savedData = localStorage.getItem('manholeInspectionData');
            if (savedData) {
                const parsedData = JSON.parse(savedData);
                if (parsedData.inspections && parsedData.inspections.length > 0) {
                    const migratedCount = await this.databaseManager.migrateFromLocalStorage(parsedData);
                    if (migratedCount > 0) {
                        console.log(`${migratedCount}件の点検データをLocalStorageからデータベースに移行しました`);
                        // 移行後、LocalStorageの点検データをクリア
                        parsedData.inspections = [];
                        localStorage.setItem('manholeInspectionData', JSON.stringify(parsedData));
                    }
                }
            }
        } catch (error) {
            console.error('LocalStorageからの移行に失敗しました:', error);
        }
    }

    async migrateWarningRanges() {
        let needsUpdate = false;
        
        this.data.manholes.forEach(manhole => {
            // 警告範囲が設定されていない場合、デフォルト値を設定
            if (!manhole.currentWarningRange1) {
                manhole.currentWarningRange1 = {
                    min: manhole.ratedCurrent1 * 0.9,
                    max: manhole.ratedCurrent1 * 1.1
                };
                needsUpdate = true;
            }
            
            if (!manhole.currentWarningRange2) {
                manhole.currentWarningRange2 = {
                    min: manhole.ratedCurrent2 * 0.9,
                    max: manhole.ratedCurrent2 * 1.1
                };
                needsUpdate = true;
            }
            
            // 点検項目配列の初期化
            if (!manhole.inspectionItems) {
                manhole.inspectionItems = [];
                needsUpdate = true;
            }
            
        });
        
        if (needsUpdate) {
            await this.saveManholesToFile();
            console.log('マンホールデータに警告範囲を追加しました');
        }
    }

    getDefaultManholes() {
        return [
            {
                id: 1,
                name: 'マンホール1',
                ratedCurrent1: 15.0,
                ratedCurrent2: 15.0,
                outputKw1: 7.5,
                outputKw2: 7.5,
                // 警告範囲設定
                currentWarningRange1: { min: 13.5, max: 16.5 }, // No1電流警告範囲
                currentWarningRange2: { min: 13.5, max: 16.5 }, // No2電流警告範囲
                latitude: 35.6762,
                longitude: 139.6503,
                inspectionItems: []
            },
            {
                id: 2,
                name: 'マンホール2',
                ratedCurrent1: 20.0,
                ratedCurrent2: 20.0,
                outputKw1: 10.0,
                outputKw2: 10.0,
                // 警告範囲設定
                currentWarningRange1: { min: 18.0, max: 22.0 }, // No1電流警告範囲
                currentWarningRange2: { min: 18.0, max: 22.0 }, // No2電流警告範囲
                latitude: 35.6812,
                longitude: 139.7671,
                inspectionItems: []
            }
        ];
    }

    async addInspection(inspectionData) {
        const inspection = {
            id: Date.now(),
            timestamp: new Date().toISOString(),
            ...inspectionData
        };

        // 写真データを分離
        const photos = inspection.photos || [];
        delete inspection.photos; // 点検データから写真を除外

        if (this.useDatabase) {
            try {
                const savedInspection = await this.databaseManager.addInspection(inspection);
                
                // 写真データを個別に保存
                if (photos.length > 0) {
                    console.log('写真データを保存中:', photos.length, '枚');
                    for (const photo of photos) {
                        const photoData = {
                            id: photo.id || `photo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                            inspectionId: Number(savedInspection.id), // 数値として統一
                            manholeId: savedInspection.manholeId,
                            data: photo.data,
                            name: photo.name,
                            timestamp: photo.timestamp || new Date().toISOString()
                        };
                        console.log('保存する写真データ:', {
                            id: photoData.id,
                            inspectionId: photoData.inspectionId,
                            name: photoData.name
                        });
                        await this.databaseManager.addPhoto(photoData);
                    }
                    console.log('写真データの保存が完了しました');
                }
                
                // メモリ上のデータも更新（写真なし）
                this.data.inspections.push(savedInspection);
                return savedInspection;
            } catch (error) {
                console.error('データベースへの保存に失敗、LocalStorageにフォールバック:', error);
                // フォールバック: LocalStorageに保存（写真込み）
                inspection.photos = photos;
                this.data.inspections.push(inspection);
                this.saveData();
                return inspection;
            }
        } else {
            // LocalStorage使用時は写真も一緒に保存
            inspection.photos = photos;
            this.data.inspections.push(inspection);
            this.saveData();
            return inspection;
        }
    }

    async updateInspection(inspectionId, inspectionData) {
        const inspectionIndex = this.data.inspections.findIndex(i => i.id == inspectionId);
        if (inspectionIndex !== -1) {
            const updatedInspection = {
                ...this.data.inspections[inspectionIndex],
                ...inspectionData,
                updatedAt: new Date().toISOString()
            };

            if (this.useDatabase) {
                try {
                    await this.databaseManager.updateInspection(updatedInspection);
                    // メモリ上のデータも更新
                    this.data.inspections[inspectionIndex] = updatedInspection;
                    return true;
                } catch (error) {
                    console.error('データベースの更新に失敗、LocalStorageにフォールバック:', error);
                    // フォールバック: LocalStorageに保存
                    this.data.inspections[inspectionIndex] = updatedInspection;
                    this.saveData();
                    return true;
                }
            } else {
                this.data.inspections[inspectionIndex] = updatedInspection;
                this.saveData();
                return true;
            }
        }
        return false;
    }

    async deleteInspection(inspectionId) {
        if (this.useDatabase) {
            try {
                await this.databaseManager.deleteInspection(inspectionId);
                // メモリ上のデータも更新
                this.data.inspections = this.data.inspections.filter(i => i.id != inspectionId);
            } catch (error) {
                console.error('データベースからの削除に失敗、LocalStorageからのみ削除:', error);
                // フォールバック: LocalStorageからのみ削除
                this.data.inspections = this.data.inspections.filter(i => i.id != inspectionId);
                this.saveData();
            }
        } else {
            this.data.inspections = this.data.inspections.filter(i => i.id != inspectionId);
            this.saveData();
        }
    }

    getInspection(inspectionId) {
        return this.data.inspections.find(i => i.id == inspectionId);
    }

    getLastInspection(manholeId) {
        const inspections = this.data.inspections
            .filter(i => i.manholeId == manholeId)
            .sort((a, b) => new Date(b.inspectionDate) - new Date(a.inspectionDate));
        
        return inspections[0];
    }

    async getFilteredInspections(manholeId = null, period = 'all') {
        if (this.useDatabase) {
            try {
                return await this.databaseManager.getFilteredInspections(manholeId, period);
            } catch (error) {
                console.error('データベースからの取得に失敗、メモリデータを使用:', error);
                // フォールバック: メモリ上のデータを使用
            }
        }

        // フォールバック処理
        let inspections = this.data.inspections;
        
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
        if (this.useDatabase) {
            try {
                return await this.databaseManager.getMonthlyInspections(year, month);
            } catch (error) {
                console.error('データベースからの取得に失敗、メモリデータを使用:', error);
                // フォールバック: メモリ上のデータを使用
            }
        }

        // フォールバック処理
        return this.data.inspections.filter(inspection => {
            const date = new Date(inspection.inspectionDate);
            return date.getFullYear() === year && date.getMonth() + 1 === month;
        });
    }

    async addManhole(manholeData) {
        const manhole = {
            id: Date.now(),
            ...manholeData
        };
        this.data.manholes.push(manhole);
        await this.saveManholesToFile();
        this.saveData(); // 互換性のため
        return manhole;
    }

    async updateManhole(manholeId, manholeData) {
        const manhole = this.data.manholes.find(m => m.id == manholeId);
        if (manhole) {
            Object.assign(manhole, manholeData);
            await this.saveManholesToFile();
            this.saveData(); // 互換性のため
            return true;
        }
        return false;
    }

    async deleteManhole(manholeId) {
        this.data.manholes = this.data.manholes.filter(m => m.id !== manholeId);
        
        // 関連する点検データも削除
        if (this.useDatabase) {
            try {
                const relatedInspections = this.data.inspections.filter(i => i.manholeId == manholeId);
                for (const inspection of relatedInspections) {
                    await this.databaseManager.deleteInspection(inspection.id);
                }
            } catch (error) {
                console.error('関連点検データの削除に失敗:', error);
            }
        }
        
        this.data.inspections = this.data.inspections.filter(i => i.manholeId != manholeId);
        await this.saveManholesToFile();
        this.saveData(); // 互換性のため
    }

    getManhole(manholeId) {
        return this.data.manholes.find(m => m.id == manholeId);
    }

    getAllManholes() {
        return this.data.manholes;
    }

    getManholes() {
        return this.data.manholes;
    }

    async addInspector(name) {
        if (this.data.inspectors.some(inspector => inspector.name === name)) {
            throw new Error('この担当者名は既に登録されています');
        }
        
        const inspector = {
            id: Date.now().toString(),
            name: name,
            createdAt: new Date().toISOString()
        };
        
        this.data.inspectors.push(inspector);
        await this.saveInspectorsToFile();
        this.saveData(); // 互換性のため
        return inspector;
    }

    async deleteInspector(inspectorId) {
        this.data.inspectors = this.data.inspectors.filter(inspector => inspector.id !== inspectorId);
        await this.saveInspectorsToFile();
        this.saveData(); // 互換性のため
    }

    getAllInspectors() {
        return this.data.inspectors;
    }

    getInspectors() {
        return this.data.inspectors;
    }

    getInspector(inspectorId) {
        return this.data.inspectors.find(inspector => inspector.id === inspectorId);
    }

    getInspectionItemsForManhole(manholeId) {
        const manhole = this.getManhole(manholeId);
        if (!manhole) {
            console.warn('Manhole not found for ID:', manholeId);
            return [];
        }
        
        // マンホール固有の点検項目がある場合はそれを返す
        if (manhole.inspectionItems && Array.isArray(manhole.inspectionItems)) {
            return manhole.inspectionItems;
        }
        
        // デフォルトの点検項目を返す
        return [
            {
                id: "operation_status",
                name: "運転状態(始動、異音など)",
                type: "checkbox",
                required: true,
                order: 1,
                category: "運転状況"
            },
            {
                id: "water_level_device",
                name: "水位計、フリクトの設置状態",
                type: "checkbox",
                required: true,
                order: 2,
                category: "設備状況"
            }
        ];
    }

    updateInspector(inspectorId, updateData) {
        const inspectorIndex = this.data.inspectors.findIndex(inspector => inspector.id === inspectorId);
        if (inspectorIndex === -1) {
            return false;
        }

        // 既存のデータと更新データをマージ
        this.data.inspectors[inspectorIndex] = {
            ...this.data.inspectors[inspectorIndex],
            ...updateData
        };

        // ファイルに保存
        this.fileManager.saveInspectors(this.data.inspectors);
        return true;
    }

    setupAutoBackup() {
        this.backupInterval = setInterval(() => {
            this.autoBackup();
        }, 30 * 60 * 1000);
    }

    autoBackup() {
        try {
            const backupData = {
                version: '1.0',
                autoBackup: true,
                timestamp: new Date().toISOString(),
                data: this.data
            };
            
            localStorage.setItem('manholeInspectionAutoBackup', JSON.stringify(backupData));
            console.log('自動バックアップが完了しました');
        } catch (error) {
            console.error('自動バックアップに失敗しました:', error);
        }
    }

    async exportBackup() {
        // 最新のデータを収集
        const currentData = {
            manholes: this.data.manholes,
            inspectors: this.data.inspectors
        };

        // 点検履歴はデータベースから取得
        if (this.useDatabase && this.databaseManager) {
            try {
                currentData.inspections = await this.databaseManager.getAllInspections();
                currentData.photos = await this.databaseManager.getAllPhotos();
            } catch (error) {
                console.warn('データベースからの読み込みに失敗、メモリデータを使用:', error);
                currentData.inspections = this.data.inspections;
                currentData.photos = this.data.photos || [];
            }
        } else {
            currentData.inspections = this.data.inspections;
            currentData.photos = this.data.photos || [];
        }

        const backupData = {
            version: '1.0',
            exportDate: new Date().toISOString(),
            dataSource: this.useDatabase ? 'database+json' : 'localstorage',
            totalRecords: {
                manholes: currentData.manholes.length,
                inspectors: currentData.inspectors.length,
                inspections: currentData.inspections.length,
                photos: currentData.photos.length
            },
            data: currentData
        };
        return backupData;
    }

    async importBackup(file) {
        if (!file) throw new Error('ファイルが選択されていません');

        try {
            const text = await file.text();
            const backupData = JSON.parse(text);
            
            if (!backupData.data || !backupData.version) {
                throw new Error('無効なバックアップファイルです');
            }

            // マスタデータを復元
            if (backupData.data.manholes) {
                this.data.manholes = backupData.data.manholes;
                await this.saveManholesToFile();
            }
            
            if (backupData.data.inspectors) {
                this.data.inspectors = backupData.data.inspectors;
                await this.saveInspectorsToFile();
            }

            // 点検履歴をデータベースに復元
            if (backupData.data.inspections && this.useDatabase) {
                try {
                    // 既存の点検データをクリア（確認後）
                    const existingCount = (await this.databaseManager.getAllInspections()).length;
                    if (existingCount > 0) {
                        console.log(`既存の点検データ ${existingCount}件 を上書きします`);
                    }

                    // 点検データをインポート
                    let importedCount = 0;
                    for (const inspection of backupData.data.inspections) {
                        try {
                            await this.databaseManager.addInspection(inspection);
                            importedCount++;
                        } catch (error) {
                            // ID重複の場合は更新を試行
                            try {
                                await this.databaseManager.updateInspection(inspection);
                                importedCount++;
                            } catch (updateError) {
                                console.warn('点検データのインポートをスキップ:', inspection.id);
                            }
                        }
                    }
                    
                    // 写真データの復元
                    if (backupData.data.photos && Array.isArray(backupData.data.photos)) {
                        let photoImportedCount = 0;
                        for (const photo of backupData.data.photos) {
                            try {
                                await this.databaseManager.addPhoto(photo);
                                photoImportedCount++;
                            } catch (error) {
                                console.warn('写真データのインポートをスキップ:', photo.id);
                            }
                        }
                        console.log(`${photoImportedCount}件の写真データをデータベースに復元しました`);
                    }
                    
                    // メモリ上のデータも更新
                    this.data.inspections = await this.databaseManager.getAllInspections();
                    console.log(`${importedCount}件の点検データをデータベースに復元しました`);
                } catch (error) {
                    console.error('データベースへの復元に失敗、LocalStorageにフォールバック:', error);
                    this.data.inspections = backupData.data.inspections;
                }
            } else {
                // フォールバック: LocalStorageに復元
                this.data.inspections = backupData.data.inspections || [];
                this.data.photos = backupData.data.photos || [];
            }

            this.saveData(); // 互換性のため
            return true;
        } catch (error) {
            throw new Error(`バックアップの復元に失敗しました: ${error.message}`);
        }
    }

    exportCSV() {
        const csvData = [];
        csvData.push([
            'マンホール名', '点検日', '担当者', 'No1アワーメータ', 'No2アワーメータ',
            '運転選択', 'ポンプ選択', '電圧', 'No1電流', 'No2電流',
            '運転水位', '異常高水位', '特記事項'
        ]);

        this.data.inspections.forEach(inspection => {
            const manhole = this.data.manholes.find(m => m.id == inspection.manholeId);
            const manholeName = manhole ? manhole.name : '不明';
            
            csvData.push([
                manholeName,
                inspection.inspectionDate,
                inspection.inspector,
                inspection.no1Hour || '',
                inspection.no2Hour || '',
                inspection['operation-mode'] || '',
                inspection['pump-selection'] || '',
                inspection.voltage || '',
                inspection.no1Current || '',
                inspection.no2Current || '',
                `${inspection.operationWaterLevel || ''}${inspection.operationWaterLevelUnit || ''}`,
                `${inspection.abnormalWaterLevel || ''}${inspection.abnormalWaterLevelUnit || ''}`,
                inspection.remarks || ''
            ]);
        });

        return csvData.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    }

    destroy() {
        if (this.backupInterval) {
            clearInterval(this.backupInterval);
            this.backupInterval = null;
        }
        if (this.databaseManager) {
            this.databaseManager.destroy();
        }
    }

    // JSON管理用の新しいメソッド
    async loadManholesFromFile(file) {
        try {
            const data = await this.fileManager.uploadJSONFile({ files: [file] });
            if (Array.isArray(data)) {
                this.data.manholes = data;
                await this.saveManholesToFile();
                return true;
            }
            throw new Error('無効なマンホールデータです');
        } catch (error) {
            throw new Error(`マンホールデータの読み込みに失敗しました: ${error.message}`);
        }
    }

    async loadInspectorsFromFile(file) {
        try {
            const data = await this.fileManager.uploadJSONFile({ files: [file] });
            if (Array.isArray(data)) {
                this.data.inspectors = data;
                await this.saveInspectorsToFile();
                return true;
            }
            throw new Error('無効な担当者データです');
        } catch (error) {
            throw new Error(`担当者データの読み込みに失敗しました: ${error.message}`);
        }
    }

    // 写真管理メソッド
    async getPhotosByInspectionId(inspectionId) {
        console.log('写真取得開始 - inspectionId:', inspectionId, 'useDatabase:', this.useDatabase);
        
        if (this.useDatabase) {
            try {
                console.log('データベースから写真を取得中...');
                const photos = await this.databaseManager.getPhotosByInspectionId(inspectionId);
                console.log('データベースから取得した写真:', photos);
                return photos;
            } catch (error) {
                console.error('データベースからの写真取得に失敗:', error);
                return [];
            }
        } else {
            // LocalStorage使用時は点検データから写真を取得
            console.log('LocalStorageから写真を取得中...');
            const inspection = this.data.inspections.find(i => i.id == inspectionId);
            console.log('LocalStorageの点検データ:', inspection);
            const photos = inspection?.photos || [];
            console.log('LocalStorageから取得した写真:', photos);
            return photos;
        }
    }

    async deletePhoto(photoId) {
        if (this.useDatabase) {
            try {
                return await this.databaseManager.deletePhoto(photoId);
            } catch (error) {
                console.error('写真の削除に失敗:', error);
                return false;
            }
        } else {
            // LocalStorage使用時は点検データから写真を削除
            for (const inspection of this.data.inspections) {
                if (inspection.photos) {
                    inspection.photos = inspection.photos.filter(photo => photo.id !== photoId);
                }
            }
            this.saveData();
            return true;
        }
    }

    async getAllPhotos() {
        if (this.useDatabase) {
            try {
                return await this.databaseManager.getAllPhotos();
            } catch (error) {
                console.error('全写真の取得に失敗:', error);
                return [];
            }
        } else {
            // LocalStorage使用時は全点検データから写真を収集
            const allPhotos = [];
            for (const inspection of this.data.inspections) {
                if (inspection.photos) {
                    allPhotos.push(...inspection.photos);
                }
            }
            return allPhotos;
        }
    }
}