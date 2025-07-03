class ManholeInspectionApp {
    constructor() {
        this.data = {
            manholes: [],
            inspections: [],
            photos: []
        };
        this.currentTab = 'inspection';
        this.recognition = null;
        this.map = null;
        this.qrScanner = null;
        this.alertTimeout = null;
        this.backupInterval = null;
        this.init();
    }

    async init() {
        await this.loadData();
        this.setupEventListeners();
        this.initializeForm();
        this.populateManholeSelects();
        this.initializeVoiceRecognition();
        this.initializeMap();
        this.setupAutoBackup();
        this.registerServiceWorker();
    }

    async loadData() {
        try {
            const savedData = localStorage.getItem('manholeInspectionData');
            if (savedData) {
                this.data = JSON.parse(savedData);
            } else {
                this.data.manholes = this.getDefaultManholes();
                this.saveData();
            }
        } catch (error) {
            console.error('データの読み込みに失敗しました:', error);
            this.data.manholes = this.getDefaultManholes();
        }
    }

    saveData() {
        try {
            localStorage.setItem('manholeInspectionData', JSON.stringify(this.data));
        } catch (error) {
            console.error('データの保存に失敗しました:', error);
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
                latitude: 35.6762,
                longitude: 139.6503
            },
            {
                id: 2,
                name: 'マンホール2',
                ratedCurrent1: 20.0,
                ratedCurrent2: 20.0,
                outputKw1: 10.0,
                outputKw2: 10.0,
                latitude: 35.6812,
                longitude: 139.7671
            }
        ];
    }

    setupEventListeners() {
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.switchTab(e.target.dataset.tab);
            });
        });

        const form = document.getElementById('inspection-form');
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveInspection();
        });

        document.getElementById('clear-form-btn').addEventListener('click', () => {
            this.clearForm();
        });

        document.getElementById('manhole-name').addEventListener('change', (e) => {
            this.onManholeChange(e.target.value);
        });

        document.getElementById('no1-hour').addEventListener('input', (e) => {
            this.calculateHourDifference('no1', e.target.value);
        });

        document.getElementById('no2-hour').addEventListener('input', (e) => {
            this.calculateHourDifference('no2', e.target.value);
        });

        document.getElementById('voltage').addEventListener('input', (e) => {
            this.checkVoltageRange(e.target.value);
        });

        document.getElementById('no1-current').addEventListener('input', (e) => {
            this.checkCurrentRange('no1', e.target.value);
        });

        document.getElementById('no2-current').addEventListener('input', (e) => {
            this.checkCurrentRange('no2', e.target.value);
        });

        document.getElementById('take-photo-btn').addEventListener('click', () => {
            document.getElementById('photo-input').click();
        });

        document.getElementById('photo-input').addEventListener('change', (e) => {
            this.handlePhotoSelection(e.target.files);
        });

        document.getElementById('master-edit-btn').addEventListener('click', () => {
            this.openMasterModal();
        });

        document.getElementById('data-export-btn').addEventListener('click', () => {
            this.openExportModal();
        });

        document.getElementById('close-master-modal').addEventListener('click', () => {
            this.closeMasterModal();
        });

        document.getElementById('close-export-modal').addEventListener('click', () => {
            this.closeExportModal();
        });

        document.getElementById('add-manhole-btn').addEventListener('click', () => {
            this.addNewManhole();
        });

        document.getElementById('close-manhole-edit-modal').addEventListener('click', () => {
            this.closeManholeEditForm();
        });

        document.getElementById('cancel-manhole-edit').addEventListener('click', () => {
            this.closeManholeEditForm();
        });

        document.getElementById('manhole-edit-form').addEventListener('submit', (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            this.saveManholeFromForm(formData);
        });

        document.getElementById('export-csv-btn').addEventListener('click', () => {
            this.exportCSV();
        });

        document.getElementById('export-backup-btn').addEventListener('click', () => {
            this.exportBackup();
        });

        document.getElementById('import-backup-btn').addEventListener('click', () => {
            document.getElementById('backup-file-input').click();
        });

        document.getElementById('backup-file-input').addEventListener('change', (e) => {
            this.importBackup(e.target.files[0]);
        });

        document.getElementById('monthly-print-btn').addEventListener('click', () => {
            this.printMonthlyReport();
        });

        document.getElementById('monthly-pdf-btn').addEventListener('click', () => {
            this.generateMonthlyPDF();
        });

        document.getElementById('qr-scan-btn').addEventListener('click', () => {
            this.openQRScanner();
        });

        document.getElementById('close-qr-scan-modal').addEventListener('click', () => {
            this.closeQRScanner();
        });

        document.getElementById('get-location-btn').addEventListener('click', () => {
            this.getCurrentLocation();
        });

        document.getElementById('add-location-btn').addEventListener('click', () => {
            this.addLocationToManhole();
        });

        document.getElementById('goto-location-btn').addEventListener('click', () => {
            this.goToManualLocation();
        });

        document.getElementById('generate-qr-btn').addEventListener('click', () => {
            this.generateQRForSelected();
        });

        document.getElementById('generate-all-qr-btn').addEventListener('click', () => {
            this.generateAllQRCodes();
        });

        document.getElementById('map-manhole').addEventListener('change', () => {
            this.updateMapDisplay();
        });

        this.setupVoiceInputListeners();

        document.getElementById('history-manhole').addEventListener('change', () => {
            this.updateHistoryDisplay();
        });

        document.getElementById('history-period').addEventListener('change', () => {
            this.updateHistoryDisplay();
        });

        document.getElementById('graph-manhole').addEventListener('change', () => {
            this.updateGraph();
        });

        document.getElementById('graph-type').addEventListener('change', () => {
            this.updateGraph();
        });

        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                e.target.classList.remove('active');
            }
        });
    }

    initializeForm() {
        document.getElementById('inspection-date').value = new Date().toISOString().split('T')[0];
    }

    populateManholeSelects() {
        const selects = [
            document.getElementById('manhole-name'),
            document.getElementById('history-manhole'),
            document.getElementById('graph-manhole'),
            document.getElementById('map-manhole')
        ];

        selects.forEach(select => {
            if (select.id === 'history-manhole') {
                select.innerHTML = '<option value="">全て</option>';
            } else if (select.id === 'map-manhole') {
                select.innerHTML = '<option value="">全て表示</option>';
            } else {
                select.innerHTML = '<option value="">選択してください</option>';
            }

            this.data.manholes.forEach(manhole => {
                const option = document.createElement('option');
                option.value = manhole.id;
                option.textContent = manhole.name;
                select.appendChild(option);
            });
        });
    }

    switchTab(tabName) {
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });

        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
        document.getElementById(`${tabName}-tab`).classList.add('active');

        this.currentTab = tabName;

        if (tabName === 'history') {
            this.updateHistoryDisplay();
        } else if (tabName === 'graph') {
            this.updateGraph();
        } else if (tabName === 'map') {
            this.ensureMapInitialized();
        }
    }

    onManholeChange(manholeId) {
        if (!manholeId) return;

        const manhole = this.data.manholes.find(m => m.id == manholeId);
        if (!manhole) return;

        document.getElementById('no1-current-info').textContent = 
            `定格電流: ${manhole.ratedCurrent1}A, 出力: ${manhole.outputKw1}kW`;
        document.getElementById('no2-current-info').textContent = 
            `定格電流: ${manhole.ratedCurrent2}A, 出力: ${manhole.outputKw2}kW`;

        const lastInspection = this.getLastInspection(manholeId);
        if (lastInspection) {
            this.displayPreviousData(lastInspection);
        }
    }

    getLastInspection(manholeId) {
        const inspections = this.data.inspections
            .filter(i => i.manholeId == manholeId)
            .sort((a, b) => new Date(b.inspectionDate) - new Date(a.inspectionDate));
        
        return inspections[0];
    }

    displayPreviousData(lastInspection) {
        if (lastInspection.no1Hour !== undefined) {
            document.getElementById('no1-diff').textContent = '';
        }
        if (lastInspection.no2Hour !== undefined) {
            document.getElementById('no2-diff').textContent = '';
        }
    }

    calculateHourDifference(pumpNo, currentValue) {
        const manholeId = document.getElementById('manhole-name').value;
        if (!manholeId || !currentValue) return;

        const lastInspection = this.getLastInspection(manholeId);
        if (!lastInspection) return;

        const lastValue = lastInspection[`${pumpNo}Hour`];
        if (lastValue !== undefined) {
            const diff = (parseFloat(currentValue) - parseFloat(lastValue)).toFixed(1);
            const diffElement = document.getElementById(`${pumpNo}-diff`);
            diffElement.textContent = `前回差分: +${diff}h`;
            diffElement.style.display = diff > 0 ? 'inline-block' : 'none';
        }
    }

    checkVoltageRange(voltage) {
        const warningElement = document.getElementById('voltage-warning');
        const val = parseFloat(voltage);
        
        if (voltage && (val < 190 || val > 230)) {
            warningElement.textContent = '電圧が正常範囲外です (210±20V)';
            warningElement.style.display = 'block';
            this.showAlert('電圧異常を検出しました', 'error', `電圧値: ${val}V (正常範囲: 190-230V)`);
        } else {
            warningElement.style.display = 'none';
        }
    }

    checkCurrentRange(pumpNo, current) {
        const manholeId = document.getElementById('manhole-name').value;
        if (!manholeId) return;

        const manhole = this.data.manholes.find(m => m.id == manholeId);
        if (!manhole) return;

        const ratedCurrent = manhole[`ratedCurrent${pumpNo === 'no1' ? '1' : '2'}`];
        const warningElement = document.getElementById(`${pumpNo}-current-warning`);
        const val = parseFloat(current);
        
        const tolerance = ratedCurrent * 0.1;
        const minCurrent = ratedCurrent - tolerance;
        const maxCurrent = ratedCurrent + tolerance;

        if (current && (val < minCurrent || val > maxCurrent)) {
            warningElement.textContent = `電流値が定格範囲外です (${ratedCurrent}±${tolerance.toFixed(1)}A)`;
            warningElement.style.display = 'block';
            this.showAlert(`${pumpNo === 'no1' ? 'No1' : 'No2'}ポンプ電流異常`, 'warning', 
                `電流値: ${val}A (定格範囲: ${minCurrent.toFixed(1)}-${maxCurrent.toFixed(1)}A)`);
        } else {
            warningElement.style.display = 'none';
        }
    }

    async handlePhotoSelection(files) {
        for (let file of files) {
            if (file.type.startsWith('image/')) {
                const photoData = await this.processPhoto(file);
                this.addPhotoPreview(photoData);
            }
        }
    }

    async processPhoto(file) {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const photoData = {
                    id: Date.now() + Math.random(),
                    data: e.target.result,
                    timestamp: new Date().toISOString(),
                    name: file.name
                };
                resolve(photoData);
            };
            reader.readAsDataURL(file);
        });
    }

    addPhotoPreview(photoData) {
        const preview = document.getElementById('photo-preview');
        const photoItem = document.createElement('div');
        photoItem.className = 'photo-item';
        photoItem.innerHTML = `
            <img src="${photoData.data}" alt="${photoData.name}">
            <button class="delete-btn" onclick="app.removePhoto('${photoData.id}')">&times;</button>
        `;
        preview.appendChild(photoItem);

        if (!this.currentPhotos) {
            this.currentPhotos = [];
        }
        this.currentPhotos.push(photoData);
    }

    removePhoto(photoId) {
        if (this.currentPhotos) {
            this.currentPhotos = this.currentPhotos.filter(p => p.id !== photoId);
        }
        
        const preview = document.getElementById('photo-preview');
        const photoItems = preview.querySelectorAll('.photo-item');
        photoItems.forEach(item => {
            const deleteBtn = item.querySelector('.delete-btn');
            if (deleteBtn.getAttribute('onclick').includes(photoId)) {
                item.remove();
            }
        });
    }

    saveInspection() {
        const formData = this.getFormData();
        if (!this.validateForm(formData)) {
            return;
        }

        if (this.currentEditingId) {
            const inspectionIndex = this.data.inspections.findIndex(i => i.id == this.currentEditingId);
            if (inspectionIndex !== -1) {
                this.data.inspections[inspectionIndex] = {
                    ...this.data.inspections[inspectionIndex],
                    ...formData,
                    photos: this.currentPhotos || []
                };
                this.saveData();
                alert('点検データを更新しました');
                this.cancelEdit();
                return;
            }
        }

        const inspection = {
            id: Date.now(),
            timestamp: new Date().toISOString(),
            ...formData,
            photos: this.currentPhotos || []
        };

        this.data.inspections.push(inspection);
        this.saveData();

        alert('点検データを保存しました');
        this.clearForm();
    }

    getFormData() {
        const form = document.getElementById('inspection-form');
        const formData = new FormData(form);
        const data = {};

        for (let [key, value] of formData.entries()) {
            data[key] = value;
        }

        data.manholeId = document.getElementById('manhole-name').value;
        data.inspectionDate = document.getElementById('inspection-date').value;
        data.inspector = document.getElementById('inspector').value;
        data.no1Hour = parseFloat(document.getElementById('no1-hour').value) || null;
        data.no2Hour = parseFloat(document.getElementById('no2-hour').value) || null;
        data.voltage = parseInt(document.getElementById('voltage').value) || null;
        data.no1Current = parseFloat(document.getElementById('no1-current').value) || null;
        data.no2Current = parseFloat(document.getElementById('no2-current').value) || null;
        data.operationWaterLevel = parseFloat(document.getElementById('operation-water-level').value) || null;
        data.operationWaterLevelUnit = document.getElementById('operation-water-level-unit').value;
        data.abnormalWaterLevel = parseFloat(document.getElementById('abnormal-water-level').value) || null;
        data.abnormalWaterLevelUnit = document.getElementById('abnormal-water-level-unit').value;
        data.remarks = document.getElementById('remarks').value;

        return data;
    }

    validateForm(data) {
        if (!data.manholeId) {
            alert('マンホール名を選択してください');
            return false;
        }
        if (!data.inspectionDate) {
            alert('点検日を入力してください');
            return false;
        }
        if (!data.inspector) {
            alert('担当者を入力してください');
            return false;
        }
        return true;
    }

    clearForm() {
        const form = document.getElementById('inspection-form');
        form.reset();
        this.initializeForm();
        this.currentPhotos = [];
        document.getElementById('photo-preview').innerHTML = '';
        document.querySelectorAll('.diff-display').forEach(el => el.textContent = '');
        document.querySelectorAll('.warning').forEach(el => el.style.display = 'none');
        document.querySelectorAll('.current-info').forEach(el => el.textContent = '');
        this.setupVoiceInputListeners(); // 音声入力ボタンのイベントリスナーを再設定
    }

    updateHistoryDisplay() {
        const manholeId = document.getElementById('history-manhole').value;
        const period = document.getElementById('history-period').value;
        
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
        
        inspections.sort((a, b) => new Date(b.inspectionDate) - new Date(a.inspectionDate));
        
        this.renderHistoryList(inspections);
    }

    renderHistoryList(inspections) {
        const historyList = document.getElementById('history-list');
        
        if (inspections.length === 0) {
            historyList.innerHTML = '<p>該当する点検データがありません</p>';
            return;
        }
        
        historyList.innerHTML = inspections.map(inspection => {
            const manhole = this.data.manholes.find(m => m.id == inspection.manholeId);
            const manholeName = manhole ? manhole.name : '不明';
            
            return `
                <div class="history-item">
                    <div class="history-item-header">
                        <div class="history-item-title">${manholeName}</div>
                        <div class="history-item-date">${inspection.inspectionDate}</div>
                        <div class="history-item-actions">
                            <button class="btn-icon" onclick="app.viewInspectionDetail('${inspection.id}')" title="詳細表示">
                                👁️
                            </button>
                            <button class="btn-icon" onclick="app.editInspection('${inspection.id}')" title="編集">
                                ✏️
                            </button>
                            <button class="btn-icon btn-danger" onclick="app.deleteInspection('${inspection.id}')" title="削除">
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
                    </div>
                </div>
            `;
        }).join('');
    }

    viewInspectionDetail(inspectionId) {
        const inspection = this.data.inspections.find(i => i.id == inspectionId);
        if (!inspection) return;

        const manhole = this.data.manholes.find(m => m.id == inspection.manholeId);
        const manholeName = manhole ? manhole.name : '不明';

        const detailHtml = `
            <div class="inspection-detail">
                <h3>${manholeName} - ${inspection.inspectionDate}</h3>
                <div class="detail-grid">
                    <div><strong>担当者:</strong> ${inspection.inspector}</div>
                    <div><strong>No1アワーメータ:</strong> ${inspection.no1Hour || 'N/A'}</div>
                    <div><strong>No2アワーメータ:</strong> ${inspection.no2Hour || 'N/A'}</div>
                    <div><strong>運転選択:</strong> ${inspection['operation-mode'] || 'N/A'}</div>
                    <div><strong>運転選択:</strong> ${inspection['pump-selection'] || 'N/A'}</div>
                    <div><strong>電圧:</strong> ${inspection.voltage || 'N/A'}V</div>
                    <div><strong>No1電流:</strong> ${inspection.no1Current || 'N/A'}A</div>
                    <div><strong>No2電流:</strong> ${inspection.no2Current || 'N/A'}A</div>
                    <div><strong>運転水位:</strong> ${inspection.operationWaterLevel || 'N/A'}${inspection.operationWaterLevelUnit || ''}</div>
                    <div><strong>異常高水位:</strong> ${inspection.abnormalWaterLevel || 'N/A'}${inspection.abnormalWaterLevelUnit || ''}</div>
                    ${inspection.remarks ? `<div class="full-width"><strong>特記事項:</strong> ${inspection.remarks}</div>` : ''}
                </div>
                ${inspection.photos && inspection.photos.length > 0 ? `
                    <div class="detail-photos">
                        <h4>写真</h4>
                        <div class="photo-grid">
                            ${inspection.photos.map(photo => `
                                <img src="${photo.data}" alt="${photo.name}" style="max-width: 200px; max-height: 150px; object-fit: cover;">
                            `).join('')}
                        </div>
                    </div>
                ` : ''}
            </div>
        `;

        const modal = document.createElement('div');
        modal.className = 'modal active';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2>点検詳細</h2>
                    <button class="close-btn">&times;</button>
                </div>
                <div class="modal-body">
                    ${detailHtml}
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        modal.querySelector('.close-btn').addEventListener('click', () => {
            modal.remove();
        });

        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }

    updateGraph() {
        const manholeId = document.getElementById('graph-manhole').value;
        const graphType = document.getElementById('graph-type').value;
        
        if (!manholeId) {
            document.getElementById('graph-container').innerHTML = '<p>マンホールを選択してください</p>';
            return;
        }

        const inspections = this.data.inspections
            .filter(i => i.manholeId == manholeId)
            .sort((a, b) => new Date(a.inspectionDate) - new Date(b.inspectionDate))
            .slice(-12);

        if (inspections.length === 0) {
            document.getElementById('graph-container').innerHTML = '<p>データがありません</p>';
            return;
        }

        this.renderChart(inspections, graphType);
        this.updateHealthStatus(inspections, manholeId);
    }

    renderChart(inspections, graphType) {
        const canvas = document.getElementById('chart');
        const ctx = canvas.getContext('2d');
        
        canvas.width = 800;
        canvas.height = 400;
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        const padding = 60;
        const chartWidth = canvas.width - 2 * padding;
        const chartHeight = canvas.height - 2 * padding;
        
        const dates = inspections.map(i => new Date(i.inspectionDate).toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' }));
        
        let data1, data2, label1, label2, unit;
        
        switch (graphType) {
            case 'current':
                data1 = inspections.map(i => i.no1Current || 0);
                data2 = inspections.map(i => i.no2Current || 0);
                label1 = 'No1電流';
                label2 = 'No2電流';
                unit = 'A';
                break;
            case 'hour':
                data1 = inspections.map(i => i.no1Hour || 0);
                data2 = inspections.map(i => i.no2Hour || 0);
                label1 = 'No1アワーメータ';
                label2 = 'No2アワーメータ';
                unit = 'h';
                break;
            case 'water-level':
                data1 = inspections.map(i => i.operationWaterLevel || 0);
                data2 = inspections.map(i => i.abnormalWaterLevel || 0);
                label1 = '運転水位';
                label2 = '異常高水位';
                unit = 'm/%';
                break;
        }
        
        const allValues = [...data1, ...data2].filter(v => v > 0);
        const minValue = Math.min(...allValues);
        const maxValue = Math.max(...allValues);
        const valueRange = maxValue - minValue || 1;
        
        ctx.strokeStyle = '#E0E0E0';
        ctx.lineWidth = 1;
        
        for (let i = 0; i <= 5; i++) {
            const y = padding + (chartHeight / 5) * i;
            ctx.beginPath();
            ctx.moveTo(padding, y);
            ctx.lineTo(padding + chartWidth, y);
            ctx.stroke();
        }
        
        for (let i = 0; i < dates.length; i++) {
            const x = padding + (chartWidth / (dates.length - 1)) * i;
            ctx.beginPath();
            ctx.moveTo(x, padding);
            ctx.lineTo(x, padding + chartHeight);
            ctx.stroke();
        }
        
        ctx.fillStyle = '#757575';
        ctx.font = '12px sans-serif';
        ctx.textAlign = 'center';
        
        dates.forEach((date, i) => {
            const x = padding + (chartWidth / (dates.length - 1)) * i;
            ctx.fillText(date, x, padding + chartHeight + 20);
        });
        
        ctx.textAlign = 'right';
        for (let i = 0; i <= 5; i++) {
            const value = maxValue - (valueRange / 5) * i;
            const y = padding + (chartHeight / 5) * i;
            ctx.fillText(value.toFixed(1) + unit, padding - 10, y + 4);
        }
        
        const drawLine = (data, color) => {
            ctx.strokeStyle = color;
            ctx.lineWidth = 3;
            ctx.beginPath();
            
            data.forEach((value, i) => {
                if (value > 0) {
                    const x = padding + (chartWidth / (dates.length - 1)) * i;
                    const y = padding + chartHeight - ((value - minValue) / valueRange) * chartHeight;
                    
                    if (i === 0 || data[i - 1] === 0) {
                        ctx.moveTo(x, y);
                    } else {
                        ctx.lineTo(x, y);
                    }
                }
            });
            
            ctx.stroke();
            
            ctx.fillStyle = color;
            data.forEach((value, i) => {
                if (value > 0) {
                    const x = padding + (chartWidth / (dates.length - 1)) * i;
                    const y = padding + chartHeight - ((value - minValue) / valueRange) * chartHeight;
                    
                    ctx.beginPath();
                    ctx.arc(x, y, 4, 0, 2 * Math.PI);
                    ctx.fill();
                }
            });
        };
        
        drawLine(data1, '#2196F3');
        drawLine(data2, '#FF9800');
        
        ctx.fillStyle = '#212121';
        ctx.font = '14px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(`${label1} (${unit})`, padding + 20, padding - 20);
        ctx.fillStyle = '#2196F3';
        ctx.fillRect(padding, padding - 30, 15, 3);
        
        ctx.fillStyle = '#212121';
        ctx.fillText(`${label2} (${unit})`, padding + 150, padding - 20);
        ctx.fillStyle = '#FF9800';
        ctx.fillRect(padding + 130, padding - 30, 15, 3);
    }

    updateHealthStatus(inspections, manholeId) {
        const manhole = this.data.manholes.find(m => m.id == manholeId);
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

    openMasterModal() {
        document.getElementById('master-modal').classList.add('active');
        this.updateMasterList();
    }

    closeMasterModal() {
        document.getElementById('master-modal').classList.remove('active');
    }

    openExportModal() {
        document.getElementById('export-modal').classList.add('active');
        this.initializePrintYearOptions();
    }

    initializePrintYearOptions() {
        const yearSelect = document.getElementById('print-year');
        const currentYear = new Date().getFullYear();
        const years = [];
        
        // 過去5年から未来2年まで
        for (let year = currentYear - 5; year <= currentYear + 2; year++) {
            years.push(year);
        }
        
        yearSelect.innerHTML = years.map(year => 
            `<option value="${year}" ${year === currentYear ? 'selected' : ''}>${year}年</option>`
        ).join('');
        
        // 現在の月を選択
        const currentMonth = new Date().getMonth() + 1;
        document.getElementById('print-month').value = currentMonth;
    }

    closeExportModal() {
        document.getElementById('export-modal').classList.remove('active');
    }

    updateMasterList() {
        const masterList = document.getElementById('master-list');
        
        masterList.innerHTML = this.data.manholes.map(manhole => `
            <div class="master-item">
                <div class="master-item-header">
                    <div class="master-item-name">${manhole.name}</div>
                    <div class="master-item-actions">
                        <button class="btn btn-secondary" onclick="app.editManhole(${manhole.id})">編集</button>
                        <button class="btn btn-secondary" onclick="app.deleteManhole(${manhole.id})">削除</button>
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
        this.openManholeEditForm();
    }

    editManhole(manholeId) {
        const manhole = this.data.manholes.find(m => m.id === manholeId);
        if (!manhole) return;

        this.openManholeEditForm(manhole);
    }

    openManholeEditForm(manhole = null) {
        const modal = document.getElementById('manhole-edit-modal');
        const form = document.getElementById('manhole-edit-form');
        const title = document.getElementById('manhole-form-title');
        
        // フォームを先にリセット
        form.reset();
        
        if (manhole) {
            // 編集モード
            title.textContent = 'マンホール編集';
            document.getElementById('edit-manhole-name').value = manhole.name;
            document.getElementById('rated-current-1').value = manhole.ratedCurrent1;
            document.getElementById('rated-current-2').value = manhole.ratedCurrent2;
            document.getElementById('output-kw-1').value = manhole.outputKw1;
            document.getElementById('output-kw-2').value = manhole.outputKw2;
            document.getElementById('latitude').value = manhole.latitude || '';
            document.getElementById('longitude').value = manhole.longitude || '';
            form.dataset.manholeId = manhole.id;
        } else {
            // 新規追加モード
            title.textContent = '新規マンホール追加';
            document.getElementById('edit-manhole-name').value = '';
            document.getElementById('rated-current-1').value = '15.0';
            document.getElementById('rated-current-2').value = '15.0';
            document.getElementById('output-kw-1').value = '7.5';
            document.getElementById('output-kw-2').value = '7.5';
            document.getElementById('latitude').value = '';
            document.getElementById('longitude').value = '';
            form.dataset.manholeId = '';
        }
        
        modal.classList.add('active');
    }

    closeManholeEditForm() {
        const modal = document.getElementById('manhole-edit-modal');
        const form = document.getElementById('manhole-edit-form');
        
        // フォームをリセットしてデータをクリア
        form.reset();
        form.dataset.manholeId = '';
        
        modal.classList.remove('active');
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
            latitude: formData.get('latitude') ? parseFloat(formData.get('latitude')) : null,
            longitude: formData.get('longitude') ? parseFloat(formData.get('longitude')) : null
        };

        // バリデーション
        if (!manholeData.name) {
            alert('マンホール名を入力してください');
            return false;
        }

        if (isNaN(manholeData.ratedCurrent1) || isNaN(manholeData.ratedCurrent2) || 
            isNaN(manholeData.outputKw1) || isNaN(manholeData.outputKw2)) {
            alert('数値を正しく入力してください');
            return false;
        }

        if (isEdit) {
            const manhole = this.data.manholes.find(m => m.id == manholeId);
            if (manhole) {
                Object.assign(manhole, manholeData);
            }
        } else {
            manholeData.id = Date.now();
            this.data.manholes.push(manholeData);
        }

        this.saveData();
        this.updateMasterList();
        this.populateManholeSelects();
        this.updateMapDisplay();
        this.closeManholeEditForm();
        return true;
    }

    deleteManhole(manholeId) {
        if (!confirm('このマンホールを削除しますか？関連する点検データも削除されます。')) {
            return;
        }

        this.data.manholes = this.data.manholes.filter(m => m.id !== manholeId);
        this.data.inspections = this.data.inspections.filter(i => i.manholeId != manholeId);
        
        this.saveData();
        this.updateMasterList();
        this.populateManholeSelects();
        this.updateMapDisplay();
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

        const csvContent = csvData.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
        const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `マンホールポンプ点検データ_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        
        this.closeExportModal();
    }

    exportBackup() {
        const backupData = {
            version: '1.0',
            exportDate: new Date().toISOString(),
            data: this.data
        };

        const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `マンホールポンプ点検バックアップ_${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        
        this.closeExportModal();
    }

    editInspection(inspectionId) {
        const inspection = this.data.inspections.find(i => i.id == inspectionId);
        if (!inspection) return;

        this.switchTab('inspection');
        this.populateFormWithInspection(inspection);
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

    populateFormWithInspection(inspection) {
        document.getElementById('manhole-name').value = inspection.manholeId;
        document.getElementById('inspection-date').value = inspection.inspectionDate;
        document.getElementById('inspector').value = inspection.inspector;
        
        if (inspection.no1Hour) document.getElementById('no1-hour').value = inspection.no1Hour;
        if (inspection.no2Hour) document.getElementById('no2-hour').value = inspection.no2Hour;
        
        if (inspection['operation-mode']) {
            document.querySelector(`input[name="operation-mode"][value="${inspection['operation-mode']}"]`).checked = true;
        }
        if (inspection['pump-selection']) {
            document.querySelector(`input[name="pump-selection"][value="${inspection['pump-selection']}"]`).checked = true;
        }
        
        if (inspection.voltage) document.getElementById('voltage').value = inspection.voltage;
        if (inspection.no1Current) document.getElementById('no1-current').value = inspection.no1Current;
        if (inspection.no2Current) document.getElementById('no2-current').value = inspection.no2Current;
        
        if (inspection.operationWaterLevel) {
            document.getElementById('operation-water-level').value = inspection.operationWaterLevel;
            document.getElementById('operation-water-level-unit').value = inspection.operationWaterLevelUnit || 'm';
        }
        if (inspection.abnormalWaterLevel) {
            document.getElementById('abnormal-water-level').value = inspection.abnormalWaterLevel;
            document.getElementById('abnormal-water-level-unit').value = inspection.abnormalWaterLevelUnit || 'm';
        }
        
        if (inspection.remarks) document.getElementById('remarks').value = inspection.remarks;
        
        const checkboxFields = [
            'operation-status', 'water-level-device', 'manhole-cover-appearance', 'manhole-cover-installation',
            'water-level-abnormal', 'scum-occurrence', 'sewage-volume', 'sludge-accumulation',
            'control-panel-installation', 'control-panel-internal', 'instruments-status',
            'notification-device', 'hh-frikuto'
        ];
        
        checkboxFields.forEach(field => {
            if (inspection[field]) {
                const radio = document.querySelector(`input[name="${field}"][value="${inspection[field]}"]`);
                if (radio) radio.checked = true;
            }
        });
        
        if (inspection.photos && inspection.photos.length > 0) {
            this.currentPhotos = [...inspection.photos];
            const preview = document.getElementById('photo-preview');
            preview.innerHTML = inspection.photos.map(photo => `
                <div class="photo-item">
                    <img src="${photo.data}" alt="${photo.name}">
                    <button class="delete-btn" onclick="app.removePhoto('${photo.id}')">&times;</button>
                </div>
            `).join('');
        }
        
        this.onManholeChange(inspection.manholeId);
    }

    cancelEdit() {
        this.currentEditingId = null;
        this.clearForm();
        
        const submitBtn = document.querySelector('#inspection-form button[type="submit"]');
        submitBtn.textContent = '点検データを保存';
        submitBtn.style.backgroundColor = '';
        
        const cancelBtn = document.querySelector('.form-actions .btn-secondary:last-child');
        if (cancelBtn && cancelBtn.textContent === '編集キャンセル') {
            cancelBtn.remove();
        }
        
        document.querySelector('header h1').textContent = 'マンホールポンプ点検';
    }

    deleteInspection(inspectionId) {
        const inspection = this.data.inspections.find(i => i.id == inspectionId);
        if (!inspection) return;
        
        const manhole = this.data.manholes.find(m => m.id == inspection.manholeId);
        const manholeName = manhole ? manhole.name : '不明';
        
        if (!confirm(`${manholeName} の ${inspection.inspectionDate} の点検データを削除しますか？\nこの操作は取り消せません。`)) {
            return;
        }
        
        this.data.inspections = this.data.inspections.filter(i => i.id != inspectionId);
        this.saveData();
        this.updateHistoryDisplay();
        
        alert('点検データを削除しました');
    }

    showAlert(title, type = 'info', message = '') {
        const alertContainer = document.getElementById('alert-container');
        const alertId = Date.now();
        
        const alertElement = document.createElement('div');
        alertElement.className = `alert alert-${type}`;
        alertElement.id = `alert-${alertId}`;
        alertElement.innerHTML = `
            <div>
                <strong>${title}</strong>
                ${message ? `<br><small>${message}</small>` : ''}
            </div>
            <button class="alert-close" onclick="app.closeAlert('${alertId}')">&times;</button>
        `;
        
        alertContainer.appendChild(alertElement);
        
        if (type === 'error') {
            navigator.vibrate && navigator.vibrate([200, 100, 200]);
        }
        
        setTimeout(() => {
            this.closeAlert(alertId);
        }, 5000);
    }

    closeAlert(alertId) {
        const alertElement = document.getElementById(`alert-${alertId}`);
        if (alertElement) {
            alertElement.remove();
        }
    }

    setupVoiceInputListeners() {
        document.querySelectorAll('.voice-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.startVoiceInput(e.target.dataset.target);
            });
        });
    }

    initializeVoiceRecognition() {
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            this.recognition = new SpeechRecognition();
            this.recognition.lang = 'ja-JP';
            this.recognition.continuous = false;
            this.recognition.interimResults = false;
            
            this.recognition.onresult = (event) => {
                const result = event.results[0][0].transcript;
                const targetInput = document.getElementById(this.voiceTarget);
                if (targetInput) {
                    // より詳細な数値変換
                    let processedResult = this.processVoiceResult(result);
                    if (processedResult) {
                        targetInput.value = processedResult;
                        targetInput.dispatchEvent(new Event('input'));
                        this.showAlert('音声入力が完了しました', 'success', `認識結果: ${result} → ${processedResult}`);
                    } else {
                        this.showAlert('数値を認識できませんでした', 'warning', `認識結果: ${result}`);
                    }
                }
                this.stopVoiceInput();
            };
            
            this.recognition.onerror = () => {
                this.stopVoiceInput();
                this.showAlert('音声認識に失敗しました', 'error');
            };
        }
    }

    processVoiceResult(result) {
        // 日本語の数字を数値に変換
        let processed = result.toLowerCase()
            .replace(/てん|ポイント/g, '.')
            .replace(/ゼロ|れい/g, '0')
            .replace(/いち|ひとつ/g, '1')
            .replace(/に/g, '2')
            .replace(/さん/g, '3')
            .replace(/よん|し/g, '4')
            .replace(/ご/g, '5')
            .replace(/ろく/g, '6')
            .replace(/なな|しち/g, '7')
            .replace(/はち/g, '8')
            .replace(/きゅう|く/g, '9')
            .replace(/じゅう/g, '10')
            .replace(/ひゃく/g, '100')
            .replace(/せん/g, '1000');

        // 数値パターンを抽出
        const numbers = processed.match(/[\d.]+/);
        return numbers ? numbers[0] : null;
    }

    startVoiceInput(targetId) {
        if (!this.recognition) {
            this.showAlert('音声認識がサポートされていません', 'warning');
            return;
        }
        
        this.voiceTarget = targetId;
        const btn = document.querySelector(`[data-target="${targetId}"]`);
        btn.classList.add('listening');
        
        this.recognition.start();
    }

    stopVoiceInput() {
        if (this.recognition) {
            this.recognition.stop();
        }
        document.querySelectorAll('.voice-btn').forEach(btn => {
            btn.classList.remove('listening');
        });
    }

    initializeMap() {
        // 地図タブが最初に表示されるまで初期化を遅延
        this.mapInitialized = false;
        this.markers = [];
        this.populateMapSelects();
    }

    ensureMapInitialized() {
        if (this.mapInitialized || !document.getElementById('map')) {
            return;
        }

        try {
            // Leafletが読み込まれているかチェック
            if (typeof L === 'undefined') {
                console.warn('Leaflet library not loaded yet');
                return;
            }

            this.map = L.map('map').setView([35.6762, 139.6503], 12);
            
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap contributors',
                maxZoom: 19
            }).addTo(this.map);

            this.mapInitialized = true;
            console.log('Map initialized successfully');
            
            // 既存のマンホールを表示
            setTimeout(() => {
                this.updateMapDisplay();
            }, 100);
            
        } catch (error) {
            console.error('Map initialization failed:', error);
            const mapElement = document.getElementById('map');
            if (mapElement) {
                mapElement.innerHTML = '<div style="padding: 20px; text-align: center; color: #666;">地図の初期化に失敗しました。<br>ページを再読み込みしてください。</div>';
            }
        }
    }

    populateMapSelects() {
        const mapSelect = document.getElementById('map-manhole');
        mapSelect.innerHTML = '<option value="">全て表示</option>';
        
        this.data.manholes.forEach(manhole => {
            const option = document.createElement('option');
            option.value = manhole.id;
            option.textContent = manhole.name;
            mapSelect.appendChild(option);
        });
    }

    updateMapDisplay() {
        if (!this.mapInitialized || !this.map) {
            this.ensureMapInitialized();
            setTimeout(() => this.updateMapDisplay(), 100);
            return;
        }

        // 既存のマーカーを削除
        this.markers.forEach(marker => {
            this.map.removeLayer(marker);
        });
        this.markers = [];

        const selectedId = document.getElementById('map-manhole').value;
        const manholes = selectedId ? 
            this.data.manholes.filter(m => m.id == selectedId) : 
            this.data.manholes;

        manholes.forEach(manhole => {
            if (manhole.latitude && manhole.longitude) {
                const marker = L.marker([manhole.latitude, manhole.longitude])
                    .addTo(this.map)
                    .bindPopup(`
                        <div>
                            <h3>${manhole.name}</h3>
                            <p><strong>緯度:</strong> ${manhole.latitude.toFixed(6)}</p>
                            <p><strong>経度:</strong> ${manhole.longitude.toFixed(6)}</p>
                            <p><strong>定格電流:</strong> ${manhole.ratedCurrent1}A / ${manhole.ratedCurrent2}A</p>
                            <p><strong>出力:</strong> ${manhole.outputKw1}kW / ${manhole.outputKw2}kW</p>
                            <button onclick="app.startInspectionFromMap(${manhole.id})" class="btn btn-primary" style="margin-top: 8px;">点検開始</button>
                        </div>
                    `);
                
                this.markers.push(marker);
            }
        });

        if (manholes.length > 0 && manholes[0].latitude) {
            this.map.setView([manholes[0].latitude, manholes[0].longitude], 14);
        }
    }

    getCurrentLocation() {
        if (!navigator.geolocation) {
            this.showAlert('位置情報がサポートされていません', 'warning');
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;
                
                this.ensureMapInitialized();
                
                if (this.mapInitialized && this.map) {
                    this.map.setView([lat, lng], 16);
                    
                    // 現在地マーカーを追加
                    const currentLocationIcon = L.divIcon({
                        html: '<div style="background-color: #ff0000; width: 16px; height: 16px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 4px rgba(0,0,0,0.3);"></div>',
                        iconSize: [20, 20],
                        className: 'current-location-marker'
                    });
                    
                    const currentMarker = L.marker([lat, lng], { icon: currentLocationIcon })
                        .addTo(this.map)
                        .bindPopup('現在地');
                    
                    this.markers.push(currentMarker);
                }
                
                // 緯度経度の入力フィールドに自動入力
                document.getElementById('manual-latitude').value = lat.toFixed(6);
                document.getElementById('manual-longitude').value = lng.toFixed(6);
                
                this.showAlert('現在地を取得しました', 'success', `緯度: ${lat.toFixed(6)}, 経度: ${lng.toFixed(6)}`);
            },
            (error) => {
                this.showAlert('位置情報の取得に失敗しました', 'error', error.message);
            }
        );
    }

    addLocationToManhole() {
        const manholeId = document.getElementById('map-manhole').value;
        if (!manholeId) {
            this.showAlert('マンホールを選択してください', 'warning');
            return;
        }

        const latitude = parseFloat(document.getElementById('manual-latitude').value);
        const longitude = parseFloat(document.getElementById('manual-longitude').value);

        if (isNaN(latitude) || isNaN(longitude)) {
            this.showAlert('有効な緯度経度を入力してください', 'warning');
            return;
        }

        // 緯度経度の範囲チェック
        if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
            this.showAlert('緯度は-90～90、経度は-180～180の範囲で入力してください', 'warning');
            return;
        }

        const manhole = this.data.manholes.find(m => m.id == manholeId);
        if (manhole) {
            manhole.latitude = latitude;
            manhole.longitude = longitude;
            this.saveData();
            this.updateMapDisplay();
            this.updateMasterList();
            this.showAlert('位置情報を追加しました', 'success', 
                `${manhole.name}: ${latitude.toFixed(7)}, ${longitude.toFixed(7)}`);
            
            // 入力フィールドをクリア
            document.getElementById('manual-latitude').value = '';
            document.getElementById('manual-longitude').value = '';
        }
    }

    goToManualLocation() {
        const latitude = parseFloat(document.getElementById('manual-latitude').value);
        const longitude = parseFloat(document.getElementById('manual-longitude').value);

        if (isNaN(latitude) || isNaN(longitude)) {
            this.showAlert('有効な緯度経度を入力してください', 'warning');
            return;
        }

        if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
            this.showAlert('緯度は-90～90、経度は-180～180の範囲で入力してください', 'warning');
            return;
        }

        this.ensureMapInitialized();
        
        if (this.mapInitialized && this.map) {
            this.map.setView([latitude, longitude], 16);
            
            // 一時的なマーカーを追加
            const tempMarker = L.marker([latitude, longitude])
                .addTo(this.map)
                .bindPopup(`指定位置<br>緯度: ${latitude.toFixed(6)}<br>経度: ${longitude.toFixed(6)}`)
                .openPopup();
            
            this.markers.push(tempMarker);
            this.showAlert('指定位置に移動しました', 'success');
        }
    }

    generateQRForSelected() {
        const manholeId = document.getElementById('map-manhole').value;
        if (!manholeId) {
            this.showAlert('マンホールを選択してください', 'warning');
            return;
        }

        const manhole = this.data.manholes.find(m => m.id == manholeId);
        if (manhole) {
            this.generateQRCode(manhole);
        }
    }

    generateAllQRCodes() {
        const display = document.getElementById('qr-display');
        display.innerHTML = '';
        
        this.data.manholes.forEach(manhole => {
            this.generateQRCode(manhole);
        });
    }

    generateQRCode(manhole) {
        const qrData = JSON.stringify({
            type: 'manhole',
            id: manhole.id,
            name: manhole.name,
            timestamp: new Date().toISOString()
        });

        const canvas = document.createElement('canvas');
        QRCode.toCanvas(canvas, qrData, { width: 200 }, (error) => {
            if (error) {
                this.showAlert('QRコード生成に失敗しました', 'error');
                return;
            }

            const qrItem = document.createElement('div');
            qrItem.className = 'qr-item';
            qrItem.innerHTML = `
                <h4>${manhole.name}</h4>
                <div></div>
                <button class="btn btn-secondary download-btn" onclick="app.downloadQR('${manhole.name}', '${canvas.toDataURL()}')">
                    ダウンロード
                </button>
            `;
            
            qrItem.querySelector('div').appendChild(canvas);
            document.getElementById('qr-display').appendChild(qrItem);
        });
    }

    downloadQR(name, dataURL) {
        const link = document.createElement('a');
        link.download = `${name}_QRコード.png`;
        link.href = dataURL;
        link.click();
    }

    openQRScanner() {
        document.getElementById('qr-scan-modal').classList.add('active');
        
        if (typeof QrScanner !== 'undefined') {
            const video = document.getElementById('qr-video');
            this.qrScanner = new QrScanner(video, result => {
                this.handleQRScanResult(result);
            });
            this.qrScanner.start();
        } else {
            document.getElementById('qr-result').innerHTML = '<p>QRスキャナーが利用できません</p>';
        }
    }

    closeQRScanner() {
        document.getElementById('qr-scan-modal').classList.remove('active');
        if (this.qrScanner) {
            this.qrScanner.stop();
            this.qrScanner = null;
        }
    }

    handleQRScanResult(result) {
        try {
            const data = JSON.parse(result);
            if (data.type === 'manhole' && data.id) {
                this.closeQRScanner();
                this.switchTab('inspection');
                document.getElementById('manhole-name').value = data.id;
                this.onManholeChange(data.id);
                this.showAlert('QRコードを読み取りました', 'success', data.name);
            }
        } catch (error) {
            this.showAlert('QRコードの読み取りに失敗しました', 'error');
        }
    }

    setupAutoBackup() {
        this.backupInterval = setInterval(() => {
            this.autoBackup();
        }, 30 * 60 * 1000); // 30分ごと
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

    async importBackup(file) {
        if (!file) return;

        try {
            const text = await file.text();
            const backupData = JSON.parse(text);
            
            if (!backupData.data || !backupData.version) {
                throw new Error('無効なバックアップファイルです');
            }

            if (confirm('現在のデータが上書きされます。復元を実行しますか？')) {
                this.data = backupData.data;
                this.saveData();
                this.populateManholeSelects();
                this.populateMapSelects();
                
                if (this.currentTab === 'history') {
                    this.updateHistoryDisplay();
                } else if (this.currentTab === 'map') {
                    this.updateMapDisplay();
                }
                
                this.showAlert('バックアップを復元しました', 'success');
            }
        } catch (error) {
            this.showAlert('バックアップの復元に失敗しました', 'error', error.message);
        }
    }

    startInspectionFromMap(manholeId) {
        this.switchTab('inspection');
        document.getElementById('manhole-name').value = manholeId;
        this.onManholeChange(manholeId);
        this.showAlert('点検を開始します', 'success');
    }

    async registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            try {
                await navigator.serviceWorker.register('./sw.js');
                console.log('Service Worker registered successfully');
            } catch (error) {
                console.error('Service Worker registration failed:', error);
            }
        }
    }

    getMonthlyInspections() {
        const year = parseInt(document.getElementById('print-year').value);
        const month = parseInt(document.getElementById('print-month').value);
        
        return this.data.inspections.filter(inspection => {
            const date = new Date(inspection.inspectionDate);
            return date.getFullYear() === year && date.getMonth() + 1 === month;
        });
    }

    generateMonthlyReportHTML() {
        const year = parseInt(document.getElementById('print-year').value);
        const month = parseInt(document.getElementById('print-month').value);
        const inspections = this.getMonthlyInspections();
        
        if (inspections.length === 0) {
            alert(`${year}年${month}月の点検データがありません。`);
            return '';
        }

        // マンホール別にグループ化
        const groupedInspections = {};
        inspections.forEach(inspection => {
            const manhole = this.data.manholes.find(m => m.id == inspection.manholeId);
            const manholeName = manhole ? manhole.name : `不明なマンホール(ID: ${inspection.manholeId})`;
            
            if (!groupedInspections[manholeName]) {
                groupedInspections[manholeName] = [];
            }
            groupedInspections[manholeName].push({...inspection, manholeName});
        });

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
                                <span class="print-detail-value">${inspection.operationMode || '-'}</span>
                            </div>
                            <div class="print-detail-item">
                                <span class="print-detail-label">ポンプ選択:</span>
                                <span class="print-detail-value">${inspection.pumpSelection || '-'}</span>
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

    printMonthlyReport() {
        const year = parseInt(document.getElementById('print-year').value);
        const month = parseInt(document.getElementById('print-month').value);
        const reportHTML = this.generateMonthlyReportHTML();
        
        if (!reportHTML) return;

        // 期間表示を設定
        document.getElementById('print-period').textContent = `${year}年${month}月の点検履歴`;
        
        // コンテンツを設定
        document.getElementById('print-content').innerHTML = reportHTML;
        
        // 印刷レイアウトを表示
        const printLayout = document.getElementById('monthly-print-layout');
        printLayout.classList.add('printing');
        
        // 印刷実行
        setTimeout(() => {
            window.print();
            
            // 印刷後にレイアウトを非表示
            setTimeout(() => {
                printLayout.classList.remove('printing');
            }, 1000);
        }, 100);
    }

    async generateMonthlyPDF() {
        const year = parseInt(document.getElementById('print-year').value);
        const month = parseInt(document.getElementById('print-month').value);
        const reportHTML = this.generateMonthlyReportHTML();
        
        if (!reportHTML) return;

        try {
            if (!window.jspdf) {
                alert('PDFライブラリが読み込まれていません。ページを再読み込みしてください。');
                return;
            }
            
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a4'
            });

            // フォント設定（日本語対応）
            doc.setFont('helvetica');
            
            // タイトル
            doc.setFontSize(16);
            doc.text(`マンホールポンプ点検履歴 ${year}年${month}月`, 105, 20, { align: 'center' });
            
            const inspections = this.getMonthlyInspections();
            const groupedInspections = {};
            
            inspections.forEach(inspection => {
                const manhole = this.data.manholes.find(m => m.id == inspection.manholeId);
                const manholeName = manhole ? manhole.name : `不明なマンホール(ID: ${inspection.manholeId})`;
                
                if (!groupedInspections[manholeName]) {
                    groupedInspections[manholeName] = [];
                }
                groupedInspections[manholeName].push({...inspection, manholeName});
            });

            let yPosition = 40;
            const pageHeight = 280;
            
            Object.keys(groupedInspections).forEach(manholeName => {
                const manholeInspections = groupedInspections[manholeName];
                
                // ページ改行チェック
                if (yPosition > pageHeight - 60) {
                    doc.addPage();
                    yPosition = 20;
                }
                
                // マンホール名
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
                    
                    // 点検日・担当者
                    doc.text(`${inspection.inspectionDate} - ${inspection.inspector || '未記入'}`, 15, yPosition);
                    yPosition += 6;
                    
                    // 基本情報
                    const basicInfo = [
                        `運転: ${inspection.operationMode || '-'}`,
                        `ポンプ: ${inspection.pumpSelection || '-'}`,
                        `電圧: ${inspection.voltage || '-'}V`,
                        `No1電流: ${inspection.no1Current || '-'}A`,
                        `No2電流: ${inspection.no2Current || '-'}A`
                    ];
                    
                    doc.text(basicInfo.join(' / '), 15, yPosition);
                    yPosition += 6;
                    
                    // ステータス
                    const statusItems = this.getStatusItems(inspection);
                    const goodCount = statusItems.filter(item => item.value === '良').length;
                    const badCount = statusItems.filter(item => item.value === '否').length;
                    
                    doc.text(`点検項目 - 良: ${goodCount}件, 否: ${badCount}件`, 15, yPosition);
                    yPosition += 6;
                    
                    // 特記事項
                    if (inspection.remarks) {
                        doc.text(`特記: ${inspection.remarks}`, 15, yPosition);
                        yPosition += 6;
                    }
                    
                    yPosition += 3; // 間隔
                });
                
                yPosition += 5; // マンホール間の間隔
            });

            // PDF保存
            doc.save(`マンホール点検履歴_${year}年${month}月.pdf`);
            
        } catch (error) {
            console.error('PDF生成エラー:', error);
            alert('PDF生成中にエラーが発生しました。');
        }
    }
}

const app = new ManholeInspectionApp();