class QRManager {
    constructor(app) {
        this.app = app;
        this.qrScanner = null;
    }

    setupQRListeners() {
        const qrScanBtn = document.getElementById('qr-scan-btn');
        if (qrScanBtn) {
            qrScanBtn.addEventListener('click', () => {
                this.openQRScanner();
            });
        }

        const closeQrScanModalBtn = document.getElementById('close-qr-scan-modal');
        if (closeQrScanModalBtn) {
            closeQrScanModalBtn.addEventListener('click', () => {
                this.closeQRScanner();
            });
        }
    }

    openQRScanner() {
        console.log('Opening QR scanner modal...');
        const modal = document.getElementById('qr-scan-modal');
        if (!modal) {
            console.error('QR scan modal element not found');
            this.app.uiManager.showAlert('QRスキャンモーダルが見つかりません。ページを再読み込みしてください。', 'error');
            return;
        }
        
        console.log('QR scan modal element found, adding active class');
        modal.classList.add('active');
        
        if (typeof QrScanner !== 'undefined') {
            const video = document.getElementById('qr-video');
            if (video) {
                try {
                    this.qrScanner = new QrScanner(video, result => {
                        this.handleQRScanResult(result);
                    }, {
                        onDecodeError: error => {
                            console.log('QR scan decode error:', error);
                        },
                        preferredCamera: 'environment',
                        highlightScanRegion: true,
                        highlightCodeOutline: true,
                    });
                    
                    this.qrScanner.start().catch(error => {
                        console.error('QR scanner start failed:', error);
                        this.showQRError('カメラの起動に失敗しました。カメラの使用許可を確認してください。');
                    });
                } catch (error) {
                    console.error('QR scanner initialization failed:', error);
                    this.showQRError('QRスキャナーの初期化に失敗しました。');
                }
            } else {
                this.showQRError('カメラ要素が見つかりません。');
            }
        } else {
            this.showQRError('QRスキャナーライブラリが利用できません。');
        }
    }

    closeQRScanner() {
        const modal = document.getElementById('qr-scan-modal');
        if (modal) {
            modal.classList.remove('active');
        }
        
        if (this.qrScanner) {
            try {
                this.qrScanner.stop();
                this.qrScanner.destroy();
            } catch (error) {
                console.error('QR scanner cleanup error:', error);
            }
            this.qrScanner = null;
        }

        this.clearQRResult();
    }

    handleQRScanResult(result) {
        try {
            const data = JSON.parse(result);
            if (data.type === 'manhole' && data.id) {
                this.closeQRScanner();
                this.app.uiManager.switchTab('inspection');
                document.getElementById('manhole-name').value = data.id;
                this.app.uiManager.onManholeChange(data.id);
                this.app.uiManager.showAlert('QRコードを読み取りました', 'success', data.name);
            } else {
                this.app.uiManager.showAlert('無効なQRコードです', 'warning', 'マンホール用のQRコードではありません');
            }
        } catch (error) {
            console.error('QR scan result parse error:', error);
            this.app.uiManager.showAlert('QRコードの読み取りに失敗しました', 'error', 'データの解析でエラーが発生しました');
        }
    }

    showQRError(message) {
        const resultDiv = document.getElementById('qr-result');
        if (resultDiv) {
            resultDiv.innerHTML = `<p style="color: #f44336; text-align: center; padding: 20px;">${message}</p>`;
        }
    }

    clearQRResult() {
        const resultDiv = document.getElementById('qr-result');
        if (resultDiv) {
            resultDiv.innerHTML = '';
        }
    }

    generateQRCode(manhole) {
        if (typeof QRCode === 'undefined') {
            this.app.uiManager.showAlert('QRコード生成ライブラリが読み込まれていません', 'error');
            return;
        }

        const qrData = JSON.stringify({
            type: 'manhole',
            id: manhole.id,
            name: manhole.name,
            timestamp: new Date().toISOString()
        });

        const canvas = document.createElement('canvas');
        QRCode.toCanvas(canvas, qrData, { 
            width: 200,
            margin: 2,
            color: {
                dark: '#000000',
                light: '#FFFFFF'
            },
            errorCorrectionLevel: 'M'
        }, (error) => {
            if (error) {
                console.error('QR code generation error:', error);
                this.app.uiManager.showAlert('QRコード生成に失敗しました', 'error', error.message);
                return;
            }

            const qrItem = document.createElement('div');
            qrItem.className = 'qr-item';
            qrItem.innerHTML = `
                <h4>${manhole.name}</h4>
                <div class="qr-canvas-container"></div>
                <button class="btn btn-secondary download-btn" onclick="app.qrManager.downloadQR('${manhole.name}', '${canvas.toDataURL()}')">
                    ダウンロード
                </button>
            `;
            
            qrItem.querySelector('.qr-canvas-container').appendChild(canvas);
            
            const displayElement = document.getElementById('qr-display');
            if (displayElement) {
                displayElement.appendChild(qrItem);
            }
        });
    }

    downloadQR(name, dataURL) {
        try {
            const link = document.createElement('a');
            link.download = `${name}_QRコード.png`;
            link.href = dataURL;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            this.app.uiManager.showAlert('QRコードをダウンロードしました', 'success', `${name}_QRコード.png`);
        } catch (error) {
            console.error('QR download error:', error);
            this.app.uiManager.showAlert('ダウンロードに失敗しました', 'error');
        }
    }

    destroy() {
        this.closeQRScanner();
    }
}