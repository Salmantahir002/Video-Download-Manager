// DOM Elements
const urlInput = document.getElementById('urlInput');
const pasteBtn = document.getElementById('pasteBtn');
const videoModeBtn = document.getElementById('videoModeBtn');
const audioModeBtn = document.getElementById('audioModeBtn');
const videoOptions = document.getElementById('videoOptions');
const audioOptions = document.getElementById('audioOptions');
const qualitySelect = document.getElementById('qualitySelect');
const audioFormatSelect = document.getElementById('audioFormatSelect');
const downloadBtn = document.getElementById('downloadBtn');
const progressSection = document.getElementById('progressSection');
const progressFill = document.getElementById('progressFill');
const progressText = document.getElementById('progressText');
const statusMessage = document.getElementById('statusMessage');
const videoPreview = document.getElementById('videoPreview');
const previewContent = document.getElementById('previewContent');
const thumbnail = document.getElementById('thumbnail');
const videoTitle = document.getElementById('videoTitle');
const videoUploader = document.getElementById('videoUploader');
const stopBtn = document.getElementById('stopBtn');
const toggleSlider = document.getElementById('toggleSlider');

// State
let currentMode = 'video';
let isDownloading = false;
let debounceTimer = null;
let currentDownloadId = null;
let abortController = null;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
});

function setupEventListeners() {
    // Paste button
    pasteBtn.addEventListener('click', async () => {
        try {
            const text = await navigator.clipboard.readText();
            urlInput.value = text;
            urlInput.dispatchEvent(new Event('input'));
            // Visual feedback
            pasteBtn.style.color = 'var(--success)';
            pasteBtn.style.borderColor = 'var(--success)';
            setTimeout(() => {
                pasteBtn.style.color = '';
                pasteBtn.style.borderColor = '';
            }, 800);
        } catch (err) {
            showStatus('error', 'Unable to access clipboard');
        }
    });

    // URL input - fetch preview on change
    urlInput.addEventListener('input', () => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            if (isValidUrl(urlInput.value)) {
                fetchVideoInfo(urlInput.value);
            } else {
                hidePreview();
            }
        }, 500);
    });

    // Mode toggle
    videoModeBtn.addEventListener('click', () => setMode('video'));
    audioModeBtn.addEventListener('click', () => setMode('audio'));

    // Download button
    downloadBtn.addEventListener('click', startDownload);

    // Stop button
    stopBtn.addEventListener('click', stopDownload);

    // Enter key to download
    urlInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            startDownload();
        }
    });
}

function setMode(mode) {
    currentMode = mode;

    if (mode === 'video') {
        videoModeBtn.classList.add('active');
        audioModeBtn.classList.remove('active');
        videoOptions.classList.remove('hidden');
        audioOptions.classList.add('hidden');
        toggleSlider.classList.remove('right');
    } else {
        audioModeBtn.classList.add('active');
        videoModeBtn.classList.remove('active');
        audioOptions.classList.remove('hidden');
        videoOptions.classList.add('hidden');
        toggleSlider.classList.add('right');
    }
}

function isValidUrl(string) {
    try {
        const url = new URL(string);
        return url.hostname.includes('youtube.com') ||
            url.hostname.includes('youtu.be') ||
            url.hostname.includes('youtube');
    } catch (_) {
        return false;
    }
}

async function fetchVideoInfo(url) {
    try {
        const response = await fetch(`/api/info?url=${encodeURIComponent(url)}`);

        if (!response.ok) throw new Error('Failed to fetch video info');

        const info = await response.json();
        showPreview(info);
    } catch (err) {
        hidePreview();
    }
}

function showPreview(info) {
    thumbnail.src = info.thumbnail;
    videoTitle.textContent = info.title;
    videoUploader.textContent = info.uploader;

    const placeholder = document.getElementById('previewPlaceholder');
    if (placeholder) placeholder.style.display = 'none';
    previewContent.classList.add('active');
}

function hidePreview() {
    const placeholder = document.getElementById('previewPlaceholder');
    if (placeholder) placeholder.style.display = 'flex';
    previewContent.classList.remove('active');
}

async function startDownload() {
    const url = urlInput.value.trim();

    if (!url) {
        showStatus('error', 'Please enter a video URL');
        return;
    }

    if (!isValidUrl(url)) {
        showStatus('error', 'Please enter a valid YouTube URL');
        return;
    }

    if (isDownloading) return;

    isDownloading = true;
    currentDownloadId = null;
    abortController = new AbortController();
    downloadBtn.classList.add('loading');
    downloadBtn.disabled = true;
    hideStatus();
    showProgress();

    try {
        const body = {
            url,
            mode: currentMode,
            quality: currentMode === 'video' ? qualitySelect.value : null,
            audioFormat: currentMode === 'audio' ? audioFormatSelect.value : null
        };

        const response = await fetch('/api/download', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
            signal: abortController.signal
        });

        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const text = decoder.decode(value);
            const lines = text.split('\n');

            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    try {
                        const data = JSON.parse(line.slice(6));
                        handleProgressUpdate(data);
                    } catch (e) {
                        // Ignore parse errors
                    }
                }
            }
        }
    } catch (err) {
        if (err.name === 'AbortError') {
            console.log('Download was cancelled by user');
        } else {
            showStatus('error', 'Download failed. Please try again.');
        }
        hideProgress();
    } finally {
        isDownloading = false;
        currentDownloadId = null;
        abortController = null;
        downloadBtn.classList.remove('loading');
        downloadBtn.disabled = false;
    }
}

async function stopDownload() {
    if (!isDownloading) return;

    if (abortController) {
        abortController.abort();
    }

    if (currentDownloadId) {
        try {
            await fetch(`/api/abort/${currentDownloadId}`, {
                method: 'POST'
            });
        } catch (err) {
            console.error('Error aborting download:', err);
        }
    }

    hideProgress();
    showStatus('error', 'Download was stopped.');

    isDownloading = false;
    currentDownloadId = null;
    abortController = null;
    downloadBtn.classList.remove('loading');
    downloadBtn.disabled = false;
}

function handleProgressUpdate(data) {
    if (data.type === 'started') {
        currentDownloadId = data.downloadId;
    } else if (data.type === 'progress') {
        progressText.textContent = data.message;

        // Parse percentage from message if available
        const percentMatch = data.message.match(/(\d+\.?\d*)%/);
        if (percentMatch) {
            const percent = parseFloat(percentMatch[1]);
            progressFill.style.width = `${percent}%`;
        }
    } else if (data.type === 'complete') {
        progressFill.style.width = '100%';
        setTimeout(() => {
            hideProgress();
            showStatus('success', 'Download complete! Check your downloads folder.');
        }, 500);
    } else if (data.type === 'aborted') {
        hideProgress();
        showStatus('error', 'Download was stopped.');
    } else if (data.type === 'error') {
        hideProgress();
        showStatus('error', data.message || 'Download failed');
    }
}

function showProgress() {
    progressSection.classList.remove('hidden');
    progressFill.style.width = '0%';
    progressText.textContent = 'Preparing download…';
}

function hideProgress() {
    progressSection.classList.add('hidden');
}

function showStatus(type, message) {
    statusMessage.className = `toast ${type}`;
    statusMessage.querySelector('.status-text').textContent = message;
}

function hideStatus() {
    statusMessage.className = 'toast hidden';
}

// ===== Download Location Settings =====
const currentPathText = document.getElementById('currentPathText');
const changePathBtn = document.getElementById('changePathBtn');
const pathEditRow = document.getElementById('pathEditRow');
const pathInput = document.getElementById('pathInput');
const savePathBtn = document.getElementById('savePathBtn');
const cancelPathBtn = document.getElementById('cancelPathBtn');
const openFolderBtn = document.getElementById('openFolderBtn');
const resetPathBtn = document.getElementById('resetPathBtn');
const pathDisplay = document.getElementById('pathDisplay');

let currentConfig = { downloadsPath: '', defaultPath: '' };

// Fetch config on load
async function loadConfigFromServer() {
    try {
        const res = await fetch('/api/config');
        if (res.ok) {
            currentConfig = await res.json();
            currentPathText.textContent = currentConfig.downloadsPath;
        }
    } catch (err) {
        currentPathText.textContent = 'Failed to load path';
    }
}

// Save new path
async function saveNewPath(newPath) {
    try {
        const res = await fetch('/api/config', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ downloadsPath: newPath })
        });
        const data = await res.json();
        if (res.ok && data.success) {
            currentConfig.downloadsPath = data.downloadsPath;
            currentPathText.textContent = data.downloadsPath;
            hideEditRow();
            showStatus('success', 'Download location updated!');
        } else {
            showStatus('error', data.error || 'Failed to update path');
        }
    } catch (err) {
        showStatus('error', 'Failed to save path. Is the server running?');
    }
}

async function selectFolderDialog() {
    if (changePathBtn.disabled) return;

    const originalHTML = changePathBtn.innerHTML;
    changePathBtn.disabled = true;
    changePathBtn.classList.add('loading');
    changePathBtn.innerHTML = `
        <div class="loading-spinner-small"></div>
        Opening…
    `;
    hideStatus();

    try {
        const res = await fetch('/api/select-folder', { method: 'POST' });
        if (!res.ok) throw new Error('API request failed');

        const data = await res.json();
        if (data.success && data.path) {
            await saveNewPath(data.path);
        } else if (data.error) {
            showStatus('error', data.error);
        } else if (data.cancelled) {
            console.log('User cancelled folder selection dialog.');
        }
    } catch (err) {
        showStatus('error', 'Failed to launch file manager. Falling back to manual text entry.');
        showEditRow();
    } finally {
        changePathBtn.disabled = false;
        changePathBtn.classList.remove('loading');
        changePathBtn.innerHTML = originalHTML;
    }
}

function showEditRow() {
    pathInput.value = currentConfig.downloadsPath;
    pathEditRow.classList.remove('hidden');
    pathInput.focus();
    pathInput.select();
}

function hideEditRow() {
    pathEditRow.classList.add('hidden');
    pathInput.value = '';
}

// Event listeners for settings
if (changePathBtn) {
    changePathBtn.addEventListener('click', selectFolderDialog);
}

if (cancelPathBtn) {
    cancelPathBtn.addEventListener('click', hideEditRow);
}

if (savePathBtn) {
    savePathBtn.addEventListener('click', () => {
        const newPath = pathInput.value.trim();
        if (!newPath) {
            showStatus('error', 'Please enter a valid folder path');
            return;
        }
        saveNewPath(newPath);
    });
}

if (pathInput) {
    pathInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            savePathBtn.click();
        }
    });
}

if (openFolderBtn) {
    openFolderBtn.addEventListener('click', async () => {
        try {
            await fetch('/api/open-folder', { method: 'POST' });
        } catch (err) {
            showStatus('error', 'Failed to open folder');
        }
    });
}

if (resetPathBtn) {
    resetPathBtn.addEventListener('click', async () => {
        if (currentConfig.defaultPath) {
            await saveNewPath(currentConfig.defaultPath);
            showStatus('success', 'Download location reset to default.');
        }
    });
}

// ===== Supported Sites Modal Logic =====
const supportedSitesBtn = document.getElementById('supportedSitesBtn');
const sitesModal = document.getElementById('sitesModal');
const modalOverlay = document.getElementById('modalOverlay');
const modalCloseBtn = document.getElementById('modalCloseBtn');
const modalSearchInput = document.getElementById('modalSearchInput');
const modalLoading = document.getElementById('modalLoading');
const modalError = document.getElementById('modalError');
const modalSitesList = document.getElementById('modalSitesList');
const modalRetryBtn = document.getElementById('modalRetryBtn');

let allSupportedSites = [];

// Open Modal
if (supportedSitesBtn) {
    supportedSitesBtn.addEventListener('click', () => {
        sitesModal.classList.remove('hidden');
        document.body.style.overflow = 'hidden'; // Lock background scrolling
        if (allSupportedSites.length === 0) {
            fetchSupportedSites();
        } else {
            renderSites(allSupportedSites);
            modalSearchInput.focus();
        }
    });
}

// Close Modal
function closeSitesModal() {
    sitesModal.classList.add('hidden');
    document.body.style.overflow = ''; // Restore scroll
    modalSearchInput.value = ''; // Clear search filter
}

if (modalOverlay) modalOverlay.addEventListener('click', closeSitesModal);
if (modalCloseBtn) modalCloseBtn.addEventListener('click', closeSitesModal);

// Close on ESC key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !sitesModal.classList.contains('hidden')) {
        closeSitesModal();
    }
});

// Fetch Supported Sites List
async function fetchSupportedSites() {
    modalLoading.classList.remove('hidden');
    modalError.classList.add('hidden');
    modalSitesList.classList.add('hidden');
    
    try {
        const res = await fetch('/api/supported-sites');
        if (!res.ok) throw new Error('API error');
        
        const data = await res.json();
        if (data && data.sites && data.sites.length > 0) {
            allSupportedSites = data.sites;
            modalLoading.classList.add('hidden');
            modalSitesList.classList.remove('hidden');
            renderSites(allSupportedSites);
            modalSearchInput.focus();
        } else {
            // Empty array means background process is still loading on startup
            setTimeout(fetchSupportedSites, 1500); // Retry in 1.5s
        }
    } catch (err) {
        modalLoading.classList.add('hidden');
        modalError.classList.remove('hidden');
    }
}

if (modalRetryBtn) {
    modalRetryBtn.addEventListener('click', fetchSupportedSites);
}

// Filter sites on search input
if (modalSearchInput) {
    modalSearchInput.addEventListener('input', () => {
        const query = modalSearchInput.value.toLowerCase().trim();
        const filtered = allSupportedSites.filter(site => site.toLowerCase().includes(query));
        renderSites(filtered);
    });
}

// Render sites to the list
function renderSites(sites) {
    modalSitesList.innerHTML = '';
    
    if (sites.length === 0) {
        const placeholder = document.createElement('li');
        placeholder.className = 'modal__item';
        placeholder.style.gridColumn = '1 / -1';
        placeholder.style.color = 'var(--text-muted)';
        placeholder.textContent = 'No matching sites found';
        modalSitesList.appendChild(placeholder);
        return;
    }
    
    // Efficiently append items in fragments
    const fragment = document.createDocumentFragment();
    sites.forEach(site => {
        const li = document.createElement('li');
        li.className = 'modal__item';
        li.textContent = site;
        li.title = `Download from ${site}`;
        
        // Add click helper to insert search suggestion to main input if they click
        li.addEventListener('click', () => {
            urlInput.value = `https://www.${site.toLowerCase()}.com/`;
            urlInput.focus();
            closeSitesModal();
            // Trigger input event to show preview or clear previous
            urlInput.dispatchEvent(new Event('input'));
        });
        
        fragment.appendChild(li);
    });
    modalSitesList.appendChild(fragment);
}

// Load config on startup
document.addEventListener('DOMContentLoaded', () => {
    loadConfigFromServer();
});
