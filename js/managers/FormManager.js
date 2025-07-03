class FormManager {
    constructor(uiManager) {
        this.uiManager = uiManager;
    }

    initializeForm() {
        // 現在の日付を設定
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('inspection-date').value = today;
        
        // マンホール選択肢を設定
        this.populateManholeSelects();
        
        // 点検者選択肢を設定
        this.populateInspectorSelect();
    }

    populateManholeSelects() {
        const manholes = this.uiManager.app.dataManager.getManholes();
        
        if (!manholes || manholes.length === 0) {
            console.error('No manholes data available');
            return;
        }
        
        // 点検入力タブのマンホール選択肢
        const manholeSelect = document.getElementById('manhole-name');
        if (manholeSelect) {
            manholeSelect.innerHTML = '<option value="">マンホールを選択</option>';
            manholes.forEach(manhole => {
                const option = document.createElement('option');
                option.value = manhole.id;
                option.textContent = manhole.name;
                manholeSelect.appendChild(option);
            });
        }
        
        // 点検履歴タブのマンホール選択肢
        const historyManholeSelect = document.getElementById('history-manhole');
        if (historyManholeSelect) {
            historyManholeSelect.innerHTML = '<option value="">全て</option>';
            manholes.forEach(manhole => {
                const option = document.createElement('option');
                option.value = manhole.id;
                option.textContent = manhole.name;
                historyManholeSelect.appendChild(option);
            });
        }
        
        // グラフタブのマンホール選択肢
        const graphManholeSelect = document.getElementById('graph-manhole');
        if (graphManholeSelect) {
            graphManholeSelect.innerHTML = '<option value="">選択してください</option>';
            manholes.forEach(manhole => {
                const option = document.createElement('option');
                option.value = manhole.id;
                option.textContent = manhole.name;
                graphManholeSelect.appendChild(option);
            });
        }
        
        // 地図タブのマンホール選択肢
        const mapManholeSelect = document.getElementById('map-manhole');
        if (mapManholeSelect) {
            mapManholeSelect.innerHTML = '<option value="">全て表示</option>';
            manholes.forEach(manhole => {
                const option = document.createElement('option');
                option.value = manhole.id;
                option.textContent = manhole.name;
                mapManholeSelect.appendChild(option);
            });
        }
    }

    populateInspectorSelect() {
        const inspectors = this.uiManager.app.dataManager.getInspectors();
        const inspectorSelect = document.getElementById('inspector');
        
        if (!inspectorSelect) {
            console.error('inspector element not found');
            return;
        }
        
        inspectorSelect.innerHTML = '<option value="">点検者を選択</option>';
        inspectors.forEach(inspector => {
            const option = document.createElement('option');
            option.value = inspector.name;
            option.textContent = inspector.name;
            inspectorSelect.appendChild(option);
        });
    }

    getFormData() {
        const formData = {
            id: this.uiManager.currentEditingId || Date.now(),
            inspectionDate: document.getElementById('inspection-date').value,
            manholeId: document.getElementById('manhole-name').value,
            manholeName: document.getElementById('manhole-name').selectedOptions[0]?.textContent || '',
            inspector: document.getElementById('inspector').value,
            
            // 電気系統データ（固定項目）
            voltage: document.getElementById('voltage')?.value || '',
            no1Current: document.getElementById('no1-current')?.value || '',
            no2Current: document.getElementById('no2-current')?.value || '',
            
            memo: document.getElementById('memo')?.value || '',
            photos: this.uiManager.photoManager.getCurrentPhotos(),
            
            // 動的点検項目
            customItems: this.getCustomItemsData(),
            
            timestamp: new Date().toISOString()
        };
        
        return formData;
    }

    getCustomItemsData() {
        const customItems = [];
        const dynamicContainer = document.getElementById('dynamic-inspection-items');
        
        if (dynamicContainer) {
            const itemContainers = dynamicContainer.querySelectorAll('.dynamic-item');
            itemContainers.forEach(container => {
                const itemId = container.dataset.itemId;
                const itemName = container.dataset.itemName;
                const itemType = container.dataset.itemType;
                
                let value = null;
                
                if (itemType === 'checkbox') {
                    const checkbox = container.querySelector('input[type="checkbox"]');
                    value = checkbox ? checkbox.checked : false;
                } else if (itemType === 'selection') {
                    const select = container.querySelector('select');
                    value = select ? select.value : '';
                } else if (itemType === 'numeric') {
                    const input = container.querySelector('input[type="number"]');
                    value = input ? parseFloat(input.value) || 0 : 0;
                } else if (itemType === 'text') {
                    const textarea = container.querySelector('textarea');
                    value = textarea ? textarea.value : '';
                }
                
                customItems.push({
                    id: itemId,
                    name: itemName,
                    type: itemType,
                    value: value
                });
            });
        }
        
        return customItems;
    }

    validateForm() {
        const formData = this.getFormData();
        
        if (!formData.inspectionDate) {
            this.uiManager.showAlert('点検日を入力してください', 'error');
            return false;
        }
        
        if (!formData.manholeId) {
            this.uiManager.showAlert('マンホールを選択してください', 'error');
            return false;
        }
        
        if (!formData.inspector) {
            this.uiManager.showAlert('点検者を選択してください', 'error');
            return false;
        }
        
        // 動的点検項目の必須項目確認
        if (formData.customItems && formData.customItems.length > 0) {
            for (const customItem of formData.customItems) {
                // 必須項目かどうかは動的項目のコンテナから判定
                const container = document.querySelector(`[data-item-id="${customItem.id}"]`);
                if (container && container.classList.contains('required')) {
                    if (customItem.type === 'checkbox' && !customItem.value) {
                        this.uiManager.showAlert(`${customItem.name} の確認が必要です`, 'error');
                        return false;
                    } else if (customItem.type !== 'checkbox' && (!customItem.value || customItem.value === '')) {
                        this.uiManager.showAlert(`${customItem.name} の入力が必要です`, 'error');
                        return false;
                    }
                }
            }
        }
        
        return true;
    }

    clearForm() {
        document.getElementById('inspection-form').reset();
        
        // 現在の日付を再設定
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('inspection-date').value = today;
        
        // 写真をクリア
        this.uiManager.photoManager.clearPhotos();
        
        // 動的項目をクリア
        this.clearDynamicInspectionItems();
        
        // 編集IDをクリア
        this.uiManager.currentEditingId = null;
        
        console.log('フォームをクリアしました');
    }

    onManholeChange() {
        const manholeSelect = document.getElementById('manhole-name');
        const selectedManholeId = manholeSelect.value;
        
        if (selectedManholeId) {
            // マンホールマスタ情報を表示
            this.displayManholeReferenceInfo(selectedManholeId);
            
            // 過去の点検データを表示
            this.displayPreviousData(selectedManholeId);
            
            // 動的点検項目を生成
            this.generateDynamicInspectionItems(selectedManholeId);
            
            // マンホール情報を地図で表示
            if (this.uiManager.app.mapManager) {
                this.uiManager.app.mapManager.highlightManhole(selectedManholeId);
            }
        } else {
            // 動的項目をクリア
            this.clearDynamicInspectionItems();
            this.clearManholeReferenceInfo();
        }
    }

    displayManholeReferenceInfo(manholeId) {
        const manhole = this.uiManager.app.dataManager.getManhole(manholeId);
        if (!manhole) return;

        // 電流入力欄の下に参考情報を表示
        this.addReferenceInfo('no1-current', `定格電流: ${manhole.ratedCurrent1}A${manhole.currentWarningRange1 ? ` (警告範囲: ${manhole.currentWarningRange1.min}A～${manhole.currentWarningRange1.max}A)` : ''}`);
        this.addReferenceInfo('no2-current', `定格電流: ${manhole.ratedCurrent2}A${manhole.currentWarningRange2 ? ` (警告範囲: ${manhole.currentWarningRange2.min}A～${manhole.currentWarningRange2.max}A)` : ''}`);
        
        // 出力kW情報も表示（フォームにある場合）
        const no1PowerElement = document.getElementById('no1-power');
        const no2PowerElement = document.getElementById('no2-power');
        
        if (no1PowerElement) {
            this.addReferenceInfo('no1-power', `定格出力: ${manhole.outputKw1}kW`);
        }
        if (no2PowerElement) {
            this.addReferenceInfo('no2-power', `定格出力: ${manhole.outputKw2}kW`);
        }
    }

    addReferenceInfo(inputId, infoText) {
        const inputElement = document.getElementById(inputId);
        if (!inputElement) return;

        // 既存の参考情報を削除
        const existingInfo = inputElement.parentElement.querySelector('.reference-info');
        if (existingInfo) {
            existingInfo.remove();
        }

        // 新しい参考情報を追加
        const infoElement = document.createElement('div');
        infoElement.className = 'reference-info';
        infoElement.textContent = infoText;
        
        // input要素の後に挿入
        inputElement.parentElement.appendChild(infoElement);
    }

    clearManholeReferenceInfo() {
        // すべての参考情報を削除
        const referenceInfos = document.querySelectorAll('.reference-info');
        referenceInfos.forEach(info => info.remove());
    }

    displayPreviousData(manholeId) {
        // 過去の点検データを取得して表示
        const previousData = this.uiManager.app.dataManager.getLastInspection(manholeId);
        if (previousData) {
            // 前回の点検データがある場合の処理
            console.log('前回の点検データ:', previousData);
            // 今後の実装で前回データを参考情報として表示
        }
    }

    checkVoltageRange(inputValue) {
        const voltage = parseFloat(inputValue);
        const warningElement = document.getElementById('voltage-warning');
        
        if (voltage && (voltage < 95 || voltage > 107)) {
            if (warningElement) {
                warningElement.textContent = '電圧が正常範囲外です（95-107V）';
            }
        } else if (warningElement) {
            warningElement.textContent = '';
        }
    }

    checkCurrentRange(pumpNumber, inputValue) {
        const manholeSelect = document.getElementById('manhole-name');
        const selectedManholeId = manholeSelect ? manholeSelect.value : null;
        
        if (!selectedManholeId) return;
        
        const manhole = this.uiManager.app.dataManager.getManhole(selectedManholeId);
        if (!manhole) return;
        
        const current = parseFloat(inputValue);
        const warningElement = document.getElementById(`${pumpNumber}-current-warning`);
        
        // マンホールマスタの警告範囲を取得
        const warningRange = pumpNumber === 'no1' ? manhole.currentWarningRange1 : manhole.currentWarningRange2;
        
        if (current && warningRange) {
            const isOutOfRange = current < warningRange.min || current > warningRange.max;
            
            if (isOutOfRange) {
                if (warningElement) {
                    warningElement.textContent = `電流値が警告範囲外です（${warningRange.min}A～${warningRange.max}A）`;
                }
            } else if (warningElement) {
                warningElement.textContent = '';
            }
        } else if (warningElement) {
            warningElement.textContent = '';
        }
    }

    populateFormWithInspection(inspection) {
        // 基本情報
        document.getElementById('inspection-date').value = inspection.inspectionDate;
        document.getElementById('manhole-name').value = inspection.manholeId;
        document.getElementById('inspector').value = inspection.inspector;
        
        // 基本点検項目
        const defaultItems = this.uiManager.getDefaultInspectionItems();
        defaultItems.forEach(item => {
            const element = document.getElementById(item.id);
            if (element) {
                if (item.type === 'checkbox') {
                    element.checked = inspection[item.id] || false;
                } else {
                    element.value = inspection[item.id] || '';
                }
            }
        });
        
        // メモ
        document.getElementById('memo').value = inspection.memo || '';
        
        // 写真
        if (inspection.photos) {
            this.uiManager.photoManager.loadPhotosForEdit(inspection.photos);
        }
        
        // 動的項目を生成してから値を設定
        this.generateDynamicInspectionItems(inspection.manholeId);
        
        // 動的項目の値を設定
        setTimeout(() => {
            if (inspection.customItems) {
                inspection.customItems.forEach(customItem => {
                    const container = document.querySelector(`[data-item-id="${customItem.id}"]`);
                    if (container) {
                        if (customItem.type === 'checkbox') {
                            const checkbox = container.querySelector('input[type="checkbox"]');
                            if (checkbox) checkbox.checked = customItem.value || false;
                        } else if (customItem.type === 'selection') {
                            const select = container.querySelector('select');
                            if (select) select.value = customItem.value || '';
                        } else if (customItem.type === 'numeric') {
                            const input = container.querySelector('input[type="number"]');
                            if (input) input.value = customItem.value || '';
                        } else if (customItem.type === 'text') {
                            const textarea = container.querySelector('textarea');
                            if (textarea) textarea.value = customItem.value || '';
                        }
                    }
                });
            }
        }, 100);
    }

    generateDynamicInspectionItems(manholeId) {
        const container = document.getElementById('dynamic-inspection-items');
        if (!container) {
            console.error('dynamic-inspection-items container not found');
            return;
        }
        
        // 既存の動的項目をクリア
        container.innerHTML = '';
        
        // マンホール固有の点検項目を取得
        const manholeItems = this.uiManager.app.dataManager.getInspectionItemsForManhole(manholeId);
        
        if (manholeItems && manholeItems.length > 0) {
            manholeItems.forEach(item => {
                const itemElement = this.generateDynamicItem(item);
                if (itemElement) {
                    container.appendChild(itemElement);
                } else {
                    console.error('Failed to generate item element for:', item);
                }
            });
            
            // イベントリスナーを設定
            this.setupDynamicItemEventListeners();
        } else {
            // 点検項目がない場合はデフォルトメッセージを表示
            container.innerHTML = `
                <div class="no-inspection-items">
                    <p>このマンホールには点検項目が設定されていません。</p>
                    <p>マンホールマスタで点検項目を追加してください。</p>
                </div>
            `;
        }
    }

    generateDynamicItem(item) {
        const itemContainer = document.createElement('div');
        itemContainer.className = 'dynamic-item';
        itemContainer.dataset.itemId = item.id;
        itemContainer.dataset.itemName = item.name;
        itemContainer.dataset.itemType = item.type;
        
        let inputHtml = '';
        
        switch (item.type) {
            case 'checkbox':
                inputHtml = `
                    <div class="dynamic-checkbox-group">
                        <input type="checkbox" id="dynamic_${item.id}" name="dynamic_${item.id}">
                        <label for="dynamic_${item.id}">${this.escapeHtml(item.name)}</label>
                    </div>
                `;
                break;
                
            case 'selection':
                const options = item.selectionOptions || item.options || ['良好', '要注意', '要修理'];
                inputHtml = `
                    <label for="dynamic_${item.id}">${this.escapeHtml(item.name)}</label>
                    <select id="dynamic_${item.id}" name="dynamic_${item.id}">
                        <option value="">選択してください</option>
                        ${options.map(option => `<option value="${this.escapeHtml(option)}">${this.escapeHtml(option)}</option>`).join('')}
                    </select>
                `;
                break;
                
            case 'numeric':
                const numericSettings = item.numericSettings || {};
                const unit = numericSettings.unit || item.unit || '';
                const decimalPlaces = numericSettings.decimalPlaces || item.decimalPlaces || 2;
                const step = Math.pow(0.1, decimalPlaces);
                
                inputHtml = `
                    <label for="dynamic_${item.id}">${this.escapeHtml(item.name)}</label>
                    <div class="dynamic-numeric-group">
                        <input type="number" id="dynamic_${item.id}" name="dynamic_${item.id}" 
                               min="${item.min || 0}" max="${item.max || 999}" 
                               step="${step}" 
                               onchange="app.uiManager.formManager.checkDynamicNumericWarning(this)">
                        ${unit ? `<span class="dynamic-numeric-unit">${this.escapeHtml(unit)}</span>` : ''}
                    </div>
                `;
                break;
                
            case 'text':
                const maxLength = item.maxLength || (item.textSettings && item.textSettings.maxLength) || 500;
                inputHtml = `
                    <label for="dynamic_${item.id}">${this.escapeHtml(item.name)}</label>
                    <textarea id="dynamic_${item.id}" name="dynamic_${item.id}" 
                              rows="3" maxlength="${maxLength}"
                              oninput="app.uiManager.formManager.updateTextCounter(this)"></textarea>
                    <div class="char-counter">
                        <span class="current">0</span>/<span class="max">${maxLength}</span>
                    </div>
                `;
                break;
                
            default:
                console.warn('Unknown item type:', item.type);
                inputHtml = `
                    <label for="dynamic_${item.id}">${this.escapeHtml(item.name)}</label>
                    <input type="text" id="dynamic_${item.id}" name="dynamic_${item.id}" 
                           placeholder="未対応の項目タイプ: ${item.type}">
                `;
                break;
        }
        
        if (!inputHtml) {
            console.error('Failed to generate input HTML for item:', item);
            return null;
        }
        
        itemContainer.innerHTML = inputHtml;
        
        // 必須項目の場合は表示（カテゴリと必須マークを追加）
        if (item.required) {
            itemContainer.classList.add('required');
        }
        
        // カテゴリがある場合は表示
        if (item.category) {
            const categoryHtml = `<span class="dynamic-item-category">${this.escapeHtml(item.category)}</span>`;
            itemContainer.innerHTML = categoryHtml + itemContainer.innerHTML;
        }
        
        return itemContainer;
    }

    setupDynamicItemEventListeners() {
        // 数値入力の警告チェック
        document.querySelectorAll('.dynamic-item input[type="number"]').forEach(input => {
            input.addEventListener('change', () => {
                this.checkDynamicNumericWarning(input);
            });
        });
        
        // テキストエリアの文字数カウント
        document.querySelectorAll('.dynamic-item textarea').forEach(textarea => {
            textarea.addEventListener('input', () => {
                this.updateTextCounter(textarea);
            });
        });
    }

    checkDynamicNumericWarning(inputElement) {
        const container = inputElement.closest('.dynamic-item');
        const itemId = container.dataset.itemId;
        const value = parseFloat(inputElement.value);
        
        const warningElement = container.querySelector('.warning');
        
        // 項目設定から警告範囲を取得
        const manholeId = document.getElementById('manhole-name').value;
        const manholeItems = this.uiManager.app.dataManager.getInspectionItemsForManhole(manholeId);
        const itemConfig = manholeItems.find(item => item.id === itemId);
        
        if (itemConfig && itemConfig.warningRange) {
            const { min, max } = itemConfig.warningRange;
            
            if (value && (value < min || value > max)) {
                if (!warningElement) {
                    const warning = document.createElement('div');
                    warning.className = 'warning';
                    warning.textContent = `警告範囲外です（${min}-${max}${itemConfig.unit || ''}）`;
                    container.appendChild(warning);
                }
            } else if (warningElement) {
                warningElement.remove();
            }
        }
    }

    updateTextCounter(textareaElement) {
        const container = textareaElement.closest('.dynamic-item');
        const counter = container.querySelector('.char-counter .current');
        
        if (counter) {
            counter.textContent = textareaElement.value.length;
        }
        
        // 最大文字数に近づいたら警告
        const maxLength = parseInt(textareaElement.getAttribute('maxlength'));
        const currentLength = textareaElement.value.length;
        
        if (currentLength > maxLength * 0.9) {
            container.classList.add('near-limit');
        } else {
            container.classList.remove('near-limit');
        }
    }

    clearDynamicInspectionItems() {
        const container = document.getElementById('dynamic-inspection-items');
        if (container) {
            container.innerHTML = `
                <div class="no-manhole-selected">
                    <p>マンホールを選択すると、そのマンホール用の点検項目が表示されます</p>
                </div>
            `;
        }
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}