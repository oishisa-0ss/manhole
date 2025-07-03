class NavigationManager {
    constructor(uiManager) {
        this.uiManager = uiManager;
        this.currentTab = 'inspection';
    }

    switchTab(tabName) {
        // タブボタンのアクティブ状態を更新
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
            if (btn.getAttribute('data-tab') === tabName) {
                btn.classList.add('active');
            }
        });

        // タブコンテンツの表示/非表示を切り替え
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        const contentElement = document.getElementById(`${tabName}-tab`);
        if (contentElement) {
            contentElement.classList.add('active');
        }

        this.currentTab = tabName;

        // タブ固有の初期化処理
        if (tabName === 'history') {
            this.uiManager.updateHistoryDisplay();
        } else if (tabName === 'graph') {
            this.uiManager.graphManager.updateGraphTypeOptions();
            // グラフマンホール選択の変更イベントリスナーを設定
            const graphManholeSelect = document.getElementById('graph-manhole');
            if (graphManholeSelect) {
                graphManholeSelect.addEventListener('change', () => {
                    this.uiManager.graphManager.updateGraphTypeOptions();
                    this.uiManager.graphManager.updateGraph();
                });
            }
            // グラフタイプ選択の変更イベントリスナーを設定
            const graphTypeSelect = document.getElementById('graph-type');
            if (graphTypeSelect) {
                graphTypeSelect.addEventListener('change', () => {
                    this.uiManager.graphManager.updateGraph();
                });
            }
            this.uiManager.graphManager.updateGraph();
        } else if (tabName === 'map') {
            this.uiManager.app.mapManager.ensureMapInitialized();
        }
    }

    startInspectionFromMap(manholeId) {
        console.log('startInspectionFromMap called with ID:', manholeId);
        
        // 点検タブに切り替え
        this.switchTab('inspection');
        
        // タブ切り替えが完了してからマンホール選択を設定
        setTimeout(() => {
            const manholeSelect = document.getElementById('manhole-name');
            if (manholeSelect) {
                manholeSelect.value = manholeId;
                // マンホール選択変更イベントを手動で発火
                this.uiManager.formManager.onManholeChange();
                
                // 成功メッセージを表示
                const manhole = this.uiManager.app.dataManager.getManhole(manholeId);
                const manholeName = manhole ? manhole.name : `ID: ${manholeId}`;
                this.uiManager.notificationManager.showAlert(`${manholeName}の点検を開始します`, 'info');
                
                console.log('点検入力に遷移完了:', manholeName);
            } else {
                console.error('マンホール選択要素が見つかりません');
                this.uiManager.notificationManager.showAlert('点検入力への遷移に失敗しました', 'error');
            }
        }, 100);
    }

    setupTabEventListeners() {
        // タブ切り替えイベントリスナー
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const tabName = btn.getAttribute('data-tab');
                if (tabName) {
                    this.switchTab(tabName);
                }
            });
        });
    }

    getCurrentTab() {
        return this.currentTab;
    }

    isCurrentTab(tabName) {
        return this.currentTab === tabName;
    }
}