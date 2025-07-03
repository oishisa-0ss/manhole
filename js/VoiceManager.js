class VoiceManager {
    constructor(app) {
        this.app = app;
        this.recognition = null;
        this.voiceTarget = null;
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
                    let processedResult = this.processVoiceResult(result);
                    if (processedResult) {
                        targetInput.value = processedResult;
                        targetInput.dispatchEvent(new Event('input'));
                        this.app.uiManager.showAlert('音声入力が完了しました', 'success', `認識結果: ${result} → ${processedResult}`);
                    } else {
                        this.app.uiManager.showAlert('数値を認識できませんでした', 'warning', `認識結果: ${result}`);
                    }
                }
                this.stopVoiceInput();
            };
            
            this.recognition.onerror = (event) => {
                console.error('音声認識エラー:', event.error);
                this.stopVoiceInput();
                this.app.uiManager.showAlert('音声認識に失敗しました', 'error', `エラー: ${event.error}`);
            };

            this.recognition.onend = () => {
                this.stopVoiceInput();
            };
        }
    }

    setupVoiceInputListeners() {
        document.querySelectorAll('.voice-btn').forEach(btn => {
            const newBtn = btn.cloneNode(true);
            btn.parentNode.replaceChild(newBtn, btn);
            
            newBtn.addEventListener('click', (e) => {
                this.startVoiceInput(e.target.dataset.target);
            });
        });
    }

    processVoiceResult(result) {
        let processed = result.toLowerCase()
            .replace(/てん|ポイント|点/g, '.')
            .replace(/ゼロ|れい|零/g, '0')
            .replace(/いち|ひとつ|一/g, '1')
            .replace(/に|ふたつ|二/g, '2')
            .replace(/さん|みっつ|三/g, '3')
            .replace(/よん|し|よっつ|四/g, '4')
            .replace(/ご|いつつ|五/g, '5')
            .replace(/ろく|むっつ|六/g, '6')
            .replace(/なな|しち|ななつ|七/g, '7')
            .replace(/はち|やっつ|八/g, '8')
            .replace(/きゅう|く|ここのつ|九/g, '9')
            .replace(/じゅう|十/g, '10')
            .replace(/にじゅう|二十/g, '20')
            .replace(/さんじゅう|三十/g, '30')
            .replace(/よんじゅう|四十/g, '40')
            .replace(/ごじゅう|五十/g, '50')
            .replace(/ろくじゅう|六十/g, '60')
            .replace(/ななじゅう|七十/g, '70')
            .replace(/はちじゅう|八十/g, '80')
            .replace(/きゅうじゅう|九十/g, '90')
            .replace(/ひゃく|百/g, '100')
            .replace(/にひゃく|二百/g, '200')
            .replace(/せん|千/g, '1000')
            .replace(/まん|万/g, '10000');

        const numbers = processed.match(/[\d.]+/);
        return numbers ? numbers[0] : null;
    }

    startVoiceInput(targetId) {
        if (!this.recognition) {
            this.app.uiManager.showAlert('音声認識がサポートされていません', 'warning');
            return;
        }
        
        if (this.recognition.state === 'recording') {
            this.stopVoiceInput();
            return;
        }
        
        this.voiceTarget = targetId;
        const btn = document.querySelector(`[data-target="${targetId}"]`);
        if (btn) {
            btn.classList.add('listening');
        }
        
        try {
            this.recognition.start();
        } catch (error) {
            console.error('音声認識開始エラー:', error);
            this.stopVoiceInput();
            this.app.uiManager.showAlert('音声認識を開始できませんでした', 'error');
        }
    }

    stopVoiceInput() {
        if (this.recognition) {
            try {
                this.recognition.stop();
            } catch (error) {
                console.error('音声認識停止エラー:', error);
            }
        }
        
        document.querySelectorAll('.voice-btn').forEach(btn => {
            btn.classList.remove('listening');
        });
        
        this.voiceTarget = null;
    }

    destroy() {
        this.stopVoiceInput();
        this.recognition = null;
    }
}