class PhotoManager {
    constructor(uiManager) {
        this.uiManager = uiManager;
        this.currentPhotos = [];
    }

    handlePhotoSelection(files) {
        for (let file of files) {
            this.processPhoto(file);
        }
    }

    processPhoto(file) {
        if (file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const photoData = {
                    id: Date.now() + Math.random(),
                    name: file.name,
                    data: e.target.result,
                    size: file.size,
                    type: file.type,
                    timestamp: new Date().toISOString()
                };
                this.currentPhotos.push(photoData);
                this.addPhotoPreview(photoData);
                console.log('写真を追加しました:', photoData.name);
            };
            reader.readAsDataURL(file);
        } else {
            this.uiManager.showAlert('画像ファイルを選択してください', 'error');
        }
    }

    addPhotoPreview(photoData) {
        const previewContainer = document.getElementById('photo-preview-container');
        if (!previewContainer) {
            console.error('Photo preview container not found');
            return;
        }
        
        const previewElement = document.createElement('div');
        previewElement.className = 'photo-preview-item';
        previewElement.setAttribute('data-photo-id', photoData.id);
        
        previewElement.innerHTML = `
            <div class="photo-thumbnail">
                <img src="${photoData.data}" alt="${photoData.name}" 
                     onclick="app.uiManager.photoManager.showPhotoDetail('${photoData.id}')">
                <button class="remove-photo-btn" onclick="app.uiManager.photoManager.removePhoto('${photoData.id}')">
                    <span>×</span>
                </button>
            </div>
            <div class="photo-name">${this.truncateFileName(photoData.name, 15)}</div>
        `;
        
        previewContainer.appendChild(previewElement);
        this.updatePhotoCount();
    }

    removePhoto(photoId) {
        this.currentPhotos = this.currentPhotos.filter(photo => photo.id !== photoId);
        
        const previewElement = document.querySelector(`[data-photo-id="${photoId}"]`);
        if (previewElement) {
            previewElement.remove();
        }
        
        this.updatePhotoCount();
        console.log('写真を削除しました:', photoId);
    }

    truncateFileName(filename, maxLength) {
        if (filename.length <= maxLength) return filename;
        const ext = filename.split('.').pop();
        const nameWithoutExt = filename.substring(0, filename.lastIndexOf('.'));
        const truncatedName = nameWithoutExt.substring(0, maxLength - ext.length - 4) + '...';
        return truncatedName + '.' + ext;
    }

    updatePhotoCount() {
        const countElement = document.getElementById('photo-count');
        if (countElement) {
            countElement.textContent = `${this.currentPhotos.length}枚`;
        }
    }

    showPhotoDetail(photoId) {
        const photo = this.currentPhotos.find(p => p.id == photoId);
        if (!photo) return;

        const modalHtml = `
            <div id="photo-detail-modal" class="modal" style="display: block;">
                <div class="modal-content photo-detail-content">
                    <span class="close" onclick="document.getElementById('photo-detail-modal').remove()">&times;</span>
                    <h3>${photo.name}</h3>
                    <div class="photo-detail-view">
                        <img src="${photo.data}" alt="${photo.name}" style="max-width: 100%; max-height: 70vh;">
                        <div class="photo-info-detail">
                            <p><strong>ファイル名:</strong> ${photo.name}</p>
                            <p><strong>サイズ:</strong> ${(photo.size / 1024).toFixed(1)} KB</p>
                            <p><strong>形式:</strong> ${photo.type}</p>
                            <p><strong>追加日時:</strong> ${new Date(photo.timestamp).toLocaleString('ja-JP')}</p>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHtml);
    }

    clearPhotos() {
        this.currentPhotos = [];
        const previewContainer = document.getElementById('photo-preview-container');
        if (previewContainer) {
            previewContainer.innerHTML = '';
        }
        this.updatePhotoCount();
        console.log('写真をクリアしました');
    }

    getCurrentPhotos() {
        return this.currentPhotos;
    }

    loadPhotosForEdit(photos) {
        this.clearPhotos();
        if (photos && photos.length > 0) {
            photos.forEach(photo => {
                this.currentPhotos.push(photo);
                this.addPhotoPreview(photo);
            });
        }
    }

    displayPhotoGallery(photos) {
        const gallery = document.getElementById('photo-gallery');
        gallery.innerHTML = '';
        
        photos.forEach((photo, index) => {
            const photoElement = document.createElement('div');
            photoElement.className = 'gallery-photo';
            photoElement.innerHTML = `
                <img src="${photo.data}" alt="${photo.name}" onclick="app.uiManager.photoManager.showPhotoDetail(${index})">
                <div class="photo-info">
                    <span class="photo-name">${photo.name}</span>
                </div>
            `;
            gallery.appendChild(photoElement);
        });
    }

    showPhotoDetail(index) {
        const photos = this.currentPhotos;
        if (index < 0 || index >= photos.length) return;
        
        const photo = photos[index];
        const detailView = document.getElementById('photo-detail-view');
        const galleryView = document.getElementById('photo-gallery-view');
        
        document.getElementById('photo-detail-image').src = photo.data;
        document.getElementById('photo-detail-name').textContent = photo.name;
        document.getElementById('photo-detail-info').innerHTML = `
            <p>ファイル名: ${photo.name}</p>
            <p>サイズ: ${(photo.size / 1024).toFixed(1)} KB</p>
            <p>形式: ${photo.type}</p>
            <p>追加日時: ${new Date(photo.timestamp).toLocaleString('ja-JP')}</p>
        `;
        
        // ナビゲーションボタンの設定
        const prevBtn = document.getElementById('photo-prev-btn');
        const nextBtn = document.getElementById('photo-next-btn');
        
        prevBtn.onclick = index > 0 ? () => this.showPhotoDetail(index - 1) : null;
        nextBtn.onclick = index < photos.length - 1 ? () => this.showPhotoDetail(index + 1) : null;
        
        prevBtn.style.opacity = index > 0 ? '1' : '0.3';
        nextBtn.style.opacity = index < photos.length - 1 ? '1' : '0.3';
        
        galleryView.style.display = 'none';
        detailView.style.display = 'block';
    }

    showPhotoGallery() {
        const detailView = document.getElementById('photo-detail-view');
        const galleryView = document.getElementById('photo-gallery-view');
        
        this.displayPhotoGallery(this.currentPhotos);
        
        detailView.style.display = 'none';
        galleryView.style.display = 'block';
        
        const modal = document.getElementById('photo-modal');
        modal.style.display = 'block';
    }

    clearPhotos() {
        this.currentPhotos = [];
        const previewContainer = document.getElementById('photo-preview-container');
        if (previewContainer) {
            previewContainer.innerHTML = '';
        }
    }

    getCurrentPhotos() {
        return this.currentPhotos;
    }

    setCurrentPhotos(photos) {
        this.currentPhotos = photos || [];
    }

    loadPhotosForEdit(photos) {
        this.clearPhotos();
        if (photos && photos.length > 0) {
            this.currentPhotos = [...photos];
            photos.forEach(photo => {
                this.addPhotoPreview(photo);
            });
        }
    }
}