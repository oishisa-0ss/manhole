class MapManager {
    constructor(app) {
        this.app = app;
        this.map = null;
        this.markers = [];
        this.mapInitialized = false;
    }

    initializeMap() {
        this.mapInitialized = false;
        this.markers = [];
        this.populateMapSelects();
    }

    ensureMapInitialized() {
        if (this.mapInitialized || !document.getElementById('map')) {
            return;
        }

        try {
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

    selectManholeOnMap(manholeId) {
        console.log('selectManholeOnMap called with ID:', manholeId);
        
        // map-manholeのselectボックスを更新
        const mapManholeSelect = document.getElementById('map-manhole');
        if (mapManholeSelect) {
            mapManholeSelect.value = manholeId;
            console.log('Updated map-manhole select to:', mapManholeSelect.value);
            
            // 選択変更イベントを発生させる（他の処理がある場合）
            const changeEvent = new Event('change', { bubbles: true });
            mapManholeSelect.dispatchEvent(changeEvent);
        } else {
            console.error('map-manhole select element not found');
        }
        
        // 成功メッセージを表示
        const manhole = this.app.dataManager.getManhole(manholeId);
        if (manhole) {
            this.app.uiManager.showAlert(`${manhole.name}を選択しました`, 'success');
        } else {
            console.error('Manhole not found for ID:', manholeId);
        }
    }

    highlightManhole(manholeId) {
        if (!this.mapInitialized || !this.map || !manholeId) {
            return;
        }

        const manhole = this.app.dataManager.getManhole(manholeId);
        if (!manhole || !manhole.latitude || !manhole.longitude) {
            return;
        }

        // 地図をマンホールの位置に移動してズーム
        this.map.setView([manhole.latitude, manhole.longitude], 16);

        // 既存のハイライトマーカーを削除
        this.markers.forEach(marker => {
            if (marker.options.className === 'highlighted-marker') {
                this.map.removeLayer(marker);
            }
        });
        this.markers = this.markers.filter(marker => marker.options.className !== 'highlighted-marker');

        // ハイライト用の特別なアイコンを作成
        const highlightIcon = L.divIcon({
            html: '<div style="background-color: #ff6b35; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 10px rgba(255,107,53,0.8); animation: pulse 2s infinite;"></div>',
            iconSize: [26, 26],
            className: 'highlighted-marker'
        });

        // ハイライトマーカーを作成
        const highlightMarker = L.marker([manhole.latitude, manhole.longitude], { 
            icon: highlightIcon,
            className: 'highlighted-marker'
        })
            .addTo(this.map)
            .bindPopup(`
                <div>
                    <h3 style="color: #ff6b35;">${manhole.name} (選択中)</h3>
                    <p><strong>緯度:</strong> ${manhole.latitude.toFixed(6)}</p>
                    <p><strong>経度:</strong> ${manhole.longitude.toFixed(6)}</p>
                    <p><strong>定格電流:</strong> ${manhole.ratedCurrent1}A / ${manhole.ratedCurrent2}A</p>
                    <p><strong>出力:</strong> ${manhole.outputKw1}kW / ${manhole.outputKw2}kW</p>
                    <button id="start-inspection-highlight-${manhole.id}" class="btn btn-primary" style="margin-top: 8px;">点検開始</button>
                </div>
            `)
            .openPopup();

        // ハイライトマーカーのポップアップボタンにもイベントリスナーを設定
        highlightMarker.on('popupopen', () => {
            const startButton = document.getElementById(`start-inspection-highlight-${manhole.id}`);
            if (startButton) {
                startButton.addEventListener('click', () => {
                    console.log('ハイライトマーカーの点検開始ボタンがクリックされました:', manhole.id);
                    if (window.app && window.app.uiManager && window.app.uiManager.navigationManager) {
                        window.app.uiManager.navigationManager.startInspectionFromMap(manhole.id);
                    } else {
                        console.error('App instance not found');
                    }
                });
            }
        });

        this.markers.push(highlightMarker);

        // CSS アニメーションを動的に追加（まだ存在しない場合）
        if (!document.getElementById('map-highlight-styles')) {
            const style = document.createElement('style');
            style.id = 'map-highlight-styles';
            style.textContent = `
                @keyframes pulse {
                    0% { transform: scale(1); opacity: 1; }
                    50% { transform: scale(1.2); opacity: 0.7; }
                    100% { transform: scale(1); opacity: 1; }
                }
            `;
            document.head.appendChild(style);
        }
    }

    populateMapSelects() {
        const mapSelect = document.getElementById('map-manhole');
        if (!mapSelect) return;
        
        mapSelect.innerHTML = '<option value="">全て表示</option>';
        
        this.app.dataManager.getAllManholes().forEach(manhole => {
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

        this.markers.forEach(marker => {
            this.map.removeLayer(marker);
        });
        this.markers = [];

        const selectedId = document.getElementById('map-manhole')?.value;
        const manholes = selectedId ? 
            this.app.dataManager.getAllManholes().filter(m => m.id == selectedId) : 
            this.app.dataManager.getAllManholes();

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
                            <button id="start-inspection-${manhole.id}" class="btn btn-primary" style="margin-top: 8px;">点検開始</button>
                        </div>
                    `);
                
                // マーカークリック時にマンホール選択を更新
                marker.on('click', () => {
                    this.selectManholeOnMap(manhole.id);
                });
                
                // ポップアップが開かれた後にボタンのイベントリスナーを設定
                marker.on('popupopen', () => {
                    const startButton = document.getElementById(`start-inspection-${manhole.id}`);
                    if (startButton) {
                        startButton.addEventListener('click', () => {
                            console.log('点検開始ボタンがクリックされました:', manhole.id);
                            if (window.app && window.app.uiManager && window.app.uiManager.navigationManager) {
                                window.app.uiManager.navigationManager.startInspectionFromMap(manhole.id);
                            } else {
                                console.error('App instance not found');
                            }
                        });
                    }
                });
                
                this.markers.push(marker);
            }
        });

        if (manholes.length > 0 && manholes[0].latitude) {
            this.map.setView([manholes[0].latitude, manholes[0].longitude], 14);
        }
    }

    setupLocationListeners() {
        const getCurrentLocationBtn = document.getElementById('get-location-btn');
        if (getCurrentLocationBtn) {
            getCurrentLocationBtn.addEventListener('click', () => {
                this.getCurrentLocation();
            });
        }

        const addLocationBtn = document.getElementById('add-location-btn');
        if (addLocationBtn) {
            addLocationBtn.addEventListener('click', () => {
                this.addLocationToManhole();
            });
        }

        const goToLocationBtn = document.getElementById('goto-location-btn');
        if (goToLocationBtn) {
            goToLocationBtn.addEventListener('click', () => {
                this.goToManualLocation();
            });
        }

        const generateQRBtn = document.getElementById('generate-qr-btn');
        if (generateQRBtn) {
            generateQRBtn.addEventListener('click', () => {
                this.generateQRForSelected();
            });
        }

        const generateAllQRBtn = document.getElementById('generate-all-qr-btn');
        if (generateAllQRBtn) {
            generateAllQRBtn.addEventListener('click', () => {
                this.generateAllQRCodes();
            });
        }

        const mapManholeSelect = document.getElementById('map-manhole');
        if (mapManholeSelect) {
            mapManholeSelect.addEventListener('change', () => {
                this.updateMapDisplay();
            });
        }
    }

    getCurrentLocation() {
        if (!navigator.geolocation) {
            this.app.uiManager.showAlert('位置情報がサポートされていません', 'warning');
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;
                
                this.ensureMapInitialized();
                
                if (this.mapInitialized && this.map) {
                    this.map.setView([lat, lng], 16);
                    
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
                
                const latInput = document.getElementById('manual-latitude');
                const lngInput = document.getElementById('manual-longitude');
                if (latInput) latInput.value = lat.toFixed(6);
                if (lngInput) lngInput.value = lng.toFixed(6);
                
                this.app.uiManager.showAlert('現在地を取得しました', 'success', `緯度: ${lat.toFixed(6)}, 経度: ${lng.toFixed(6)}`);
            },
            (error) => {
                this.app.uiManager.showAlert('位置情報の取得に失敗しました', 'error', error.message);
            }
        );
    }

    addLocationToManhole() {
        const manholeSelect = document.getElementById('map-manhole');
        const manholeId = manholeSelect?.value;
        
        if (!manholeId) {
            this.app.uiManager.showAlert('マンホールを選択してください', 'warning');
            return;
        }

        const latInput = document.getElementById('manual-latitude');
        const lngInput = document.getElementById('manual-longitude');
        const latitude = parseFloat(latInput?.value || '');
        const longitude = parseFloat(lngInput?.value || '');

        if (isNaN(latitude) || isNaN(longitude)) {
            this.app.uiManager.showAlert('有効な緯度経度を入力してください', 'warning');
            return;
        }

        if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
            this.app.uiManager.showAlert('緯度は-90～90、経度は-180～180の範囲で入力してください', 'warning');
            return;
        }

        const manhole = this.app.dataManager.getManhole(manholeId);
        if (manhole) {
            const success = this.app.dataManager.updateManhole(manholeId, {
                ...manhole,
                latitude: latitude,
                longitude: longitude
            });
            
            if (success) {
                this.updateMapDisplay();
                this.app.uiManager.updateMasterList();
                this.app.uiManager.showAlert('位置情報を追加しました', 'success', 
                    `${manhole.name}: ${latitude.toFixed(7)}, ${longitude.toFixed(7)}`);
                
                if (latInput) latInput.value = '';
                if (lngInput) lngInput.value = '';
            }
        }
    }

    goToManualLocation() {
        const latInput = document.getElementById('manual-latitude');
        const lngInput = document.getElementById('manual-longitude');
        const latitude = parseFloat(latInput?.value || '');
        const longitude = parseFloat(lngInput?.value || '');

        if (isNaN(latitude) || isNaN(longitude)) {
            this.app.uiManager.showAlert('有効な緯度経度を入力してください', 'warning');
            return;
        }

        if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
            this.app.uiManager.showAlert('緯度は-90～90、経度は-180～180の範囲で入力してください', 'warning');
            return;
        }

        this.ensureMapInitialized();
        
        if (this.mapInitialized && this.map) {
            this.map.setView([latitude, longitude], 16);
            
            const tempMarker = L.marker([latitude, longitude])
                .addTo(this.map)
                .bindPopup(`指定位置<br>緯度: ${latitude.toFixed(6)}<br>経度: ${longitude.toFixed(6)}`)
                .openPopup();
            
            this.markers.push(tempMarker);
            this.app.uiManager.showAlert('指定位置に移動しました', 'success');
        }
    }

    generateQRForSelected() {
        const manholeSelect = document.getElementById('map-manhole');
        const manholeId = manholeSelect?.value;
        
        if (!manholeId) {
            this.app.uiManager.showAlert('マンホールを選択してください', 'warning');
            return;
        }

        const manhole = this.app.dataManager.getManhole(manholeId);
        if (manhole && this.app.qrManager) {
            this.app.qrManager.generateQRCode(manhole);
        }
    }

    generateAllQRCodes() {
        if (!this.app.qrManager) return;
        
        const display = document.getElementById('qr-display');
        if (display) {
            display.innerHTML = '';
        }
        
        this.app.dataManager.getAllManholes().forEach(manhole => {
            this.app.qrManager.generateQRCode(manhole);
        });
    }

    destroy() {
        if (this.map) {
            this.map.remove();
            this.map = null;
        }
        this.markers = [];
        this.mapInitialized = false;
    }
}