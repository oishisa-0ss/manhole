// キャッシュ名とバージョン管理
const CACHE_NAME = 'manhole-inspection-v2';
const RUNTIME_CACHE = 'manhole-runtime-v2';
const IMAGE_CACHE = 'manhole-images-v2';

// 完全オフライン対応のための必須リソース
const ESSENTIAL_URLS = [
    '/',
    '/index.html',
    '/style.css',
    '/app.js',
    '/manifest.json',
    '/offline.html'
];

// 外部ライブラリ（CDNから取得してキャッシュ）
const EXTERNAL_RESOURCES = [
    'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
    'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
    'https://cdn.jsdelivr.net/npm/qrcode@1.5.3/build/qrcode.min.js',
    'https://cdn.jsdelivr.net/npm/qr-scanner@1.4.2/qr-scanner.min.js'
];

// 全てのキャッシュ対象URL
const urlsToCache = [...ESSENTIAL_URLS, ...EXTERNAL_RESOURCES];

// Service Workerのインストール処理
self.addEventListener('install', (event) => {
    console.log('Service Worker installing...');
    
    event.waitUntil(
        Promise.all([
            // 必須リソースを優先的にキャッシュ
            caches.open(CACHE_NAME).then((cache) => {
                console.log('Essential resources caching...');
                return cache.addAll(ESSENTIAL_URLS);
            }),
            
            // 外部リソースを個別にキャッシュ（失敗してもインストールを継続）
            caches.open(CACHE_NAME).then(async (cache) => {
                console.log('External resources caching...');
                const promises = EXTERNAL_RESOURCES.map(async (url) => {
                    try {
                        const response = await fetch(url);
                        if (response.ok) {
                            return cache.put(url, response);
                        }
                    } catch (error) {
                        console.warn(`Failed to cache ${url}:`, error);
                    }
                });
                return Promise.allSettled(promises);
            })
        ]).then(() => {
            console.log('Service Worker installation completed');
            // 新しいService Workerを即座に有効化
            return self.skipWaiting();
        })
    );
});

// 完全オフライン対応のフェッチ処理
self.addEventListener('fetch', (event) => {
    // ナビゲーションリクエスト（ページ読み込み）の処理
    // HTML ページ読み込みの判定を強化（start_url 対策）
    if (req.mode === 'navigate' || 
        (req.headers.get('accept')?.includes('text/html'))) {
        event.respondWith(handleNavigateRequest(req));
        return;
    }
    
    // 画像リクエストの処理
    if (event.request.destination === 'image') {
        event.respondWith(handleImageRequest(event.request));
        return;
    }
    
    // その他のリクエスト（CSS, JS, API等）の処理
    event.respondWith(handleOtherRequests(event.request));
});

/**
 * ナビゲーションリクエストの処理（キャッシュファースト + オフラインフォールバック）
 */
async function handleNavigateRequest(request) {
    try {
        // まずキャッシュから探す
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            return cachedResponse;
        }
        
        // キャッシュにない場合、ネットワークから取得してキャッシュ
        const networkResponse = await fetch(request);
        if (networkResponse.ok) {
            const cache = await caches.open(RUNTIME_CACHE);
            cache.put(request, networkResponse.clone());
            return networkResponse;
        }
        
        // ネットワークエラーの場合、メインページまたはオフラインページを返す
        return await caches.match('/index.html') || 
               await caches.match('/offline.html') ||
               new Response('オフラインです', { status: 503, statusText: 'Service Unavailable' });
               
    } catch (error) {
        console.error('Navigation request failed:', error);
        return await caches.match('/offline.html') ||
               new Response('オフラインです', { status: 503, statusText: 'Service Unavailable' });
    }
}

/**
 * 画像リクエストの処理（キャッシュファースト）
 */
async function handleImageRequest(request) {
    try {
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            return cachedResponse;
        }
        
        const networkResponse = await fetch(request);
        if (networkResponse.ok) {
            const cache = await caches.open(IMAGE_CACHE);
            cache.put(request, networkResponse.clone());
            return networkResponse;
        }
        
        return networkResponse;
    } catch (error) {
        console.error('Image request failed:', error);
        // オフライン時のプレースホルダー画像を返すことも可能
        return new Response('', { status: 503, statusText: 'Service Unavailable' });
    }
}

/**
 * その他のリクエストの処理（ネットワークファースト + キャッシュフォールバック）
 */
async function handleOtherRequests(request) {
    try {
        // 静的リソース（CSS, JS）は キャッシュファースト
        if (request.url.includes('.css') || request.url.includes('.js') || 
            request.url.includes('leaflet') || request.url.includes('qrcode') || 
            request.url.includes('qr-scanner')) {
            
            const cachedResponse = await caches.match(request);
            if (cachedResponse) {
                return cachedResponse;
            }
        }
        
        // ネットワークから取得を試行
        const networkResponse = await fetch(request);
        if (networkResponse.ok) {
            // 静的リソースをキャッシュ
            if (request.method === 'GET' && 
                (request.url.includes('.css') || request.url.includes('.js') || 
                 request.url.includes('leaflet') || request.url.includes('qrcode') || 
                 request.url.includes('qr-scanner'))) {
                const cache = await caches.open(CACHE_NAME);
                cache.put(request, networkResponse.clone());
            }
            return networkResponse;
        }
        
        // ネットワークが失敗した場合、キャッシュから取得
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            return cachedResponse;
        }
        
        return networkResponse;
        
    } catch (error) {
        console.error('Request failed:', error);
        
        // オフライン時のキャッシュフォールバック
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            return cachedResponse;
        }
        
        return new Response('リソースが利用できません', { 
            status: 503, 
            statusText: 'Service Unavailable' 
        });
    }
}

// Service Workerの有効化処理
self.addEventListener('activate', (event) => {
    console.log('Service Worker activating...');
    
    // 現在のバージョンで使用するキャッシュ一覧
    const cacheWhitelist = [CACHE_NAME, RUNTIME_CACHE, IMAGE_CACHE];

    event.waitUntil(
        Promise.all([
            // 古いキャッシュを削除
            caches.keys().then((cacheNames) => {
                return Promise.all(
                    cacheNames.map((cacheName) => {
                        if (cacheWhitelist.indexOf(cacheName) === -1) {
                            console.log('Deleting old cache:', cacheName);
                            return caches.delete(cacheName);
                        }
                    })
                );
            }),
            
            // すべてのクライアントを即座に制御下に置く
            self.clients.claim()
        ]).then(() => {
            console.log('Service Worker activation completed');
        })
    );
});

// バックグラウンド同期イベント処理
self.addEventListener('sync', (event) => {
    console.log('Background sync event:', event.tag);
    
    if (event.tag === 'background-sync') {
        event.waitUntil(doBackgroundSync());
    }
});

// メッセージイベント処理（アプリからの通信用）
self.addEventListener('message', (event) => {
    console.log('Message received:', event.data);
    
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
    
    if (event.data && event.data.type === 'GET_CACHE_STATUS') {
        getCacheStatus().then(status => {
            event.ports[0].postMessage(status);
        });
    }
});

/**
 * バックグラウンド同期の実行
 */
async function doBackgroundSync() {
    try {
        console.log('Starting background sync...');
        
        // ネットワーク接続状態を確認
        if (!navigator.onLine) {
            console.log('No network connection, skipping sync');
            return;
        }
        
        const pendingUploads = await getPendingUploads();
        console.log(`Found ${pendingUploads.length} pending uploads`);
        
        let successCount = 0;
        let failCount = 0;
        
        for (const upload of pendingUploads) {
            try {
                await syncData(upload);
                await removePendingUpload(upload.id);
                successCount++;
                console.log(`Successfully synced upload ${upload.id}`);
            } catch (error) {
                failCount++;
                console.error(`Failed to sync upload ${upload.id}:`, error);
                
                // 一定回数失敗した場合は削除
                if (upload.retryCount && upload.retryCount >= 3) {
                    await removePendingUpload(upload.id);
                    console.log(`Removed failed upload ${upload.id} after max retries`);
                } else {
                    // リトライ回数を増やす
                    await updateUploadRetryCount(upload.id, (upload.retryCount || 0) + 1);
                }
            }
        }
        
        console.log(`Background sync completed: ${successCount} success, ${failCount} failed`);
        
        // 同期結果をアプリに通知
        const clients = await self.clients.matchAll();
        clients.forEach(client => {
            client.postMessage({
                type: 'SYNC_COMPLETE',
                success: successCount,
                failed: failCount
            });
        });
        
    } catch (error) {
        console.error('Background sync failed:', error);
    }
}

/**
 * 保留中のアップロードデータを取得
 */
async function getPendingUploads() {
    return new Promise((resolve) => {
        const request = indexedDB.open('ManholeInspectionDB', 1);
        
        request.onsuccess = (event) => {
            const db = event.target.result;
            const transaction = db.transaction(['pendingUploads'], 'readonly');
            const store = transaction.objectStore('pendingUploads');
            const getAllRequest = store.getAll();
            
            getAllRequest.onsuccess = () => {
                resolve(getAllRequest.result || []);
            };
            
            getAllRequest.onerror = () => {
                console.error('Failed to get pending uploads');
                resolve([]);
            };
        };
        
        request.onerror = () => {
            console.error('Failed to open database');
            resolve([]);
        };
    });
}

/**
 * データ同期の実行
 */
async function syncData(upload) {
    console.log('Syncing data:', upload);
    
    try {
        // 実際の同期処理をここに実装
        // 例: サーバーにPOSTリクエストを送信
        const response = await fetch('/api/upload', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(upload.data)
        });
        
        if (!response.ok) {
            throw new Error(`Server responded with status: ${response.status}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error('Sync data error:', error);
        throw error;
    }
}

/**
 * 保留中のアップロードを削除
 */
async function removePendingUpload(uploadId) {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('ManholeInspectionDB', 1);
        
        request.onsuccess = (event) => {
            const db = event.target.result;
            const transaction = db.transaction(['pendingUploads'], 'readwrite');
            const store = transaction.objectStore('pendingUploads');
            const deleteRequest = store.delete(uploadId);
            
            deleteRequest.onsuccess = () => {
                resolve();
            };
            
            deleteRequest.onerror = () => {
                reject(new Error('Failed to remove pending upload'));
            };
        };
        
        request.onerror = () => {
            reject(new Error('Failed to open database'));
        };
    });
}

/**
 * アップロードのリトライ回数を更新
 */
async function updateUploadRetryCount(uploadId, retryCount) {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('ManholeInspectionDB', 1);
        
        request.onsuccess = (event) => {
            const db = event.target.result;
            const transaction = db.transaction(['pendingUploads'], 'readwrite');
            const store = transaction.objectStore('pendingUploads');
            const getRequest = store.get(uploadId);
            
            getRequest.onsuccess = () => {
                const data = getRequest.result;
                if (data) {
                    data.retryCount = retryCount;
                    const putRequest = store.put(data);
                    
                    putRequest.onsuccess = () => resolve();
                    putRequest.onerror = () => reject(new Error('Failed to update retry count'));
                } else {
                    resolve(); // データが見つからない場合は正常終了
                }
            };
            
            getRequest.onerror = () => {
                reject(new Error('Failed to get upload data'));
            };
        };
        
        request.onerror = () => {
            reject(new Error('Failed to open database'));
        };
    });
}

/**
 * キャッシュ状態を取得
 */
async function getCacheStatus() {
    try {
        const cacheNames = await caches.keys();
        const status = {};
        
        for (const cacheName of cacheNames) {
            const cache = await caches.open(cacheName);
            const keys = await cache.keys();
            status[cacheName] = keys.length;
        }
        
        return {
            caches: status,
            isOnline: navigator.onLine
        };
    } catch (error) {
        console.error('Failed to get cache status:', error);
        return { error: error.message };
    }
}
