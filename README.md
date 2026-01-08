# MangoPulse: Behavioral CRM

**Smart Engagement Automator** - A backend solution for coaches with large student databases (17,000+) to manage targeted, cost-effective communication.

## 🎯 Problem Statement

Coaches with large databases struggle with "One-Size-Fits-All" communication. Blasting everyone on WhatsApp for every update is expensive and leads to high "unfollow" rates. MangoPulse segments users in real-time based on their participation to send targeted nudges, collect feedback, or provide recordings automatically.

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ (recommended: Node 20+)
- npm or yarn
- Supabase account with a project

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd smart-engagement-automator
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   
   Copy the example environment file:
   ```bash
   cp .env.example .env
   ```
   
   Fill in your Supabase credentials in `.env`:
   ```env
   SUPABASE_URL="https://your-project.supabase.co"
   SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
   JWT_SECRET="your-super-secret-jwt-key"
   JWT_EXPIRES_IN="7d"
   PORT=3000
   NODE_ENV=development
   ```

4. **Run the migration in Supabase**
   
   Go to your Supabase Dashboard → SQL Editor → Run the SQL from:
   ```
   src/db/migrations/001_create_users.sql
   ```

5. **Start the development server**
   ```bash
   npm run start:dev
   ```

The API will be available at `http://localhost:3000/api`

## 📚 API Endpoints

### Authentication (`/api/auth`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/signup` | Register a new user | No |
| POST | `/signin` | Login and get JWT token | No |
| GET | `/me` | Get current user profile | Yes |

#### Sign Up Request
```json
{
  "email": "user@example.com",
  "password": "password123",
  "tagMangoId": "optional-tagmango-id",
  "roles": ["user"]
}
```

#### Sign In Request
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

### Users (`/api/users`)

| Method | Endpoint | Description | Auth Required | Role Required |
|--------|----------|-------------|---------------|---------------|
| GET | `/` | List all users | Yes | Coach |
| GET | `/coaches` | List all coaches | Yes | - |
| GET | `/profile` | Get own profile | Yes | - |
| GET | `/:id` | Get user by ID | Yes | Coach |
| PATCH | `/profile` | Update own profile | Yes | - |
| PATCH | `/:id` | Update user by ID | Yes | Coach |
| DELETE | `/:id` | Delete user | Yes | Coach |

### Zoom Webhooks (`/api/zoom`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/webhook` | Receive Zoom webhook events | No (Zoom signature verified) |
| POST | `/webhook/validate` | Handle Zoom URL validation | No |
| GET | `/meetings/:meetingId/participants` | Get meeting participants | Yes |

## 🗄️ Database Schema

### Users Table

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| email | VARCHAR(255) | Unique email |
| password | TEXT | Hashed password |
| tag_mango_id | VARCHAR(255) | Optional TagMango integration |
| roles | ARRAY | User roles: ['user', 'coach'] |
| created_at | TIMESTAMPTZ | Creation time |
| updated_at | TIMESTAMPTZ | Last update time |

## 🛠️ Available Scripts

```bash
# Development
npm run start:dev     # Start with hot-reload

# Production
npm run build         # Build for production
npm run start:prod    # Start production server

# Testing
npm run test          # Run unit tests
npm run test:e2e      # Run E2E tests

# Linting
npm run lint          # Fix ESLint issues
npm run format        # Format with Prettier
```

## 🏗️ Project Structure

```
src/
├── auth/                 # Authentication module
│   ├── decorators/       # Custom decorators (Public, Roles, CurrentUser)
│   ├── dto/              # Data Transfer Objects
│   ├── guards/           # JWT and Roles guards
│   ├── strategies/       # Passport JWT strategy
│   ├── auth.controller.ts
│   ├── auth.module.ts
│   └── auth.service.ts
├── db/                   # Database module
│   ├── migrations/       # SQL migrations (run in Supabase)
│   └── database.module.ts
├── users/                # Users module
│   ├── dto/
│   ├── users.controller.ts
│   ├── users.module.ts
│   └── users.service.ts
├── zoom/                 # Zoom integration module
│   ├── dto/
│   ├── zoom.controller.ts
│   ├── zoom.module.ts
│   └── zoom.service.ts
├── app.module.ts         # Root module
└── main.ts               # Application entry point
```

## 🔒 Authentication Flow

1. User signs up with email/password
2. Password is hashed using bcrypt
3. JWT token is returned upon successful signup/signin
4. Include token in requests: `Authorization: Bearer <token>`
5. Protected routes validate the JWT and extract user info

## 🎯 Core Features (Roadmap)

### Phase 1: Foundation ✅
- [x] User authentication (signup/signin)
- [x] Role-based access control (user/coach)
- [x] Zoom webhook integration
- [x] Supabase integration

### Phase 2: Engagement Engine (TODO)
- [ ] Attendance Fork Logic
- [ ] Interactive WhatsApp Buttons
- [ ] Next Event Nudge
- [ ] Session completion detection

### Phase 3: Analytics (TODO)
- [ ] Cohort Analytics Dashboard
- [ ] Participation trends
- [ ] Cost Estimator
- [ ] Engagement Re-activation Rate metrics

### Phase 4: Advanced (Bonus)
- [ ] Automated Cohort Study
- [ ] AI Sentiment Analysis
- [ ] Gamification (Badges)

## 🧪 Testing the API

Use curl or any API client:

```bash
# Sign Up
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123","roles":["coach"]}'

# Sign In
curl -X POST http://localhost:3000/api/auth/signin \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

# Get Profile (with token)
curl http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## 📝 License

UNLICENSED - Private project for hackathon

---

Built with ❤️ for the 2-day hackathon using NestJS and Supabase.
