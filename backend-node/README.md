# Ninja-PDF Node.js Backend

A robust Node.js implementation of the Ninja-PDF backend, featuring Express, Sequelize (Postgres), and Bull (Redis).

## 🚀 Features

- **Authentication**: JWT-based auth, password hashing, role-based access.
- **File Management**: Secure uploads, MIME type validation, quoting enforcement.
- **PDF Tools**: Architecture for PDF processing (Word to PDF, Merge, Split, etc.) using Bull queues.
- **Subscriptions**: Stripe integration placeholders and plan management.
- **Database**: SQL schema using Sequelize ORM.
- **Background Jobs**: Asynchronous processing with Redis/Bull.

## 🛠️ Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: PostgreSQL (via Sequelize)
- **Cache/Queue**: Redis (via Bull)
- **Auth**: Statusless JWT

## 📂 Project Structure

```
backend-node/
├── src/
│   ├── config/         # Database and app config
│   ├── controllers/    # Request handlers
│   ├── jobs/           # Bull queue definitions
│   ├── middleware/     # Auth & error middleware
│   ├── models/         # Sequelize definitions
│   ├── routes/         # Express routes
│   ├── services/       # Business logic
│   ├── utils/          # Helper functions
│   ├── app.js          # Express app setup
│   └── server.js       # Entry point
└── package.json
```

## 🏁 Getting Started

1.  **Install Dependencies**
    ```bash
    npm install
    ```

2.  **Environment Setup**
    Copy `.env.example` to `.env` and configure your Database and Redis credentials.
    ```bash
    cp .env.example .env
    ```

3.  **Run Development Server**
    ```bash
    npm run dev
    ```

## 📡 API Endpoints

### Auth
- `POST /api/auth/signup` - Register
- `POST /api/auth/login` - Login
- `GET /api/auth/user` - Get Profile

### Files
- `POST /api/files/upload` - Upload file
- `GET /api/files` - List files

### Tools (Jobs)
- `POST /api/tools/word-to-pdf`
- `POST /api/tools/merge`
- `POST /api/tools/compress-pdf`
- ... (All standard PDF tools supported)

### Billing
- `POST /api/billing/subscribe` - Create subscription
