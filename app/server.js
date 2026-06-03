const express = require('express');
const cors = require('cors');
const { spawn, exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

const app = express();
const PORT = 3000;

const isPkg = typeof process.pkg !== 'undefined';

// Physical directory on user's machine to run external binaries
const USER_DATA_DIR = path.join(os.homedir(), '.yt-dlp-web');
const BIN_DIR = path.join(USER_DATA_DIR, 'bin');
const CONFIG_PATH = path.join(USER_DATA_DIR, 'config.json');
const DEFAULT_DOWNLOADS_PATH = path.join(os.homedir(), 'Downloads', 'YT-Downloads');

// Ensure directories exist
if (!fs.existsSync(USER_DATA_DIR)) fs.mkdirSync(USER_DATA_DIR, { recursive: true });
if (!fs.existsSync(BIN_DIR)) fs.mkdirSync(BIN_DIR, { recursive: true });

// Config management - persists user's download folder preference
function loadConfig() {
    try {
        if (fs.existsSync(CONFIG_PATH)) {
            return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
        }
    } catch (err) {
        console.error('Failed to load config:', err.message);
    }
    return { downloadsPath: DEFAULT_DOWNLOADS_PATH };
}

function saveConfig(config) {
    try {
        fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf-8');
    } catch (err) {
        console.error('Failed to save config:', err.message);
    }
}

function getDownloadsPath() {
    const config = loadConfig();
    const dlPath = config.downloadsPath || DEFAULT_DOWNLOADS_PATH;
    // Ensure the directory exists
    if (!fs.existsSync(dlPath)) {
        try {
            fs.mkdirSync(dlPath, { recursive: true });
        } catch (err) {
            console.error('Failed to create downloads directory:', err.message);
            // Fallback to default
            if (!fs.existsSync(DEFAULT_DOWNLOADS_PATH)) {
                fs.mkdirSync(DEFAULT_DOWNLOADS_PATH, { recursive: true });
            }
            return DEFAULT_DOWNLOADS_PATH;
        }
    }
    return dlPath;
}

// Ensure default downloads directory exists on startup
if (!fs.existsSync(getDownloadsPath())) {
    fs.mkdirSync(getDownloadsPath(), { recursive: true });
}

// Target executable paths
const YT_DLP_PATH = path.join(BIN_DIR, 'yt-dlp.exe');
const FFMPEG_PATH = BIN_DIR; // yt-dlp expects FFMPEG_PATH to be the directory containing ffmpeg.exe

// Extract binaries from pkg if running in packaged mode
function extractBinaries() {
    const binaries = ['yt-dlp.exe', 'ffmpeg.exe'];
    
    for (const bin of binaries) {
        const destPath = path.join(BIN_DIR, bin);
        
        // Resolve source path (in pkg, it's inside the virtual directory. In dev, it is in app/bin)
        let srcPath = path.join(__dirname, 'bin', bin);
        if (!isPkg && !fs.existsSync(srcPath)) {
            // Fallback for development if bin is not inside app/bin yet
            srcPath = path.join(__dirname, '..', bin === 'yt-dlp.exe' ? 'yt-dlp.exe' : 'ffmpeg-8.0.1-full_build/bin/ffmpeg.exe');
        }
        
        if (!fs.existsSync(srcPath)) {
            console.error(`Source binary not found: ${srcPath}`);
            continue;
        }

        let shouldExtract = false;
        if (!fs.existsSync(destPath)) {
            shouldExtract = true;
        } else {
            // Compare file sizes to see if they differ
            try {
                const srcStats = fs.statSync(srcPath);
                const destStats = fs.statSync(destPath);
                if (srcStats.size !== destStats.size) {
                    shouldExtract = true;
                }
            } catch (err) {
                shouldExtract = true;
            }
        }
        
        if (shouldExtract) {
            console.log(`Extracting ${bin} to ${destPath}...`);
            try {
                const data = fs.readFileSync(srcPath);
                fs.writeFileSync(destPath, data);
                // Make sure the binary is executable
                fs.chmodSync(destPath, 0o755);
            } catch (err) {
                console.error(`Failed to extract ${bin}:`, err.message);
            }
        }
    }
}

// Call extraction immediately
extractBinaries();

// Track active downloads for abort functionality
const activeDownloads = new Map();

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ===== Config API =====
// Get current config (download path)
app.get('/api/config', (req, res) => {
    const config = loadConfig();
    res.json({
        downloadsPath: config.downloadsPath || DEFAULT_DOWNLOADS_PATH,
        defaultPath: DEFAULT_DOWNLOADS_PATH
    });
});

// Set download path
app.post('/api/config', (req, res) => {
    const { downloadsPath } = req.body;
    if (!downloadsPath || typeof downloadsPath !== 'string') {
        return res.status(400).json({ error: 'Invalid downloads path' });
    }

    // Normalize path separators
    const normalizedPath = path.resolve(downloadsPath.trim());

    // Try to create the directory if it doesn't exist
    try {
        if (!fs.existsSync(normalizedPath)) {
            fs.mkdirSync(normalizedPath, { recursive: true });
        }
    } catch (err) {
        return res.status(400).json({ error: `Cannot create directory: ${err.message}` });
    }

    // Verify write permission by creating a temp file
    const testFile = path.join(normalizedPath, '.write-test');
    try {
        fs.writeFileSync(testFile, 'test');
        fs.unlinkSync(testFile);
    } catch (err) {
        return res.status(400).json({ error: `No write permission to this folder: ${err.message}` });
    }

    const config = loadConfig();
    config.downloadsPath = normalizedPath;
    saveConfig(config);

    console.log('Downloads path updated to:', normalizedPath);
    res.json({ success: true, downloadsPath: normalizedPath });
});

// Open folder in system file explorer
app.post('/api/open-folder', (req, res) => {
    const dlPath = getDownloadsPath();
    if (process.platform === 'win32') {
        exec(`explorer "${dlPath}"`);
    } else if (process.platform === 'darwin') {
        exec(`open "${dlPath}"`);
    } else {
        exec(`xdg-open "${dlPath}"`);
    }
    res.json({ success: true });
});

// Select folder via system dialog
app.post('/api/select-folder', (req, res) => {
    console.log('📂 Opening folder selection dialog...');
    if (process.platform === 'win32') {
        // PowerShell command to open FolderBrowserDialog in STA mode, wrapped in a topmost transparent form
        const psCommand = `powershell -NoProfile -ExecutionPolicy Bypass -STA -Command "Add-Type -AssemblyName System.Windows.Forms; $form = New-Object System.Windows.Forms.Form; $form.TopMost = $true; $form.Opacity = 0; $form.ShowInTaskbar = $false; $form.Show(); $dialog = New-Object System.Windows.Forms.FolderBrowserDialog; $dialog.Description = 'Select Downloads Folder'; $dialog.ShowNewFolderButton = $true; if ($dialog.ShowDialog($form) -eq [System.Windows.Forms.DialogResult]::OK) { Write-Output $dialog.SelectedPath }; $form.Close()"`;
        
        exec(psCommand, (err, stdout, stderr) => {
            if (err) {
                console.error('Folder dialog error:', err);
                return res.status(500).json({ error: 'Failed to open folder dialog' });
            }
            const selectedPath = stdout.trim();
            if (!selectedPath) {
                console.log('Folder dialog cancelled by user');
                return res.json({ success: false, cancelled: true });
            }
            console.log('Selected folder from dialog:', selectedPath);
            res.json({ success: true, path: selectedPath });
        });
    } else if (process.platform === 'darwin') {
        const appleScript = `osascript -e "POSIX path of (choose folder with prompt \\"Select Downloads Folder\\")"`;
        exec(appleScript, (err, stdout, stderr) => {
            if (err) {
                // If user cancels, AppleScript exits with error code
                console.log('Folder dialog cancelled by user');
                return res.json({ success: false, cancelled: true });
            }
            const selectedPath = stdout.trim();
            console.log('Selected folder from dialog:', selectedPath);
            res.json({ success: true, path: selectedPath });
        });
    } else {
        // Linux
        exec('zenity --file-selection --directory --title="Select Downloads Folder"', (err, stdout, stderr) => {
            if (err) {
                console.log('Folder dialog cancelled by user');
                return res.json({ success: false, cancelled: true });
            }
            const selectedPath = stdout.trim();
            console.log('Selected folder from dialog:', selectedPath);
            res.json({ success: true, path: selectedPath });
        });
    }
});

// Get available formats for a URL
app.post('/api/formats', (req, res) => {
    const { url } = req.body;

    if (!url) {
        return res.status(400).json({ error: 'URL is required' });
    }

    const args = ['-F', '--no-warnings', url];
    const process = spawn(YT_DLP_PATH, args);

    let output = '';
    let error = '';

    process.stdout.on('data', (data) => {
        output += data.toString();
    });

    process.stderr.on('data', (data) => {
        error += data.toString();
    });

    process.on('close', (code) => {
        if (code !== 0) {
            return res.status(500).json({ error: error || 'Failed to fetch formats' });
        }

        // Parse formats from output
        const lines = output.split('\n');
        const formats = [];

        for (const line of lines) {
            const match = line.match(/^(\d+)\s+(\w+)\s+(\d+x\d+|\w+)/);
            if (match) {
                formats.push({
                    id: match[1],
                    ext: match[2],
                    resolution: match[3]
                });
            }
        }

        res.json({ formats, raw: output });
    });
});

// Cleanup partial/incomplete files from downloads folder
function cleanupPartialFiles() {
    try {
        const currentDlPath = getDownloadsPath();
        const files = fs.readdirSync(currentDlPath);
        const partialPatterns = ['.part', '.ytdl', '.temp', '.tmp'];

        files.forEach(file => {
            const isPartial = partialPatterns.some(pattern => file.endsWith(pattern)) ||
                file.includes('.f') && file.includes('.part'); // Fragment files like .f140.part

            if (isPartial) {
                const filePath = path.join(currentDlPath, file);
                try {
                    fs.unlinkSync(filePath);
                    console.log(`Cleaned up partial file: ${file}`);
                } catch (err) {
                    console.log(`Could not delete ${file}: ${err.message}`);
                }
            }
        });
    } catch (err) {
        console.log('Cleanup error:', err.message);
    }
}

// Abort a download
app.post('/api/abort/:id', (req, res) => {
    const downloadId = req.params.id;
    const downloadProcess = activeDownloads.get(downloadId);

    if (downloadProcess) {
        console.log(`Aborting download: ${downloadId}`);
        downloadProcess.kill('SIGTERM');
        activeDownloads.delete(downloadId);

        // Clean up partial files after a short delay to ensure process has stopped
        setTimeout(() => {
            cleanupPartialFiles();
        }, 1000);

        res.json({ success: true, message: 'Download aborted and partial files cleaned up' });
    } else {
        res.status(404).json({ error: 'Download not found or already completed' });
    }
});

// Download video/audio
app.post('/api/download', (req, res) => {
    const { url, mode, quality, audioFormat } = req.body;

    // Generate unique download ID
    const downloadId = Date.now().toString(36) + Math.random().toString(36).substr(2);

    console.log('\n=== Download Request ===');
    console.log('Download ID:', downloadId);
    console.log('URL:', url);
    console.log('Mode:', mode);
    console.log('Quality:', quality);

    if (!url) {
        return res.status(400).json({ error: 'URL is required' });
    }

    // Set headers for SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Prevent buffering in proxies
    res.flushHeaders(); // Establish connection immediately

    // Send the download ID to the client immediately
    res.write(`data: ${JSON.stringify({ type: 'started', downloadId })}\n\n`);

    let args = [];
    const currentDlPath = getDownloadsPath();
    const outputTemplate = path.join(currentDlPath, '%(title)s.%(ext)s');

    // Speed optimization flags - maximize download speed
    const speedFlags = [
        '--concurrent-fragments', '16',    // Download 16 fragments simultaneously
        '--buffer-size', '64K',            // Larger buffer size for better throughput
        '--http-chunk-size', '10M',        // 10MB chunks for faster downloads
        '--no-mtime',                      // Don't set modification time (faster)
    ];

    if (mode === 'audio') {
        const format = audioFormat || 'mp3';

        // For opus - download native format directly (no conversion needed, much faster)
        // For other formats - need ffmpeg conversion
        if (format === 'opus') {
            args = [
                '-f', 'bestaudio[acodec=opus]/bestaudio',
                '-o', outputTemplate,
                '--no-warnings',
                '--newline',
                '--progress',
                ...speedFlags,
                url
            ];
        } else {
            // mp3, m4a, flac, wav need conversion
            args = [
                '-x',
                '--audio-format', format,
                '--ffmpeg-location', FFMPEG_PATH,
                '-o', outputTemplate,
                '--no-warnings',
                '--newline',
                '--progress',
                ...speedFlags,
                url
            ];
        }
    } else {
        // Video mode
        let formatString = 'best';
        if (quality && quality !== 'best') {
            formatString = `bestvideo[height<=${quality}]+bestaudio/best[height<=${quality}]`;
        }
        args = [
            '-f', formatString,
            '--ffmpeg-location', FFMPEG_PATH,
            '-o', outputTemplate,
            '--no-warnings',
            '--newline',
            '--progress',
            '--merge-output-format', 'mp4',
            ...speedFlags,
            url
        ];
    }

    console.log('YT-DLP Path:', YT_DLP_PATH);
    console.log('Args:', args.join(' '));

    const downloadProcess = spawn(YT_DLP_PATH, args);
    console.log('Process spawned with PID:', downloadProcess.pid);

    // Track this download
    activeDownloads.set(downloadId, downloadProcess);

    let hasError = false;
    let errorMessage = '';
    let wasAborted = false;

    downloadProcess.stdout.on('data', (data) => {
        const message = data.toString().trim();
        if (message) {
            res.write(`data: ${JSON.stringify({ type: 'progress', message })}\n\n`);
        }
    });

    // yt-dlp writes progress to stderr, so we treat it as progress unless process fails
    downloadProcess.stderr.on('data', (data) => {
        const message = data.toString().trim();
        if (message) {
            errorMessage += message + '\n';
            // Send as progress during download - we'll determine if it's an error on close
            res.write(`data: ${JSON.stringify({ type: 'progress', message })}\n\n`);
        }
    });

    downloadProcess.on('error', (err) => {
        hasError = true;
        res.write(`data: ${JSON.stringify({ type: 'error', message: `Failed to start yt-dlp: ${err.message}` })}\n\n`);
        res.end();
    });

    downloadProcess.on('close', (code, signal) => {
        console.log('Process exited with code:', code, 'signal:', signal);
        if (code !== 0 && errorMessage) {
            console.log('Error details:', errorMessage);
        }

        // Clean up tracking
        activeDownloads.delete(downloadId);
        hasError = true; // Prevent killing after close

        if (signal === 'SIGTERM') {
            wasAborted = true;
            res.write(`data: ${JSON.stringify({ type: 'aborted', message: 'Download was stopped' })}\n\n`);
        } else if (code === 0) {
            res.write(`data: ${JSON.stringify({ type: 'complete', message: 'Download complete!' })}\n\n`);
        } else {
            res.write(`data: ${JSON.stringify({ type: 'error', message: errorMessage || 'Download failed' })}\n\n`);
        }
        res.end();
    });

    // Note: We don't kill the process on client disconnect
    // Let downloads complete in the background
});

// Get video info using YouTube oEmbed API (much faster than yt-dlp)
app.get('/api/info', async (req, res) => {
    const { url } = req.query;

    if (!url) {
        return res.status(400).json({ error: 'URL is required' });
    }

    try {
        // Extract video ID from URL
        const videoId = extractVideoId(url);
        if (!videoId) {
            return res.status(400).json({ error: 'Invalid YouTube URL' });
        }

        // Use YouTube's oEmbed API for fast metadata
        const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;

        const response = await fetch(oembedUrl);
        if (!response.ok) {
            throw new Error('Failed to fetch video info');
        }

        const data = await response.json();

        // Use high quality thumbnail
        const thumbnail = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;

        res.json({
            title: data.title,
            thumbnail: thumbnail,
            uploader: data.author_name
        });
    } catch (err) {
        console.error('Error fetching video info:', err);
        res.status(500).json({ error: 'Failed to fetch video info' });
    }
});

// Helper function to extract YouTube video ID
function extractVideoId(url) {
    const patterns = [
        /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([^&\n?#]+)/,
        /youtube\.com\/shorts\/([^&\n?#]+)/
    ];

    for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match) return match[1];
    }
    return null;
}

// Auto-update yt-dlp on startup
function updateYtDlp() {
    console.log('🔄 Checking for yt-dlp updates...');

    const updateProcess = spawn(YT_DLP_PATH, ['-U']);
    let output = '';

    updateProcess.stdout.on('data', (data) => {
        output += data.toString();
    });

    updateProcess.stderr.on('data', (data) => {
        output += data.toString();
    });

    updateProcess.on('close', (code) => {
        if (output.includes('up to date') || output.includes('Up to date')) {
            console.log('✅ yt-dlp is already up to date');
        } else if (output.includes('Updated') || output.includes('Updating')) {
            console.log('✅ yt-dlp has been updated!');
            console.log(output.trim());
        } else if (code === 0) {
            console.log('✅ yt-dlp update check complete');
        } else {
            console.log('⚠️ Update check failed (will use existing version)');
        }
    });
}

// Browser auto-opener helper
function openBrowser(url) {
    let command = '';
    switch (process.platform) {
        case 'darwin':
            command = `open "${url}"`;
            break;
        case 'win32':
            command = `start "" "${url}"`;
            break;
        default:
            command = `xdg-open "${url}"`;
    }
    exec(command, (err) => {
        if (err) {
            console.error('Failed to open browser:', err);
        }
    });
}

// Start server
app.listen(PORT, () => {
    console.log(`
╔═══════════════════════════════════════════════════════╗
║                                                       ║
║   🎬 YT-DLP Web Interface is running!                 ║
║                                                       ║
║   Open in browser: http://localhost:${PORT}              ║
║   Downloads will be saved to: ${getDownloadsPath()}       ║
║                                                       ║
║   Press Ctrl+C to stop the server                     ║
║                                                       ║
╚═══════════════════════════════════════════════════════╝
    `);

    // Auto-open browser on startup
    console.log('🌐 Opening interface in browser...');
    openBrowser(`http://localhost:${PORT}`);

    // Check for updates 5 seconds after server starts (non-blocking)
    setTimeout(updateYtDlp, 5000);
});
