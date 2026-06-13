# DevDock Hub

Railway-ready cloud hub for DevDock mobile and desktop agent sync.

## Railway

Create a Railway project with:

- Node service from this repository
- Postgres plugin
- Start command: `node hub/server.js`

Environment variables:

```env
DATABASE_URL=postgres://...
JWT_SECRET=change-me
JWT_TTL=7d
```

The service auto-runs `hub/schema.sql` at startup.

## API Shape

User auth:

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/me`

Agent setup:

- `POST /api/agents` with user token
- Save the returned `token` inside the desktop DevDock agent

Agent sync:

- `POST /api/agent/heartbeat`
- `PUT /api/agent/projects`
- `PUT /api/agent/processes`
- `PUT /api/agent/git`
- `PUT /api/agent/production`
- `PUT /api/agent/databases`
- `GET /api/agent/commands`
- `PATCH /api/agent/commands/:id`

Mobile/cloud reads:

- `GET /api/projects`
- `GET /api/processes`
- `GET /api/git`
- `GET /api/production`
- `GET /api/databases`
- `POST /api/commands`
