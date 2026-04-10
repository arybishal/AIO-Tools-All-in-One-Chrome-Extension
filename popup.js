document.addEventListener('DOMContentLoaded', () => {
    // ========================================
    // Tile-Based Navigation
    // ========================================
    const featureTiles = document.querySelectorAll('.feature-tile');
    const featureContents = document.querySelectorAll('.feature-content');
    const tilesGrid = document.querySelector('.tiles-grid');
    const contentArea = document.querySelector('.content-area');

    // Map tile data-feature to content IDs
    const featureMap = {
        'tab-manager': 'tab-manager-content',
        'screenshot-tool': 'screenshot-tool-content',
        'pip-tool': 'pip-tool-content',
        'rightclick-tool': 'rightclick-tool-content',
        'download-manager': 'download-manager-content',
        'settings': 'settings-content',
        'about': 'about-content'
    };

    // Show tiles, hide all content initially
    function showTiles() {
        if (tilesGrid) tilesGrid.style.display = 'grid';
        if (contentArea) contentArea.style.display = 'none';
        featureContents.forEach(content => content.classList.remove('active'));
    }

    // Hide tiles, show specific content
    function showContent(contentId) {
        if (tilesGrid) tilesGrid.style.display = 'none';
        if (contentArea) contentArea.style.display = 'block';
        featureContents.forEach(content => {
            content.classList.remove('active');
            if (content.id === contentId) {
                content.classList.add('active');
            }
        });
    }

    // Handle tile clicks
    featureTiles.forEach(tile => {
        tile.addEventListener('click', () => {
            const feature = tile.dataset.feature;
            const contentId = featureMap[feature];
            if (contentId) {
                showContent(contentId);
            }
        });
    });

    // Add back button functionality to content headers
    featureContents.forEach(content => {
        const header = content.querySelector('.content-header h2');
        if (header) {
            header.style.cursor = 'pointer';
            header.addEventListener('click', () => {
                showTiles();
            });
            header.title = 'Click to go back';
        }
    });

    // Initialize - show tiles
    showTiles();
    
    // Force tiles to be visible
    if (tilesGrid) {
        tilesGrid.style.display = 'grid';
        tilesGrid.style.visibility = 'visible';
    }

    // ========================================
    // Tab Manager Section
    // ========================================
    const messageArea = document.getElementById('messageArea');
    const manualAddSection = document.getElementById('manualAddSection');
    const editSection = document.getElementById('editSection');
    const urlList = document.getElementById('urlList');
    const manualUrlInput = document.getElementById('manualUrlInput');
    const urlCounter = document.getElementById('urlCounter');
    const tileUrlCounter = document.getElementById('tileUrlCounter');
    const fileInput = document.getElementById('fileInput');

    const btnAddCurrent = document.getElementById('btnAddCurrent');
    const btnAddManual = document.getElementById('btnAddManual');
    const btnEdit = document.getElementById('btnEdit');
    const btnEject = document.getElementById('btnEject');
    const btnClearAll = document.getElementById('btnClearAll');
    const btnSaveManual = document.getElementById('btnSaveManual');
    const btnCancelManual = document.getElementById('btnCancelManual');
    const btnCloseEdit = document.getElementById('btnCloseEdit');
    const btnExport = document.getElementById('btnExport');
    const btnImport = document.getElementById('btnImport');

    function showMessage(text, type = 'info') {
        messageArea.textContent = text;
        messageArea.className = `message-area ${type} show`;
        setTimeout(() => {
            messageArea.className = 'message-area';
        }, 3000);
    }

    function isValidUrl(string) {
        try {
            new URL(string);
            return true;
        } catch (_) {
            return false;
        }
    }

    function getSavedUrls() {
        return new Promise((resolve) => {
            chrome.storage.local.get(['urls'], (result) => {
                resolve(result.urls || []);
            });
        });
    }

    function saveUrls(urls) {
        return new Promise((resolve) => {
            chrome.storage.local.set({ urls }, () => {
                updateUrlCounter();
                resolve();
            });
        });
    }

    async function updateUrlCounter() {
        const urls = await getSavedUrls();
        const count = urls.length;
        const label = `${count} URL${count !== 1 ? 's' : ''}`;

        if (urlCounter) {
            urlCounter.textContent = label;
        }

        if (tileUrlCounter) {
            tileUrlCounter.textContent = label;
        }
    }

    // Add Current Tab URL
    btnAddCurrent.addEventListener('click', async () => {
        manualAddSection.classList.add('hidden');
        editSection.classList.add('hidden');

        chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
            if (!tabs || tabs.length === 0) {
                showMessage('No active tab found', 'error');
                return;
            }
            const currentUrl = tabs[0].url;

            if (!currentUrl) {
                showMessage('Cannot save this page', 'error');
                return;
            }

            const urls = await getSavedUrls();
            if (urls.includes(currentUrl)) {
                showMessage('URL already saved!', 'error');
                return;
            }

            urls.push(currentUrl);
            await saveUrls(urls);
            showMessage('✓ Current URL saved!', 'success');
        });
    });

    // Add Manual URL
    btnAddManual.addEventListener('click', () => {
        manualAddSection.classList.remove('hidden');
        editSection.classList.add('hidden');
        manualUrlInput.value = '';
        manualUrlInput.focus();
    });

    btnCancelManual.addEventListener('click', () => {
        manualAddSection.classList.add('hidden');
    });

    btnSaveManual.addEventListener('click', async () => {
        const rawUrl = manualUrlInput.value.trim();

        if (!rawUrl) {
            showMessage('Please enter a URL', 'error');
            return;
        }

        let urlToSave = rawUrl;
        if (!/^https?:\/\//i.test(urlToSave)) {
            urlToSave = 'https://' + urlToSave;
        }

        if (!isValidUrl(urlToSave)) {
            showMessage('Invalid URL format', 'error');
            return;
        }

        const urls = await getSavedUrls();
        if (urls.includes(urlToSave)) {
            showMessage('URL already exists', 'error');
            return;
        }

        urls.push(urlToSave);
        await saveUrls(urls);

        manualUrlInput.value = '';
        manualAddSection.classList.add('hidden');
        showMessage('✓ URL saved successfully', 'success');
    });

    manualUrlInput.addEventListener('keypress', async (e) => {
        if (e.key === 'Enter') {
            await btnSaveManual.click();
        }
    });

    // Edit URLs
    async function renderUrlList() {
        urlList.innerHTML = '';
        const urls = await getSavedUrls();

        if (urls.length === 0) {
            urlList.innerHTML = `
                <li class="empty-state">
                    <div class="empty-state-icon">📭</div>
                    <div>No URLs saved yet.<br>Add some URLs to get started!</div>
                </li>
            `;
            return;
        }

        urls.forEach((url, index) => {
            const li = document.createElement('li');
            li.className = 'url-list-item-enter';

            const numberSpan = document.createElement('span');
            numberSpan.className = 'url-number';
            numberSpan.textContent = index + 1;

            const span = document.createElement('span');
            span.className = 'url-text';
            span.textContent = url;
            span.title = url;

            const delBtn = document.createElement('button');
            delBtn.className = 'delete-btn';
            delBtn.textContent = '✕';
            delBtn.title = 'Remove URL';
            delBtn.onclick = async () => {
                const currentUrls = await getSavedUrls();
                currentUrls.splice(index, 1);
                await saveUrls(currentUrls);
                renderUrlList();
                showMessage('URL removed', 'info');
            };

            li.appendChild(numberSpan);
            li.appendChild(span);
            li.appendChild(delBtn);
            urlList.appendChild(li);
        });
    }

    btnEdit.addEventListener('click', () => {
        editSection.classList.remove('hidden');
        manualAddSection.classList.add('hidden');
        renderUrlList();
    });

    btnCloseEdit.addEventListener('click', () => {
        editSection.classList.add('hidden');
    });

    // Clear All URLs
    btnClearAll.addEventListener('click', async () => {
        const urls = await getSavedUrls();
        if (urls.length === 0) {
            showMessage('No URLs to clear', 'info');
            return;
        }

        if (confirm(`Are you sure you want to clear all ${urls.length} saved URLs?`)) {
            await saveUrls([]);
            showMessage('✓ All URLs cleared', 'success');
        }
    });

    // EJECT
    btnEject.addEventListener('click', async () => {
        const urls = await getSavedUrls();

        if (urls.length === 0) {
            showMessage('No URLs to eject!', 'error');
            return;
        }

        if (urls.length === 1) {
            showMessage(`Ejecting 1 URL...`, 'info');
        } else {
            showMessage(`Ejecting ${urls.length} URLs...`, 'info');
        }

        const currentWindow = await chrome.windows.getCurrent();

        await chrome.windows.create({
            url: urls,
            focused: true,
            state: 'maximized'
        });

        if (currentWindow && currentWindow.id) {
            chrome.windows.remove(currentWindow.id);
        }
    });

    // Export URLs
    btnExport.addEventListener('click', async () => {
        const urls = await getSavedUrls();

        if (urls.length === 0) {
            showMessage('No URLs to export', 'error');
            return;
        }

        const exportData = {
            version: '1.0-beta',
            exportedAt: new Date().toISOString(),
            count: urls.length,
            urls: urls
        };

        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `aio-urls-${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        showMessage(`✓ Exported ${urls.length} URLs`, 'success');
    });

    // Import URLs
    btnImport.addEventListener('click', () => {
        fileInput.click();
    });

    fileInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        fileInput.value = '';

        try {
            const text = await file.text();
            let importData;

            try {
                importData = JSON.parse(text);
            } catch (parseError) {
                showMessage('Invalid JSON file format', 'error');
                return;
            }

            let urlsToImport = [];
            if (Array.isArray(importData)) {
                urlsToImport = importData;
            } else if (importData && Array.isArray(importData.urls)) {
                urlsToImport = importData.urls;
            } else {
                showMessage('No valid URLs found in file', 'error');
                return;
            }

            const validUrls = urlsToImport.filter(url => {
                if (typeof url !== 'string') return false;
                let testUrl = url;
                if (!/^https?:\/\//i.test(testUrl)) {
                    testUrl = 'https://' + testUrl;
                }
                return isValidUrl(testUrl);
            });

            if (validUrls.length === 0) {
                showMessage('No valid URLs found in file', 'error');
                return;
            }

            const existingUrls = await getSavedUrls();
            let addedCount = 0;

            validUrls.forEach(url => {
                let normalizedUrl = url;
                if (!/^https?:\/\//i.test(normalizedUrl)) {
                    normalizedUrl = 'https://' + normalizedUrl;
                }
                if (!existingUrls.includes(normalizedUrl)) {
                    existingUrls.push(normalizedUrl);
                    addedCount++;
                }
            });

            await saveUrls(existingUrls);

            if (addedCount === 0) {
                showMessage('All URLs already exist', 'info');
            } else {
                showMessage(`✓ Imported ${addedCount} new URLs`, 'success');
            }

        } catch (error) {
            console.error('Import error:', error);
            showMessage('Error reading file', 'error');
        }
    });

    // Initialize URL counter
    updateUrlCounter();

    // ========================================
    // Picture-in-Picture Video Section
    // ========================================
    const pipMessage = document.getElementById('pipMessage');
    const pipControls = document.getElementById('pipControls');
    const pipStatus = document.getElementById('pipStatus');
    const pipTimeline = document.getElementById('pipTimeline');
    const pipCurrentTime = document.getElementById('pipCurrentTime');
    const pipDuration = document.getElementById('pipDuration');

    const btnActivatePiP = document.getElementById('btnActivatePiP');
    const btnPiPRewind = document.getElementById('btnPiPRewind');
    const btnPiPPlayPause = document.getElementById('btnPiPPlayPause');
    const btnPiPForward = document.getElementById('btnPiPForward');
    const btnPiPMute = document.getElementById('btnPiPMute');
    const btnClosePiP = document.getElementById('btnClosePiP');

    function showPipMessage(text, type = 'info') {
        pipMessage.textContent = text;
        pipMessage.className = `message-area ${type} show`;
        setTimeout(() => {
            pipMessage.className = 'message-area';
        }, 3000);
    }

    function formatTime(seconds) {
        if (isNaN(seconds) || !isFinite(seconds)) return '0:00';
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    // Activate PiP
    btnActivatePiP.addEventListener('click', async () => {
        try {
            showPipMessage('Searching for video...', 'info');
            
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            
            if (!tab) {
                showPipMessage('No active tab found', 'error');
                return;
            }

            // Inject script to find and activate PiP
            const results = await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                func: async () => {
                    // Find all video elements
                    const videos = Array.from(document.querySelectorAll('video'));
                    
                    if (videos.length === 0) {
                        return { success: false, error: 'No video found on this page' };
                    }

                    // Find a video that can be played
                    let targetVideo = null;
                    for (const video of videos) {
                        if (video.readyState >= 1) { // HAVE_METADATA
                            targetVideo = video;
                            break;
                        }
                    }

                    if (!targetVideo && videos.length > 0) {
                        targetVideo = videos[0];
                    }

                    if (!targetVideo) {
                        return { success: false, error: 'No playable video found' };
                    }

                    try {
                        // Check if PiP is already active
                        if (document.pictureInPictureElement) {
                            await document.exitPictureInPicture();
                            return { success: true, action: 'exited', message: 'PiP closed' };
                        }

                        // Request PiP
                        const pipWindow = await targetVideo.requestPictureInPicture();
                        
                        // Set up event listeners
                        targetVideo.addEventListener('timeupdate', () => {
                            window.postMessage({
                                type: 'AIO_PIP_TIMEUPDATE',
                                currentTime: targetVideo.currentTime,
                                duration: targetVideo.duration
                            }, '*');
                        });

                        targetVideo.addEventListener('play', () => {
                            window.postMessage({ type: 'AIO_PIP_PLAY' }, '*');
                        });

                        targetVideo.addEventListener('pause', () => {
                            window.postMessage({ type: 'AIO_PIP_PAUSE' }, '*');
                        });

                        targetVideo.addEventListener('volumechange', () => {
                            window.postMessage({
                                type: 'AIO_PIP_VOLUME',
                                muted: targetVideo.muted,
                                volume: targetVideo.volume
                            }, '*');
                        });

                        pipWindow.addEventListener('leave', () => {
                            window.postMessage({ type: 'AIO_PIP_LEAVE' }, '*');
                        });

                        return {
                            success: true,
                            action: 'entered',
                            message: 'PiP activated!',
                            duration: targetVideo.duration,
                            currentTime: targetVideo.currentTime,
                            muted: targetVideo.muted,
                            playing: !targetVideo.paused
                        };
                    } catch (err) {
                        return { success: false, error: err.message };
                    }
                }
            });

            if (results && results[0] && results[0].result) {
                const result = results[0].result;
                
                if (result.success) {
                    if (result.action === 'entered') {
                        showPipMessage(result.message, 'success');
                        pipControls.classList.remove('hidden');
                        pipStatus.textContent = 'PiP Active';
                        
                        // Update timeline
                        if (result.duration) {
                            pipDuration.textContent = formatTime(result.duration);
                            pipTimeline.max = result.duration;
                        }
                        
                        // Update play/pause button
                        updatePlayPauseBtn(result.playing);
                        
                        // Update mute button
                        updateMuteBtn(result.muted);
                    } else if (result.action === 'exited') {
                        showPipMessage(result.message, 'info');
                        pipControls.classList.add('hidden');
                        pipStatus.textContent = 'Ready';
                    }
                } else {
                    showPipMessage(result.error || 'Failed to activate PiP', 'error');
                }
            }
        } catch (error) {
            console.error('PiP error:', error);
            showPipMessage('Error: ' + error.message, 'error');
        }
    });

    // Rewind 10 seconds
    btnPiPRewind.addEventListener('click', async () => {
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                func: () => {
                    const video = document.querySelector('video');
                    if (video) {
                        video.currentTime = Math.max(0, video.currentTime - 10);
                    }
                }
            });
            showPipMessage('Rewound 10 seconds', 'info');
        } catch (error) {
            showPipMessage('Error rewinding', 'error');
        }
    });

    // Forward 10 seconds
    btnPiPForward.addEventListener('click', async () => {
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                func: () => {
                    const video = document.querySelector('video');
                    if (video) {
                        video.currentTime = Math.min(video.duration, video.currentTime + 10);
                    }
                }
            });
            showPipMessage('Forwarded 10 seconds', 'info');
        } catch (error) {
            showPipMessage('Error forwarding', 'error');
        }
    });

    // Play/Pause
    btnPiPPlayPause.addEventListener('click', async () => {
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            const results = await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                func: () => {
                    const video = document.querySelector('video');
                    if (video) {
                        if (video.paused) {
                            video.play();
                            return { playing: true };
                        } else {
                            video.pause();
                            return { playing: false };
                        }
                    }
                    return null;
                }
            });
            
            if (results && results[0] && results[0].result) {
                updatePlayPauseBtn(results[0].result.playing);
            }
        } catch (error) {
            showPipMessage('Error toggling playback', 'error');
        }
    });

    function updatePlayPauseBtn(isPlaying) {
        const btn = btnPiPPlayPause;
        btn.querySelector('span:first-child').textContent = isPlaying ? '⏸️' : '▶️';
        btn.querySelector('.btn-label').textContent = isPlaying ? 'Pause' : 'Play';
    }

    // Mute/Unmute
    btnPiPMute.addEventListener('click', async () => {
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            const results = await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                func: () => {
                    const video = document.querySelector('video');
                    if (video) {
                        video.muted = !video.muted;
                        return { muted: video.muted };
                    }
                    return null;
                }
            });
            
            if (results && results[0] && results[0].result) {
                updateMuteBtn(results[0].result.muted);
            }
        } catch (error) {
            showPipMessage('Error toggling mute', 'error');
        }
    });

    function updateMuteBtn(isMuted) {
        const btn = btnPiPMute;
        btn.querySelector('span:first-child').textContent = isMuted ? '🔇' : '🔊';
        btn.querySelector('.btn-label').textContent = isMuted ? 'Unmute' : 'Mute';
    }

    // Timeline seek
    pipTimeline.addEventListener('change', async (e) => {
        try {
            const time = parseFloat(e.target.value);
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                func: (seekTime) => {
                    const video = document.querySelector('video');
                    if (video) {
                        video.currentTime = seekTime;
                    }
                },
                args: [time]
            });
        } catch (error) {
            showPipMessage('Error seeking', 'error');
        }
    });

    // Close PiP
    btnClosePiP.addEventListener('click', async () => {
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                func: () => {
                    if (document.pictureInPictureElement) {
                        document.exitPictureInPicture();
                    }
                }
            });
            pipControls.classList.add('hidden');
            pipStatus.textContent = 'Ready';
            showPipMessage('PiP closed', 'info');
        } catch (error) {
            showPipMessage('Error closing PiP', 'error');
        }
    });

    // Listen for messages from content script
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.type === 'AIO_PIP_TIMEUPDATE') {
            pipCurrentTime.textContent = formatTime(message.currentTime);
            pipTimeline.value = message.currentTime;
        } else if (message.type === 'AIO_PIP_PLAY') {
            updatePlayPauseBtn(true);
        } else if (message.type === 'AIO_PIP_PAUSE') {
            updatePlayPauseBtn(false);
        } else if (message.type === 'AIO_PIP_VOLUME') {
            updateMuteBtn(message.muted);
        } else if (message.type === 'AIO_PIP_LEAVE') {
            pipControls.classList.add('hidden');
            pipStatus.textContent = 'Ready';
            showPipMessage('PiP closed', 'info');
        }
    });

    // ========================================
    // Download Manager Section
    // ========================================
    const imageusMessage = document.getElementById('imageusMessage');
    const imageusStatus = document.getElementById('imageusStatus');
    const imageCount = document.getElementById('imageCount');
    const videoCount = document.getElementById('videoCount');

    const btnEnableDownloads = document.getElementById('btnEnableDownloads');
    const btnDisableDownloads = document.getElementById('btnDisableDownloads');

    function showImageusMessage(text, type = 'info') {
        imageusMessage.textContent = text;
        imageusMessage.className = `message-area ${type} show`;
        setTimeout(() => {
            imageusMessage.className = 'message-area';
        }, 3000);
    }

    // Enable Download Buttons
    btnEnableDownloads.addEventListener('click', async () => {
        try {
            showImageusMessage('Adding download buttons...', 'info');
            
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            
            if (!tab) {
                showImageusMessage('No active tab found', 'error');
                return;
            }

            // Inject script to add download buttons
            const results = await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                func: addDownloadButtons
            });

            if (results && results[0] && results[0].result) {
                const { images, videos } = results[0].result;
                imageCount.textContent = images;
                videoCount.textContent = videos;
                
                showImageusMessage(`✓ Added download buttons to ${images} images and ${videos} videos!`, 'success');
                imageusStatus.classList.remove('hidden');
            }
        } catch (error) {
            showImageusMessage('Error: ' + error.message, 'error');
        }
    });

    // Disable Download Buttons
    btnDisableDownloads.addEventListener('click', async () => {
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            
            if (tab) {
                await chrome.tabs.reload(tab.id);
                showImageusMessage('Download buttons disabled', 'info');
                imageusStatus.classList.add('hidden');
            }
        } catch (error) {
            showImageusMessage('Error: ' + error.message, 'error');
        }
    });

    // Content script function to add download buttons
    function addDownloadButtons() {
        // Remove existing download buttons
        document.querySelectorAll('.aio-download-btn').forEach(btn => btn.remove());

        let imageCount = 0;
        let videoCount = 0;

        // Add download buttons to images
        document.querySelectorAll('img').forEach(img => {
            if (img.src && img.src.startsWith('http') && !img.closest('.aio-download-btn')) {
                imageCount++;
                
                // Create download button
                const downloadBtn = document.createElement('button');
                downloadBtn.className = 'aio-download-btn';
                downloadBtn.textContent = '⬇';
                downloadBtn.style.cssText = `
                    position: absolute;
                    top: 5px;
                    right: 5px;
                    z-index: 2147483647;
                    background: linear-gradient(135deg, #d4a017 0%, #dc143c 100%);
                    color: white;
                    border: none;
                    border-radius: 50%;
                    width: 32px;
                    height: 32px;
                    font-size: 16px;
                    cursor: pointer;
                    opacity: 0;
                    transition: opacity 0.2s;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.3);
                `;

                // Show button on hover
                img.style.position = img.style.position || 'relative';
                img.parentNode.style.position = 'relative';
                img.parentNode.appendChild(downloadBtn);

                img.addEventListener('mouseenter', () => {
                    downloadBtn.style.opacity = '1';
                });

                img.addEventListener('mouseleave', () => {
                    downloadBtn.style.opacity = '0';
                });

                // Download on click
                downloadBtn.addEventListener('click', async (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    
                    try {
                        // Use File System Access API to ask where to save
                        if (window.showSaveFilePicker) {
                            const fileName = img.src.split('/').pop().split('?')[0] || 'image.jpg';
                            const handle = await window.showSaveFilePicker({
                                suggestedName: fileName,
                                types: [{
                                    description: 'Image File',
                                    accept: { 'image/*': ['.jpg', '.jpeg', '.png', '.gif', '.webp'] }
                                }]
                            });
                            
                            // Fetch and save the image
                            const response = await fetch(img.src);
                            const blob = await response.blob();
                            const writable = await handle.createWritable();
                            await writable.write(blob);
                            await writable.close();
                        } else {
                            // Fallback: open in new tab
                            window.open(img.src, '_blank');
                        }
                    } catch (err) {
                        if (err.name !== 'AbortError') {
                            // Open in new tab as fallback
                            window.open(img.src, '_blank');
                        }
                    }
                });
            }
        });

        // Add download buttons to videos
        document.querySelectorAll('video').forEach(video => {
            if ((video.src || video.poster) && !video.closest('.aio-download-btn')) {
                videoCount++;
                
                const videoSrc = video.src || video.poster;
                
                const downloadBtn = document.createElement('button');
                downloadBtn.className = 'aio-download-btn';
                downloadBtn.textContent = '⬇';
                downloadBtn.style.cssText = `
                    position: absolute;
                    top: 5px;
                    right: 5px;
                    z-index: 2147483647;
                    background: linear-gradient(135deg, #d4a017 0%, #dc143c 100%);
                    color: white;
                    border: none;
                    border-radius: 50%;
                    width: 32px;
                    height: 32px;
                    font-size: 16px;
                    cursor: pointer;
                    opacity: 0;
                    transition: opacity 0.2s;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.3);
                `;

                video.style.position = video.style.position || 'relative';
                video.parentNode.style.position = 'relative';
                video.parentNode.appendChild(downloadBtn);

                video.addEventListener('mouseenter', () => {
                    downloadBtn.style.opacity = '1';
                });

                video.addEventListener('mouseleave', () => {
                    downloadBtn.style.opacity = '0';
                });

                downloadBtn.addEventListener('click', async (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    
                    try {
                        if (window.showSaveFilePicker) {
                            const fileName = videoSrc.split('/').pop().split('?')[0] || 'video.mp4';
                            const handle = await window.showSaveFilePicker({
                                suggestedName: fileName,
                                types: [{
                                    description: 'Video File',
                                    accept: { 'video/*': ['.mp4', '.webm', '.ogg', '.mov'] }
                                }]
                            });
                            
                            const response = await fetch(videoSrc);
                            const blob = await response.blob();
                            const writable = await handle.createWritable();
                            await writable.write(blob);
                            await writable.close();
                        } else {
                            window.open(videoSrc, '_blank');
                        }
                    } catch (err) {
                        if (err.name !== 'AbortError') {
                            window.open(videoSrc, '_blank');
                        }
                    }
                });
            }
        });

        return { images: imageCount, videos: videoCount };
    }

    // ========================================
    // Screenshot Tool Section
    // ========================================
    const screenshotMessage = document.getElementById('screenshotMessage');
    const screenshotPreview = document.getElementById('screenshotPreview');
    const screenshotImage = document.getElementById('screenshotImage');

    const btnCaptureVisible = document.getElementById('btnCaptureVisible');
    const btnCaptureFull = document.getElementById('btnCaptureFull');
    const btnCaptureWindow = document.getElementById('btnCaptureWindow');
    const btnEditScreenshot = document.getElementById('btnEditScreenshot');
    const btnDownloadPreview = document.getElementById('btnDownloadPreview');
    const btnClosePreview = document.getElementById('btnClosePreview');

    let currentScreenshot = null;

    function showScreenshotMessage(text, type = 'info') {
        screenshotMessage.textContent = text;
        screenshotMessage.className = `message-area ${type} show`;
        setTimeout(() => {
            screenshotMessage.className = 'message-area';
        }, 3000);
    }

    // Capture Visible Area
    btnCaptureVisible.addEventListener('click', async () => {
        try {
            showScreenshotMessage('Capturing visible area...', 'info');
            
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            
            if (!tab) {
                showScreenshotMessage('No active tab found', 'error');
                return;
            }

            const dataUrl = await chrome.tabs.captureVisibleTab(null, { format: 'png' });
            
            currentScreenshot = dataUrl;
            showPreview(dataUrl);
            showScreenshotMessage('✓ Screenshot captured!', 'success');
        } catch (error) {
            console.error('Capture error:', error);
            showScreenshotMessage('Failed to capture screenshot', 'error');
        }
    });

    // Capture Full Page - True full page screenshot
    btnCaptureFull.addEventListener('click', async () => {
        try {
            showScreenshotMessage('Capturing full page...', 'info');
            
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            
            if (!tab) {
                showScreenshotMessage('No active tab found', 'error');
                return;
            }

            // Get page dimensions by injecting a script
            const results = await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                func: () => {
                    return {
                        scrollHeight: document.documentElement.scrollHeight,
                        scrollWidth: document.documentElement.scrollWidth,
                        windowWidth: window.innerWidth,
                        windowHeight: window.innerHeight,
                        scrollTop: window.scrollY
                    };
                }
            });

            if (results && results[0] && results[0].result) {
                const { scrollHeight, scrollWidth, windowWidth, windowHeight, scrollTop } = results[0].result;
                
                // Calculate how many screenshots we need
                const fullHeight = scrollHeight;
                const fullWidth = scrollWidth;
                
                // For full page, we'll scroll and capture multiple screenshots
                // Then stitch them together
                const screenshots = [];
                const viewportHeight = windowHeight;
                const totalScrolls = Math.ceil(fullHeight / viewportHeight);
                
                // Scroll to top first
                await chrome.scripting.executeScript({
                    target: { tabId: tab.id },
                    func: () => {
                        window.scrollTo(0, 0);
                    }
                });

                // Wait a bit for scroll
                await new Promise(resolve => setTimeout(resolve, 300));

                // Capture each section
                for (let i = 0; i < totalScrolls; i++) {
                    showScreenshotMessage(`Capturing section ${i + 1} of ${totalScrolls}...`, 'info');
                    
                    // Capture
                    const dataUrl = await chrome.tabs.captureVisibleTab(null, { format: 'png' });
                    screenshots.push(dataUrl);
                    
                    // Scroll down (except for last one)
                    if (i < totalScrolls - 1) {
                        await chrome.scripting.executeScript({
                            target: { tabId: tab.id },
                            func: (scrollPos) => {
                                window.scrollTo(0, scrollPos);
                            },
                            args: [(i + 1) * viewportHeight]
                        });
                        
                        // Wait for scroll
                        await new Promise(resolve => setTimeout(resolve, 300));
                    }
                }

                // Scroll back to original position
                await chrome.scripting.executeScript({
                    target: { tabId: tab.id },
                    func: (scrollPos) => {
                        window.scrollTo(0, scrollPos);
                    },
                    args: [scrollTop]
                });

                // Stitch screenshots together using a canvas
                const finalCanvas = document.createElement('canvas');
                finalCanvas.width = fullWidth;
                finalCanvas.height = fullHeight;
                const finalCtx = finalCanvas.getContext('2d');

                // Load and draw all screenshots
                let loadedCount = 0;
                const images = [];
                
                for (const screenshot of screenshots) {
                    const img = new Image();
                    img.onload = () => {
                        loadedCount++;
                        if (loadedCount === screenshots.length) {
                            // All images loaded, draw them
                            images.forEach((image, index) => {
                                finalCtx.drawImage(image, 0, index * viewportHeight);
                            });
                            
                            // Convert to data URL
                            const fullPageDataUrl = finalCanvas.toDataURL('image/png');
                            currentScreenshot = fullPageDataUrl;
                            showPreview(fullPageDataUrl);
                            showScreenshotMessage('✓ Full page screenshot captured!', 'success');
                        }
                    };
                    img.src = screenshot;
                    images.push(img);
                }
            }
        } catch (error) {
            console.error('Full page capture error:', error);
            // Fallback to visible capture
            try {
                const dataUrl = await chrome.tabs.captureVisibleTab(null, { format: 'png' });
                currentScreenshot = dataUrl;
                showPreview(dataUrl);
                showScreenshotMessage('✓ Screenshot captured (visible area)', 'success');
            } catch (e) {
                showScreenshotMessage('Failed to capture screenshot', 'error');
            }
        }
    });

    // Capture Window
    btnCaptureWindow.addEventListener('click', async () => {
        try {
            showScreenshotMessage('Capturing window...', 'info');
            
            const dataUrl = await chrome.tabs.captureVisibleTab(null, { format: 'png' });
            
            currentScreenshot = dataUrl;
            showPreview(dataUrl);
            showScreenshotMessage('✓ Window screenshot captured!', 'success');
        } catch (error) {
            console.error('Window capture error:', error);
            showScreenshotMessage('Failed to capture screenshot', 'error');
        }
    });

    function showPreview(dataUrl) {
        screenshotImage.src = dataUrl;
        screenshotPreview.classList.remove('hidden');
    }

    // Edit Screenshot - Open in full editor window
    btnEditScreenshot.addEventListener('click', async () => {
        if (!currentScreenshot) return;
        
        // Store screenshot in chrome.storage.local for the editor (persists across windows)
        await chrome.storage.local.set({ 'aio-screenshot': currentScreenshot });
        
        // Open editor in a new window
        const editorUrl = chrome.runtime.getURL('editor.html');
        chrome.windows.create({
            url: editorUrl,
            type: 'popup',
            width: Math.min(1200, window.screen.width - 100),
            height: Math.min(800, window.screen.height - 100),
            left: Math.floor((window.screen.width - 1200) / 2),
            top: Math.floor((window.screen.height - 800) / 2)
        });
        
        screenshotPreview.classList.add('hidden');
        currentScreenshot = null;
    });

    // Download Preview
    btnDownloadPreview.addEventListener('click', async () => {
        if (!currentScreenshot) {
            showScreenshotMessage('No screenshot to download', 'error');
            return;
        }

        // Use File System Access API if available
        if (window.showSaveFilePicker) {
            try {
                // Send message to background script to handle file saving
                const response = await chrome.runtime.sendMessage({
                    type: 'downloadScreenshot',
                    data: currentScreenshot,
                    filename: `aio-screenshot-${new Date().toISOString().slice(0, 10)}.png`
                });
                
                if (response && response.success) {
                    showScreenshotMessage('✓ Screenshot saved!', 'success');
                } else {
                    fallbackDownload(currentScreenshot);
                }
            } catch (e) {
                fallbackDownload(currentScreenshot);
            }
        } else {
            fallbackDownload(currentScreenshot);
        }
    });

    function fallbackDownload(dataUrl) {
        const a = document.createElement('a');
        a.href = dataUrl;
        a.download = `aio-screenshot-${new Date().toISOString().slice(0, 10)}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        showScreenshotMessage('✓ Screenshot downloaded!', 'success');
    }

    // Close Preview
    btnClosePreview.addEventListener('click', () => {
        screenshotPreview.classList.add('hidden');
        currentScreenshot = null;
    });

    // ========================================
    // Settings Section
    // ========================================
    const screenshotFormat = document.getElementById('screenshotFormat');
    const screenshotQuality = document.getElementById('screenshotQuality');
    const qualityValue = document.getElementById('qualityValue');
    const autoDownload = document.getElementById('autoDownload');
    const autoEject = document.getElementById('autoEject');

    // Load settings
    chrome.storage.local.get(['settings'], (result) => {
        if (result.settings) {
            screenshotFormat.value = result.settings.format || 'png';
            screenshotQuality.value = result.settings.quality || 90;
            qualityValue.textContent = `${screenshotQuality.value}%`;
            autoDownload.checked = result.settings.autoDownload !== false;
            autoEject.checked = result.settings.autoEject !== false;
        }
    });

    // Save settings on change
    function saveSettings() {
        chrome.storage.local.set({
            settings: {
                format: screenshotFormat.value,
                quality: parseInt(screenshotQuality.value),
                autoDownload: autoDownload.checked,
                autoEject: autoEject.checked
            }
        });
    }

    screenshotFormat.addEventListener('change', saveSettings);
    
    screenshotQuality.addEventListener('input', () => {
        qualityValue.textContent = `${screenshotQuality.value}%`;
        saveSettings();
    });

    autoDownload.addEventListener('change', saveSettings);
    autoEject.addEventListener('change', saveSettings);
});