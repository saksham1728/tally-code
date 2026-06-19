/**
 * Mock Tally Server
 * 
 * Simulates Tally ODBC server for testing on Mac
 * Responds to XML requests on port 9000
 */

const express = require('express');
const xml2js = require('xml2js');

const app = express();
const PORT = 9000;

// Parse XML body
app.use(express.text({ type: 'application/xml' }));
app.use(express.text({ type: 'text/xml' }));

// Fake invoice data
const fakeInvoices = [
  {
    VOUCHERNUMBER: 'INV-001',
    DATE: '20240615',
    PARTYNAME: 'ABC Industries Ltd',
    PARTYGSTIN: '27AABCS9603R1Z5',
    AMOUNT: '15000.00',
    SUBTOTAL: '12711.86',
    TOTALTAX: '2288.14',
    ALLLEDGERENTRIES: {
      LIST: [
        {
          STOCKITEMNAME: 'Product A',
          ACTUALQTY: '10',
          RATE: '1000.00',
          AMOUNT: '10000.00',
          CGSTAMOUNT: '900.00'
        },
        {
          STOCKITEMNAME: 'Product B',
          ACTUALQTY: '5',
          RATE: '500.00',
          AMOUNT: '2500.00',
          CGSTAMOUNT: '225.00'
        }
      ]
    }
  },
  {
    VOUCHERNUMBER: 'INV-002',
    DATE: '20240616',
    PARTYNAME: 'XYZ Corporation',
    PARTYGSTIN: '29AABCT1332L1ZG',
    AMOUNT: '25000.00',
    SUBTOTAL: '21186.44',
    TOTALTAX: '3813.56',
    ALLLEDGERENTRIES: {
      LIST: [
        {
          STOCKITEMNAME: 'Service Package',
          ACTUALQTY: '1',
          RATE: '21186.44',
          AMOUNT: '21186.44',
          CGSTAMOUNT: '1906.78'
        }
      ]
    }
  },
  {
    VOUCHERNUMBER: 'INV-003',
    DATE: '20240617',
    PARTYNAME: 'Tech Solutions Pvt Ltd',
    PARTYGSTIN: '27ZZZZZ9999Z1Z9',
    AMOUNT: '8500.00',
    SUBTOTAL: '7203.39',
    TOTALTAX: '1296.61',
    ALLLEDGERENTRIES: {
      LIST: [
        {
          STOCKITEMNAME: 'Software License',
          ACTUALQTY: '3',
          RATE: '2401.13',
          AMOUNT: '7203.39',
          CGSTAMOUNT: '648.30'
        }
      ]
    }
  }
];

// Parse XML request
async function parseXML(xmlString) {
  const parser = new xml2js.Parser();
  try {
    return await parser.parseStringPromise(xmlString);
  } catch (error) {
    console.error('XML parsing error:', error);
    return null;
  }
}

// Build XML response
function buildInvoicesXML(invoices) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<ENVELOPE>
  <HEADER>
    <VERSION>1</VERSION>
    <TALLYREQUEST>Export</TALLYREQUEST>
    <TYPE>Data</TYPE>
    <ID>VoucherList</ID>
  </HEADER>
  <BODY>
    <DATA>
      <COLLECTION>
        ${invoices.map(inv => `
        <VOUCHER>
          <VOUCHERNUMBER>${inv.VOUCHERNUMBER}</VOUCHERNUMBER>
          <DATE>${inv.DATE}</DATE>
          <PARTYNAME>${inv.PARTYNAME}</PARTYNAME>
          <PARTYGSTIN>${inv.PARTYGSTIN}</PARTYGSTIN>
          <AMOUNT>${inv.AMOUNT}</AMOUNT>
          <SUBTOTAL>${inv.SUBTOTAL}</SUBTOTAL>
          <TOTALTAX>${inv.TOTALTAX}</TOTALTAX>
          ${inv.ALLLEDGERENTRIES.LIST.map(item => `
          <ALLLEDGERENTRIES.LIST>
            <STOCKITEMNAME>${item.STOCKITEMNAME}</STOCKITEMNAME>
            <ACTUALQTY>${item.ACTUALQTY}</ACTUALQTY>
            <RATE>${item.RATE}</RATE>
            <AMOUNT>${item.AMOUNT}</AMOUNT>
            <CGSTAMOUNT>${item.CGSTAMOUNT}</CGSTAMOUNT>
          </ALLLEDGERENTRIES.LIST>
          `).join('')}
        </VOUCHER>
        `).join('')}
      </COLLECTION>
    </DATA>
  </BODY>
</ENVELOPE>`;
}

// Build success response for import
function buildImportSuccessXML() {
  return `<?xml version="1.0" encoding="UTF-8"?>
<ENVELOPE>
  <HEADER>
    <VERSION>1</VERSION>
    <TALLYREQUEST>Import</TALLYREQUEST>
    <TYPE>Data</TYPE>
    <ID>Response</ID>
  </HEADER>
  <BODY>
    <IMPORTSTATUS>
      <SUCCESS>1</SUCCESS>
      <CREATED>1</CREATED>
      <MESSAGE>Voucher imported successfully</MESSAGE>
    </IMPORTSTATUS>
  </BODY>
</ENVELOPE>`;
}

// Build company info response
function buildCompanyInfoXML() {
  return `<?xml version="1.0" encoding="UTF-8"?>
<ENVELOPE>
  <HEADER>
    <VERSION>1</VERSION>
  </HEADER>
  <BODY>
    <DATA>
      <COMPANY>
        <NAME>Mock Tally Company</NAME>
        <MASTERNAME>Primary Company</MASTERNAME>
        <GSTIN>27MOCKCOMPANY123</GSTIN>
      </COMPANY>
    </DATA>
  </BODY>
</ENVELOPE>`;
}

// Handle all POST requests
app.post('/', async (req, res) => {
  try {
    const xmlBody = req.body;
    console.log('\n📥 Received XML Request:');
    console.log(xmlBody.substring(0, 200) + '...\n');

    // Parse request
    const parsed = await parseXML(xmlBody);
    
    if (!parsed || !parsed.ENVELOPE) {
      return res.status(400).send('Invalid XML');
    }

    const requestType = parsed.ENVELOPE.HEADER?.[0]?.TALLYREQUEST?.[0];
    const requestId = parsed.ENVELOPE.HEADER?.[0]?.ID?.[0];

    console.log(`📋 Request Type: ${requestType}`);
    console.log(`🆔 Request ID: ${requestId}`);

    // Handle different request types
    if (requestType === 'Export') {
      if (requestId === 'CompanyInfo') {
        console.log('✅ Responding with Company Info\n');
        res.set('Content-Type', 'application/xml');
        return res.send(buildCompanyInfoXML());
      }
      
      if (requestId === 'VoucherList') {
        console.log(`✅ Responding with ${fakeInvoices.length} invoices\n`);
        res.set('Content-Type', 'application/xml');
        return res.send(buildInvoicesXML(fakeInvoices));
      }
    }

    if (requestType === 'Import') {
      console.log('✅ Import successful (mocked)\n');
      res.set('Content-Type', 'application/xml');
      return res.send(buildImportSuccessXML());
    }

    // Default response
    res.set('Content-Type', 'application/xml');
    res.send(buildCompanyInfoXML());

  } catch (error) {
    console.error('❌ Error processing request:', error.message);
    res.status(500).send('Internal server error');
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'Mock Tally Server',
    port: PORT,
    invoices: fakeInvoices.length
  });
});

// Root GET endpoint
app.get('/', (req, res) => {
  res.send(`
    <h1>🎭 Mock Tally Server</h1>
    <p>Simulating Tally ODBC Server on port ${PORT}</p>
    <p><strong>Status:</strong> Running ✅</p>
    <p><strong>Fake Invoices:</strong> ${fakeInvoices.length}</p>
    <p><strong>Endpoints:</strong></p>
    <ul>
      <li>POST / - XML API (Tally requests)</li>
      <li>GET /health - Health check</li>
    </ul>
    <hr>
    <h3>Available Fake Invoices:</h3>
    <ul>
      ${fakeInvoices.map(inv => `
        <li>
          <strong>${inv.VOUCHERNUMBER}</strong> - 
          ${inv.PARTYNAME} - 
          ₹${inv.AMOUNT}
        </li>
      `).join('')}
    </ul>
  `);
});

// Start server
app.listen(PORT, () => {
  console.log('\n╔════════════════════════════════════════╗');
  console.log('║     🎭 MOCK TALLY SERVER STARTED      ║');
  console.log('╚════════════════════════════════════════╝\n');
  console.log(`✅ Server running on: http://localhost:${PORT}`);
  console.log(`✅ Health check: http://localhost:${PORT}/health`);
  console.log(`✅ Fake invoices loaded: ${fakeInvoices.length}`);
  console.log('\n📝 Ready to handle Tally XML requests...\n');
  console.log('Press Ctrl+C to stop\n');
});

// Handle shutdown
process.on('SIGINT', () => {
  console.log('\n\n👋 Mock Tally Server shutting down...\n');
  process.exit(0);
});
