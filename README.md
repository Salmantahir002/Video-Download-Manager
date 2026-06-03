# YT-DLP Video Manager (v3.0)

A beautiful, self-hosted web interface wrapper designed to make downloading high-quality videos and audio streams from YouTube and other sites incredibly easy.

---

## ✨ Features

- **Modern Web Interface:** Clean, responsive, glassmorphic UI styled with custom dark-mode aesthetics.
- **Maximized Download Speeds (aria2c):** Integrates `aria2c` as an external downloader, enabling multi-threaded HTTP/DASH/HLS downloads (up to 16 connections per file) to achieve the highest possible speed of your internet connection.
- **Searchable Supported Sites Directory:** A dynamic header button that loads and caches all 1,400+ supported sites from `yt-dlp`, featuring a real-time search bar and click-to-input shortcuts.
- **Instant Folder Picker:** Custom native C# compiled helper to trigger the Windows Explorer-style directory picker instantly (with PowerShell and manual text fallbacks).
- **Instant Video Previews:** Paste a URL to quickly fetch the video thumbnail, title, and uploader name using fast oEmbed caching.
- **Multiple Formats & Qualities:**
  - **Video:** Download in resolutions ranging from standard 360p up to 4K (2160p) with automatic audio merging.
  - **Audio:** Extract high-quality audio files directly to `MP3`, `Opus` (native download), `M4A`, `FLAC`, or `WAV`.
- **Real-Time Progress Logs:** Watch download percentages, file size estimations, speeds, and ETA updates in real-time.
- **Cancel Anytime:** Clean abort mechanism that terminates the download process immediately and automatically cleans up partial/fragment temp files.
- **Self-Updating Engine:** Automatically checks for and applies `yt-dlp` updates on startup.

---

## 📋 Prerequisites

Before running this application locally, you must ensure the following are installed and configured:

### 1. Node.js
- **Minimum version required:** **Node.js v18.0.0+** (v20+ recommended).
- Verify your installation by running `node -v` in your terminal.
- Download link: [Node.js Official Website](https://nodejs.org/)

### 2. External Binaries (Required in Development)
You must download and place in the `app/bin/` directory manually:

*   **FFmpeg (`ffmpeg.exe`):**
    - **Purpose:** Merges separate high-quality video and audio streams downloaded by `yt-dlp` (required for resolutions like 1080p, 4K, and for MP3 conversions).
    - **Download:** Download the latest release from the official Windows builds page: [Gyan.dev FFmpeg Builds](https://www.gyan.dev/ffmpeg/builds/) (e.g., `ffmpeg-release-essentials.zip`).
    - **Placement:** Extract the zip, find `ffmpeg.exe` in the extracted `bin/` subfolder, and copy it to:
      `Video-Download-Manager/app/bin/ffmpeg.exe`

---

## 🛠️ Project Structure

```text
Video-Download-Manager/
├── app/
│   ├── bin/
│   │   ├── aria2c.exe        # High-speed multi-threaded downloader
│   │   ├── ffmpeg.exe        # Video/audio merger and converter
│   │   ├── folder_picker.cs  # Folder selection dialog source code
│   │   ├── folder_picker.exe # Compiled folder selection helper
│   │   └── yt-dlp.exe        # Core downloading engine
│   ├── public/               # Web client files (HTML, CSS, JS)
│   │   ├── index.html        # Glassmorphic user interface
│   │   ├── styles.css        # Responsive dark-mode styling
│   │   └── app.js            # Frontend controller logic
│   ├── package.json          # Node.js dependencies & pkg compilation options
│   └── server.js             # Express API backend
├── .gitignore                # Version control exclusions
└── README.md                 # Project documentation
```

---

### Local Development Setup

1. Clone this repository or copy the project files:
   ```bash
   git clone https://github.com/Salmantahir002/Video-Download-Manager.git
   cd Video-Download-Manager
   ```

2. Run the application:
   ```bash
   # Navigate to the app folder
   cd app
   
   # Install dependencies
   npm install
   
   # Start the application
   node server.js
   ```

3. The application will launch and open your web browser automatically at `http://localhost:3000`.

---

## 📝 License & Disclaimer

This project is for educational and personal use only. Please respect the terms of service of YouTube and any other platform from which you download content.
