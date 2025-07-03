class NotificationManager {
    constructor(uiManager) {
        this.uiManager = uiManager;
        this.alertTimeout = null;
    }

    showAlert(title, type = 'info', message = '') {
        const alertContainer = document.getElementById('alert-container');
        const alertId = 'alert-' + Date.now();
        
        const alertElement = document.createElement('div');
        alertElement.id = alertId;
        alertElement.className = `alert alert-${type}`;
        alertElement.innerHTML = `
            <div class="alert-content">
                <strong>${title}</strong>
                ${message ? `<div>${message}</div>` : ''}
            </div>
            <button class="alert-close" onclick="window.app.uiManager.notificationManager.closeAlert('${alertId}')">&times;</button>
        `;
        
        alertContainer.appendChild(alertElement);
        
        // エラー時のバイブレーション
        if (type === 'error' && navigator.vibrate) {
            navigator.vibrate(200);
        }
        
        // 5秒後に自動で閉じる
        setTimeout(() => {
            this.closeAlert(alertId);
        }, 5000);
    }

    closeAlert(alertId) {
        const alertElement = document.getElementById(alertId);
        if (alertElement) {
            alertElement.remove();
        }
    }

    // 便利メソッド
    showSuccess(title, message = '') {
        this.showAlert(title, 'success', message);
    }

    showError(title, message = '') {
        this.showAlert(title, 'error', message);
    }

    showWarning(title, message = '') {
        this.showAlert(title, 'warning', message);
    }

    showInfo(title, message = '') {
        this.showAlert(title, 'info', message);
    }

    closeAllAlerts() {
        const alertContainer = document.getElementById('alert-container');
        if (alertContainer) {
            alertContainer.innerHTML = '';
        }
    }
}