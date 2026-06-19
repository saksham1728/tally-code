/**
 * WebSocket Server for Tally Bridge
 * 
 * Handles real-time communication with desktop connector
 */

const WebSocket = require('ws');
const jwt = require('jsonwebtoken');
const Invoice = require('./models/Invoice');
const InvoiceLineItem = require('./models/InvoiceLineItem');
const { matchBuyerForInvoice } = require('./services/matching.service');
const { logImportEvent } = require('./services/syncLog.service');

function createWebSocketServer(server) {
  const wss = new WebSocket.Server({ 
    server,
    path: '/ws'
  });

  console.log('✅ WebSocket server initialized on /ws');

  // Store connected clients
  const clients = new Map();

  wss.on('connection', (ws, req) => {
    console.log('📱 New WebSocket connection attempt');

    let clientId = null;
    let authenticated = false;

    // Handle messages from client
    ws.on('message', async (data) => {
      try {
        const message = JSON.parse(data.toString());
        console.log('📩 Received message:', message.type);

        switch (message.type) {
          case 'AUTHENTICATE':
            // Authenticate client
            try {
              const token = message.payload.token || req.url.split('token=')[1];
              
              if (!token) {
                ws.send(JSON.stringify({
                  type: 'ERROR',
                  payload: { message: 'No token provided' }
                }));
                ws.close();
                return;
              }

              const decoded = jwt.verify(token, process.env.JWT_SECRET);
              
              console.log('🔍 Decoded JWT:', JSON.stringify(decoded, null, 2));
              console.log('🔍 companyId type:', typeof decoded.companyId);
              console.log('🔍 companyId value:', decoded.companyId);
              
              clientId = decoded.companyId; // Use company ID as client ID
              authenticated = true;
              
              // Store both the websocket and decoded info
              clients.set(clientId, { ws, decoded });
              
              ws.send(JSON.stringify({
                type: 'AUTHENTICATED',
                payload: { 
                  user: decoded.email,
                  clientId 
                }
              }));
              
              console.log('✅ Client authenticated:', decoded.email, 'CompanyID:', clientId);
              
            } catch (error) {
              console.error('❌ Authentication failed:', error.message);
              ws.send(JSON.stringify({
                type: 'ERROR',
                payload: { message: 'Authentication failed' }
              }));
              ws.close();
            }
            break;

          case 'PING':
            // Heartbeat
            ws.send(JSON.stringify({
              type: 'PONG',
              requestId: message.requestId
            }));
            break;

          case 'SYNC_INVOICES':
            // Handle invoice sync from connector
            if (!authenticated) {
              ws.send(JSON.stringify({
                type: 'ERROR',
                payload: { message: 'Not authenticated' }
              }));
              return;
            }

            console.log('📦 Received invoices from Tally Bridge:', message.payload.invoices?.length || 0);
            
            try {
              const invoices = message.payload.invoices || [];
              let importedCount = 0;
              let skippedCount = 0;
              let errorCount = 0;
              
              // Process each invoice
              for (const tallyInvoice of invoices) {
                try {
                  // Check for duplicate
                  const isDuplicate = await Invoice.isAlreadyImported(tallyInvoice.sourceReferenceId);
                  
                  if (isDuplicate) {
                    console.log(`⏭️ Skipping duplicate invoice: ${tallyInvoice.invoiceNumber}`);
                    skippedCount++;
                    continue;
                  }
                  
                  // Create invoice
                  const invoice = new Invoice({
                    invoiceNumber: tallyInvoice.invoiceNumber,
                    invoiceDate: tallyInvoice.invoiceDate,
                    sellerCompanyId: clientId, // User's company ID from JWT
                    buyerCompanyName: tallyInvoice.buyerCompanyName,
                    buyerGSTIN: tallyInvoice.buyerGSTIN,
                    taxableAmount: tallyInvoice.taxableAmount,
                    taxAmount: tallyInvoice.taxAmount,
                    totalAmount: tallyInvoice.totalAmount,
                    status: 'New',
                    sourceReferenceId: tallyInvoice.sourceReferenceId,
                    rawPayload: tallyInvoice.rawPayload
                  });
                  
                  await invoice.save();
                  console.log(`✅ Saved invoice: ${invoice.invoiceNumber} (ID: ${invoice._id})`);
                  
                  // Create line items
                  if (tallyInvoice.lineItems && tallyInvoice.lineItems.length > 0) {
                    for (const lineItem of tallyInvoice.lineItems) {
                      const invoiceLineItem = new InvoiceLineItem({
                        invoiceId: invoice._id,
                        ...lineItem
                      });
                      await invoiceLineItem.save();
                    }
                    console.log(`  📝 Saved ${tallyInvoice.lineItems.length} line items`);
                  }
                  
                  // Log successful import
                  await logImportEvent(invoice._id, clientId, 'success');
                  
                  // Trigger buyer matching in background
                  matchBuyerForInvoice(invoice._id).catch(err => {
                    console.error(`⚠️ Buyer matching failed for ${invoice._id}:`, err.message);
                  });
                  
                  importedCount++;
                  
                } catch (error) {
                  console.error(`❌ Failed to save invoice ${tallyInvoice.invoiceNumber}:`, error.message);
                  errorCount++;
                }
              }
              
              console.log(`📊 Import summary: ${importedCount} imported, ${skippedCount} skipped, ${errorCount} errors`);
              
              // Send success response
              ws.send(JSON.stringify({
                type: 'SYNC_INVOICES_RESPONSE',
                requestId: message.requestId,
                success: true,
                payload: {
                  imported: importedCount,
                  skipped: skippedCount,
                  errors: errorCount,
                  message: `Successfully imported ${importedCount} invoices`
                }
              }));
              
            } catch (error) {
              console.error('❌ Sync invoices error:', error.message);
              ws.send(JSON.stringify({
                type: 'SYNC_INVOICES_RESPONSE',
                requestId: message.requestId,
                success: false,
                payload: {
                  message: error.message || 'Failed to sync invoices'
                }
              }));
            }
            break;

          case 'FETCH_INVOICES_RESPONSE':
            // Response from connector for fetch request
            console.log('📥 Fetch invoices response received');
            break;

          case 'PUSH_INVOICE_RESPONSE':
            // Response from connector for push request
            console.log('📤 Push invoice response received');
            break;

          default:
            console.log('⚠️ Unknown message type:', message.type);
        }

      } catch (error) {
        console.error('❌ Message processing error:', error.message);
        ws.send(JSON.stringify({
          type: 'ERROR',
          payload: { message: 'Invalid message format' }
        }));
      }
    });

    // Handle connection close
    ws.on('close', () => {
      if (clientId) {
        clients.delete(clientId);
        console.log('👋 Client disconnected:', clientId);
      }
    });

    // Handle errors
    ws.on('error', (error) => {
      console.error('❌ WebSocket error:', error.message);
    });

    // Send initial ping
    setTimeout(() => {
      if (ws.readyState === WebSocket.OPEN && !authenticated) {
        console.log('⏱️ Authentication timeout, closing connection');
        ws.close();
      }
    }, 10000); // 10 second timeout for authentication
  });

  // Broadcast message to all connected clients
  wss.broadcast = function(data) {
    wss.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(data));
      }
    });
  };

  // Send message to specific client
  wss.sendToClient = function(clientId, data) {
    const clientInfo = clients.get(clientId);
    if (clientInfo && clientInfo.ws && clientInfo.ws.readyState === WebSocket.OPEN) {
      clientInfo.ws.send(JSON.stringify(data));
    }
  };

  return wss;
}

module.exports = createWebSocketServer;
