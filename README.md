# YT-DLP Video Manager (v1.0)

A beautiful, self-hosted web interface wrapper for [yt-dlp](https://github.com/yt-dlp/yt-dlp) and [FFmpeg](https://ffmpeg.org/), designed to make downloading high-quality videos and audio streams from YouTube and other sites incredibly easy.

---

## ✨ Features

- **Modern Web Interface:** Clean, responsive, glassmorphic UI styled with custom dark-mode aesthetics.
- **Instant Video Previews:** Paste a URL to quickly fetch the video thumbnail, title, and uploader name using fast oEmbed caching.
- **Multiple Formats & Qualities:**
  - **Video:** Download in resolutions ranging from standard 360p up to 4K (2160p) with automatic audio merging.
  - **Audio:** Extract high-quality audio files directly to `MP3`, `Opus` (native download), `M4A`, `FLAC`, or `WAV`.
- **Maximized Download Speeds:** Pre-configured speed flags enabling multi-threaded fragment downloads (`--concurrent-fragments 16`), larger buffer sizes, and optimal chunk sizes.
- **Real-Time Progress Logs:** Watch download percentages, file size estimations, speeds, and ETA updates in real-time.
- **Cancel Anytime:** Clean abort mechanism that terminates the download process immediately and automatically cleans up partial/fragment temp files.
- **Self-Updating Engine:** Automatically checks for and applies `yt-dlp` updates on startup.

---

## 🛠️ Project Structure

```text
Video-Manager/
├── app/
│   ├── public/             # Frontend assets (HTML, CSS, JS)
│   │   ├── index.html      # Main user interface
│   │   ├── styles.css      # Glassmorphic custom CSS styling
│   │   └── app.js          # Web-socket/API connection and UI logic
│   ├── package.json        # Node.js dependencies (Express, CORS, pkg config)
│   └── server.js           # Backend server spawning yt-dlp and managing processes
├── start.bat               # Convenient launcher script for local dev
├── .gitignore              # Ignores downloads, node_modules, and heavy binaries
└── README.md               # Project documentation
```

---

## 🚀 Getting Started

### Prerequisites

To run this application locally in development mode, you need:
1. **Node.js** (v18 or higher recommended)
2. **yt-dlp.exe** downloaded and placed in the project root folder.
3. **FFmpeg** binaries (`ffmpeg.exe`) placed in `ffmpeg-8.0.1-full_build/bin/` inside the project root folder.

### Local Development Setup

1. Clone this repository or copy the project files:
   ```bash
   git clone https://github.com/Salmantahir002/Video-Manager.git
   cd Video-Manager
   ```

2. Double-click `start.bat` or run:
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
