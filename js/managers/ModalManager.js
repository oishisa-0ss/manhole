class ModalManager {
    constructor(uiManager) {
        this.uiManager = uiManager;
        this.hasShownDataWarning = false;
    }

    openMasterModal() {
        if (!this.hasShownDataWarning) {
            this.showDataPersistenceWarning();
            this.hasShownDataWarning = true;
        }
        
        document.getElementById('master-modal').style.display = 'block';
        this.uiManager.updateMasterList();
        this.uiManager.refreshInspectorMasterList();
    }

    openMasterModalWithInspectorTab() {
        this.openMasterModal();
        this.switchMasterTab('inspector');
    }

    openExportModal() {
        document.getElementById('export-modal').style.display = 'block';
    }

    openInspectorModal() {
        document.getElementById('inspector-modal').style.display = 'block';
        this.uiManager.refreshInspectorList();
    }

    openManholeEditModal(manhole = null) {
        const modal = document.getElementById('manhole-edit-modal');
        const form = document.getElementById('manhole-edit-form');
        const titleElement = document.getElementById('manhole-form-title');
        
        if (!modal || !form) {
            console.error('Manhole edit modal elements not found');
            return;
        }
        
        if (manhole) {
            // 編集モード
            if (titleElement) {
                titleElement.textContent = 'マンホール編集';
            }
            
            // フォーム要素に値を設定
            const formElements = {
                'edit-manhole-name': manhole.name || '',
                'rated-current-1': manhole.ratedCurrent1 || '',
                'rated-current-2': manhole.ratedCurrent2 || '',
                'output-kw-1': manhole.outputKw1 || '',
                'output-kw-2': manhole.outputKw2 || '',
                'current-warning-min-1': manhole.currentWarningMin1 || '',
                'current-warning-max-1': manhole.currentWarningMax1 || '',
                'current-warning-min-2': manhole.currentWarningMin2 || '',
                'current-warning-max-2': manhole.currentWarningMax2 || ''
            };
            
            // 各フォーム要素に値を設定
            Object.entries(formElements).forEach(([id, value]) => {
                const element = document.getElementById(id);
                if (element) {
                    element.value = value;
                }
            });
            
            this.uiManager.currentEditingId = manhole.id;
        } else {
            // 新規作成モード
            if (titleElement) {
                titleElement.textContent = 'マンホール追加';
            }
            form.reset();
            this.uiManager.currentEditingId = null;
        }
        
        modal.style.display = 'block';
        
        // 点検項目のコピー元リストを更新
        if (this.uiManager.populateCopySourceManholes) {
            this.uiManager.populateCopySourceManholes(this.uiManager.currentEditingId);
        }
        
        // 現在のマンホールの点検項目リストを更新
        if (this.uiManager.updateInspectionItemsList && this.uiManager.currentEditingId) {
            this.uiManager.updateInspectionItemsList(this.uiManager.currentEditingId);
        }
    }

    closeManholeEditModal() {
        const modal = document.getElementById('manhole-edit-modal');
        if (modal) {
            modal.style.display = 'none';
            this.clearModalState(modal.id);
        }
    }

    openInspectionItemEditModal(item = null) {
        const modal = document.getElementById('inspection-item-edit-modal');
        const form = document.getElementById('inspection-item-edit-form');
        const titleElement = document.getElementById('inspection-item-form-title');
        
        if (!modal || !form) {
            console.error('Inspection item edit modal elements not found');
            return;
        }
        
        if (item) {
            // 編集モード
            if (titleElement) {
                titleElement.textContent = '点検項目編集';
            }
            
            const nameInput = document.getElementById('item-name');
            const typeSelect = document.getElementById('item-type');
            const requiredCheckbox = document.getElementById('item-required');
            const categoryInput = document.getElementById('item-category');
            
            if (nameInput) nameInput.value = item.name || '';
            if (typeSelect) typeSelect.value = item.type || '';
            if (requiredCheckbox) requiredCheckbox.checked = item.required || false;
            if (categoryInput) categoryInput.value = item.category || '';
            
            this.uiManager.currentEditingInspectionItem = item;
        } else {
            // 新規作成モード
            if (titleElement) {
                titleElement.textContent = '点検項目追加';
            }
            form.reset();
            this.uiManager.currentEditingInspectionItem = null;
        }
        
        modal.style.display = 'block';
    }

    closeInspectionItemEditModal() {
        const modal = document.getElementById('inspection-item-edit-modal');
        if (modal) {
            modal.style.display = 'none';
            this.clearModalState(modal.id);
        }
    }

    async showInspectionDetailModal(inspectionId) {
        const inspection = this.uiManager.app.dataManager.getInspection(inspectionId);
        if (!inspection) {
            this.uiManager.showAlert('点検データが見つかりません', 'error');
            return;
        }

        // 写真データを取得
        const photos = await this.uiManager.app.dataManager.getPhotosByInspectionId(inspectionId);

        // 動的にモーダルを作成
        const modalHtml = `
            <div id="inspection-detail-modal" class="modal" style="display: block;">
                <div class="modal-content">
                    <span class="close" onclick="document.getElementById('inspection-detail-modal').remove()">&times;</span>
                    <h2>点検詳細</h2>
                    <div class="inspection-detail">
                        <h3>基本情報</h3>
                        <p><strong>点検日:</strong> ${new Date(inspection.inspectionDate).toLocaleDateString('ja-JP')}</p>
                        <p><strong>マンホール:</strong> ${inspection.manholeName}</p>
                        <p><strong>点検者:</strong> ${inspection.inspector}</p>
                        
                        <h3>点検結果</h3>
                        ${this.generateInspectionResults(inspection)}
                        
                        ${photos && photos.length > 0 ? 
                            `<h3>写真 (${photos.length}枚)</h3>
                             <div class="photo-thumbnails" id="photo-thumbnails-${inspectionId}">
                                 ${photos.map((photo, index) => 
                                     `<div class="thumbnail-container">
                                        <img src="${photo.data}" 
                                             alt="${photo.name}" 
                                             class="photo-thumbnail" 
                                             data-photo-index="${index}"
                                             title="${photo.name}">
                                      </div>`
                                 ).join('')}
                             </div>` : ''
                        }
                        
                        ${inspection.remarks ? 
                            `<h3>特記事項</h3>
                             <p>${inspection.remarks}</p>` : ''
                        }
                    </div>
                </div>
            </div>
        `;

        // 既存のモーダルがあれば削除
        const existingModal = document.getElementById('inspection-detail-modal');
        if (existingModal) {
            existingModal.remove();
        }

        // 新しいモーダルを追加
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        
        // 写真クリックイベントを設定
        this.setupPhotoClickEvents(inspectionId, photos);
    }
    
    setupPhotoClickEvents(inspectionId, photos) {
        const thumbnailContainer = document.getElementById(`photo-thumbnails-${inspectionId}`);
        if (!thumbnailContainer || !photos || photos.length === 0) return;

        // 各サムネイルにクリックイベントを追加
        const thumbnails = thumbnailContainer.querySelectorAll('.photo-thumbnail');
        thumbnails.forEach((thumbnail, index) => {
            thumbnail.addEventListener('click', () => {
                this.openPhotoModal(photos[index].data, photos[index].name, index, photos);
            });
        });
    }
    
    openPhotoModal(photoData, photoName, currentIndex, allPhotos) {
        const photoModalHtml = `
            <div id="photo-expand-modal" class="modal photo-expand-modal" style="display: block;">
                <div class="modal-content photo-expand-content">
                    <div class="photo-expand-header">
                        <span class="photo-expand-title">${photoName}</span>
                        <span class="photo-expand-close">&times;</span>
                    </div>
                    <div class="photo-expand-body">
                        <div class="photo-navigation">
                            ${currentIndex > 0 ? 
                                `<button class="photo-nav-btn prev">‹</button>` 
                                : '<div class="photo-nav-spacer"></div>'
                            }
                            <img src="${photoData}" alt="${photoName}" class="photo-expand-image">
                            ${currentIndex < allPhotos.length - 1 ? 
                                `<button class="photo-nav-btn next">›</button>`
                                : '<div class="photo-nav-spacer"></div>'
                            }
                        </div>
                        <div class="photo-expand-info">
                            ${currentIndex + 1} / ${allPhotos.length}
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // 既存の拡大モーダルがあれば削除
        const existingPhotoModal = document.getElementById('photo-expand-modal');
        if (existingPhotoModal) {
            existingPhotoModal.remove();
        }
        
        document.body.insertAdjacentHTML('beforeend', photoModalHtml);
        
        // イベントリスナーを設定
        this.setupPhotoModalEvents(currentIndex, allPhotos);
    }
    
    setupPhotoModalEvents(currentIndex, allPhotos) {
        const modal = document.getElementById('photo-expand-modal');
        if (!modal) return;
        
        // 閉じるボタン
        const closeBtn = modal.querySelector('.photo-expand-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                modal.remove();
            });
        }
        
        // 前の写真ボタン
        const prevBtn = modal.querySelector('.photo-nav-btn.prev');
        if (prevBtn && currentIndex > 0) {
            prevBtn.addEventListener('click', () => {
                const prevPhoto = allPhotos[currentIndex - 1];
                this.openPhotoModal(prevPhoto.data, prevPhoto.name, currentIndex - 1, allPhotos);
            });
        }
        
        // 次の写真ボタン
        const nextBtn = modal.querySelector('.photo-nav-btn.next');
        if (nextBtn && currentIndex < allPhotos.length - 1) {
            nextBtn.addEventListener('click', () => {
                const nextPhoto = allPhotos[currentIndex + 1];
                this.openPhotoModal(nextPhoto.data, nextPhoto.name, currentIndex + 1, allPhotos);
            });
        }
        
        // 背景クリックで閉じる
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
        
        // ESCキーで閉じる
        const escapeHandler = (e) => {
            if (e.key === 'Escape') {
                modal.remove();
                document.removeEventListener('keydown', escapeHandler);
            }
        };
        document.addEventListener('keydown', escapeHandler);
    }

    generateInspectionResults(inspection) {
        let html = '<div class="inspection-results">';
        
        // 電気系統データ
        if (inspection.voltage || inspection.no1Current || inspection.no2Current) {
            html += '<h4>電気系統</h4>';
            if (inspection.voltage) {
                html += `<div class="result-item"><strong>電圧計:</strong> ${inspection.voltage}V</div>`;
            }
            if (inspection.no1Current) {
                html += `<div class="result-item"><strong>No1電流値:</strong> ${inspection.no1Current}A</div>`;
            }
            if (inspection.no2Current) {
                html += `<div class="result-item"><strong>No2電流値:</strong> ${inspection.no2Current}A</div>`;
            }
        }
        
        // 動的点検項目（動的項目とデフォルト項目を含む）
        if (inspection.customItems && inspection.customItems.length > 0) {
            html += '<h4>点検項目</h4>';
            inspection.customItems.forEach(item => {
                if (item.value !== undefined && item.value !== null && item.value !== '') {
                    let displayValue;
                    if (item.type === 'checkbox') {
                        displayValue = item.value ? '✓ 確認済み' : '× 未確認';
                    } else if (item.type === 'selection') {
                        displayValue = item.value;
                    } else if (item.type === 'numeric') {
                        // 数値項目の場合、単位も表示
                        const manholeItems = this.uiManager.app.dataManager.getInspectionItemsForManhole(inspection.manholeId);
                        const itemConfig = manholeItems ? manholeItems.find(i => i.id === item.id) : null;
                        const unit = (itemConfig && itemConfig.numericSettings && itemConfig.numericSettings.unit) || 
                                    (itemConfig && itemConfig.unit) || '';
                        displayValue = `${item.value}${unit ? ' ' + unit : ''}`;
                    } else {
                        displayValue = item.value;
                    }
                    
                    html += `<div class="result-item">
                        <strong>${item.name}:</strong> ${displayValue}
                    </div>`;
                }
            });
        }
        
        // メモ
        if (inspection.memo) {
            html += '<h4>メモ</h4>';
            html += `<div class="result-item">${inspection.memo}</div>`;
        }
        
        html += '</div>';
        return html;
    }

    closeModal(modalType = null) {
        if (modalType) {
            const modal = document.getElementById(`${modalType}-modal`);
            if (modal) {
                modal.style.display = 'none';
            }
        } else {
            // 全てのモーダルを閉じる
            const modals = document.querySelectorAll('.modal');
            modals.forEach(modal => {
                modal.style.display = 'none';
            });
        }
    }

    switchMasterTab(tabName) {
        // タブボタンのアクティブ状態を更新
        document.querySelectorAll('.master-tab-btn').forEach(btn => {
            btn.classList.remove('active');
            if (btn.getAttribute('data-master-tab') === tabName) {
                btn.classList.add('active');
            }
        });

        // タブコンテンツの表示/非表示を切り替え
        document.querySelectorAll('.master-tab-content').forEach(content => {
            content.classList.remove('active');
        });
        
        // 実際のHTML構造に合わせてIDを修正
        let contentId;
        if (tabName === 'manholes') {
            contentId = 'manholes-master-tab';
        } else if (tabName === 'inspectors') {
            contentId = 'inspectors-master-tab';
        }
        
        if (contentId) {
            const contentElement = document.getElementById(contentId);
            if (contentElement) {
                contentElement.classList.add('active');
            }
        }

        // タブ固有の初期化処理
        if (tabName === 'manholes') {
            this.uiManager.updateMasterList();
        } else if (tabName === 'inspectors') {
            this.uiManager.refreshInspectorMasterList();
        }
    }

    showDataPersistenceWarning() {
        this.uiManager.showAlert(
            'データの保存について', 
            'warning', 
            'このアプリのデータはブラウザに保存されます。ブラウザデータの削除時にデータが失われる可能性があります。定期的なバックアップをお勧めします。'
        );
    }

    initializeModalListeners() {
        this.setupModalTriggerListeners();
        this.setupModalCloseListeners();
        this.setupMasterTabListeners();
    }

    setupModalTriggerListeners() {
        // マスタデータモーダル開く
        const masterBtn = document.getElementById('master-edit-btn');
        if (masterBtn) {
            masterBtn.addEventListener('click', () => this.openMasterModal());
        }

        // エクスポートモーダル開く
        const exportBtn = document.getElementById('data-export-btn');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => this.openExportModal());
        }

        // QRスキャンボタン（将来の拡張用）
        const qrBtn = document.getElementById('qr-scan-btn');
        if (qrBtn) {
            qrBtn.addEventListener('click', () => {
                console.log('QRスキャン機能は実装中です');
            });
        }
    }

    setupModalCloseListeners() {
        // モーダル背景クリックで閉じる
        window.addEventListener('click', (event) => {
            if (event.target.classList.contains('modal')) {
                event.target.style.display = 'none';
                this.clearModalState(event.target.id);
            }
        });
        
        // Escキーでモーダルを閉じる
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape') {
                const visibleModal = document.querySelector('.modal[style*="block"]');
                if (visibleModal) {
                    visibleModal.style.display = 'none';
                    this.clearModalState(visibleModal.id);
                }
            }
        });

        // 閉じるボタン
        document.querySelectorAll('.close-btn').forEach(closeBtn => {
            closeBtn.addEventListener('click', (e) => {
                const modal = e.target.closest('.modal');
                if (modal) {
                    modal.style.display = 'none';
                    this.clearModalState(modal.id);
                }
            });
        });
        
        // 特定のIDを持つ閉じるボタンにも個別にイベントリスナーを追加
        const specificCloseButtons = [
            'close-master-modal',
            'close-export-modal',
            'close-manhole-edit-modal',
            'close-inspection-item-edit-modal'
        ];
        
        specificCloseButtons.forEach(buttonId => {
            const btn = document.getElementById(buttonId);
            if (btn) {
                btn.addEventListener('click', (e) => {
                    e.preventDefault();
                    const modal = btn.closest('.modal');
                    if (modal) {
                        modal.style.display = 'none';
                        this.clearModalState(modal.id);
                    }
                });
            }
        });
    }

    setupMasterTabListeners() {
        // マスタモーダル内のタブ切り替え
        document.querySelectorAll('.master-tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const tabName = btn.getAttribute('data-master-tab');
                if (tabName) {
                    this.switchMasterTab(tabName);
                }
            });
        });
    }
    
    clearModalState(modalId) {
        // モーダル閉じる時の状態クリア
        if (modalId === 'manhole-edit-modal') {
            this.uiManager.currentEditingId = null;
        } else if (modalId === 'inspection-item-edit-modal') {
            this.uiManager.currentEditingInspectionItem = null;
        }
    }
}