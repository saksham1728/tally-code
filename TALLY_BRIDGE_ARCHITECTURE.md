# 🏗️ TALLY BRIDGE DESKTOP CONNECTOR - COMPLETE ARCHITECTURE

## 📋 OVERVIEW

**Purpose**: Desktop application (.exe) jo user ke local computer par chalega aur Tally software ko cloud portal se connect karega

**Technology**: Electron (JavaScript/Node.js based)
- **Output**: `.exe` file for Windows, `.dmg` for Mac
- **Runs**: Background process as system tray app
- **Size**: ~100-150 MB (includes Node.js runtime)

---

## 🎯 CORE FUNCTIONALITY

### What It Does:
1. ✅ Local Tally se connect (localhost:9000)
2. ✅ Cloud backend se WebSocket connection
3. ✅ Invoices fetch karke cloud ko send
4. ✅ Cloud se invoices receive karke Tally mein push
5. ✅ Auto-sync har 15 minutes mein
6. ✅ System tray mein background running
7. ✅ User login/settings UI

---

## 📂 PROJECT STRUCTURE

```
tally-bridge/
│
├── package.json                    # Dependencies & build config
├── main.js                        # Electron main process (entry point)
├── preload.js                     # Security bridge
│
├── src/                           # Core logic
│   ├── tally-connector.js         # Tally XML API connection
│   ├── cloud-client.js            # WebSocket to cloud backend
│   ├── auth-manager.js            # Login/token management
│   ├── config-manager.js          # Settings storage
│   ├── sync-engine.js             # Auto-sync orchestration
│   ├── logger.js                  # File logging
│   └── auto-updater.js            # App updates
│
├── renderer/                      # UI (HTML/CSS/JS)
│   ├── index.html                 # Main window
│   ├── login.html                 # Login screen
│   ├── settings.html              # Settings page
│   ├── styles.css                 # Styling
│   └── renderer.js                # UI logic
│
└── build/                         # Build assets
    ├── icon.ico                   # Windows icon
    ├── icon.png                   # Mac icon
    └── installer-config.json      # Installer settings
```

---

## 🔧 DETAILED COMPONENT ARCHITECTURE

### 1. main.js (Electron Main Process)
**Role**: App lifecycle, system tray, window management

**Responsibilities:**
- Create system tray icon with menu
- Show/hide UI window
- Auto-start on system boot
- Handle app quit/minimize
- IPC communication with renderer
- Spawn background sync process

**Features:**

#### System Tray Icon
- 🟢 Green: Connected & syncing
- 🔴 Red: Disconnected
- 🟡 Yellow: Connecting

#### Tray Menu:
- "Open Dashboard"
- "Sync Now"
- "Settings"
- "Quit"

#### Window Management:
- Hide to tray (don't quit)
- Restore from tray
- Single instance (no multiple opens)

**Code Structure:**
```javascript
const { app, BrowserWindow, Tray, Menu } = require('electron');
const path = require('path');
const SyncEngine = require('./src/sync-engine');

let tray = null;
let mainWindow = null;
let syncEngine = null;

// Create system tray
function createTray() {
  tray = new Tray(path.join(__dirname, 'build/icon.png'));
  const contextMenu = Menu.buildFromTemplate([
    { label: 'Open Dashboard', click: showWindow },
    { label: 'Sync Now', click: manualSync },
    { label: 'Settings', click: openSettings },
    { type: 'separator' },
    { label: 'Quit', click: quitApp }
  ]);
  tray.setContextMenu(contextMenu);
  tray.setToolTip('Tally Bridge');
}

// Update tray icon based on status
function updateTrayIcon(status) {
  const iconPath = {
    connected: 'icon-green.png',
    disconnected: 'icon-red.png',
    syncing: 'icon-yellow.png'
  }[status];
  tray.setImage(path.join(__dirname, 'build', iconPath));
}
```

---

### 2. src/tally-connector.js
**Role**: Connect to local Tally via XML requests

**Features:**
- Connect to localhost:9000 (Tally ODBC port)
- Send XML requests for invoice data
- Parse XML responses
- Retry logic on failure
- Circuit breaker pattern

**XML Request Example:**
```xml
<ENVELOPE>
  <HEADER>
    <VERSION>1</VERSION>
    <TALLYREQUEST>Export</TALLYREQUEST>
    <TYPE>Data</TYPE>
    <ID>VoucherList</ID>
  </HEADER>
  <BODY>
    <DESC>
      <STATICVARIABLES>
        <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
      </STATICVARIABLES>
    </DESC>
  </BODY>
</ENVELOPE>
```

**Reuses Code From:**
`backend/integrations/TallyConnector.js`

**Key Methods:**
```javascript
class TallyConnector {
  constructor() {
    this.endpoint = 'http://localhost:9000';
    this.timeout = 10000;
  }

  // Test if Tally is running
  async testConnection() { }

  // Fetch invoices from Tally
  async fetchInvoices(startDate, endDate) { }

  // Push invoice to Tally
  async pushInvoice(invoiceData) { }

  // Parse XML response
  parseXMLResponse(xml) { }
}
```

---

### 3. src/cloud-client.js
**Role**: WebSocket connection to cloud backend

**Features:**
- WebSocket connection to wss://your-backend.com
- Authentication using JWT token
- Bi-directional messaging
- Auto-reconnect on disconnect
- Heartbeat/ping-pong

**Message Types:**

1. **AUTHENTICATE**
   - → Send JWT token
   
2. **FETCH_INVOICES_REQUEST**
   - ← Cloud asks for invoices
   - → Connector fetches from Tally & responds
   
3. **PUSH_INVOICE_REQUEST**
   - ← Cloud sends invoice to push
   - → Connector pushes to Tally
   
4. **SYNC_STATUS**
   - → Connector sends sync status updates
   
5. **HEARTBEAT**
   - ↔ Keep connection alive

**WebSocket Protocol:**
```javascript
// Request format
{
  "type": "FETCH_INVOICES_REQUEST",
  "requestId": "uuid-12345",
  "payload": {
    "startDate": "2024-01-01",
    "endDate": "2024-12-31"
  }
}

// Response format
{
  "type": "FETCH_INVOICES_RESPONSE",
  "requestId": "uuid-12345",
  "success": true,
  "payload": {
    "invoices": [...]
  }
}
```

**Key Methods:**
```javascript
class CloudClient {
  constructor(endpoint, authManager) {
    this.ws = null;
    this.endpoint = endpoint;
    this.authManager = authManager;
    this.reconnectInterval = 5000;
  }

  // Connect to cloud
  async connect() { }

  // Send message to cloud
  send(type, payload) { }

  // Handle incoming messages
  onMessage(handler) { }

  // Auto-reconnect
  reconnect() { }
}
```

---

### 4. src/auth-manager.js
**Role**: Handle user authentication

**Features:**
- Login to cloud portal
- Store JWT token securely (OS keychain)
- Token refresh logic
- Logout

**Authentication Flow:**
```
1. User enters email/password in UI
2. Auth manager calls POST /api/auth/login
3. Gets JWT token
4. Stores in OS keychain (secure)
5. Uses for WebSocket auth
```

**Storage:**
- **Windows**: Windows Credential Manager
- **Mac**: Keychain Access
- **Linux**: libsecret

**Key Methods:**
```javascript
const keytar = require('keytar');
const axios = require('axios');

class AuthManager {
  constructor(apiEndpoint) {
    this.apiEndpoint = apiEndpoint;
    this.serviceName = 'tally-bridge';
  }

  // Login user
  async login(email, password) {
    const response = await axios.post(`${this.apiEndpoint}/auth/login`, {
      email, password
    });
    
    const token = response.data.token;
    await keytar.setPassword(this.serviceName, email, token);
    return token;
  }

  // Get stored token
  async getToken(email) {
    return await keytar.getPassword(this.serviceName, email);
  }

  // Logout
  async logout(email) {
    await keytar.deletePassword(this.serviceName, email);
  }

  // Refresh token
  async refreshToken() { }
}
```

---

### 5. src/config-manager.js
**Role**: Store app settings

**Settings Stored:**
```javascript
{
  "tallyEndpoint": "http://localhost:9000",
  "cloudEndpoint": "wss://your-backend.com",
  "syncInterval": 900000,  // 15 minutes in ms
  "autoStart": true,
  "logLevel": "info",
  "lastSyncTime": null
}
```

**Storage Location:**
- **Windows**: `%APPDATA%/tally-bridge/config.json`
- **Mac**: `~/Library/Application Support/tally-bridge/config.json`

**Key Methods:**
```javascript
const Store = require('electron-store');

class ConfigManager {
  constructor() {
    this.store = new Store({
      name: 'config',
      defaults: {
        tallyEndpoint: 'http://localhost:9000',
        cloudEndpoint: 'ws://localhost:3000',
        syncInterval: 900000,
        autoStart: true,
        logLevel: 'info'
      }
    });
  }

  get(key) {
    return this.store.get(key);
  }

  set(key, value) {
    this.store.set(key, value);
  }

  getAll() {
    return this.store.store;
  }
}
```

---

### 6. src/sync-engine.js
**Role**: Orchestrate auto-sync

**Sync Flow:**
```
1. Timer triggers every 15 minutes
2. Check if user logged in
3. Check if Tally is running
4. Fetch new invoices from Tally
5. Send to cloud via WebSocket
6. Listen for cloud invoices to push
7. Push to Tally
8. Log sync status
9. Update tray icon status
```

**Error Handling:**
- Tally not running → Show notification
- Cloud disconnected → Retry connection
- Sync failed → Log error, retry next cycle

**Key Methods:**
```javascript
class SyncEngine {
  constructor(tallyConnector, cloudClient, configManager, logger) {
    this.tallyConnector = tallyConnector;
    this.cloudClient = cloudClient;
    this.config = configManager;
    this.logger = logger;
    this.syncTimer = null;
    this.isSyncing = false;
  }

  // Start auto-sync
  start() {
    const interval = this.config.get('syncInterval');
    this.syncTimer = setInterval(() => this.sync(), interval);
    this.sync(); // Run immediately
  }

  // Stop auto-sync
  stop() {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
    }
  }

  // Perform sync
  async sync() {
    if (this.isSyncing) return;
    
    this.isSyncing = true;
    this.updateStatus('syncing');

    try {
      // 1. Test Tally connection
      const tallyOk = await this.tallyConnector.testConnection();
      if (!tallyOk) {
        throw new Error('Tally not running');
      }

      // 2. Fetch invoices from Tally
      const lastSync = this.config.get('lastSyncTime');
      const invoices = await this.tallyConnector.fetchInvoices(lastSync, new Date());

      // 3. Send to cloud
      await this.cloudClient.send('SYNC_INVOICES', { invoices });

      // 4. Update last sync time
      this.config.set('lastSyncTime', new Date());

      this.updateStatus('connected');
      this.logger.info(`Sync completed: ${invoices.length} invoices`);
      
    } catch (error) {
      this.logger.error('Sync failed:', error);
      this.updateStatus('disconnected');
    } finally {
      this.isSyncing = false;
    }
  }

  // Manual sync
  async syncNow() {
    await this.sync();
  }
}
```

---

### 7. src/logger.js
**Role**: File-based logging

**Log Location:**
- **Windows**: `%APPDATA%/tally-bridge/logs/`
- **Mac**: `~/Library/Application Support/tally-bridge/logs/`

**Log Rotation:**
- Max file size: 10MB
- Keep last 5 files
- Format: `app-2024-06-15.log`

**Log Levels:**
- **ERROR**: Critical failures
- **WARN**: Non-critical issues
- **INFO**: Sync events
- **DEBUG**: Detailed debugging

**Implementation:**
```javascript
const winston = require('winston');
const path = require('path');
const { app } = require('electron');

class Logger {
  constructor() {
    const logDir = path.join(app.getPath('userData'), 'logs');
    
    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
      transports: [
        new winston.transports.File({
          filename: path.join(logDir, 'app.log'),
          maxsize: 10485760, // 10MB
          maxFiles: 5,
          tailable: true
        }),
        new winston.transports.Console({
          format: winston.format.simple()
        })
      ]
    });
  }

  info(message, meta) {
    this.logger.info(message, meta);
  }

  error(message, meta) {
    this.logger.error(message, meta);
  }

  warn(message, meta) {
    this.logger.warn(message, meta);
  }

  debug(message, meta) {
    this.logger.debug(message, meta);
  }
}
```

---

### 8. renderer/ (UI)
**Role**: User interface

**Screens:**

#### 1. LOGIN SCREEN (login.html)
```html
<!DOCTYPE html>
<html>
<head>
  <title>Tally Bridge - Login</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <div class="login-container">
    <img src="../build/icon.png" class="logo">
    <h1>Tally Bridge</h1>
    <form id="login-form">
      <input type="email" id="email" placeholder="Email" required>
      <input type="password" id="password" placeholder="Password" required>
      <label>
        <input type="checkbox" id="remember"> Remember me
      </label>
      <button type="submit">Login</button>
    </form>
    <div id="error-message"></div>
  </div>
  <script src="renderer.js"></script>
</body>
</html>
```

#### 2. DASHBOARD (index.html)
```html
<!DOCTYPE html>
<html>
<head>
  <title>Tally Bridge - Dashboard</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <div class="dashboard">
    <h1>Tally Bridge Dashboard</h1>
    
    <div class="status-section">
      <h2>Connection Status</h2>
      <div class="status-item">
        <span>Tally:</span>
        <span id="tally-status" class="status-badge">●</span>
      </div>
      <div class="status-item">
        <span>Cloud:</span>
        <span id="cloud-status" class="status-badge">●</span>
      </div>
    </div>

    <div class="stats-section">
      <h2>Sync Statistics</h2>
      <p>Last sync: <span id="last-sync">Never</span></p>
      <p>Invoices synced today: <span id="sync-count">0</span></p>
    </div>

    <div class="actions">
      <button id="sync-now">Sync Now</button>
      <button id="open-portal">Open Portal</button>
      <button id="settings">Settings</button>
    </div>
  </div>
  <script src="renderer.js"></script>
</body>
</html>
```

#### 3. SETTINGS (settings.html)
```html
<!DOCTYPE html>
<html>
<head>
  <title>Tally Bridge - Settings</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <div class="settings">
    <h1>Settings</h1>
    
    <form id="settings-form">
      <label>
        Tally Endpoint:
        <input type="text" id="tally-endpoint" value="http://localhost:9000">
      </label>

      <label>
        Cloud Endpoint:
        <input type="text" id="cloud-endpoint">
      </label>

      <label>
        Sync Interval (minutes):
        <input type="number" id="sync-interval" min="5" max="60" value="15">
      </label>

      <label>
        <input type="checkbox" id="auto-start"> Auto-start on system boot
      </label>

      <label>
        Log Level:
        <select id="log-level">
          <option value="error">Error</option>
          <option value="warn">Warning</option>
          <option value="info">Info</option>
          <option value="debug">Debug</option>
        </select>
      </label>

      <button type="submit">Save Settings</button>
    </form>

    <div class="danger-zone">
      <button id="logout" class="danger">Logout</button>
    </div>
  </div>
  <script src="renderer.js"></script>
</body>
</html>
```

---

## 🔄 DATA FLOW ARCHITECTURE

```
USER'S COMPUTER                    CLOUD BACKEND
┌─────────────────────┐           ┌──────────────────┐
│                     │           │                  │
│   TALLY SOFTWARE    │           │   WEB PORTAL     │
│   (localhost:9000)  │           │   (React)        │
│                     │           │                  │
└──────────┬──────────┘           └────────┬─────────┘
           │                               │
           │ XML/HTTP                      │ HTTPS
           │                               │
┌──────────▼──────────┐           ┌────────▼─────────┐
│                     │           │                  │
│  TALLY BRIDGE       │◄─────────►│  BACKEND API     │
│  (Desktop App)      │ WebSocket │  (Express.js)    │
│                     │           │                  │
└─────────────────────┘           └──────────────────┘
```

### SYNC PROCESS:

#### SELLER → BUYER (Invoice Push)
```
1. Seller creates invoice in Tally
2. Tally Bridge detects new invoice
3. Bridge sends invoice to Cloud via WebSocket
4. Cloud stores in MongoDB
5. Cloud notifies Buyer's Bridge via WebSocket
6. Buyer's Bridge pushes to Buyer's Tally
```

#### BUYER → SELLER (Invoice Pull)
```
1. Buyer views pending invoices on Portal
2. Buyer clicks "Accept & Import"
3. Portal sends to Buyer's Bridge via WebSocket
4. Bridge pushes to Buyer's Tally
5. Bridge confirms to Cloud
6. Portal updates status
```

---

## 🔐 SECURITY ARCHITECTURE

### 1. AUTHENTICATION:
- JWT token from cloud backend
- Stored in OS keychain (encrypted)
- WebSocket authenticated with token

### 2. LOCAL TALLY:
- Only localhost connection allowed
- No external Tally access

### 3. CLOUD CONNECTION:
- WSS (WebSocket Secure) only
- Certificate pinning (production)
- Token refresh every 24 hours

### 4. DATA:
- No data stored locally (except logs)
- All invoice data transient
- Logs auto-delete after 30 days

---

## 🚀 INSTALLATION & DEPLOYMENT

### Build Process:
```bash
# Install dependencies
npm install

# Build for Windows
npm run build:win

# Build for Mac
npm run build:mac

# Output
dist/TallyBridge-Setup-1.0.0.exe  (Windows)
dist/TallyBridge-1.0.0.dmg        (Mac)
```

### User Installation:
```
1. Download TallyBridge-Setup.exe
2. Double-click to install
3. Auto-starts on system boot
4. Shows in system tray
5. Click tray icon → Login
6. Enter portal credentials
7. Auto-syncs in background
```

---

## 📊 SYSTEM REQUIREMENTS

### MINIMUM:
- Windows 10/11 or macOS 11+
- 4GB RAM
- 500MB disk space
- Internet connection
- Tally Prime/ERP 9 installed

### TALLY CONFIGURATION:
- ODBC Server must be enabled
- Port 9000 must be accessible
- **In Tally**: F12 → Advanced → ODBC Server → Enable

---

## 🎨 UI/UX DESIGN

### SYSTEM TRAY STATES:
- 🟢 **Green Icon**: Connected & syncing
- 🔴 **Red Icon**: Disconnected
- 🟡 **Yellow Icon**: Connecting/syncing in progress

### NOTIFICATIONS:
- "Tally Bridge connected"
- "Synced 5 invoices"
- "Tally not running - please start Tally"
- "Cloud connection lost - retrying..."

---

## 🔄 AUTO-UPDATE MECHANISM

### CHECK FOR UPDATES:
- On app start
- Every 24 hours in background

### UPDATE FLOW:
```
1. Check GitHub releases for new version
2. Download .exe in background
3. Show notification: "Update available"
4. User clicks "Update & Restart"
5. Install new version
6. Restart app
```

---

## 📝 DEPENDENCIES (package.json)

```json
{
  "name": "tally-bridge",
  "version": "1.0.0",
  "description": "Desktop connector for Tally to Cloud Portal",
  "main": "main.js",
  "author": "Your Name",
  "license": "MIT",
  "dependencies": {
    "electron": "^28.0.0",
    "electron-store": "^8.1.0",
    "keytar": "^7.9.0",
    "ws": "^8.15.0",
    "axios": "^1.6.0",
    "xml2js": "^0.6.0",
    "winston": "^3.11.0",
    "electron-updater": "^6.1.0"
  },
  "devDependencies": {
    "electron-builder": "^24.9.0"
  },
  "scripts": {
    "start": "electron .",
    "build:win": "electron-builder --win",
    "build:mac": "electron-builder --mac",
    "pack": "electron-builder --dir"
  },
  "build": {
    "appId": "com.tallybridge.app",
    "productName": "TallyBridge",
    "directories": {
      "output": "dist"
    },
    "files": [
      "main.js",
      "preload.js",
      "src/**/*",
      "renderer/**/*",
      "build/**/*"
    ],
    "win": {
      "target": "nsis",
      "icon": "build/icon.ico"
    },
    "mac": {
      "target": "dmg",
      "icon": "build/icon.png",
      "category": "public.app-category.business"
    },
    "nsis": {
      "oneClick": false,
      "allowToChangeInstallationDirectory": true,
      "createDesktopShortcut": true,
      "createStartMenuShortcut": true
    }
  }
}
```

---

## 🎯 KEY FEATURES SUMMARY

| Feature | Description |
|---------|-------------|
| **Background Running** | Runs in system tray, no visible window needed |
| **Auto-Sync** | Every 15 minutes automatically |
| **Manual Sync** | Click "Sync Now" button anytime |
| **Auto-Start** | Starts on Windows/Mac boot |
| **Secure Login** | JWT auth with OS keychain storage |
| **Real-time Updates** | WebSocket for instant invoice push |
| **Error Recovery** | Auto-reconnect, retry logic |
| **Logging** | Detailed logs for debugging |
| **Updates** | Auto-update mechanism |
| **Single Instance** | Only one app instance runs |

---

## 🔌 BACKEND API REQUIREMENTS

Backend needs to add WebSocket support:

### NEW ENDPOINT:
```
ws://localhost:3000/ws
```

### MESSAGES TO HANDLE:
1. **authenticate** (from connector)
2. **fetch_invoices_request** (to connector)
3. **push_invoice_request** (to connector)
4. **sync_status** (from connector)

### WebSocket Server Implementation:
```javascript
// backend/websocket-server.js
const WebSocket = require('ws');
const jwt = require('jsonwebtoken');

function createWebSocketServer(server) {
  const wss = new WebSocket.Server({ server, path: '/ws' });

  wss.on('connection', (ws, req) => {
    console.log('New WebSocket connection');

    ws.on('message', async (data) => {
      const message = JSON.parse(data);

      switch (message.type) {
        case 'authenticate':
          handleAuth(ws, message.payload);
          break;
        case 'sync_invoices':
          handleSyncInvoices(ws, message.payload);
          break;
        case 'sync_status':
          handleSyncStatus(ws, message.payload);
          break;
      }
    });

    ws.on('close', () => {
      console.log('WebSocket disconnected');
    });
  });

  return wss;
}

module.exports = createWebSocketServer;
```

---

## 📱 DEVELOPMENT ROADMAP

### Phase 1: Core Development (Week 1-2)
- [ ] Setup Electron project
- [ ] Implement TallyConnector
- [ ] Implement CloudClient (WebSocket)
- [ ] Implement AuthManager
- [ ] Implement ConfigManager
- [ ] Implement Logger

### Phase 2: Sync Engine (Week 3)
- [ ] Implement SyncEngine
- [ ] Auto-sync logic
- [ ] Error handling & retry
- [ ] Status updates

### Phase 3: UI Development (Week 4)
- [ ] Login screen
- [ ] Dashboard
- [ ] Settings page
- [ ] System tray integration

### Phase 4: Testing & Polish (Week 5)
- [ ] End-to-end testing
- [ ] Error scenarios testing
- [ ] UI/UX improvements
- [ ] Performance optimization

### Phase 5: Distribution (Week 6)
- [ ] Build Windows .exe
- [ ] Build Mac .dmg
- [ ] Create installer
- [ ] Documentation
- [ ] Release

---

## 🐛 TROUBLESHOOTING

### Common Issues:

#### 1. "Tally not running"
**Solution**: 
- Start Tally Prime/ERP 9
- Enable ODBC Server: F12 → Advanced → ODBC Server

#### 2. "Cloud connection failed"
**Solution**:
- Check internet connection
- Verify cloud endpoint URL in settings
- Re-login with portal credentials

#### 3. "Authentication failed"
**Solution**:
- Logout and login again
- Check email/password
- Clear stored credentials from OS keychain

#### 4. "Port 9000 already in use"
**Solution**:
- Close other applications using port 9000
- Restart Tally

---

## 📞 SUPPORT

For issues or questions:
- Email: support@tallybridge.com
- Documentation: https://docs.tallybridge.com
- GitHub: https://github.com/yourorg/tally-bridge

---

## 📄 LICENSE

MIT License - See LICENSE file for details

---

**Last Updated**: June 15, 2024  
**Version**: 1.0.0  
**Author**: Saksham Maheshwari
