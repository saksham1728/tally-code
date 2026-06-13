# User-Configurable Field Mapping Guide

## Overview

The Field Mapping feature allows users to customize how Tally field names map to our internal invoice structure. This is essential because different Tally installations may use different field names for the same data.

---

## Why Field Mapping?

**Problem:** Different companies may have different field names in their Tally setup:
- Company A uses: `Qty` for quantity
- Company B uses: `Quantity` for quantity  
- Company C uses: `quan` for quantity

**Solution:** User-configurable field mapping allows each company to define their own mapping.

---

## How It Works

### 1. Default Mapping

When a user first configures their Tally connection, default mappings are automatically applied:

**Invoice-Level Fields:**
- `invoiceNumber` ← `VOUCHERNUMBER` (Tally field)
- `invoiceDate` ← `DATE`
- `buyerName` ← `PARTYNAME`
- `buyerGSTIN` ← `PARTYGSTIN`
- `totalAmount` ← `AMOUNT`
- `subtotal` ← `SUBTOTAL`
- `totalTax` ← `TOTALTAX`

**Line Item Fields:**
- `description` ← `STOCKITEMNAME` (Tally field)
- `quantity` ← `ACTUALQTY`
- `rate` ← `RATE`
- `taxableAmount` ← `AMOUNT`
- `taxAmount` ← `CGSTAMOUNT`

---

## API Endpoints

### 1. Get Current Field Mapping

```http
GET /api/field-mapping
Headers: Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "fieldMapping": {
      "invoice": {
        "invoiceNumber": "VOUCHERNUMBER",
        "invoiceDate": "DATE",
        "buyerName": "PARTYNAME",
        "buyerGSTIN": "PARTYGSTIN",
        "totalAmount": "AMOUNT"
      },
      "lineItem": {
        "description": "STOCKITEMNAME",
        "quantity": "ACTUALQTY",
        "rate": "RATE",
        "taxableAmount": "AMOUNT",
        "taxAmount": "CGSTAMOUNT"
      }
    }
  }
}
```

---

### 2. Update Field Mapping

```http
PUT /api/field-mapping
Headers: Authorization: Bearer <token>
Content-Type: application/json

Body:
{
  "invoice": {
    "invoiceNumber": "INV_NO",
    "invoiceDate": "INV_DATE"
  },
  "lineItem": {
    "quantity": "QTY",
    "description": "ITEM_NAME"
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Field mapping updated successfully",
  "data": {
    "fieldMapping": {
      "invoice": {
        "invoiceNumber": "INV_NO",
        "invoiceDate": "INV_DATE",
        "buyerName": "PARTYNAME",
        ...
      },
      "lineItem": {
        "description": "ITEM_NAME",
        "quantity": "QTY",
        ...
      }
    }
  }
}
```

---

### 3. Get Available Tally Fields

Fetches a sample invoice from Tally to show all available field names:

```http
GET /api/field-mapping/available-fields
Headers: Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "availableFields": {
      "invoice": ["VOUCHERNUMBER", "DATE", "PARTYNAME", "AMOUNT", ...],
      "lineItem": ["STOCKITEMNAME", "ACTUALQTY", "RATE", ...]
    },
    "sampleInvoice": {
      "invoice": {
        "VOUCHERNUMBER": "INV-001",
        "DATE": "2024-06-09",
        ...
      },
      "lineItem": {
        "STOCKITEMNAME": "Product A",
        "ACTUALQTY": 10,
        ...
      }
    }
  }
}
```

---

### 4. Reset to Default Mapping

```http
POST /api/field-mapping/reset
Headers: Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "message": "Field mapping reset to defaults",
  "data": {
    "fieldMapping": {
      "invoice": { ... },
      "lineItem": { ... }
    }
  }
}
```

---

## User Workflow

### Step 1: Configure Tally Connection
User sets up their Tally connection with endpoint and credentials.

### Step 2: View Available Fields
```javascript
// Frontend calls
GET /api/field-mapping/available-fields

// Shows user what fields exist in their Tally
```

### Step 3: Customize Mapping (Optional)
```javascript
// If default mapping doesn't match, user updates:
PUT /api/field-mapping
{
  "lineItem": {
    "quantity": "QTY",           // Instead of default "ACTUALQTY"
    "description": "ITEM_DESC"   // Instead of default "STOCKITEMNAME"
  }
}
```

### Step 4: Import Invoices
```javascript
// Backend automatically uses user's custom mapping
POST /api/invoices/import-from-tally

// TallyConnector.importInvoices() uses fieldMapping to transform data
```

### Step 5: Push Invoices
```javascript
// Buyer pushes invoice to their Tally
POST /api/invoices/:id/push-to-tally

// TallyConnector.pushInvoice() uses buyer's fieldMapping to format data
```

---

## Frontend UI Example

### Field Mapping Configuration Page

```jsx
<FieldMappingConfig>
  <Section title="Invoice Fields">
    <FieldMapper
      label="Invoice Number"
      ourField="invoiceNumber"
      tallyField={mapping.invoice.invoiceNumber}
      availableFields={availableFields.invoice}
      onChange={handleChange}
    />
    <FieldMapper
      label="Invoice Date"
      ourField="invoiceDate"
      tallyField={mapping.invoice.invoiceDate}
      availableFields={availableFields.invoice}
      onChange={handleChange}
    />
    ...
  </Section>
  
  <Section title="Line Item Fields">
    <FieldMapper
      label="Item Description"
      ourField="description"
      tallyField={mapping.lineItem.description}
      availableFields={availableFields.lineItem}
      onChange={handleChange}
    />
    <FieldMapper
      label="Quantity"
      ourField="quantity"
      tallyField={mapping.lineItem.quantity}
      availableFields={availableFields.lineItem}
      onChange={handleChange}
    />
    ...
  </Section>
  
  <Button onClick={saveMapping}>Save Mapping</Button>
  <Button onClick={resetMapping}>Reset to Defaults</Button>
</FieldMappingConfig>
```

---

## Technical Implementation

### Database Schema (TallyConnection Model)

```javascript
{
  companyId: ObjectId,
  apiEndpoint: "http://localhost:9000",
  encryptedCredentials: "...",
  fieldMapping: {
    invoice: {
      invoiceNumber: { type: String, default: 'VOUCHERNUMBER' },
      invoiceDate: { type: String, default: 'DATE' },
      buyerName: { type: String, default: 'PARTYNAME' },
      buyerGSTIN: { type: String, default: 'PARTYGSTIN' },
      totalAmount: { type: String, default: 'AMOUNT' }
    },
    lineItem: {
      description: { type: String, default: 'STOCKITEMNAME' },
      quantity: { type: String, default: 'ACTUALQTY' },
      rate: { type: String, default: 'RATE' },
      taxableAmount: { type: String, default: 'AMOUNT' },
      taxAmount: { type: String, default: 'CGSTAMOUNT' }
    }
  }
}
```

### TallyConnector Transform Methods

```javascript
// Import: Tally → Our Format
transformTallyInvoice(tallyInvoice, fieldMapping) {
  const invoiceMapping = fieldMapping.invoice;
  const lineItemMapping = fieldMapping.lineItem;
  
  return {
    invoiceNumber: tallyInvoice[invoiceMapping.invoiceNumber],
    invoiceDate: tallyInvoice[invoiceMapping.invoiceDate],
    lineItems: tallyInvoice.items.map(item => ({
      description: item[lineItemMapping.description],
      quantity: item[lineItemMapping.quantity],
      ...
    }))
  };
}

// Push: Our Format → Tally
transformToTallyFormat(invoiceData, fieldMapping) {
  const tallyInvoice = {};
  
  tallyInvoice[fieldMapping.invoice.invoiceNumber] = invoiceData.invoiceNumber;
  tallyInvoice[fieldMapping.invoice.invoiceDate] = invoiceData.invoiceDate;
  
  return tallyInvoice;
}
```

---

## Benefits

✅ **Flexibility:** Works with any Tally field naming convention  
✅ **No Code Changes:** Users configure mapping via UI  
✅ **Per-Company:** Each company has their own custom mapping  
✅ **Easy Discovery:** Auto-detect available fields from Tally  
✅ **Safe Defaults:** Works out-of-the-box with standard Tally fields  
✅ **Version Agnostic:** Compatible with Tally ERP 9 and Tally Prime

---

## Common Field Variations

| Our Field | Common Tally Variations |
|-----------|------------------------|
| `invoiceNumber` | VOUCHERNUMBER, INV_NO, INVOICE_NO, VOUCHER_NUM |
| `invoiceDate` | DATE, INV_DATE, VOUCHER_DATE, BILLDATE |
| `buyerName` | PARTYNAME, CUSTOMER_NAME, BUYER, PARTY_LEDGER_NAME |
| `buyerGSTIN` | PARTYGSTIN, GSTIN, GST_NO, PARTY_GST |
| `quantity` | ACTUALQTY, QTY, QUANTITY, BILLEDQTY |
| `description` | STOCKITEMNAME, ITEM_NAME, PRODUCT, LEDGERNAME |
| `rate` | RATE, PRICE, UNIT_PRICE, ITEM_RATE |

---

## Testing Field Mapping

### Test Case 1: Import with Custom Mapping

```bash
# 1. Set custom mapping
curl -X PUT http://localhost:5000/api/field-mapping \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "lineItem": {
      "quantity": "QTY",
      "description": "ITEM_DESC"
    }
  }'

# 2. Import invoices (should use custom mapping)
curl -X POST http://localhost:5000/api/invoices/import-from-tally \
  -H "Authorization: Bearer <token>" \
  -d '{}'

# 3. Verify invoices imported with correct field mapping
```

---

## Future Enhancements

1. **Auto-Detection:** Automatically suggest mapping by analyzing field names
2. **Mapping Templates:** Pre-defined mappings for common Tally configurations
3. **Validation:** Warn if mapped field doesn't exist in Tally data
4. **Bulk Update:** Update mapping for multiple companies at once (super admin)
5. **Export/Import:** Share field mapping configuration between users

---

## Support

For issues or questions about field mapping:
1. Check if Tally connection is active
2. Verify field names using `/available-fields` endpoint
3. Test with default mapping first
4. Use `/reset` to restore defaults if issues occur

