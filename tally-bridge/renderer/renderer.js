/**
 * Renderer Script for Dashboard
 * Handles UI interactions and IPC communication
 */

// DOM Elements
const tallyStatus = document.getElementById('tally-status');
const cloudStatus = document.getElementById('cloud-status');
const lastSyncEl = document.getElementById('last-sync');
const syncCountEl = document.getElementById('sync-count');
const syncStatusEl = document.getElementById('sync-status');
const activityLog = document.getElementById('activity-log');

const syncNowBtn = document.getElementById('sync-now-btn');
const openPortalBtn = document.getElementById('open-portal-btn');
const testTallyBtn = document.getElementById('test-tally-btn');
const settingsBtn = document.getElementById('settings-btn');

// Activity log
const maxLogItems = 50;
let logItems = [];

/**
 * Add log item
 */
function addLog(message, type = 'info') {
  const now = new Date();
  const time = now.toLocaleTimeString('en-US', { 
    hour12: false, 
    hour: '2-digit', 
    minute: '2-digit' 
  });
  
  logItems.unshift({ time, message, type });
  
  // Keep only last 50 items
  if (logItems.length > maxLogItems) {
    logItems = logItems.slice(0, maxLogItems);
  }
  
  renderLog();
}

/**
 * Render activity log
 */
function renderLog() {
  if (logItems.length === 0) {
    activityLog.innerHTML = `
      <div class="log-item">
        <span class="log-time">--:--</span>
        <span class="log-message">No activity yet</span>
      </div>
    `;
    return;
  }
  
  activityLog.innerHTML = logItems.map(item => `
    <div class="log-item">
      <span class="log-time">${item.time}</span>
      <span class="log-message">${item.message}</span>
    </div>
  `).join('');
}

/**
 * Update status badge
 */
function updateStatusBadge(element, status, text) {
  element.className = `status-badge ${status}`;
  element.innerHTML = `
    <span class="status-dot"></span>
    <span class="status-text">${text}</span>
  `;
}

/**
 * Update Tally status
 */
function updateTallyStatus(connected) {
  if (connected) {
    updateStatusBadge(tallyStatus, 'connected', 'Connected');
  } else {
    updateStatusBadge(tallyStatus, 'disconnected', 'Disconnected');
  }
}

/**
 * Update Cloud status
 */
function updateCloudStatus(connected) {
  if (connected) {
    updateStatusBadge(cloudStatus, 'connected', 'Connected');
  } else {
    updateStatusBadge(cloudStatus, 'disconnected', 'Disconnected');
  }
}

/**
 * Update sync stats
 */
async function updateSyncStats() {
  try {
    const stats = await window.electronAPI.getSyncStats();
    
    // Last sync time
    if (stats.lastSyncTime) {
      const lastSync = new Date(stats.lastSyncTime);
      const now = new Date();
      const diff = Math.floor((now - lastSync) / 1000); // seconds
      
      let timeAgo;
      if (diff < 60) {
        timeAgo = 'Just now';
      } else if (diff < 3600) {
        timeAgo = `${Math.floor(diff / 60)}m ago`;
      } else if (diff < 86400) {
        timeAgo = `${Math.floor(diff / 3600)}h ago`;
      } else {
        timeAgo = `${Math.floor(diff / 86400)}d ago`;
      }
      
      lastSyncEl.textContent = timeAgo;
    } else {
      lastSyncEl.textContent = 'Never';
    }
    
    // Sync count
    syncCountEl.textContent = stats.syncCount || 0;
    
    // Sync status
    if (stats.isSyncing) {
      syncStatusEl.textContent = 'Syncing...';
    } else if (stats.lastSyncStatus === 'success') {
      syncStatusEl.textContent = 'Success';
    } else if (stats.lastSyncStatus === 'error') {
      syncStatusEl.textContent = 'Failed';
    } else {
      syncStatusEl.textContent = 'Idle';
    }
    
  } catch (error) {
    console.error('Failed to update sync stats:', error);
  }
}

/**
 * Test Tally connection
 */
async function testTallyConnection() {
  testTallyBtn.disabled = true;
  testTallyBtn.textContent = 'Testing...';
  
  try {
    addLog('Testing Tally connection...');
    const result = await window.electronAPI.testTally();
    
    if (result.success) {
      updateTallyStatus(true);
      addLog('Tally connection successful', 'success');
    } else {
      updateTallyStatus(false);
      addLog(`Tally connection failed: ${result.message}`, 'error');
    }
  } catch (error) {
    updateTallyStatus(false);
    addLog(`Tally test error: ${error.message}`, 'error');
  } finally {
    testTallyBtn.disabled = false;
    testTallyBtn.innerHTML = `
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
      </svg>
      Test Tally
    `;
  }
}

/**
 * Manual sync
 */
async function performSync() {
  syncNowBtn.disabled = true;
  syncNowBtn.textContent = 'Syncing...';
  
  try {
    addLog('Starting manual sync...');
    updateCloudStatus(true); // Assume connected if we can sync
    
    const result = await window.electronAPI.syncNow();
    
    if (result.success) {
      addLog('Manual sync completed successfully', 'success');
      await updateSyncStats();
    } else {
      addLog(`Manual sync failed: ${result.error}`, 'error');
    }
  } catch (error) {
    addLog(`Sync error: ${error.message}`, 'error');
    updateCloudStatus(false);
  } finally {
    syncNowBtn.disabled = false;
    syncNowBtn.innerHTML = `
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="23 4 23 10 17 10"></polyline>
        <polyline points="1 20 1 14 7 14"></polyline>
        <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
      </svg>
      Sync Now
    `;
  }
}

/**
 * Open portal in browser
 */
async function openPortal() {
  try {
    await window.electronAPI.openPortal();
    addLog('Opened cloud portal in browser');
  } catch (error) {
    addLog(`Failed to open portal: ${error.message}`, 'error');
  }
}

/**
 * Open settings
 */
function openSettings() {
  window.location.href = 'settings.html';
}

// Event Listeners
syncNowBtn.addEventListener('click', performSync);
openPortalBtn.addEventListener('click', openPortal);
testTallyBtn.addEventListener('click', testTallyConnection);
settingsBtn.addEventListener('click', openSettings);

// Listen to status updates from main process
window.electronAPI.onStatusUpdate((data) => {
  const { status } = data;
  
  switch (status) {
    case 'connected':
      updateCloudStatus(true);
      addLog('Connected to cloud');
      break;
    case 'disconnected':
      updateCloudStatus(false);
      addLog('Disconnected from cloud', 'warn');
      break;
    case 'syncing':
      updateCloudStatus(true);
      addLog('Syncing invoices...');
      break;
  }
  
  updateSyncStats();
});

// Listen to sync complete events
window.electronAPI.onSyncComplete((data) => {
  addLog(`Sync completed: ${data.syncCount} total invoices synced`, 'success');
  updateSyncStats();
});

// Listen to sync error events
window.electronAPI.onSyncError((data) => {
  addLog(`Sync error: ${data.error}`, 'error');
  updateSyncStats();
});

// Initialize on page load
window.addEventListener('DOMContentLoaded', () => {
  addLog('Dashboard loaded');
  
  // Initial checks
  testTallyConnection();
  updateSyncStats();
  
  // Assume cloud is connected initially
  updateCloudStatus(true);
  
  // Update stats every 30 seconds
  setInterval(updateSyncStats, 30000);
});
