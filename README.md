# B2B Invoice Sync Platform

A middleware dashboard that connects with Tally accounting software to facilitate invoice synchronization between seller and buyer companies.

## Technology Stack

### Backend
- **Node.js** 18+
- **Express.js** 4.x - Web framework
- **MongoDB** 6.x - Database
- **Mongoose** - ODM
- **JWT** - Authentication
- **bcrypt** - Password hashing
- **crypto-js** - Credential encryption
- **axios** - HTTP client for Tally API

### Frontend
- **React** 19+ with Vite
- **React Router** - Navigation
- **axios** - API client

## Project Structure

```
tally-layer/
├── backend/              # Express.js API server
│   ├── config/          # Configuration files
│   ├── controllers/     # Business logic controllers
│   ├── integrations/    # Tally connector & interface
│   ├── middleware/      # Auth, validation, error handling
│   ├── models/          # Mongoose schemas
│   ├── routes/          # API routes
│   ├── scripts/         # Seed data and utilities
│   └── services/        # Business services
├── frontend/            # React Vite application
│   ├── public/          # Static assets
│   └── src/             # React components
└── .kiro/               # Kiro spec files
```

## Setup Instructions

### Prerequisites
- Node.js 18+ installed
- MongoDB 6+ running locally or connection to MongoDB Atlas
- npm or yarn package manager

### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create `.env` file from the example:
   ```bash
   cp .env.example .env
   ```

4. Update `.env` with your configuration:
   ```env
   MONGODB_URI=mongodb://localhost:27017/b2b-invoice-sync
   JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
   JWT_EXPIRATION=24h
   ENCRYPTION_KEY=your-32-character-encryption-key-here-change-this
   PORT=5000
   NODE_ENV=development
   INTEGRATION_MODE=mock
   ```

5. Start the backend server:
   ```bash
   npm run dev    # Development mode with nodemon
   npm start      # Production mode
   ```

### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create `.env` file from the example:
   ```bash
   cp .env.example .env
   ```

4. Update `.env` with your configuration:
   ```env
   VITE_API_BASE_URL=http://localhost:5000/api
   VITE_NODE_ENV=development
   ```

5. Start the frontend development server:
   ```bash
   npm run dev
   ```

6. Open your browser to `http://localhost:5173` (Vite default port)

## Environment Variables

### Backend Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `MONGODB_URI` | MongoDB connection string | Yes | - |
| `JWT_SECRET` | Secret key for JWT signing | Yes | - |
| `JWT_EXPIRATION` | JWT token expiration time | No | 24h |
| `ENCRYPTION_KEY` | 32-character key for credential encryption | Yes | - |
| `PORT` | Backend server port | No | 5000 |
| `NODE_ENV` | Environment mode | No | development |
| `INTEGRATION_MODE` | Integration connector type (mock/tally) | No | mock |
| `TALLY_API_BASE_URL` | Tally API base URL (for tally mode) | No | - |

### Frontend Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `VITE_API_BASE_URL` | Backend API base URL | Yes | - |
| `VITE_NODE_ENV` | Environment mode | No | development |

## Integration Modes

The platform supports two integration modes:

### Mock Mode (Development)
- Uses `MockConnector` for testing without Tally API
- Returns hardcoded sample invoice data
- Set `INTEGRATION_MODE=mock` in backend `.env`

### Tally Mode (Production)
- Uses `TallyConnector` for real Tally API integration
- Requires valid Tally API credentials
- Set `INTEGRATION_MODE=tally` in backend `.env`

## User Roles

The platform supports three user roles:

1. **Seller Admin** - Can import invoices from Tally, view their invoices and sync logs
2. **Buyer Admin** - Can view matched invoices, accept/reject, and push to their Tally
3. **Super Admin** - System-wide access to all companies, invoices, and statistics

## MVP Scope and Limitations

This is an MVP focused on:
- ✅ Invoice synchronization between Tally systems
- ✅ Buyer-seller matching by GSTIN and company name
- ✅ One-click invoice push to buyer's Tally
- ✅ Audit trail with sync logs

This MVP does NOT include:
- ❌ Accounting features (ledger management, payment tracking, financial reports)
- ❌ Replacement or replication of Tally functionality
- ❌ Automated test cases in the initial release

## Development

### Backend Development
```bash
cd backend
npm run dev    # Starts nodemon for auto-reload
```

### Frontend Development
```bash
cd frontend
npm run dev    # Starts Vite dev server with HMR
```

### Database Seeding
```bash
cd backend
node scripts/seed.js
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login and get JWT token

### Company
- `GET /api/company/me` - Get current user's company
- `PUT /api/company/me` - Update company details
- `POST /api/company/tally-connection` - Configure Tally connection
- `POST /api/company/test-connection` - Test Tally connectivity

### Invoices
- `GET /api/invoices` - Get invoices (filtered by role)
- `GET /api/invoices/:id` - Get invoice details with line items
- `POST /api/invoices/import-from-tally` - Import invoices from Tally
- `POST /api/invoices/:id/push-to-tally` - Push invoice to buyer's Tally
- `PUT /api/invoices/:id/status` - Update invoice status

### Logs
- `GET /api/logs` - Get sync logs (with filters)

### Admin (Super Admin Only)
- `GET /api/admin/companies` - Get all companies
- `GET /api/admin/stats` - Get system statistics
- `POST /api/admin/match/:invoiceId` - Manually trigger buyer matching

## License

ISC
