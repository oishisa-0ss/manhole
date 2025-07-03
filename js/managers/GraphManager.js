class GraphManager {
    constructor(uiManager) {
        this.uiManager = uiManager;
        this.canvas = null;
        this.ctx = null;
    }

    initializeCanvas() {
        this.canvas = document.getElementById('chart');
        if (!this.canvas) {
            console.error('Chart canvas element not found');
            return false;
        }
        
        this.ctx = this.canvas.getContext('2d');
        if (!this.ctx) {
            console.error('Failed to get canvas 2D context');
            return false;
        }
        
        return true;
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
            const inspectionItems = this.uiManager.app.dataManager.getInspectionItemsForManhole(manholeId);
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
            const graphContainer = document.getElementById('graph-container');
            if (graphContainer) {
                graphContainer.innerHTML = '<p>マンホールを選択してください</p>';
            }
            return;
        }

        // キャンバス初期化（グラフタブがアクティブな場合のみ）
        const graphTab = document.getElementById('graph-tab');
        if (!graphTab || !graphTab.classList.contains('active')) {
            console.log('Graph tab is not active, skipping graph update');
            return;
        }

        // 少し遅延させてDOM要素が確実に利用可能になってから初期化
        setTimeout(() => {
            if (!this.initializeCanvas()) {
                const graphContainer = document.getElementById('graph-container');
                if (graphContainer) {
                    graphContainer.innerHTML = '<p>グラフの初期化に失敗しました</p>';
                }
                return;
            }
            this.performGraphUpdate(manholeId, graphType);
        }, 100);
    }

    async performGraphUpdate(manholeId, graphType) {
        try {
            const inspections = await this.uiManager.app.dataManager.getFilteredInspections(manholeId, 'all');
            const sortedInspections = inspections
                .sort((a, b) => new Date(a.inspectionDate) - new Date(b.inspectionDate))
                .slice(-12);

            if (sortedInspections.length === 0) {
                this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
                this.ctx.fillStyle = '#757575';
                this.ctx.font = '18px Arial';
                this.ctx.textAlign = 'center';
                this.ctx.fillText('データがありません', this.canvas.width / 2, this.canvas.height / 2);
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
        if (!this.canvas || !this.ctx) {
            console.error('Canvas not initialized');
            return;
        }
        
        const container = this.canvas.parentElement;
        this.canvas.width = Math.min(1000, container.clientWidth || 1000);
        this.canvas.height = 500;
        
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        const padding = 80;
        const chartWidth = this.canvas.width - 2 * padding;
        const chartHeight = this.canvas.height - 2 * padding;
        
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
            
            // マンホール用の点検項目を取得（デフォルト項目を含む）
            const inspectionItems = this.uiManager.app.dataManager.getInspectionItemsForManhole(manholeId);
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
            this.ctx.fillStyle = '#757575';
            this.ctx.font = '18px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('データがありません', this.canvas.width / 2, this.canvas.height / 2);
            return;
        }
        
        const minValue = Math.min(...allValues);
        const maxValue = Math.max(...allValues);
        const valueRange = maxValue === minValue ? Math.max(Math.abs(maxValue) * 0.2, 1) : maxValue - minValue;
        const chartMinValue = minValue - valueRange * 0.1;
        const chartMaxValue = maxValue + valueRange * 0.1;
        const chartValueRange = chartMaxValue - chartMinValue;
        
        // チャートタイトル
        this.ctx.fillStyle = '#333';
        this.ctx.font = 'bold 20px sans-serif';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(`${label1}${label2 ? ` / ${label2}` : ''} の推移`, this.canvas.width / 2, 30);
        
        // グリッド線とY軸ラベル
        this.ctx.strokeStyle = '#E0E0E0';
        this.ctx.lineWidth = 1;
        this.ctx.fillStyle = '#666';
        this.ctx.font = '12px sans-serif';
        this.ctx.textAlign = 'right';
        
        const gridLines = 6;
        for (let i = 0; i <= gridLines; i++) {
            const y = padding + (chartHeight / gridLines) * i;
            const value = chartMaxValue - (chartValueRange / gridLines) * i;
            
            // 横グリッド線
            this.ctx.beginPath();
            this.ctx.moveTo(padding, y);
            this.ctx.lineTo(padding + chartWidth, y);
            this.ctx.stroke();
            
            // Y軸ラベル
            this.ctx.fillText(value.toFixed(1) + unit, padding - 10, y + 4);
        }
        
        // X軸（時系列）
        this.ctx.strokeStyle = '#333';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.moveTo(padding, padding + chartHeight);
        this.ctx.lineTo(padding + chartWidth, padding + chartHeight);
        this.ctx.stroke();
        
        // Y軸
        this.ctx.beginPath();
        this.ctx.moveTo(padding, padding);
        this.ctx.lineTo(padding, padding + chartHeight);
        this.ctx.stroke();
        
        // X軸ラベル（日付）
        this.ctx.fillStyle = '#666';
        this.ctx.font = '11px sans-serif';
        this.ctx.textAlign = 'center';
        
        const xStep = dates.length > 1 ? chartWidth / (dates.length - 1) : chartWidth / 2;
        dates.forEach((date, i) => {
            const x = padding + (dates.length > 1 ? xStep * i : chartWidth / 2);
            
            // 縦のグリッド線
            this.ctx.strokeStyle = '#E0E0E0';
            this.ctx.lineWidth = 1;
            this.ctx.beginPath();
            this.ctx.moveTo(x, padding);
            this.ctx.lineTo(x, padding + chartHeight);
            this.ctx.stroke();
            
            // 日付ラベル
            this.ctx.fillStyle = '#666';
            this.ctx.fillText(date.display, x, padding + chartHeight + 20);
            
            // 詳細な日付をツールチップ用に（マウスオーバー時に表示）
            if (dates.length <= 10) {
                this.ctx.font = '9px sans-serif';
                this.ctx.fillText(date.full, x, padding + chartHeight + 35);
                this.ctx.font = '11px sans-serif';
            }
        });
        
        const drawTimeSeries = (data, color, label) => {
            if (!data || data.length === 0) return;
            
            // データポイントの描画
            this.ctx.fillStyle = color;
            data.forEach((value, i) => {
                if (value !== null && value !== undefined && !isNaN(value)) {
                    const x = padding + (dates.length > 1 ? xStep * i : chartWidth / 2);
                    const y = padding + chartHeight - ((value - chartMinValue) / chartValueRange) * chartHeight;
                    
                    // データポイント（円）
                    this.ctx.beginPath();
                    this.ctx.arc(x, y, 5, 0, 2 * Math.PI);
                    this.ctx.fill();
                    
                    // 値をデータポイント上に表示（データが少ない場合）
                    if (dates.length <= 8) {
                        this.ctx.fillStyle = '#333';
                        this.ctx.font = 'bold 11px sans-serif';
                        this.ctx.textAlign = 'center';
                        this.ctx.fillText(value.toFixed(1), x, y - 12);
                        this.ctx.fillStyle = color;
                    }
                }
            });
            
            // 線の描画
            this.ctx.strokeStyle = color;
            this.ctx.lineWidth = 3;
            this.ctx.lineCap = 'round';
            this.ctx.lineJoin = 'round';
            
            let pathStarted = false;
            this.ctx.beginPath();
            
            data.forEach((value, i) => {
                if (value !== null && value !== undefined && !isNaN(value)) {
                    const x = padding + (dates.length > 1 ? xStep * i : chartWidth / 2);
                    const y = padding + chartHeight - ((value - chartMinValue) / chartValueRange) * chartHeight;
                    
                    if (!pathStarted) {
                        this.ctx.moveTo(x, y);
                        pathStarted = true;
                    } else {
                        this.ctx.lineTo(x, y);
                    }
                }
            });
            
            if (pathStarted) {
                this.ctx.stroke();
            }
        };
        
        // データ系列の描画
        drawTimeSeries(data1, '#2196F3', label1);
        if (data2.length > 0 && data2.some(v => v !== null)) {
            drawTimeSeries(data2, '#FF9800', label2);
        }
        
        // 凡例の描画
        this.ctx.fillStyle = '#212121';
        this.ctx.font = '14px sans-serif';
        this.ctx.textAlign = 'left';
        
        // 第1系列の凡例
        this.ctx.fillStyle = '#2196F3';
        this.ctx.fillRect(padding + 20, padding - 30, 15, 3);
        this.ctx.fillStyle = '#212121';
        this.ctx.fillText(`${label1} (${unit})`, padding + 45, padding - 20);
        
        // 第2系列の凡例（存在する場合）
        if (label2 && data2.length > 0 && data2.some(v => v !== null)) {
            this.ctx.fillStyle = '#FF9800';
            this.ctx.fillRect(padding + 220, padding - 30, 15, 3);
            this.ctx.fillStyle = '#212121';
            this.ctx.fillText(`${label2} (${unit})`, padding + 245, padding - 20);
        }
    }

    updateHealthStatus(inspections, manholeId) {
        const manhole = this.uiManager.app.dataManager.getManhole(manholeId);
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
        `;
    }
}