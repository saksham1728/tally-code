/**
 * Tally Connection Test Script
 * 
 * This script tests if Tally ODBC Server is accessible and responding
 */

const axios = require('axios');

// Configuration - Update these with your senior's Tally details
const TALLY_CONFIG = {
  host: 'localhost',  // Change if Tally is on another computer
  port: 9000,         // Default Tally ODBC port
  companyName: ''     // Your company name in Tally (leave blank for default)
};

const TALLY_URL = `http://${TALLY_CONFIG.host}:${TALLY_CONFIG.port}`;

// Test 1: Check if Tally server is running
async function testConnection() {
  console.log('\n🔍 Testing Tally Connection...\n');
  console.log(`Target: ${TALLY_URL}`);
  console.log('─'.repeat(50));

  try {
    const response = await axios.get(TALLY_URL, { timeout: 5000 });
    console.log('✅ Tally server is running!');
    console.log(`Status: ${response.status}`);
    return true;
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      console.log('❌ Cannot connect to Tally!');
      console.log('   Possible reasons:');
      console.log('   1. Tally is not running');
      console.log('   2. ODBC Server is not enabled in Tally');
      console.log('   3. Wrong port number');
      console.log('   4. Firewall blocking the connection');
    } else if (error.code === 'ETIMEDOUT') {
      console.log('❌ Connection timeout!');
      console.log('   Tally is taking too long to respond');
    } else {
      console.log('❌ Error:', error.message);
    }
    return false;
  }
}

// Test 2: Get company information
async function getCompanyInfo() {
  console.log('\n🏢 Fetching Company Information...\n');
  console.log('─'.repeat(50));

  const xmlRequest = `
    <ENVELOPE>
      <HEADER>
        <VERSION>1</VERSION>
        <TALLYREQUEST>Export</TALLYREQUEST>
        <TYPE>Data</TYPE>
        <ID>List of Companies</ID>
      </HEADER>
      <BODY>
        <DESC>
          <STATICVARIABLES>
            <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
          </STATICVARIABLES>
          <TDL>
            <TDLMESSAGE>
              <COLLECTION NAME="Companies">
                <TYPE>Company</TYPE>
              </COLLECTION>
              <REPORT NAME="List of Companies">
                <FORMS>List of Companies</FORMS>
              </REPORT>
              <FORM NAME="List of Companies">
                <PARTS>List of Companies</PARTS>
              </FORM>
              <PART NAME="List of Companies">
                <LINES>List of Companies</LINES>
                <REPEAT>List of Companies : Companies</REPEAT>
                <SCROLLED>Vertical</SCROLLED>
              </PART>
              <LINE NAME="List of Companies">
                <FIELDS>Company Name</FIELDS>
              </LINE>
              <FIELD NAME="Company Name">
                <SET>$Name</SET>
              </FIELD>
            </TDLMESSAGE>
          </TDL>
        </DESC>
      </BODY>
    </ENVELOPE>
  `;

  try {
    const response = await axios.post(TALLY_URL, xmlRequest, {
      headers: { 'Content-Type': 'application/xml' },
      timeout: 10000
    });

    console.log('✅ Successfully retrieved company data!');
    console.log('\nResponse:');
    console.log(response.data);
    return true;
  } catch (error) {
    console.log('❌ Failed to get company info');
    console.log('   Error:', error.message);
    return false;
  }
}

// Test 3: Try to fetch vouchers (invoices)
async function getVouchers() {
  console.log('\n📄 Fetching Vouchers (Invoices)...\n');
  console.log('─'.repeat(50));

  const xmlRequest = `
    <ENVELOPE>
      <HEADER>
        <VERSION>1</VERSION>
        <TALLYREQUEST>Export</TALLYREQUEST>
        <TYPE>Data</TYPE>
        <ID>Vouchers</ID>
      </HEADER>
      <BODY>
        <DESC>
          <STATICVARIABLES>
            <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
            <SVFROMDATE>20240101</SVFROMDATE>
            <SVTODATE>20241231</SVTODATE>
          </STATICVARIABLES>
          <TDL>
            <TDLMESSAGE>
              <COLLECTION NAME="Sales Vouchers">
                <TYPE>Voucher</TYPE>
                <FILTER>VoucherTypeFilter</FILTER>
              </COLLECTION>
              <SYSTEM TYPE="Formulae" NAME="VoucherTypeFilter">$$IsEqual:##VoucherTypeName:Sales</SYSTEM>
            </TDLMESSAGE>
          </TDL>
        </DESC>
      </BODY>
    </ENVELOPE>
  `;

  try {
    const response = await axios.post(TALLY_URL, xmlRequest, {
      headers: { 'Content-Type': 'application/xml' },
      timeout: 15000
    });

    console.log('✅ Successfully retrieved vouchers!');
    console.log('\nFirst 500 characters of response:');
    console.log(response.data.substring(0, 500) + '...');
    return true;
  } catch (error) {
    console.log('❌ Failed to get vouchers');
    console.log('   Error:', error.message);
    return false;
  }
}

// Main test runner
async function runTests() {
  console.log('\n' + '═'.repeat(50));
  console.log('  TALLY API CONNECTION TEST');
  console.log('═'.repeat(50));
  console.log('\nIMPORTANT STEPS BEFORE RUNNING:');
  console.log('1. Make sure Tally is running');
  console.log('2. Enable ODBC Server in Tally:');
  console.log('   Gateway of Tally → F12 → Advanced Config');
  console.log('   → Enable ODBC Server → Set to YES');
  console.log('   → ODBC Port → 9000 (default)');
  console.log('3. Press Ctrl+A to accept and return to Tally');
  console.log('═'.repeat(50));

  // Run tests
  const connectionOk = await testConnection();
  
  if (connectionOk) {
    await getCompanyInfo();
    await getVouchers();
  }

  console.log('\n' + '═'.repeat(50));
  console.log('  TEST SUMMARY');
  console.log('═'.repeat(50));
  
  if (connectionOk) {
    console.log('\n✅ Connection: SUCCESS');
    console.log('\n📝 Next Steps:');
    console.log('1. Update backend/.env with: INTEGRATION_MODE=tally');
    console.log('2. Update TallyConnector.js to parse XML responses');
    console.log('3. Test invoice import from real Tally data');
  } else {
    console.log('\n❌ Connection: FAILED');
    console.log('\n📝 Troubleshooting:');
    console.log('1. Verify Tally is running');
    console.log('2. Check ODBC Server is enabled');
    console.log('3. Try accessing http://localhost:9000 in browser');
    console.log('4. Check firewall settings');
  }
  
  console.log('\n' + '═'.repeat(50) + '\n');
}

// Run the tests
runTests().catch(console.error);
