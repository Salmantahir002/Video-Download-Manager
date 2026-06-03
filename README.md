# YT-DLP Video Manager (v3.0)

A beautiful, self-hosted web interface wrapper for [yt-dlp](https://github.com/yt-dlp/yt-dlp) and [FFmpeg](https://ffmpeg.org/), designed to make downloading high-quality videos and audio streams from YouTube and other sites incredibly easy.

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
- Used to run the Express backend server.
- Verify your installation by running `node -v` in your terminal.
- Download link: [Node.js Official Website](https://nodejs.org/)

### 2. External Binaries (Required in Development)
Since heavy executables are excluded from Git control (listed in `.gitignore`), you must download and place them in the `app/bin/` directory manually:

*   **FFmpeg (`ffmpeg.exe`):**
    - **Purpose:** Merges separate high-quality video and audio streams downloaded by `yt-dlp` (required for resolutions like 1080p, 4K, and for MP3 conversions).
    - **Download:** Download the latest release from the official Windows builds page: [Gyan.dev FFmpeg Builds](https://www.gyan.dev/ffmpeg/builds/) (e.g., `ffmpeg-release-essentials.zip`).
    - **Placement:** Extract the zip, find `ffmpeg.exe` in the extracted `bin/` subfolder, and copy it to:
      `Video-Download-Manager/app/bin/ffmpeg.exe`

*   **yt-dlp (`yt-dlp.exe`):**
    - **Purpose:** The core downloading engine.
    - **Download:** Download the latest version from [yt-dlp GitHub Releases](https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe).
    - **Placement:** Save `yt-dlp.exe` directly to:
      `Video-Download-Manager/app/bin/yt-dlp.exe`

*   **aria2c (`aria2c.exe`):**
    - **Purpose:** External download accelerator that unlocks multi-threaded connections (up to 16 connections per download) to maximize download speeds.
    - **Download:** Download the latest Windows release from [aria2 GitHub Releases](https://github.com/aria2/aria2/releases) (e.g., `aria2-1.37.0-win-64bit-build1.zip`).
    - **Placement:** Extract the zip, find `aria2c.exe` in the extracted folder, and copy it to:
      `Video-Download-Manager/app/bin/aria2c.exe`

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

## 📦 Single Executable Compilation (.exe)

This project is fully prepared to be compiled into a **single standalone executable** using Vercel's `pkg` utility.

The packaging routine:
1. Bundles the Node.js runtime, Express backend, and HTML/CSS/JS frontend files.
2. Embeds the external native binaries (`yt-dlp.exe` and `ffmpeg.exe`).
3. Automatically extracts those binaries to the user's `%APPDATA%` folder on startup for seamless execution.
4. Allows downloading files directly to the user's standard `%USERPROFILE%\Downloads\YT-Downloads` folder on any Windows laptop without setup!

---

## 📝 License & Disclaimer

This project is for educational and personal use only. Please respect the terms of service of YouTube and any other platform from which you download content.
