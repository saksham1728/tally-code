# Testing Guide - B2B Invoice Sync Platform

## Prerequisites

Before you start testing, ensure you have:

1. ✅ Node.js 18+ installed
2. ✅ MongoDB running (locally or Atlas)
3. ✅ Both backend and frontend dependencies installed (`npm install`)
4. ✅ Environment files configured (`.env` files)

---

## Step 1: Start the Services

### Terminal 1 - Start MongoDB (if local)
```bash
# macOS with Homebrew
brew services start mongodb-community

# Or manually
mongod --dbpath /path/to/data/directory
```

### Terminal 2 - Start Backend
```bash
cd backend
npm run dev
```

**Expected Output:**
```
✅ Connected to MongoDB successfully
🚀 Server is running on port 5000
```

### Terminal 3 - Start Frontend
```bash
cd frontend
npm run dev
```

**Expected Output:**
```
VITE v8.x.x  ready in XXX ms

➜  Local:   http://localhost:5173/
➜  Network: use --host to expose
```

---

## Step 2: Access the Application

Open your browser and navigate to: **http://localhost:5173**

You should see the **Login Page** with:
- Login/Register tabs
- Platform features section
- Responsive design

---

## Step 3: Test User Registration

### Register Seller Company

1. Click the **"Register"** tab
2. Fill in the form:
   - **Email**: `seller@example.com`
   - **Password**: `password123`
   - **Company Name**: `ABC Sellers Ltd`
   - **GSTIN**: `27AABCU9603R1ZX` (must be 15 alphanumeric characters)
   - **Phone**: `9876543210`
   - **Company Type**: Select **"Seller"**
3. Click **"Register"**

**Expected Result:**
- ✅ Success notification appears
- ✅ Automatically redirected to Seller Dashboard
- ✅ You should see welcome screen with stats (all zeros initially)

### Register Buyer Company

1. **Logout** first (click profile icon → Logout)
2. Click the **"Register"** tab again
3. Fill in the form:
   - **Email**: `buyer@example.com`
   - **Password**: `password123`
   - **Company Name**: `XYZ Buyers Ltd`
   - **GSTIN**: `29AABCU9603R1ZY` (different GSTIN)
   - **Phone**: `9876543211`
   - **Company Type**: Select **"Buyer"**
4. Click **"Register"**

**Expected Result:**
- ✅ Success notification appears
- ✅ Automatically redirected to Buyer Dashboard
- ✅ You should see empty state (no invoices yet)

---

## Step 4: Test Login

1. **Logout** if logged in
2. Click **"Login"** tab
3. Enter credentials:
   - **Email**: `seller@example.com`
   - **Password**: `password123`
4. Click **"Login"**

**Expected Result:**
- ✅ Success notification
- ✅ Redirected to appropriate dashboard based on role
- ✅ Navbar appears at top with navigation links

---

## Step 5: Test Company Profile & Tally Connection

### View Company Profile

1. Login as **Seller** (`seller@example.com`)
2. Click **"Company Profile"** in the navbar
3. You should see:
   - ✅ Company information (name, GSTIN, type)
   - ✅ Contact details (email, phone)
   - ✅ Tally connection status (Not Configured)

### Edit Contact Details

1. Click **"Edit Profile"** button
2. Change email to: `seller-updated@example.com`
3. Change phone to: `9999999999`
4. Click **"Save Changes"**

**Expected Result:**
- ✅ Success notification
- ✅ Profile updates displayed
- ✅ Form switches back to view mode

### Configure Tally Connection

1. Scroll down to **"Tally Integration Setup"**
2. Fill in:
   - **Tally API Endpoint**: `http://localhost:9000` (default)
   - **Username**: (leave blank for mock mode)
   - **Password**: (leave blank for mock mode)
3. Click **"Test Connection"**

**Expected Result:**
- ✅ Green success message: "Connection Successful"
- ✅ Response time displayed

4. Click **"Save Configuration"**

**Expected Result:**
- ✅ Configuration saved successfully
- ✅ Tally status changes to "Connected" in Company Profile

---

## Step 6: Test Invoice Import (Seller)

### Import Invoices from Tally

1. Login as **Seller** (`seller@example.com`)
2. Go to **Seller Dashboard** (or click logo)
3. Click **"📥 Import from Tally"** button

**Expected Result:**
- ✅ Loading spinner appears
- ✅ Success notification: "Successfully imported X invoice(s) from Tally"
- ✅ Stats cards update with new invoice count
- ✅ Invoice table populates with imported invoices
- ✅ Some invoices may show "Unmatched" status (orange badge)

### Verify Invoice Details

1. Find any invoice in the table
2. Click **"👁️ View"** button

**Expected Result:**
- ✅ Modal opens with complete invoice details
- ✅ Seller and buyer information displayed
- ✅ Line items table with quantities, rates, amounts
- ✅ Subtotal, tax, and grand total calculations
- ✅ Status and timestamps visible
- ✅ Close button works (ESC key also closes)

---

## Step 7: Test Buyer Dashboard

### View Matched Invoices

1. **Logout** from seller account
2. **Login** as **Buyer** (`buyer@example.com`)
3. Navigate to **Buyer Dashboard**

**Expected Result:**
- ✅ Only invoices matched to this buyer are visible
- ✅ Stats show invoice counts by status
- ✅ New invoices have "New" status (yellow badge)

### Accept/Reject Invoices

1. Find an invoice with **"New"** status
2. Click **"✓ Accept"** button

**Expected Result:**
- ✅ Success notification appears
- ✅ Invoice status changes to "Accepted" (green badge)
- ✅ Stats update immediately
- ✅ Accept/Reject buttons disappear

3. Find another **"New"** invoice
4. Click **"✕ Reject"** button

**Expected Result:**
- ✅ Success notification appears
- ✅ Invoice status changes to "Rejected" (red badge)
- ✅ Stats update

### Push Invoice to Tally

1. Find an **"Accepted"** invoice
2. Click **"📤 Push"** button

**Expected Result:**
- ✅ Success notification with response time (< 3 seconds)
- ✅ Invoice status changes to "Pushed_to_Tally" (blue badge)
- ✅ Push button disappears (already pushed)
- ✅ Stats update

---

## Step 8: Test Sync Logs

1. Login as any user (seller or buyer)
2. Click **"Sync Logs"** in navbar

**Expected Result:**
- ✅ Log filter section appears at top
- ✅ Log table shows all synchronization events
- ✅ Events include: import_from_tally, buyer_match_success, push_to_tally_success, etc.
- ✅ Color-coded event types and statuses
- ✅ Timestamps in reverse chronological order

### Filter Logs

1. Select **Event Type**: "Import from Tally"
2. Click **"Apply Filters"**

**Expected Result:**
- ✅ Only import events displayed
- ✅ Log count updates

3. Click **"✕ Clear Filters"**

**Expected Result:**
- ✅ All logs displayed again
- ✅ Filter form resets

---

## Step 9: Test Navigation & Navbar

### Verify Navbar Links

1. Login as **Seller**
2. Navbar should show:
   - ✅ Dashboard
   - ✅ Company Profile
   - ✅ Sync Logs
   - ✅ User email
   - ✅ Logout button

3. Login as **Buyer**
4. Navbar should show same links (no Admin Panel)

5. Click each link and verify:
   - ✅ Dashboard → Appropriate dashboard
   - ✅ Company Profile → Company profile page
   - ✅ Sync Logs → Logs page

### Test Logout

1. Click **Logout** button

**Expected Result:**
- ✅ Redirected to login page
- ✅ Navbar disappears
- ✅ Cannot access protected routes without login

---

## Step 10: Test Responsive Design

### Desktop View (1920x1080)
- ✅ All stats cards in one row
- ✅ Invoice table shows all columns
- ✅ Modals are properly centered

### Tablet View (768px)
- Open browser DevTools (F12)
- Toggle device toolbar
- Select iPad or similar
- ✅ Stats cards in 2 columns
- ✅ Sidebar navigation still visible
- ✅ Tables remain scrollable

### Mobile View (375px)
- Select iPhone SE or similar
- ✅ Stats cards stack vertically
- ✅ Invoice table scrolls horizontally
- ✅ Buttons stack properly
- ✅ Modal takes full screen
- ✅ Navigation is accessible

---

## Step 11: Test Error Handling

### Test Invalid Login
1. Try login with wrong password
   - **Expected**: ❌ Error notification: "Invalid credentials"

### Test Duplicate Registration
1. Try registering with existing email
   - **Expected**: ❌ Error notification: "Email already exists"

### Test Invalid GSTIN Format
1. Register with GSTIN less than 15 characters
   - **Expected**: ❌ Validation error

### Test Backend Offline
1. Stop the backend server
2. Try any action (import, push, etc.)
   - **Expected**: ❌ Error notification: "Network Error" or similar

---

## Step 12: Test Field Mapping (Advanced)

### Access Field Mapping API

1. Login as **Seller**
2. Open browser console (F12 → Console)
3. Run this command:

```javascript
fetch('http://localhost:5173/api/field-mapping', {
  headers: {
    'Authorization': 'Bearer ' + localStorage.getItem('token')
  }
}).then(r => r.json()).then(console.log)
```

**Expected Result:**
- ✅ Returns current field mapping configuration
- ✅ Shows invoice-level and line-item mappings

### View Available Fields

```javascript
fetch('http://localhost:5173/api/field-mapping/available-fields', {
  headers: {
    'Authorization': 'Bearer ' + localStorage.getItem('token')
  }
}).then(r => r.json()).then(console.log)
```

**Expected Result:**
- ✅ Lists all available Tally fields

---

## Common Issues & Troubleshooting

### Issue: "Cannot connect to database"
**Solution**: 
- Ensure MongoDB is running
- Check `MONGODB_URI` in backend `.env`
- Run: `brew services start mongodb-community` (macOS)

### Issue: "Network Error" in frontend
**Solution**:
- Check if backend is running on port 5000
- Verify `VITE_API_BASE_URL` in frontend `.env`
- Check browser console for CORS errors

### Issue: "JWT token expired"
**Solution**:
- Logout and login again
- Token expires after 24 hours by default

### Issue: Modal not closing
**Solution**:
- Press ESC key
- Click outside the modal
- Click the X button in top-right

### Issue: Invoices not showing after import
**Solution**:
- Check backend logs for errors
- Verify `INTEGRATION_MODE=mock` in backend `.env`
- Refresh the page

### Issue: Push to Tally fails
**Solution**:
- Ensure Tally connection is configured
- In mock mode, it should always succeed
- Check sync logs for error details

---

## Test Checklist

Use this checklist to verify all features:

### Authentication
- [ ] Register seller account
- [ ] Register buyer account
- [ ] Login with valid credentials
- [ ] Login fails with invalid credentials
- [ ] Logout works
- [ ] Protected routes redirect to login

### Company Profile
- [ ] View company information
- [ ] Edit contact details
- [ ] Configure Tally connection
- [ ] Test Tally connection
- [ ] Connection status updates

### Seller Features
- [ ] Import invoices from Tally
- [ ] View invoice list
- [ ] View invoice details
- [ ] See unmatched invoices
- [ ] Stats update correctly

### Buyer Features
- [ ] View matched invoices only
- [ ] Accept invoice
- [ ] Reject invoice
- [ ] Push invoice to Tally
- [ ] Push button disables after success
- [ ] Stats update correctly

### Sync Logs
- [ ] View all logs
- [ ] Filter by event type
- [ ] Filter by date range
- [ ] Clear filters
- [ ] Logs in reverse chronological order

### UI/UX
- [ ] Responsive on desktop (1920px)
- [ ] Responsive on tablet (768px)
- [ ] Responsive on mobile (375px)
- [ ] Navbar shows/hides correctly
- [ ] Notifications appear and auto-dismiss
- [ ] Loading spinners work
- [ ] Modals open/close properly

### Error Handling
- [ ] Backend errors show user-friendly messages
- [ ] Network errors handled gracefully
- [ ] Validation errors displayed
- [ ] Form validation works

---

## Performance Testing

### Response Time Checks

1. **Login Response**: Should be < 2 seconds
2. **Invoice Import**: Should complete < 5 seconds (mock mode)
3. **Push to Tally**: Should complete < 3 seconds (mock mode)
4. **Page Navigation**: Should be instant (< 500ms)

### Load Testing (Optional)

1. Import 50+ invoices
2. Verify table performance
3. Check scroll smoothness
4. Test search/filter speed

---

## Next Steps After Testing

Once you've verified all features work:

1. **Document any bugs** you find
2. **Note any UX improvements** needed
3. **Test with real Tally API** (change `INTEGRATION_MODE=tally`)
4. **Add custom field mappings** for your Tally installation
5. **Deploy to staging environment**
6. **Perform security audit**
7. **Load test with multiple users**

---

## Support

If you encounter issues during testing:

1. Check browser console for errors (F12)
2. Check backend terminal for error logs
3. Review `.env` configuration
4. Refer to README.md for setup instructions
5. Check FIELD_MAPPING_GUIDE.md for mapping issues

---

## Success Criteria

Your testing is successful if:

✅ All items in Test Checklist are checked
✅ No critical errors in console
✅ Response times meet requirements
✅ UI is responsive across devices
✅ Data persists correctly in MongoDB
✅ Role-based access control works
✅ Audit logs are created for all actions

**Happy Testing! 🚀**
