class ExportManager {
    constructor(app) {
        this.app = app;
    }

    setupExportListeners() {
        const exportCSVBtn = document.getElementById('export-csv-btn');
        if (exportCSVBtn) {
            exportCSVBtn.addEventListener('click', () => {
                this.exportCSV();
            });
        }

        const exportBackupBtn = document.getElementById('export-backup-btn');
        if (exportBackupBtn) {
            exportBackupBtn.addEventListener('click', () => {
                this.exportBackup();
            });
        }

        const importBackupBtn = document.getElementById('import-backup-btn');
        if (importBackupBtn) {
            importBackupBtn.addEventListener('click', () => {
                document.getElementById('backup-file-input').click();
            });
        }

        const backupFileInput = document.getElementById('backup-file-input');
        if (backupFileInput) {
            backupFileInput.addEventListener('change', (e) => {
                this.importBackup(e.target.files[0]);
            });
        }

        const monthlyPrintBtn = document.getElementById('monthly-print-btn');
        if (monthlyPrintBtn) {
            monthlyPrintBtn.addEventListener('click', () => {
                this.printMonthlyReport();
            });
        }

        const monthlyPDFBtn = document.getElementById('monthly-pdf-btn');
        if (monthlyPDFBtn) {
            monthlyPDFBtn.addEventListener('click', () => {
                this.generateMonthlyPDF();
            });
        }

        // マスタファイル管理
        const exportManholesBtn = document.getElementById('export-manholes-btn');
        if (exportManholesBtn) {
            exportManholesBtn.addEventListener('click', () => {
                this.exportManholes();
            });
        }

        const importManholesBtn = document.getElementById('import-manholes-btn');
        if (importManholesBtn) {
            importManholesBtn.addEventListener('click', () => {
                document.getElementById('manholes-file-input').click();
            });
        }

        const manholesFileInput = document.getElementById('manholes-file-input');
        if (manholesFileInput) {
            manholesFileInput.addEventListener('change', (e) => {
                this.importManholes(e.target.files[0]);
            });
        }

        const exportInspectorsBtn = document.getElementById('export-inspectors-btn');
        if (exportInspectorsBtn) {
            exportInspectorsBtn.addEventListener('click', () => {
                this.exportInspectors();
            });
        }

        const importInspectorsBtn = document.getElementById('import-inspectors-btn');
        if (importInspectorsBtn) {
            importInspectorsBtn.addEventListener('click', () => {
                document.getElementById('inspectors-file-input').click();
            });
        }

        const inspectorsFileInput = document.getElementById('inspectors-file-input');
        if (inspectorsFileInput) {
            inspectorsFileInput.addEventListener('change', (e) => {
                this.importInspectors(e.target.files[0]);
            });
        }

        // 点検履歴バックアップ・復元
        const exportInspectionsBtn = document.getElementById('export-inspections-btn');
        if (exportInspectionsBtn) {
            exportInspectionsBtn.addEventListener('click', () => {
                this.exportInspections();
            });
        }

        const importInspectionsBtn = document.getElementById('import-inspections-btn');
        if (importInspectionsBtn) {
            importInspectionsBtn.addEventListener('click', () => {
                document.getElementById('inspections-file-input').click();
            });
        }

        const mergeInspectionsBtn = document.getElementById('merge-inspections-btn');
        if (mergeInspectionsBtn) {
            mergeInspectionsBtn.addEventListener('click', () => {
                this.showMergeOptions();
            });
        }

        const inspectionsFileInput = document.getElementById('inspections-file-input');
        if (inspectionsFileInput) {
            inspectionsFileInput.addEventListener('change', (e) => {
                this.importInspections(e.target.files[0]);
            });
        }
    }

    exportCSV() {
        try {
            const csvContent = this.app.dataManager.exportCSV();
            const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `マンホールポンプ点検データ_${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            this.app.uiManager.modalManager.closeModal('export');
            this.app.uiManager.showAlert('CSVファイルをエクスポートしました', 'success');
        } catch (error) {
            console.error('CSV export error:', error);
            this.app.uiManager.showAlert('CSVエクスポートに失敗しました', 'error');
        }
    }

    async exportBackup() {
        try {
            const backupData = await this.app.dataManager.exportBackup();
            const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `マンホールポンプ点検バックアップ_${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            this.app.uiManager.modalManager.closeModal('export');
            
            const totalCount = backupData.totalRecords.manholes + backupData.totalRecords.inspectors + backupData.totalRecords.inspections;
            this.app.uiManager.showAlert('統合バックアップファイルをエクスポートしました', 'success', 
                `マンホール: ${backupData.totalRecords.manholes}件, 担当者: ${backupData.totalRecords.inspectors}件, 点検履歴: ${backupData.totalRecords.inspections}件`);
        } catch (error) {
            console.error('Backup export error:', error);
            this.app.uiManager.showAlert('バックアップエクスポートに失敗しました', 'error');
        }
    }

    async importBackup(file) {
        if (!file) return;

        try {
            const success = await this.app.dataManager.importBackup(file);
            if (success && confirm('現在のデータが上書きされます。復元を実行しますか？')) {
                this.app.uiManager.formManager.populateManholeSelects();
                this.app.uiManager.formManager.populateInspectorSelect();
                
                if (this.app.mapManager) {
                    this.app.mapManager.populateMapSelects();
                }
                
                if (this.app.uiManager.navigationManager.getCurrentTab() === 'history') {
                    this.app.uiManager.updateHistoryDisplay();
                } else if (this.app.uiManager.navigationManager.getCurrentTab() === 'map') {
                    this.app.mapManager.updateMapDisplay();
                }
                
                this.app.uiManager.showAlert('バックアップを復元しました', 'success');
            }
        } catch (error) {
            console.error('Backup import error:', error);
            this.app.uiManager.showAlert('バックアップの復元に失敗しました', 'error', error.message);
        }

        document.getElementById('backup-file-input').value = '';
    }

    printMonthlyReport() {
        const year = parseInt(document.getElementById('print-year').value);
        const month = parseInt(document.getElementById('print-month').value);
        const reportHTML = this.generateMonthlyReportHTML(year, month);
        
        if (!reportHTML) return;

        document.getElementById('print-period').textContent = `${year}年${month}月の点検履歴`;
        document.getElementById('print-content').innerHTML = reportHTML;
        
        const printLayout = document.getElementById('monthly-print-layout');
        printLayout.classList.add('printing');
        
        setTimeout(() => {
            window.print();
            
            setTimeout(() => {
                printLayout.classList.remove('printing');
            }, 1000);
        }, 100);
    }

    async generateMonthlyPDF() {
        const year = parseInt(document.getElementById('print-year').value);
        const month = parseInt(document.getElementById('print-month').value);
        const reportHTML = this.generateMonthlyReportHTML(year, month);
        
        if (!reportHTML) return;

        try {
            if (!window.jspdf) {
                this.app.uiManager.showAlert('PDFライブラリが読み込まれていません。ページを再読み込みしてください。', 'error');
                return;
            }
            
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a4'
            });

            doc.setFont('helvetica');
            
            doc.setFontSize(16);
            doc.text(`マンホールポンプ点検履歴 ${year}年${month}月`, 105, 20, { align: 'center' });
            
            const inspections = this.app.dataManager.getMonthlyInspections(year, month);
            const groupedInspections = this.groupInspectionsByManhole(inspections);

            let yPosition = 40;
            const pageHeight = 280;
            
            Object.keys(groupedInspections).forEach(manholeName => {
                const manholeInspections = groupedInspections[manholeName];
                
                if (yPosition > pageHeight - 60) {
                    doc.addPage();
                    yPosition = 20;
                }
                
                doc.setFontSize(12);
                doc.setFont('helvetica', 'bold');
                doc.text(`${manholeName} (${manholeInspections.length}件)`, 10, yPosition);
                yPosition += 10;
                
                manholeInspections.forEach(inspection => {
                    if (yPosition > pageHeight - 40) {
                        doc.addPage();
                        yPosition = 20;
                    }
                    
                    doc.setFontSize(10);
                    doc.setFont('helvetica', 'normal');
                    
                    doc.text(`${inspection.inspectionDate} - ${inspection.inspector || '未記入'}`, 15, yPosition);
                    yPosition += 6;
                    
                    const basicInfo = [
                        `運転: ${inspection['operation-mode'] || '-'}`,
                        `ポンプ: ${inspection['pump-selection'] || '-'}`,
                        `電圧: ${inspection.voltage || '-'}V`,
                        `No1電流: ${inspection.no1Current || '-'}A`,
                        `No2電流: ${inspection.no2Current || '-'}A`
                    ];
                    
                    doc.text(basicInfo.join(' / '), 15, yPosition);
                    yPosition += 6;
                    
                    const statusItems = this.getStatusItems(inspection);
                    const goodCount = statusItems.filter(item => item.value === '良').length;
                    const badCount = statusItems.filter(item => item.value === '否').length;
                    
                    doc.text(`点検項目 - 良: ${goodCount}件, 否: ${badCount}件`, 15, yPosition);
                    yPosition += 6;
                    
                    if (inspection.remarks) {
                        doc.text(`特記: ${inspection.remarks}`, 15, yPosition);
                        yPosition += 6;
                    }
                    
                    yPosition += 3;
                });
                
                yPosition += 5;
            });

            doc.save(`マンホール点検履歴_${year}年${month}月.pdf`);
            this.app.uiManager.showAlert('PDFを生成しました', 'success');
            
        } catch (error) {
            console.error('PDF生成エラー:', error);
            this.app.uiManager.showAlert('PDF生成中にエラーが発生しました', 'error', error.message);
        }
    }

    generateMonthlyReportHTML(year, month) {
        const inspections = this.app.dataManager.getMonthlyInspections(year, month);
        
        if (inspections.length === 0) {
            this.app.uiManager.showAlert(`${year}年${month}月の点検データがありません`, 'warning');
            return '';
        }

        const groupedInspections = this.groupInspectionsByManhole(inspections);
        let html = '';
        
        Object.keys(groupedInspections).forEach(manholeName => {
            const manholeInspections = groupedInspections[manholeName];
            html += `
                <div class="print-manhole-section">
                    <div class="print-manhole-header">
                        ${manholeName} (${manholeInspections.length}件)
                    </div>
            `;
            
            manholeInspections.forEach(inspection => {
                const statusItems = this.getStatusItems(inspection);
                const goodCount = statusItems.filter(item => item.value === '良').length;
                const badCount = statusItems.filter(item => item.value === '否').length;
                
                html += `
                    <div class="print-inspection-item">
                        <div class="print-inspection-date">
                            ${inspection.inspectionDate} - ${inspection.inspector || '未記入'}
                        </div>
                        <div class="print-inspection-details">
                            <div class="print-detail-item">
                                <span class="print-detail-label">運転選択:</span>
                                <span class="print-detail-value">${inspection['operation-mode'] || '-'}</span>
                            </div>
                            <div class="print-detail-item">
                                <span class="print-detail-label">ポンプ選択:</span>
                                <span class="print-detail-value">${inspection['pump-selection'] || '-'}</span>
                            </div>
                            <div class="print-detail-item">
                                <span class="print-detail-label">電圧:</span>
                                <span class="print-detail-value">${inspection.voltage || '-'}V</span>
                            </div>
                            <div class="print-detail-item">
                                <span class="print-detail-label">No1電流:</span>
                                <span class="print-detail-value">${inspection.no1Current || '-'}A</span>
                            </div>
                            <div class="print-detail-item">
                                <span class="print-detail-label">No2電流:</span>
                                <span class="print-detail-value">${inspection.no2Current || '-'}A</span>
                            </div>
                            <div class="print-detail-item">
                                <span class="print-detail-label">運転水位:</span>
                                <span class="print-detail-value">${inspection.operationWaterLevel || '-'}${inspection.operationWaterLevelUnit || ''}</span>
                            </div>
                        </div>
                        <div class="print-status-indicators">
                            <span class="print-status-badge print-status-good">良: ${goodCount}</span>
                            <span class="print-status-badge print-status-bad">否: ${badCount}</span>
                        </div>
                        ${inspection.remarks ? `<div class="print-remarks">特記: ${inspection.remarks}</div>` : ''}
                    </div>
                `;
            });
            
            html += '</div>';
        });

        return html;
    }

    groupInspectionsByManhole(inspections) {
        const grouped = {};
        
        inspections.forEach(inspection => {
            const manhole = this.app.dataManager.getManhole(inspection.manholeId);
            const manholeName = manhole ? manhole.name : `不明なマンホール(ID: ${inspection.manholeId})`;
            
            if (!grouped[manholeName]) {
                grouped[manholeName] = [];
            }
            grouped[manholeName].push({...inspection, manholeName});
        });

        return grouped;
    }

    getStatusItems(inspection) {
        const statusFields = [
            'operation-status', 'water-level-device', 'manhole-cover-appearance', 'manhole-cover-installation',
            'water-level-abnormal', 'scum-occurrence', 'sewage-volume', 'sludge-accumulation',
            'control-panel-installation', 'control-panel-internal', 'instruments-status',
            'notification-device', 'hh-frikuto'
        ];
        
        return statusFields.map(field => ({
            field,
            value: inspection[field] || ''
        })).filter(item => item.value);
    }

    // マスタファイル管理メソッド
    async exportManholes() {
        try {
            await this.app.dataManager.exportManholesToFile();
            this.app.uiManager.showAlert('マンホールマスタをエクスポートしました', 'success');
        } catch (error) {
            console.error('Manholes export error:', error);
            this.app.uiManager.showAlert('マンホールマスタのエクスポートに失敗しました', 'error');
        }
    }

    async importManholes(file) {
        if (!file) return;

        try {
            const success = await this.app.dataManager.loadManholesFromFile(file);
            if (success) {
                this.app.uiManager.formManager.populateManholeSelects();
                if (this.app.mapManager) {
                    this.app.mapManager.populateMapSelects();
                    this.app.mapManager.updateMapDisplay();
                }
                this.app.uiManager.updateMasterList();
                this.app.uiManager.showAlert('マンホールマスタを読み込みました', 'success');
            }
        } catch (error) {
            console.error('Manholes import error:', error);
            this.app.uiManager.showAlert('マンホールマスタの読み込みに失敗しました', 'error', error.message);
        }

        document.getElementById('manholes-file-input').value = '';
    }

    async exportInspectors() {
        try {
            await this.app.dataManager.exportInspectorsToFile();
            this.app.uiManager.showAlert('担当者マスタをエクスポートしました', 'success');
        } catch (error) {
            console.error('Inspectors export error:', error);
            this.app.uiManager.showAlert('担当者マスタのエクスポートに失敗しました', 'error');
        }
    }

    async importInspectors(file) {
        if (!file) return;

        try {
            const success = await this.app.dataManager.loadInspectorsFromFile(file);
            if (success) {
                this.app.uiManager.formManager.populateInspectorSelect();
                this.app.uiManager.refreshInspectorList();
                this.app.uiManager.showAlert('担当者マスタを読み込みました', 'success');
            }
        } catch (error) {
            console.error('Inspectors import error:', error);
            this.app.uiManager.showAlert('担当者マスタの読み込みに失敗しました', 'error', error.message);
        }

        document.getElementById('inspectors-file-input').value = '';
    }

    // 点検履歴バックアップ・復元メソッド
    async exportInspections() {
        try {
            if (this.app.dataManager.useDatabase && this.app.dataManager.databaseManager) {
                await this.app.dataManager.databaseManager.exportInspectionsToFile();
                this.app.uiManager.showAlert('点検履歴をバックアップしました', 'success');
            } else {
                // フォールバック: LocalStorageから出力
                const inspections = this.app.dataManager.data.inspections;
                const exportData = {
                    version: '1.0',
                    exportDate: new Date().toISOString(),
                    dataType: 'inspections',
                    totalRecords: inspections.length,
                    inspections: inspections
                };

                const blob = new Blob([JSON.stringify(exportData, null, 2)], { 
                    type: 'application/json' 
                });
                
                const link = document.createElement('a');
                link.href = URL.createObjectURL(blob);
                link.download = `点検履歴バックアップ_${new Date().toISOString().split('T')[0]}.json`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);

                this.app.uiManager.showAlert('点検履歴をバックアップしました（LocalStorage）', 'success');
            }
        } catch (error) {
            console.error('Inspections export error:', error);
            this.app.uiManager.showAlert('点検履歴のバックアップに失敗しました', 'error', error.message);
        }
    }

    async importInspections(file) {
        if (!file) return;

        try {
            if (this.app.dataManager.useDatabase && this.app.dataManager.databaseManager) {
                const result = await this.app.dataManager.databaseManager.importInspectionsFromFile(file);
                
                // メモリ上のデータも更新
                this.app.dataManager.data.inspections = await this.app.dataManager.databaseManager.getAllInspections();
                
                // UI更新
                if (this.app.uiManager.navigationManager.getCurrentTab() === 'history') {
                    this.app.uiManager.updateHistoryDisplay();
                }

                const message = `点検履歴を復元しました\n新規: ${result.imported}件\n更新: ${result.updated}件\nスキップ: ${result.skipped}件`;
                this.app.uiManager.showAlert('点検履歴復元完了', 'success', message);
            } else {
                // フォールバック: LocalStorageに復元
                const text = await file.text();
                const backupData = JSON.parse(text);
                
                if (!backupData.inspections || !Array.isArray(backupData.inspections)) {
                    throw new Error('無効な点検履歴バックアップファイルです');
                }

                this.app.dataManager.data.inspections = backupData.inspections;
                this.app.dataManager.saveData();

                if (this.app.uiManager.navigationManager.getCurrentTab() === 'history') {
                    this.app.uiManager.updateHistoryDisplay();
                }

                this.app.uiManager.showAlert('点検履歴を復元しました（LocalStorage）', 'success', 
                    `${backupData.inspections.length}件のデータを復元`);
            }
        } catch (error) {
            console.error('Inspections import error:', error);
            this.app.uiManager.showAlert('点検履歴の復元に失敗しました', 'error', error.message);
        }

        document.getElementById('inspections-file-input').value = '';
    }

    showMergeOptions() {
        const mergeOptions = document.getElementById('merge-options');
        if (mergeOptions) {
            if (mergeOptions.style.display === 'none') {
                mergeOptions.style.display = 'block';
                document.getElementById('merge-inspections-btn').textContent = '点検履歴マージ実行';
            } else {
                this.executeMerge();
            }
        }
    }

    async executeMerge() {
        const fileInput = document.getElementById('inspections-file-input');
        const mergeMode = document.getElementById('merge-mode').value;

        if (!fileInput.files[0]) {
            // ファイル選択ダイアログを開く
            fileInput.addEventListener('change', async (e) => {
                if (e.target.files[0]) {
                    await this.performMerge(e.target.files[0], mergeMode);
                }
            }, { once: true });
            fileInput.click();
        } else {
            await this.performMerge(fileInput.files[0], mergeMode);
        }
    }

    async performMerge(file, mergeMode) {
        try {
            if (this.app.dataManager.useDatabase && this.app.dataManager.databaseManager) {
                const result = await this.app.dataManager.databaseManager.mergeInspectionsFromFile(file, mergeMode);
                
                // メモリ上のデータも更新
                this.app.dataManager.data.inspections = await this.app.dataManager.databaseManager.getAllInspections();
                
                // UI更新
                if (this.app.uiManager.navigationManager.getCurrentTab() === 'history') {
                    this.app.uiManager.updateHistoryDisplay();
                }

                const modeText = {
                    'skip': 'スキップ',
                    'update': '更新',
                    'duplicate': '重複許可'
                };

                const message = `点検履歴をマージしました（${modeText[mergeMode]}）\n新規: ${result.imported}件\n更新: ${result.updated}件\nスキップ: ${result.skipped}件`;
                this.app.uiManager.showAlert('点検履歴マージ完了', 'success', message);
            } else {
                throw new Error('データベースが利用できません。通常の復元を使用してください。');
            }
        } catch (error) {
            console.error('Inspections merge error:', error);
            this.app.uiManager.showAlert('点検履歴のマージに失敗しました', 'error', error.message);
        }

        // UI をリセット
        document.getElementById('merge-options').style.display = 'none';
        document.getElementById('merge-inspections-btn').textContent = '点検履歴マージ';
        document.getElementById('inspections-file-input').value = '';
    }
}