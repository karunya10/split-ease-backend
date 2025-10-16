# SplitEase Backend

A Node.js/Express backend API for managing group expenses and settlements with real-time chat functionality.

## Features

- **User Authentication**: Email/password and Google OAuth authentication
- **Group Management**: Create and manage expense-sharing groups
- **Expense Tracking**: Add, split, and track expenses within groups
- **Settlement System**: Automatic calculation and tracking of user debts
- **Real-time Chat**: Socket.IO-powered group conversations
- **Email Notifications**: Automated email services using Resend

## Tech Stack

- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js
- **Database**: PostgreSQL with Prisma ORM
- **Real-time**: Socket.IO
- **Authentication**: JWT + bcrypt
- **Email Service**: Resend

## Prerequisites

- Node.js (v16 or higher)
- PostgreSQL database
- npm or yarn package manager

## Installation

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd splitease-backend
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Environment setup**
   Create a `.env` file in the root directory:

   ```env
   DATABASE_URL="postgresql://username:password@localhost:5432/splitease"
   JWT_SECRET="your-jwt-secret-key"
   GOOGLE_CLIENT_ID="your-google-client-id"
   GOOGLE_CLIENT_SECRET="your-google-client-secret"
   RESEND_API_KEY="your-resend-api-key"
   PORT=4000
   ```

4. **Database setup**

   ```bash
   # Generate Prisma client
   npm run generate

   # Run database migrations
   npm run migrate
   ```

## Development

Start the development server with hot reloading:

```bash
npm run dev
```

The server will start on `http://localhost:4000` (or your specified PORT).

## Production

1. **Build the project**

   ```bash
   npm run build
   ```

2. **Start the production server**
   ```bash
   npm start
   ```

## API Endpoints

### Authentication

- `POST /auth/register` - User registration
- `POST /auth/login` - User login
- `POST /auth/google` - Google OAuth authentication

### Users

- `GET /users/profile` - Get user profile
- `PUT /users/profile` - Update user profile

### Groups

- `GET /groups` - Get user's groups
- `POST /groups` - Create a new group
- `GET /groups/:id` - Get group details
- `PUT /groups/:id` - Update group
- `DELETE /groups/:id` - Delete group

### Group Members

- `POST /groups/:id/members` - Add member to group
- `DELETE /groups/:groupId/members/:userId` - Remove member from group

### Expenses

- `GET /groups/:id/expenses` - Get group expenses
- `POST /groups/:id/expenses` - Create new expense
- `PUT /groups/:groupId/expenses/:expenseId` - Update expense
- `DELETE /groups/:groupId/expenses/:expenseId` - Delete expense

### Settlements

- `GET /groups/:id/settlements` - Get group settlements
- `POST /groups/:id/settlements` - Create settlement
- `PUT /groups/:groupId/settlements/:settlementId/status` - Update settlement status

### Chat

- `GET /chat/groups/:groupId/messages` - Get group messages
- `POST /chat/groups/:groupId/messages` - Send message (also via Socket.IO)

## Database Schema

The application uses Prisma ORM with the following main models:

- **User**: User accounts with authentication details
- **Group**: Expense-sharing groups
- **GroupMember**: Many-to-many relationship between users and groups
- **Expense**: Individual expenses within groups
- **ExpenseSplit**: How expenses are split among group members
- **Settlement**: Debt settlements between users
- **Conversation**: Group chat conversations
- **Message**: Individual chat messages

## Real-time Features

The application includes Socket.IO for real-time features:

- **Live Chat**: Real-time messaging within groups
- **Expense Updates**: Live updates when expenses are added/modified
- **Settlement Notifications**: Real-time settlement status updates

## Scripts

- `npm run dev` - Start development server with hot reloading
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run generate` - Generate Prisma client
- `npm run migrate` - Run database migrations
