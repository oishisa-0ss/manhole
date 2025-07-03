class UIManager {
    constructor(app) {
        this.app = app;
        this.currentEditingId = null;
        this.currentManholeForInspectionItems = null;
        this.currentEditingInspectionItem = null;
        this.inspectionItemsOrder = [];
        
        // Initialize NotificationManager
        this.notificationManager = new NotificationManager(this);
        
        // Initialize NavigationManager
        this.navigationManager = new NavigationManager(this);
        
        // Initialize PhotoManager
        this.photoManager = new PhotoManager(this);
        
        // Initialize ModalManager
        this.modalManager = new ModalManager(this);
        
        // Initialize FormManager
        this.formManager = new FormManager(this);
        
        // Initialize GraphManager
        this.graphManager = new GraphManager(this);
    }

    // デフォルト点検項目定義
    getDefaultInspectionItems() {
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

    setupEventListeners() {
        // Setup navigation event listeners
        this.navigationManager.setupTabEventListeners();
        
        // Setup modal event listeners
        this.modalManager.initializeModalListeners();

        const form = document.getElementById('inspection-form');
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.saveInspection();
            });
        }

        const clearFormBtn = document.getElementById('clear-form-btn');
        if (clearFormBtn) {
            clearFormBtn.addEventListener('click', () => {
                this.formManager.clearForm();
            });
        }

        const manholeNameSelect = document.getElementById('manhole-name');
        if (manholeNameSelect) {
            manholeNameSelect.addEventListener('change', (e) => {
                this.formManager.onManholeChange();
            });
        }

        const voltageInput = document.getElementById('voltage');
        if (voltageInput) {
            voltageInput.addEventListener('blur', (e) => {
                this.formManager.checkVoltageRange(e.target.value);
            });
        }

        const no1CurrentInput = document.getElementById('no1-current');
        if (no1CurrentInput) {
            no1CurrentInput.addEventListener('blur', (e) => {
                this.formManager.checkCurrentRange('no1', e.target.value);
            });
        }

        const no2CurrentInput = document.getElementById('no2-current');
        if (no2CurrentInput) {
            no2CurrentInput.addEventListener('blur', (e) => {
                this.formManager.checkCurrentRange('no2', e.target.value);
            });
        }

        const takePhotoBtn = document.getElementById('take-photo-btn');
        if (takePhotoBtn) {
            takePhotoBtn.addEventListener('click', () => {
                const photoInput = document.getElementById('photo-input');
                if (photoInput) {
                    photoInput.click();
                }
            });
        }

        const photoInput = document.getElementById('photo-input');
        if (photoInput) {
            photoInput.addEventListener('change', (e) => {
                this.photoManager.handlePhotoSelection(e.target.files);
            });
        }

        this.setupFormListeners();

        const historyManholeSelect = document.getElementById('history-manhole');
        if (historyManholeSelect) {
            historyManholeSelect.addEventListener('change', () => {
                this.updateHistoryDisplay();
            });
        }

        const historyPeriodSelect = document.getElementById('history-period');
        if (historyPeriodSelect) {
            historyPeriodSelect.addEventListener('change', () => {
                this.updateHistoryDisplay();
            });
        }

        const graphManholeSelect = document.getElementById('graph-manhole');
        if (graphManholeSelect) {
            graphManholeSelect.addEventListener('change', async () => {
                this.graphManager.updateGraphTypeOptions();
                await this.graphManager.updateGraph();
            });
        }

        const graphTypeSelect = document.getElementById('graph-type');
        if (graphTypeSelect) {
            graphTypeSelect.addEventListener('change', async () => {
                await this.graphManager.updateGraph();
            });
        }

        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                e.target.classList.remove('active');
            }
        });
    }


    setupFormListeners() {
        document.getElementById('add-manhole-btn').addEventListener('click', () => {
            this.addNewManhole();
        });

        document.getElementById('cancel-manhole-edit').addEventListener('click', () => {
            this.modalManager.closeManholeEditModal();
        });

        document.getElementById('manhole-edit-form').addEventListener('submit', (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            this.saveManholeFromForm(formData);
        });

        document.getElementById('add-inspector-btn').addEventListener('click', () => {
            this.addInspector();
        });

        // マスタ編集モーダル内の担当者追加ボタン（IDが重複するため個別に処理）
        const addInspectorBtnMaster = document.querySelector('#inspectors-master-tab #add-inspector-btn');
        if (addInspectorBtnMaster) {
            addInspectorBtnMaster.addEventListener('click', () => {
                this.addInspectorFromMaster();
            });
        }

        // 点検項目設定関連のイベントリスナー
        const addInspectionItemBtn = document.getElementById('add-inspection-item-btn');
        if (addInspectionItemBtn) {
            addInspectionItemBtn.addEventListener('click', () => {
                this.addNewInspectionItem();
            });
        }

        const inspectionItemEditForm = document.getElementById('inspection-item-edit-form');
        if (inspectionItemEditForm) {
            inspectionItemEditForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.saveInspectionItem();
            });
        }

        const cancelInspectionItemEdit = document.getElementById('cancel-inspection-item-edit');
        if (cancelInspectionItemEdit) {
            cancelInspectionItemEdit.addEventListener('click', () => {
                this.modalManager.closeInspectionItemEditModal();
            });
        }

        // 点検項目コピー・ペーストイベント
        const copyInspectionItemsBtn = document.getElementById('copy-inspection-items-btn');
        if (copyInspectionItemsBtn) {
            copyInspectionItemsBtn.addEventListener('click', () => {
                this.copyInspectionItems();
            });
        }

        const pasteInspectionItemsBtn = document.getElementById('paste-inspection-items-btn');
        if (pasteInspectionItemsBtn) {
            pasteInspectionItemsBtn.addEventListener('click', () => {
                this.pasteInspectionItems();
            });
        }

        // 項目タイプ変更時の設定表示切り替え
        const itemTypeSelect = document.getElementById('item-type');
        if (itemTypeSelect) {
            itemTypeSelect.addEventListener('change', (e) => {
                this.toggleInspectionItemTypeSettings(e.target.value);
            });
        }

        // 担当者管理ボタン
        const manageInspectorsBtn = document.getElementById('manage-inspectors-btn');
        if (manageInspectorsBtn) {
            manageInspectorsBtn.addEventListener('click', () => {
                // 担当者マスタタブを開く
                this.modalManager.openMasterModal();
                this.modalManager.switchMasterTab('inspectors');
            });
        }

        // 写真表示モーダル関連のイベントリスナー
        const photoDetailBack = document.getElementById('photo-detail-back');
        if (photoDetailBack) {
            photoDetailBack.addEventListener('click', () => {
                this.photoManager.showPhotoGallery();
            });
        }
    }







    saveInspection() {
        const formData = this.formManager.getFormData();
        if (!this.formManager.validateForm(formData)) {
            return;
        }

        if (this.currentEditingId) {
            const success = this.app.dataManager.updateInspection(this.currentEditingId, {
                ...formData,
                photos: this.photoManager.getCurrentPhotos()
            });
            
            if (success) {
                this.showAlert('点検データを更新しました', 'success');
                this.cancelEdit();
            } else {
                this.showAlert('更新に失敗しました', 'error');
            }
            return;
        }

        this.app.dataManager.addInspection({
            ...formData,
            photos: this.photoManager.getCurrentPhotos()
        });

        this.showAlert('点検データを保存しました', 'success');
        this.formManager.clearForm();
    }

    async updateHistoryDisplay() {
        const manholeId = document.getElementById('history-manhole').value;
        const period = document.getElementById('history-period').value;
        
        try {
            const inspections = await this.app.dataManager.getFilteredInspections(manholeId, period);
            this.renderHistoryList(inspections);
        } catch (error) {
            console.error('履歴表示エラー:', error);
            this.renderHistoryList([]);
        }
    }

    renderHistoryList(inspections) {
        const historyList = document.getElementById('history-list');
        
        if (inspections.length === 0) {
            historyList.innerHTML = '<p>該当する点検データがありません</p>';
            return;
        }
        
        historyList.innerHTML = inspections.map(inspection => {
            const manhole = this.app.dataManager.getManhole(inspection.manholeId);
            const manholeName = manhole ? manhole.name : '不明';
            
            return `
                <div class="history-item">
                    <div class="history-item-header">
                        <div class="history-item-title">${manholeName}</div>
                        <div class="history-item-date">${inspection.inspectionDate}</div>
                        <div class="history-item-actions">
                            <button class="btn-icon" onclick="app.uiManager.modalManager.showInspectionDetailModal('${inspection.id}')" title="詳細表示">
                                👁️
                            </button>
                            <button class="btn-icon" onclick="app.uiManager.editInspection('${inspection.id}')" title="編集">
                                ✏️
                            </button>
                            <button class="btn-icon" onclick="app.uiManager.viewInspectionPhotos('${inspection.id}')" title="写真表示">
                                📷
                            </button>
                            <button class="btn-icon btn-danger" onclick="app.uiManager.deleteInspection('${inspection.id}')" title="削除">
                                🗑️
                            </button>
                        </div>
                    </div>
                    <div class="history-item-summary">
                        <div class="summary-item">
                            <span class="summary-label">担当者:</span> ${inspection.inspector}
                        </div>
                        <div class="summary-item">
                            <span class="summary-label">電圧:</span> ${inspection.voltage || 'N/A'}V
                        </div>
                        <div class="summary-item">
                            <span class="summary-label">No1電流:</span> ${inspection.no1Current || 'N/A'}A
                        </div>
                        <div class="summary-item">
                            <span class="summary-label">No2電流:</span> ${inspection.no2Current || 'N/A'}A
                        </div>
                        ${inspection.remarks ? `
                        <div class="summary-item">
                            <span class="summary-label">特記事項:</span> ${inspection.remarks.substring(0, 50)}${inspection.remarks.length > 50 ? '...' : ''}
                        </div>
                        ` : ''}
                        <div class="summary-item photo-count" data-inspection-id="${inspection.id}">
                            <span class="summary-label">写真:</span> <span class="photo-count-text">読み込み中...</span>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        // 写真枚数を非同期で取得・表示
        this.updatePhotoCountsInHistory(inspections);
    }

    async updatePhotoCountsInHistory(inspections) {
        for (const inspection of inspections) {
            try {
                const photos = await this.app.dataManager.getPhotosByInspectionId(inspection.id);
                const photoCountElement = document.querySelector(`.photo-count[data-inspection-id="${inspection.id}"] .photo-count-text`);
                
                if (photoCountElement) {
                    if (photos.length > 0) {
                        photoCountElement.innerHTML = `<span class="has-photos">${photos.length}枚</span>`;
                    } else {
                        photoCountElement.textContent = 'なし';
                    }
                }
            } catch (error) {
                console.error('写真枚数の取得に失敗:', error);
                const photoCountElement = document.querySelector(`.photo-count[data-inspection-id="${inspection.id}"] .photo-count-text`);
                if (photoCountElement) {
                    photoCountElement.textContent = 'エラー';
                }
            }
        }
    }


    editInspection(inspectionId) {
        const inspection = this.app.dataManager.getInspection(inspectionId);
        if (!inspection) return;

        this.navigationManager.switchTab('inspection');
        this.formManager.populateFormWithInspection(inspection);
        this.currentEditingId = inspection.id;
        
        const submitBtn = document.querySelector('#inspection-form button[type="submit"]');
        submitBtn.textContent = '点検データを更新';
        submitBtn.style.backgroundColor = '#FF9800';
        
        const cancelBtn = document.createElement('button');
        cancelBtn.type = 'button';
        cancelBtn.className = 'btn btn-secondary';
        cancelBtn.textContent = '編集キャンセル';
        cancelBtn.onclick = () => this.cancelEdit();
        
        const formActions = document.querySelector('.form-actions');
        formActions.appendChild(cancelBtn);
        
        document.querySelector('header h1').textContent = 'マンホールポンプ点検 - 編集モード';
    }

    cancelEdit() {
        this.currentEditingId = null;
        this.formManager.clearForm();
        
        const submitBtn = document.querySelector('#inspection-form button[type="submit"]');
        submitBtn.textContent = '点検データを保存';
        submitBtn.style.backgroundColor = '';
        
        const cancelBtn = document.querySelector('.form-actions .btn-secondary:last-child');
        if (cancelBtn && cancelBtn.textContent === '編集キャンセル') {
            cancelBtn.remove();
        }
        
        document.querySelector('header h1').textContent = 'マンホールポンプ点検';
    }

    async deleteInspection(inspectionId) {
        const inspection = this.app.dataManager.getInspection(inspectionId);
        if (!inspection) return;
        
        const manhole = this.app.dataManager.getManhole(inspection.manholeId);
        const manholeName = manhole ? manhole.name : '不明';
        
        if (!confirm(`${manholeName} の ${inspection.inspectionDate} の点検データを削除しますか？\nこの操作は取り消せません。`)) {
            return;
        }
        
        try {
            await this.app.dataManager.deleteInspection(inspectionId);
            await this.updateHistoryDisplay();
            this.showAlert('点検データを削除しました', 'success');
        } catch (error) {
            console.error('削除エラー:', error);
            this.showAlert('削除に失敗しました', 'error');
        }
    }








    updateMasterList() {
        const masterList = document.getElementById('master-list');
        
        masterList.innerHTML = this.app.dataManager.getAllManholes().map(manhole => `
            <div class="master-item">
                <div class="master-item-header">
                    <div class="master-item-name">${manhole.name}</div>
                    <div class="master-item-actions">
                        <button class="btn btn-secondary" onclick="app.uiManager.editManhole(${manhole.id})">編集</button>
                        <button class="btn btn-secondary" onclick="app.uiManager.deleteManhole(${manhole.id})">削除</button>
                    </div>
                </div>
                <div class="master-item-details">
                    <div class="master-detail">
                        <span class="master-detail-label">No1定格電流:</span> ${manhole.ratedCurrent1}A
                    </div>
                    <div class="master-detail">
                        <span class="master-detail-label">No2定格電流:</span> ${manhole.ratedCurrent2}A
                    </div>
                    <div class="master-detail">
                        <span class="master-detail-label">No1出力:</span> ${manhole.outputKw1}kW
                    </div>
                    <div class="master-detail">
                        <span class="master-detail-label">No2出力:</span> ${manhole.outputKw2}kW
                    </div>
                    <div class="master-detail">
                        <span class="master-detail-label">No1電流警告範囲:</span> ${manhole.currentWarningRange1 ? `${manhole.currentWarningRange1.min.toFixed(1)}-${manhole.currentWarningRange1.max.toFixed(1)}A` : '未設定'}
                    </div>
                    <div class="master-detail">
                        <span class="master-detail-label">No2電流警告範囲:</span> ${manhole.currentWarningRange2 ? `${manhole.currentWarningRange2.min.toFixed(1)}-${manhole.currentWarningRange2.max.toFixed(1)}A` : '未設定'}
                    </div>
                    <div class="master-detail">
                        <span class="master-detail-label">緯度:</span> ${manhole.latitude ? manhole.latitude.toFixed(7) : '未設定'}
                    </div>
                    <div class="master-detail">
                        <span class="master-detail-label">経度:</span> ${manhole.longitude ? manhole.longitude.toFixed(7) : '未設定'}
                    </div>
                </div>
            </div>
        `).join('');
    }

    addNewManhole() {
        this.modalManager.openManholeEditModal();
    }

    editManhole(manholeId) {
        const manhole = this.app.dataManager.getManhole(manholeId);
        if (!manhole) return;

        this.modalManager.openManholeEditModal(manhole);
    }



    saveManholeFromForm(formData) {
        const manholeId = document.getElementById('manhole-edit-form').dataset.manholeId;
        const isEdit = manholeId !== '';
        
        const manholeData = {
            name: formData.get('name')?.trim() || '',
            ratedCurrent1: parseFloat(formData.get('ratedCurrent1')),
            ratedCurrent2: parseFloat(formData.get('ratedCurrent2')),
            outputKw1: parseFloat(formData.get('outputKw1')),
            outputKw2: parseFloat(formData.get('outputKw2')),
            // 警告範囲設定
            currentWarningRange1: {
                min: parseFloat(formData.get('currentWarningMin1')) || 0,
                max: parseFloat(formData.get('currentWarningMax1')) || 0
            },
            currentWarningRange2: {
                min: parseFloat(formData.get('currentWarningMin2')) || 0,
                max: parseFloat(formData.get('currentWarningMax2')) || 0
            },
            latitude: formData.get('latitude') ? parseFloat(formData.get('latitude')) : null,
            longitude: formData.get('longitude') ? parseFloat(formData.get('longitude')) : null
        };

        if (!manholeData.name) {
            this.showAlert('マンホール名を入力してください', 'warning');
            return false;
        }

        if (isNaN(manholeData.ratedCurrent1) || isNaN(manholeData.ratedCurrent2) || 
            isNaN(manholeData.outputKw1) || isNaN(manholeData.outputKw2)) {
            this.showAlert('数値を正しく入力してください', 'warning');
            return false;
        }

        let success;
        if (isEdit) {
            success = this.app.dataManager.updateManhole(manholeId, manholeData);
        } else {
            this.app.dataManager.addManhole(manholeData);
            success = true;
        }

        if (success) {
            this.updateMasterList();
            this.formManager.populateManholeSelects();
            if (this.app.mapManager) {
                this.app.mapManager.updateMapDisplay();
            }
            this.modalManager.closeManholeEditModal();
        }
        return success;
    }

    deleteManhole(manholeId) {
        if (!confirm('このマンホールを削除しますか？関連する点検データも削除されます。')) {
            return;
        }

        this.app.dataManager.deleteManhole(manholeId);
        this.updateMasterList();
        this.formManager.populateManholeSelects();
        if (this.app.mapManager) {
            this.app.mapManager.updateMapDisplay();
        }
    }

    addInspector() {
        const nameInput = document.getElementById('new-inspector-name');
        const name = nameInput.value.trim();
        
        if (!name) {
            this.showAlert('担当者名を入力してください', 'warning');
            return;
        }
        
        try {
            this.app.dataManager.addInspector(name);
            this.formManager.populateInspectorSelect();
            this.refreshInspectorList();
            nameInput.value = '';
            this.showAlert('担当者を追加しました', 'success');
        } catch (error) {
            this.showAlert(error.message, 'error');
        }
    }

    editInspector(inspectorId) {
        console.log('editInspector called with ID:', inspectorId, 'Type:', typeof inspectorId);
        const inspector = this.app.dataManager.getInspector(inspectorId);
        console.log('Found inspector:', inspector);
        if (!inspector) {
            this.showAlert('担当者が見つかりません', 'error');
            return;
        }

        const newName = prompt('担当者名を編集してください:', inspector.name);
        if (newName === null) {
            // キャンセルされた
            return;
        }

        if (newName.trim() === '') {
            this.showAlert('担当者名を入力してください', 'error');
            return;
        }

        // 重複チェック
        const existingInspectors = this.app.dataManager.getAllInspectors();
        const isDuplicate = existingInspectors.some(existing => 
            existing.id !== inspectorId && existing.name.trim() === newName.trim()
        );

        if (isDuplicate) {
            this.showAlert('同じ名前の担当者が既に存在します', 'error');
            return;
        }

        // 担当者を更新
        const success = this.app.dataManager.updateInspector(inspectorId, {
            name: newName.trim(),
            updatedAt: new Date().toISOString()
        });

        if (success) {
            this.showAlert('担当者を更新しました', 'success');
            this.refreshInspectorMasterList();
            this.formManager.populateInspectorSelect();
        } else {
            this.showAlert('担当者の更新に失敗しました', 'error');
        }
    }

    deleteInspector(inspectorId) {
        if (!confirm('この担当者を削除しますか？')) return;
        
        this.app.dataManager.deleteInspector(inspectorId);
        this.formManager.populateInspectorSelect();
        this.refreshInspectorList();
        this.showAlert('担当者を削除しました', 'success');
    }

    refreshInspectorList() {
        const container = document.getElementById('inspector-list-container');
        const inspectors = this.app.dataManager.getAllInspectors();
        
        if (inspectors.length === 0) {
            container.innerHTML = '<p class="no-data">登録されている担当者はありません</p>';
            return;
        }
        
        container.innerHTML = inspectors.map(inspector => `
            <div class="inspector-item">
                <span class="inspector-name">${inspector.name}</span>
                <button type="button" class="btn btn-icon btn-danger" onclick="app.uiManager.deleteInspector('${inspector.id}')">削除</button>
            </div>
        `).join('');
    }

    refreshInspectorMasterList() {
        console.log('refreshInspectorMasterList called');
        const container = document.getElementById('inspectors-master-list');
        console.log('Container found:', container);
        
        if (!container) {
            console.error('inspectors-master-list container not found');
            return;
        }
        
        const inspectors = this.app.dataManager.getAllInspectors();
        console.log('Inspectors data:', inspectors);
        console.log('Number of inspectors:', inspectors.length);
        
        if (inspectors.length === 0) {
            container.innerHTML = '<p class="no-data">登録されている担当者はありません</p>';
            return;
        }
        
        container.innerHTML = inspectors.map(inspector => `
            <div class="master-item">
                <div class="master-item-content">
                    <span class="master-item-name">${inspector.name}</span>
                    <small class="master-item-date">登録日: ${new Date(inspector.createdAt).toLocaleDateString('ja-JP')}</small>
                </div>
                <div class="master-item-actions">
                    <button type="button" class="btn btn-secondary btn-small" onclick="app.uiManager.editInspector('${inspector.id}')">編集</button>
                    <button type="button" class="btn btn-danger btn-small" onclick="app.uiManager.deleteInspectorFromMaster('${inspector.id}')">削除</button>
                </div>
            </div>
        `).join('');
    }

    async addInspectorFromMaster() {
        const nameInput = document.querySelector('#inspectors-master-tab #new-inspector-name');
        const name = nameInput.value.trim();
        
        if (!name) {
            this.showAlert('担当者名を入力してください', 'warning');
            return;
        }
        
        try {
            await this.app.dataManager.addInspector(name);
            nameInput.value = '';
            this.refreshInspectorMasterList();
            this.formManager.populateInspectorSelect(); // メインフォームの選択肢も更新
            this.showAlert('担当者を追加しました', 'success');
        } catch (error) {
            this.showAlert(error.message, 'error');
        }
    }

    async deleteInspectorFromMaster(inspectorId) {
        console.log('deleteInspectorFromMaster called with ID:', inspectorId, 'Type:', typeof inspectorId);
        const inspector = this.app.dataManager.getAllInspectors().find(i => i.id === inspectorId);
        console.log('Found inspector for deletion:', inspector);
        if (!inspector) {
            console.error('Inspector not found for deletion');
            return;
        }
        
        if (!confirm(`担当者「${inspector.name}」を削除しますか？`)) {
            return;
        }
        
        try {
            await this.app.dataManager.deleteInspector(inspectorId);
            this.refreshInspectorMasterList();
            this.formManager.populateInspectorSelect(); // メインフォームの選択肢も更新
            this.showAlert('担当者を削除しました', 'success');
        } catch (error) {
            this.showAlert('削除に失敗しました', 'error');
        }
    }

    initializePrintYearOptions() {
        const yearSelect = document.getElementById('print-year');
        const currentYear = new Date().getFullYear();
        const years = [];
        
        for (let year = currentYear - 5; year <= currentYear + 2; year++) {
            years.push(year);
        }
        
        yearSelect.innerHTML = years.map(year => 
            `<option value="${year}" ${year === currentYear ? 'selected' : ''}>${year}年</option>`
        ).join('');
        
        const currentMonth = new Date().getMonth() + 1;
        document.getElementById('print-month').value = currentMonth;
    }

    updateGraphTypeOptions() {
        const manholeId = document.getElementById('graph-manhole').value;
        const graphTypeSelect = document.getElementById('graph-type');
        
        if (!graphTypeSelect) return;

        // デフォルトオプションを保持
        const defaultOptions = [
            { value: 'current', text: '電流値推移' },
            { value: 'voltage', text: '電圧推移' },
            { value: 'water-level', text: '水位推移' }
        ];

        let dynamicOptions = [];

        if (manholeId) {
            // マンホール用の点検項目を取得（デフォルト項目を含む）
            const inspectionItems = this.app.dataManager.getInspectionItemsForManhole(manholeId);
            if (inspectionItems && inspectionItems.length > 0) {
                // 数値型の点検項目を取得
                const numericItems = inspectionItems.filter(item => item.type === 'numeric');
                dynamicOptions = numericItems.map(item => ({
                    value: `dynamic_${item.id}`,
                    text: `${item.name} ${(item.numericSettings && item.numericSettings.unit) || item.unit ? 
                        `(${(item.numericSettings && item.numericSettings.unit) || item.unit})` : ''}`
                }));
            }
        }

        // 現在の選択値を保存
        const currentValue = graphTypeSelect.value;

        // オプションを再構築
        graphTypeSelect.innerHTML = '';
        
        // デフォルトオプション
        defaultOptions.forEach(option => {
            const optionElement = document.createElement('option');
            optionElement.value = option.value;
            optionElement.textContent = option.text;
            graphTypeSelect.appendChild(optionElement);
        });

        // 動的オプション
        if (dynamicOptions.length > 0) {
            // セパレーター
            const separator = document.createElement('option');
            separator.disabled = true;
            separator.textContent = '--- 点検項目 ---';
            graphTypeSelect.appendChild(separator);

            dynamicOptions.forEach(option => {
                const optionElement = document.createElement('option');
                optionElement.value = option.value;
                optionElement.textContent = option.text;
                graphTypeSelect.appendChild(optionElement);
            });
        }

        // 選択値を復元（存在する場合）
        if (currentValue && Array.from(graphTypeSelect.options).some(opt => opt.value === currentValue)) {
            graphTypeSelect.value = currentValue;
        } else {
            // デフォルト値を設定
            graphTypeSelect.value = 'current';
        }
    }

    async updateGraph() {
        const manholeId = document.getElementById('graph-manhole').value;
        const graphType = document.getElementById('graph-type').value;
        
        if (!manholeId) {
            document.getElementById('graph-container').innerHTML = '<p>マンホールを選択してください</p>';
            return;
        }

        try {
            const inspections = await this.app.dataManager.getFilteredInspections(manholeId, 'all');
            const sortedInspections = inspections
                .sort((a, b) => new Date(a.inspectionDate) - new Date(b.inspectionDate))
                .slice(-12);

            if (sortedInspections.length === 0) {
                document.getElementById('graph-container').innerHTML = '<p>データがありません</p>';
                return;
            }

            this.renderChart(sortedInspections, graphType, manholeId);
            this.updateHealthStatus(sortedInspections, manholeId);
        } catch (error) {
            console.error('グラフ更新エラー:', error);
            document.getElementById('graph-container').innerHTML = '<p>データの取得に失敗しました</p>';
        }
    }

    renderChart(inspections, graphType, manholeId) {
        const canvas = document.getElementById('chart');
        if (!canvas) {
            console.error('Chart canvas element not found');
            return;
        }
        
        const ctx = canvas.getContext('2d');
        if (!ctx) {
            console.error('Failed to get canvas 2D context');
            return;
        }
        
        const container = canvas.parentElement;
        canvas.width = Math.min(1000, container.clientWidth || 1000);
        canvas.height = 500;
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        const padding = 80;
        const chartWidth = canvas.width - 2 * padding;
        const chartHeight = canvas.height - 2 * padding;
        
        // 時系列ソート済みの検査データから日付配列を作成
        const sortedInspections = inspections.sort((a, b) => new Date(a.inspectionDate) - new Date(b.inspectionDate));
        const dates = sortedInspections.map(i => {
            const date = new Date(i.inspectionDate);
            return {
                display: date.toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' }),
                full: date.toLocaleDateString('ja-JP'),
                timestamp: date.getTime()
            };
        });
        
        let data1, data2, label1, label2, unit;
        
        if (graphType.startsWith('dynamic_')) {
            // 動的数値項目の処理
            const itemId = graphType.replace('dynamic_', '');
            const manhole = this.app.dataManager.getManhole(manholeId);
            
            // マンホール用の点検項目を取得（デフォルト項目を含む）
            const inspectionItems = this.app.dataManager.getInspectionItemsForManhole(manholeId);
            if (inspectionItems && inspectionItems.length > 0) {
                const item = inspectionItems.find(i => i.id === itemId);
                if (item && item.type === 'numeric') {
                    data1 = sortedInspections.map(inspection => {
                        // カスタム項目のデータを検索
                        if (inspection.customItems && Array.isArray(inspection.customItems)) {
                            const customItem = inspection.customItems.find(ci => ci.id === itemId);
                            if (customItem && customItem.value !== undefined) {
                                const value = parseFloat(customItem.value);
                                return isNaN(value) ? null : value;
                            }
                        }
                        
                        // フォームデータから直接取得を試行
                        const fieldValue = inspection[`dynamic_${itemId}`];
                        if (fieldValue !== undefined) {
                            const value = parseFloat(fieldValue);
                            return isNaN(value) ? null : value;
                        }
                        
                        return null;
                    });
                    data2 = [];
                    label1 = item.name;
                    label2 = '';
                    unit = (item.numericSettings && item.numericSettings.unit) || item.unit || '';
                } else {
                    // 項目が見つからない場合
                    data1 = [];
                    data2 = [];
                    label1 = '不明な項目';
                    label2 = '';
                    unit = '';
                }
            } else {
                data1 = [];
                data2 = [];
                label1 = '項目なし';
                label2 = '';
                unit = '';
            }
        } else {
            // 既存の固定項目の処理
            switch (graphType) {
                case 'current':
                    data1 = sortedInspections.map(i => {
                        const value = parseFloat(i.no1Current);
                        return isNaN(value) ? null : value;
                    });
                    data2 = sortedInspections.map(i => {
                        const value = parseFloat(i.no2Current);
                        return isNaN(value) ? null : value;
                    });
                    label1 = 'No1電流';
                    label2 = 'No2電流';
                    unit = 'A';
                    break;
                case 'voltage':
                    data1 = sortedInspections.map(i => {
                        const value = parseFloat(i.voltage);
                        return isNaN(value) ? null : value;
                    });
                    data2 = [];
                    label1 = '電圧';
                    label2 = '';
                    unit = 'V';
                    break;
                case 'water-level':
                    data1 = sortedInspections.map(i => {
                        const value = parseFloat(i.operationWaterLevel);
                        return isNaN(value) ? null : value;
                    });
                    data2 = sortedInspections.map(i => {
                        const value = parseFloat(i.abnormalWaterLevel);
                        return isNaN(value) ? null : value;
                    });
                    label1 = '運転水位';
                    label2 = '異常高水位';
                    unit = 'm/%';
                    break;
                default:
                    data1 = [];
                    data2 = [];
                    label1 = '不明';
                    label2 = '';
                    unit = '';
            }
        }
        
        // nullを除いた有効な値を取得
        const allValues = [...data1, ...data2].filter(v => v !== null && v !== undefined && !isNaN(v));
        
        if (allValues.length === 0) {
            ctx.fillStyle = '#757575';
            ctx.font = '18px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('データがありません', canvas.width / 2, canvas.height / 2);
            return;
        }
        
        const minValue = Math.min(...allValues);
        const maxValue = Math.max(...allValues);
        const valueRange = maxValue === minValue ? Math.max(Math.abs(maxValue) * 0.2, 1) : maxValue - minValue;
        const chartMinValue = minValue - valueRange * 0.1;
        const chartMaxValue = maxValue + valueRange * 0.1;
        const chartValueRange = chartMaxValue - chartMinValue;
        
        // チャートタイトル
        ctx.fillStyle = '#333';
        ctx.font = 'bold 20px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`${label1}${label2 ? ` / ${label2}` : ''} の推移`, canvas.width / 2, 30);
        
        // グリッド線とY軸ラベル
        ctx.strokeStyle = '#E0E0E0';
        ctx.lineWidth = 1;
        ctx.fillStyle = '#666';
        ctx.font = '12px sans-serif';
        ctx.textAlign = 'right';
        
        const gridLines = 6;
        for (let i = 0; i <= gridLines; i++) {
            const y = padding + (chartHeight / gridLines) * i;
            const value = chartMaxValue - (chartValueRange / gridLines) * i;
            
            // 横グリッド線
            ctx.beginPath();
            ctx.moveTo(padding, y);
            ctx.lineTo(padding + chartWidth, y);
            ctx.stroke();
            
            // Y軸ラベル
            ctx.fillText(value.toFixed(1) + unit, padding - 10, y + 4);
        }
        
        // X軸（時系列）
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(padding, padding + chartHeight);
        ctx.lineTo(padding + chartWidth, padding + chartHeight);
        ctx.stroke();
        
        // Y軸
        ctx.beginPath();
        ctx.moveTo(padding, padding);
        ctx.lineTo(padding, padding + chartHeight);
        ctx.stroke();
        
        // X軸ラベル（日付）
        ctx.fillStyle = '#666';
        ctx.font = '11px sans-serif';
        ctx.textAlign = 'center';
        
        const xStep = dates.length > 1 ? chartWidth / (dates.length - 1) : chartWidth / 2;
        dates.forEach((date, i) => {
            const x = padding + (dates.length > 1 ? xStep * i : chartWidth / 2);
            
            // 縦のグリッド線
            ctx.strokeStyle = '#E0E0E0';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(x, padding);
            ctx.lineTo(x, padding + chartHeight);
            ctx.stroke();
            
            // 日付ラベル
            ctx.fillStyle = '#666';
            ctx.fillText(date.display, x, padding + chartHeight + 20);
            
            // 詳細な日付をツールチップ用に（マウスオーバー時に表示）
            if (dates.length <= 10) {
                ctx.font = '9px sans-serif';
                ctx.fillText(date.full, x, padding + chartHeight + 35);
                ctx.font = '11px sans-serif';
            }
        });
        
        const drawTimeSeries = (data, color, label) => {
            if (!data || data.length === 0) return;
            
            // データポイントの描画
            ctx.fillStyle = color;
            data.forEach((value, i) => {
                if (value !== null && value !== undefined && !isNaN(value)) {
                    const x = padding + (dates.length > 1 ? xStep * i : chartWidth / 2);
                    const y = padding + chartHeight - ((value - chartMinValue) / chartValueRange) * chartHeight;
                    
                    // データポイント（円）
                    ctx.beginPath();
                    ctx.arc(x, y, 5, 0, 2 * Math.PI);
                    ctx.fill();
                    
                    // 値をデータポイント上に表示（データが少ない場合）
                    if (dates.length <= 8) {
                        ctx.fillStyle = '#333';
                        ctx.font = 'bold 11px sans-serif';
                        ctx.textAlign = 'center';
                        ctx.fillText(value.toFixed(1), x, y - 12);
                        ctx.fillStyle = color;
                    }
                }
            });
            
            // 線の描画
            ctx.strokeStyle = color;
            ctx.lineWidth = 3;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            
            let pathStarted = false;
            ctx.beginPath();
            
            data.forEach((value, i) => {
                if (value !== null && value !== undefined && !isNaN(value)) {
                    const x = padding + (dates.length > 1 ? xStep * i : chartWidth / 2);
                    const y = padding + chartHeight - ((value - chartMinValue) / chartValueRange) * chartHeight;
                    
                    if (!pathStarted) {
                        ctx.moveTo(x, y);
                        pathStarted = true;
                    } else {
                        ctx.lineTo(x, y);
                    }
                }
            });
            
            if (pathStarted) {
                ctx.stroke();
            }
        };
        
        // データ系列の描画
        drawTimeSeries(data1, '#2196F3', label1);
        if (data2.length > 0 && data2.some(v => v !== null)) {
            drawTimeSeries(data2, '#FF9800', label2);
        }
        
        // 凡例の描画
        ctx.fillStyle = '#212121';
        ctx.font = '14px sans-serif';
        ctx.textAlign = 'left';
        
        // 第1系列の凡例
        ctx.fillStyle = '#2196F3';
        ctx.fillRect(padding + 20, padding - 30, 15, 3);
        ctx.fillStyle = '#212121';
        ctx.fillText(`${label1} (${unit})`, padding + 45, padding - 20);
        
        // 第2系列の凡例（存在する場合）
        if (label2 && data2.length > 0 && data2.some(v => v !== null)) {
            ctx.fillStyle = '#FF9800';
            ctx.fillRect(padding + 220, padding - 30, 15, 3);
            ctx.fillStyle = '#212121';
            ctx.fillText(`${label2} (${unit})`, padding + 245, padding - 20);
        }
    }

    updateHealthStatus(inspections, manholeId) {
        const manhole = this.app.dataManager.getManhole(manholeId);
        if (!manhole) return;

        const latest = inspections[inspections.length - 1];
        const healthContainer = document.getElementById('health-status');
        
        const getHealthClass = (current, rated) => {
            if (!current || !rated) return 'health-good';
            const diff = Math.abs(current - rated) / rated;
            if (diff > 0.2) return 'health-error';
            if (diff > 0.1) return 'health-warning';
            return 'health-good';
        };
        
        const getHealthText = (current, rated) => {
            if (!current || !rated) return '正常';
            const diff = Math.abs(current - rated) / rated;
            if (diff > 0.2) return '異常';
            if (diff > 0.1) return '注意';
            return '正常';
        };

        healthContainer.innerHTML = `
            <div class="health-card">
                <div class="health-title">No1ポンプ状態</div>
                <div class="health-value ${getHealthClass(latest.no1Current, manhole.ratedCurrent1)}">
                    ${getHealthText(latest.no1Current, manhole.ratedCurrent1)}
                </div>
                <div>電流値: ${latest.no1Current || 'N/A'}A</div>
            </div>
            <div class="health-card">
                <div class="health-title">No2ポンプ状態</div>
                <div class="health-value ${getHealthClass(latest.no2Current, manhole.ratedCurrent2)}">
                    ${getHealthText(latest.no2Current, manhole.ratedCurrent2)}
                </div>
                <div>電流値: ${latest.no2Current || 'N/A'}A</div>
            </div>
            <div class="health-card">
                <div class="health-title">電圧状態</div>
                <div class="health-value ${latest.voltage && (latest.voltage < 190 || latest.voltage > 230) ? 'health-error' : 'health-good'}">
                    ${latest.voltage && (latest.voltage < 190 || latest.voltage > 230) ? '異常' : '正常'}
                </div>
                <div>電圧値: ${latest.voltage || 'N/A'}V</div>
            </div>
            <div class="health-card">
                <div class="health-title">総合評価</div>
                <div class="health-value health-good">良好</div>
                <div>点検項目: 正常</div>
            </div>
        `;
    }

    // Notification methods delegated to NotificationManager
    showAlert(title, type = 'info', message = '') {
        return this.notificationManager.showAlert(title, type, message);
    }

    closeAlert(alertId) {
        return this.notificationManager.closeAlert(alertId);
    }


    // 写真表示機能
    async viewInspectionPhotos(inspectionId) {
        console.log('写真表示開始:', inspectionId);
        try {
            const inspection = this.app.dataManager.getInspection(inspectionId);
            console.log('取得した点検データ:', inspection);
            
            if (!inspection) {
                this.showAlert('点検データが見つかりません', 'error');
                return;
            }

            const manhole = this.app.dataManager.getManhole(inspection.manholeId);
            const manholeName = manhole ? manhole.name : '不明なマンホール';
            
            console.log('写真データ取得開始...');
            const photos = await this.app.dataManager.getPhotosByInspectionId(inspectionId);
            console.log('取得した写真データ:', photos);
            
            // モーダルタイトルを設定
            document.getElementById('photo-modal-title').textContent = 
                `${manholeName} - ${inspection.inspectionDate} の写真`;
            
            this.photoManager.displayPhotoGallery(photos);
            
            // モーダルを表示
            const modal = document.getElementById('photo-view-modal');
            console.log('モーダル要素:', modal);
            modal.classList.add('active');
            
        } catch (error) {
            console.error('写真表示エラー:', error);
            this.showAlert('写真の表示に失敗しました', 'error');
        }
    }




    // 点検項目設定機能
    updateInspectionItemsList(manholeId) {
        const listContainer = document.getElementById('inspection-items-list');
        if (!listContainer) return;

        const manhole = this.app.dataManager.getManhole(manholeId);
        if (!manhole) return;

        // 点検項目がない場合はデフォルト項目を設定
        if (!manhole.inspectionItems || manhole.inspectionItems.length === 0) {
            manhole.inspectionItems = this.getDefaultInspectionItems();
            this.app.dataManager.saveManholesToFile();
        }

        // 項目を順序でソート
        const sortedItems = [...manhole.inspectionItems].sort((a, b) => a.order - b.order);

        if (sortedItems.length === 0) {
            listContainer.innerHTML = `
                <div class="inspection-items-empty">
                    <div class="inspection-items-empty-icon">📋</div>
                    <p>点検項目が設定されていません</p>
                    <p>「点検項目を追加」ボタンで項目を追加してください</p>
                </div>
            `;
            return;
        }

        listContainer.innerHTML = sortedItems.map((item, index) => `
            <div class="inspection-item" data-item-id="${item.id}">
                <div class="inspection-item-handle">⋮⋮</div>
                <div class="inspection-item-order">${index + 1}</div>
                <div class="inspection-item-content">
                    <div class="inspection-item-name">${item.name}</div>
                    <div class="inspection-item-meta">
                        <span class="inspection-item-type ${item.type}">${this.getItemTypeLabel(item.type)}</span>
                        ${item.category ? `<span class="inspection-item-category">${item.category}</span>` : ''}
                        ${item.required ? '<span class="inspection-item-required">必須</span>' : ''}
                    </div>
                    ${this.getInspectionItemSettings(item)}
                </div>
                <div class="inspection-item-actions">
                    <button type="button" class="btn btn-secondary btn-icon" onclick="app.uiManager.editInspectionItem('${manholeId}', '${item.id}')">
                        ✏️
                    </button>
                    <button type="button" class="btn btn-secondary btn-icon" onclick="app.uiManager.deleteInspectionItem('${manholeId}', '${item.id}')">
                        🗑️
                    </button>
                </div>
            </div>
        `).join('');

        // ドラッグ&ドロップの初期化
        this.initializeSortable(listContainer, manholeId);
    }

    getItemTypeLabel(type) {
        const labels = {
            checkbox: 'チェックボックス',
            selection: '選択肢',
            numeric: '数値入力',
            text: '文字列入力'
        };
        return labels[type] || type;
    }

    getInspectionItemSettings(item) {
        if (item.type === 'numeric' && item.numericSettings) {
            const settings = item.numericSettings;
            return `
                <div class="inspection-item-settings">
                    小数点${settings.decimalPlaces}桁 ${settings.unit || ''}
                    ${settings.warningRange ? 
                        `/ 警告範囲: ${settings.warningRange.min} - ${settings.warningRange.max}` : ''}
                </div>
            `;
        } else if (item.type === 'selection' && item.selectionOptions) {
            return `
                <div class="inspection-item-settings">
                    選択肢: ${item.selectionOptions.slice(0, 3).join(', ')}${item.selectionOptions.length > 3 ? '...' : ''}
                </div>
            `;
        } else if (item.type === 'text' && item.maxLength) {
            return `
                <div class="inspection-item-settings">
                    最大${item.maxLength}文字
                </div>
            `;
        }
        return '';
    }

    initializeSortable(container, manholeId) {
        // 簡易的なドラッグ&ドロップ実装
        let draggedElement = null;

        container.addEventListener('dragstart', (e) => {
            if (e.target.classList.contains('inspection-item')) {
                draggedElement = e.target;
                e.target.classList.add('dragging');
            }
        });

        container.addEventListener('dragover', (e) => {
            e.preventDefault();
        });

        container.addEventListener('drop', (e) => {
            e.preventDefault();
            if (draggedElement && e.target.closest('.inspection-item')) {
                const targetElement = e.target.closest('.inspection-item');
                if (targetElement !== draggedElement) {
                    const rect = targetElement.getBoundingClientRect();
                    const midY = rect.top + rect.height / 2;
                    
                    if (e.clientY < midY) {
                        container.insertBefore(draggedElement, targetElement);
                    } else {
                        container.insertBefore(draggedElement, targetElement.nextSibling);
                    }
                    
                    this.updateInspectionItemsOrder(manholeId);
                }
            }
        });

        container.addEventListener('dragend', (e) => {
            if (e.target.classList.contains('inspection-item')) {
                e.target.classList.remove('dragging');
            }
            draggedElement = null;
        });

        // 各アイテムにdraggable属性を追加
        container.querySelectorAll('.inspection-item').forEach(item => {
            item.draggable = true;
        });
    }

    updateInspectionItemsOrder(manholeId) {
        const container = document.getElementById('inspection-items-list');
        const items = container.querySelectorAll('.inspection-item');
        const manhole = this.app.dataManager.getManhole(manholeId);
        
        if (!manhole || !manhole.inspectionItems) return;

        items.forEach((item, index) => {
            const itemId = item.dataset.itemId;
            const inspectionItem = manhole.inspectionItems.find(i => i.id === itemId);
            if (inspectionItem) {
                inspectionItem.order = index + 1;
            }
        });

        this.app.dataManager.saveManholesToFile();
        this.updateInspectionItemsList(manholeId);
    }

    addNewInspectionItem() {
        // マンホール編集モーダルのコンテキストで現在編集中のマンホールを取得
        const selectedManholeId = this.currentEditingId;
        
        if (!selectedManholeId) {
            this.showAlert('点検項目を追加するマンホールを選択してください', 'error');
            return;
        }
        
        this.currentManholeForInspectionItems = selectedManholeId;
        this.currentEditingInspectionItem = null;
        this.modalManager.openInspectionItemEditModal();
    }

    editInspectionItem(manholeId, itemId) {
        const manhole = this.app.dataManager.getManhole(manholeId);
        if (!manhole || !manhole.inspectionItems) return;

        const item = manhole.inspectionItems.find(i => i.id === itemId);
        if (!item) return;

        this.currentEditingInspectionItem = { manholeId, itemId };
        this.modalManager.openInspectionItemEditModal(item);
    }

    deleteInspectionItem(manholeId, itemId) {
        if (!confirm('この点検項目を削除してもよろしいですか？')) return;

        const manhole = this.app.dataManager.getManhole(manholeId);
        if (!manhole || !manhole.inspectionItems) return;

        manhole.inspectionItems = manhole.inspectionItems.filter(i => i.id !== itemId);
        this.app.dataManager.saveManholesToFile();
        this.updateInspectionItemsList(manholeId);
        
        this.showAlert('点検項目を削除しました', 'success');
    }



    toggleInspectionItemTypeSettings(type) {
        const settingsSections = ['selection-settings', 'numeric-settings', 'text-settings'];
        
        settingsSections.forEach(sectionId => {
            const section = document.getElementById(sectionId);
            if (section) {
                section.style.display = 'none';
            }
        });

        if (type) {
            const targetSection = document.getElementById(`${type}-settings`);
            if (targetSection) {
                targetSection.style.display = 'block';
            }
        }
    }

    saveInspectionItem() {
        console.log('saveInspectionItem called');
        console.log('currentManholeForInspectionItems:', this.currentManholeForInspectionItems);
        console.log('currentEditingInspectionItem:', this.currentEditingInspectionItem);
        
        const form = document.getElementById('inspection-item-edit-form');
        const formData = new FormData(form);

        // 基本情報を取得
        const itemData = {
            name: formData.get('name').trim(),
            type: formData.get('type'),
            category: formData.get('category').trim(),
            required: document.getElementById('item-required').checked
        };

        // バリデーション
        if (!itemData.name || !itemData.type) {
            this.showAlert('項目名とタイプは必須です', 'error');
            return;
        }

        // IDとorderの設定
        if (this.currentEditingInspectionItem) {
            itemData.id = this.currentEditingInspectionItem.itemId;
            const manhole = this.app.dataManager.getManhole(this.currentEditingInspectionItem.manholeId);
            const existingItem = manhole.inspectionItems.find(i => i.id === itemData.id);
            itemData.order = existingItem ? existingItem.order : 1;
        } else {
            itemData.id = `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            const manholeId = this.currentManholeForInspectionItems;
            const manhole = this.app.dataManager.getManhole(manholeId);
            itemData.order = manhole.inspectionItems ? manhole.inspectionItems.length + 1 : 1;
        }

        // タイプ別設定
        if (itemData.type === 'selection') {
            const optionsText = document.getElementById('selection-options').value.trim();
            itemData.selectionOptions = optionsText ? optionsText.split('\n').map(s => s.trim()).filter(s => s) : [];
            if (itemData.selectionOptions.length === 0) {
                this.showAlert('選択肢を入力してください', 'error');
                return;
            }
        } else if (itemData.type === 'numeric') {
            itemData.numericSettings = {
                decimalPlaces: parseInt(document.getElementById('decimal-places').value) || 2,
                unit: document.getElementById('numeric-unit').value.trim()
            };
            
            const minVal = document.getElementById('warning-min').value;
            const maxVal = document.getElementById('warning-max').value;
            if (minVal !== '' && maxVal !== '') {
                itemData.numericSettings.warningRange = {
                    min: parseFloat(minVal),
                    max: parseFloat(maxVal)
                };
            }
        } else if (itemData.type === 'text') {
            itemData.maxLength = parseInt(document.getElementById('max-length').value) || 500;
        }

        // データ保存
        const manholeId = this.currentEditingInspectionItem ? 
            this.currentEditingInspectionItem.manholeId : 
            this.currentManholeForInspectionItems;
        
        const manhole = this.app.dataManager.getManhole(manholeId);
        if (!manhole) {
            this.showAlert('マンホールデータが見つかりません', 'error');
            return;
        }

        if (!manhole.inspectionItems) {
            manhole.inspectionItems = [];
        }

        if (this.currentEditingInspectionItem) {
            // 編集
            const index = manhole.inspectionItems.findIndex(i => i.id === itemData.id);
            if (index !== -1) {
                manhole.inspectionItems[index] = itemData;
            }
        } else {
            // 新規追加
            manhole.inspectionItems.push(itemData);
        }

        this.app.dataManager.saveManholesToFile();
        this.updateInspectionItemsList(manholeId);
        this.modalManager.closeInspectionItemEditModal();
        
        const action = this.currentEditingInspectionItem ? '更新' : '追加';
        this.showAlert(`点検項目を${action}しました`, 'success');
    }


    // 点検項目コピー・ペースト機能
    populateCopySourceManholes(currentManholeId) {
        const select = document.getElementById('copy-source-manhole');
        if (!select) return;

        const manholes = this.app.dataManager.getAllManholes();
        
        // 現在編集中のマンホール以外をオプションに追加
        select.innerHTML = '<option value="">コピー元マンホールを選択</option>';
        manholes.forEach(manhole => {
            if (manhole.id !== currentManholeId && manhole.inspectionItems && manhole.inspectionItems.length > 0) {
                const option = document.createElement('option');
                option.value = manhole.id;
                option.textContent = `${manhole.name} (${manhole.inspectionItems.length}項目)`;
                select.appendChild(option);
            }
        });
    }

    copyInspectionItems() {
        // コピー元のマンホールを取得
        const copySourceSelect = document.getElementById('copy-source-manhole');
        const selectedManholeId = copySourceSelect ? copySourceSelect.value : null;
        
        if (!selectedManholeId) {
            this.showAlert('コピー元のマンホールを選択してください', 'warning');
            return;
        }

        const sourceManhole = this.app.dataManager.getManhole(selectedManholeId);
        if (!sourceManhole || !sourceManhole.inspectionItems) {
            this.showAlert('選択されたマンホールに点検項目が見つかりません', 'error');
            return;
        }

        // 点検項目をクリップボードに保存（ディープコピー）
        this.copiedInspectionItems = JSON.parse(JSON.stringify(sourceManhole.inspectionItems));
        
        // ペーストボタンを有効化
        const pasteBtn = document.getElementById('paste-inspection-items-btn');
        if (pasteBtn) {
            pasteBtn.disabled = false;
        }

        this.showAlert(`${sourceManhole.name}の点検項目(${this.copiedInspectionItems.length}項目)をコピーしました`, 'success');
    }

    pasteInspectionItems() {
        if (!this.copiedInspectionItems || this.copiedInspectionItems.length === 0) {
            this.showAlert('コピーされた点検項目がありません', 'warning');
            return;
        }

        // 現在編集中のマンホールを取得
        const selectedManholeId = this.currentEditingId;
        
        if (!selectedManholeId) {
            this.showAlert('点検項目を貼り付けるマンホールを選択してください', 'error');
            return;
        }
        
        this.currentManholeForInspectionItems = selectedManholeId;

        // 確認ダイアログ
        if (!confirm('既存の点検項目を全て削除して、コピーした点検項目を貼り付けますか？')) {
            return;
        }

        const manhole = this.app.dataManager.getManhole(this.currentManholeForInspectionItems);
        if (!manhole) {
            this.showAlert('マンホールデータが見つかりません', 'error');
            return;
        }

        // 新しいIDを生成して点検項目を貼り付け
        const pastedItems = this.copiedInspectionItems.map((item, index) => ({
            ...item,
            id: `item_${Date.now()}_${index}` // 新しいIDを生成
        }));

        // マンホールの点検項目を更新
        manhole.inspectionItems = pastedItems;
        
        // データを保存
        this.app.dataManager.saveManholesToFile();
        
        // UIを更新
        this.updateInspectionItemsList(this.currentManholeForInspectionItems);
        
        this.showAlert(`点検項目(${pastedItems.length}項目)を貼り付けました`, 'success');
    }
}