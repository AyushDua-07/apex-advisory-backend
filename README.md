# Apex Advisory Backend

REST API for the Apex Advisory consulting marketplace.

## Setup

1. Copy `.env.example` to `.env` and fill in your MongoDB URI and JWT secret.
2. Install dependencies: `npm install`
3. Seed the database: `npm run seed`
4. Start the server: `npm start` (or `npm run dev` for development)

## Environment Variables

| Variable | Description |
|----------|-------------|
| MONGO_URI | MongoDB Atlas connection string |
| JWT_SECRET | Secret key for JWT signing |
| JWT_EXPIRES_IN | Token expiration (default: 7d) |
| NODE_ENV | Environment (development/production) |
| PORT | Server port (default: 5000) |
| CLIENT_ORIGIN | Frontend URL for CORS |

## API Endpoints

- `POST /api/auth/register` — Register a new user
- `POST /api/auth/login` — Login
- `GET /api/auth/me` — Get current user (protected)
- `GET /api/advisors` — List approved consultants
- `GET /api/advisors/:id` — Get consultant profile
- `GET /api/advisors/:id/availability` — Get availability slots
- `POST /api/appointments` — Book appointment (protected)
- `GET /api/appointments/mine` — Get my appointments (protected)
- `PATCH /api/appointments/:id/status` — Update appointment status (protected)
- `POST /api/reviews` — Create review (protected)
- `GET /api/reviews/consultant/:id` — Get consultant reviews
- `GET /api/admin/stats` — Admin stats (admin only)
- `GET /api/admin/users` — All users (admin only)
- `PATCH /api/admin/users/:id/status` — Update user status (admin only)
- `GET /api/admin/consultants` — All consultants (admin only)
- `PATCH /api/admin/consultants/:id/status` — Approve/reject consultant (admin only)
- `GET /api/admin/sessions` — All sessions (admin only)
