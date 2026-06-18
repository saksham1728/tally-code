# 🚀 Getting Started with Tally Bridge

## 📋 Prerequisites

Before you start, make sure you have:

1. **Node.js 18+** installed
   ```bash
   node --version  # Should be 18 or higher
   ```

2. **Tally Prime/ERP 9** installed on your computer

3. **Cloud backend** running (the main portal from tally-layer folder)

---

## 🔧 Installation

### Step 1: Install Dependencies

```bash
cd tally-bridge
npm install
```

This will install all required packages:
- electron (desktop framework)
- electron-store (config storage)
- keytar (secure credentials)
- ws (WebSocket client)
- axios (HTTP requests)
- xml2js (XML parsing)
- winston (logging)
- uuid (unique IDs)

---

## 🏃 Running in Development Mode

```bash
npm run dev
# or
npm start
```

This will:
1. Start the Electron app
2. Show the login screen
3. Create system tray icon
4. Initialize logger and config

---

## 🧪 Testing the App

### 1. **Enable Tally ODBC Server**

In Tally:
1. Press `F12` (Configure)
2. Go to `Advanced Configuration`
3. Find `ODBC Server`
4. Enable it (Port 9000)
5. Restart Tally

### 2. **Start Cloud Backend**

```bash
cd ../backend
npm start
# Backend should be running on port 3000
```

### 3. **Login to Tally Bridge**

Use your portal credentials:
- Email: `saksham@test.com`
- Password: `saksham28`

### 4. **Test Features**

1. **Test Tally Connection**
   - Click "Test Tally" button
   - Should show "Connected" if Tally is running

2. **Manual Sync**
   - Click "Sync Now" button
   - Check activity log for results

3. **Settings**
   - Click "Settings" button
   - Verify all config values
   - Test save functionality

4. **System Tray**
   - Minimize window (goes to tray)
   - Right-click tray icon
   - Test tray menu options

---

## 🏗️ Building Installers

### For Windows (.exe):

```bash
npm run build:win
```

Output: `dist/TallyBridge-Setup-1.0.0.exe`

### For macOS (.dmg):

```bash
npm run build:mac
```

Output: `dist/TallyBridge-1.0.0.dmg`

---

## 📁 Project Structure

```
tally-bridge/
├── main.js                 # Electron main process
├── preload.js             # Security bridge
├── package.json           # Dependencies
│
├── src/                   # Core logic
│   ├── auth-manager.js    # JWT auth
│   ├── tally-connector.js # Tally API
│   ├── cloud-client.js    # WebSocket
│   ├── sync-engine.js     # Auto-sync
│   ├── config-manager.js  # Settings
│   └── logger.js          # Logging
│
├── renderer/              # UI files
│   ├── login.html         # Login screen
│   ├── index.html         # Dashboard
│   ├── settings.html      # Settings page
│   ├── styles.css         # Styling
│   └── renderer.js        # UI logic
│
└── build/                 # Icons (TODO)
    └── icon.png.txt       # Icon guide
```

---

## 🔍 Debugging

### View Logs

**macOS:**
```bash
~/Library/Application Support/tally-bridge/logs/app.log
```

**Windows:**
```bash
%APPDATA%\tally-bridge\logs\app.log
```

### View Config

**macOS:**
```bash
~/Library/Application Support/tally-bridge/config.json
```

**Windows:**
```bash
%APPDATA%\tally-bridge\config.json
```

### Open DevTools

In development mode:
- Press `Cmd+Option+I` (Mac) or `Ctrl+Shift+I` (Windows)
- Or add this to main.js: `mainWindow.webContents.openDevTools()`

---

## 🐛 Common Issues

### "Tally connection failed"
**Solution:**
1. Make sure Tally is running
2. Enable ODBC Server in Tally (F12 → Advanced)
3. Check if port 9000 is accessible
4. Try: `http://localhost:9000` in browser

### "Cloud connection failed"
**Solution:**
1. Check if backend is running (port 3000)
2. Verify cloud endpoint in settings
3. Check internet connection
4. Look at logs for WebSocket errors

### "Login failed"
**Solution:**
1. Verify backend is running
2. Check email/password
3. Test login directly on web portal
4. Check backend logs for auth errors

### "Module not found" errors
**Solution:**
```bash
rm -rf node_modules package-lock.json
npm install
```

---

## 📝 Configuration

Default settings (can be changed in Settings page):

```json
{
  "tallyEndpoint": "http://localhost:9000",
  "cloudEndpoint": "ws://localhost:3000",
  "syncInterval": 900000,  // 15 minutes
  "autoSync": true,
  "autoStart": true,
  "logLevel": "info"
}
```

---

## 🔐 Security Notes

1. **Credentials** are stored in OS keychain (secure)
2. **WebSocket** uses JWT authentication
3. **Logs** don't contain sensitive data
4. **Config** is stored locally (not encrypted)

---

## 🎯 Next Steps

1. ✅ Install dependencies: `npm install`
2. ✅ Start in dev mode: `npm start`
3. ✅ Test all features
4. 🔄 Create proper icons (build/*.png)
5. 🔄 Test on Windows
6. 🔄 Test on macOS
7. 🔄 Build installers
8. 🔄 Deploy to users

---

## 📚 Additional Resources

- **Architecture**: See `../TALLY_BRIDGE_ARCHITECTURE.md`
- **Tasks**: See `TASKS.md`
- **Progress**: See `PROGRESS.md`

---

## 💬 Support

For issues or questions:
- Check logs first
- Review architecture document
- Test each component individually
- Verify backend is working

---

**Happy Coding! 🚀**
