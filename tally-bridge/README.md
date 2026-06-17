# 🌉 Tally Bridge - Desktop Connector

Desktop application that bridges local Tally software with cloud-based B2B invoice sync platform.

## 🎯 What It Does

- Connects to local Tally (localhost:9000)
- Syncs invoices with cloud portal via WebSocket
- Runs as background system tray application
- Auto-sync every 15 minutes
- Push/pull invoices between Tally and cloud

## 🚀 Quick Start

### Development
```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Build for production
npm run build:win  # Windows .exe
npm run build:mac  # macOS .dmg
```

## 📋 Prerequisites

- Node.js 18+ installed
- Tally Prime/ERP 9 installed
- Tally ODBC Server enabled (F12 → Advanced → ODBC Server)
- Cloud portal credentials

## 🏗️ Architecture

See [ARCHITECTURE.md](../TALLY_BRIDGE_ARCHITECTURE.md) for detailed architecture documentation.

## 📂 Project Structure

```
tally-bridge/
├── main.js              # Electron main process
├── preload.js           # Security bridge
├── src/                 # Core logic
│   ├── tally-connector.js
│   ├── cloud-client.js
│   ├── auth-manager.js
│   ├── config-manager.js
│   ├── sync-engine.js
│   ├── logger.js
│   └── auto-updater.js
├── renderer/            # UI (HTML/CSS/JS)
│   ├── index.html
│   ├── login.html
│   ├── settings.html
│   ├── styles.css
│   └── renderer.js
└── build/              # Build assets
    ├── icon.ico
    └── icon.png
```

## 🔧 Development Status

See [TASKS.md](TASKS.md) for current development progress.

## 📝 License

MIT License - See LICENSE file for details
