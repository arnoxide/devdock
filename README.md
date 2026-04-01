# DevDock

A desktop app for managing local development environments. Monitor processes, terminals, databases, APIs, ports, and Git — all in one place.

Built with Electron + React. Open source.

---

## Features

### Project Management
- Add projects by browsing or dropping a path
- Auto-detects project type (Node.js, Python, PHP, etc.)
- Auto-groups related nested projects (e.g. `client/` + `server/`)
- Open any project directly in your editor

### Process Control
- Start, stop, and restart dev servers per project
- Real-time process output streaming
- Run custom one-off commands
- Auto-detects which port a process is listening on

### Integrated Terminal
- Full xterm.js terminal per project
- Multiple sessions, resizable, with scrollback history
- Runs in your configured shell (`bash`, `zsh`, etc.)

### API Monitoring
- Auto-detects API endpoints from source code and active ports
- Health checks with response time tracking
- Supports GET, POST, PUT, DELETE, PATCH
- Real-time metrics dashboard with charts
- Log analysis for HTTP requests, login attempts, DB events, and errors

### Port Manager
- Scan all active ports on your machine
- Kill any process occupying a port

### Database Monitor
- Connect to PostgreSQL and MongoDB
- Run queries, browse tables, inspect schema
- Live connection status monitoring

### Git Integration
- Commit, push, pull from the UI
- Detects if you're behind remote — warns before committing
- Disables push when there are uncommitted changes or you're behind

### GitHub Integration
- Connect with a personal access token
- Browse repos, pull requests, issues, and Actions runs
- Real-time notification polling

### Security Vault
- Encrypted credential storage (AES-256-GCM)
- Password manager with categories (login, API key, SSH, database)
- Copy passwords without revealing them
- Import/export environment variables per project

### Environment Variables
- Read and write `.env` files per project
- Save reusable templates and apply them across projects

### System Monitoring
- Real-time CPU, memory, and disk usage
- History charts

### Log Viewer
- Centralized logs per project
- Filter, search, and clear

### Production Metrics
- Connect to production services (Render, Railway, etc.)
- Monitor deployments, performance, and resource usage
- Trigger rollbacks from the UI

### Tunnel / Link Sharing
- Expose a local port to the internet via a public URL (localtunnel)
- Auto-patches Vite config for tunnel compatibility

### Notifications
- Auto-update alerts (available, downloading, ready to install)
- In-app notification center

### Command Palette
- `Ctrl+K` to search projects and pages instantly

### Settings
- Launch at startup (all platforms)
- Start minimized / close to tray
- Theme (dark/light)
- Default shell
- SSH key generation and GitHub auth test

---

## Tech Stack

| Layer | Technology |
|---|---|
| Desktop framework | Electron 33 |
| Build tool | electron-vite |
| UI | React 18 + React Router 7 |
| State | Zustand |
| Styling | Tailwind CSS |
| Charts | Recharts |
| Icons | Lucide React |
| Terminal | xterm.js + node-pty |
| Database clients | pg (PostgreSQL), mongodb |
| Real-time | Socket.IO |
| Security | bcryptjs, jsonwebtoken |
| Auto-updates | electron-updater |
| Tunneling | localtunnel |
| Storage | electron-store |

---

## Getting Started

### Prerequisites

- Node.js 20+
- `npm`
- Linux: `build-essential` (for node-pty native build)

```bash
# Linux
sudo apt install build-essential

# macOS (Xcode CLI tools)
xcode-select --install
```

### Install & Run

```bash
git clone https://github.com/arnoxide/devdock.git
cd devdock
npm install
npm run dev
```

### Build for Distribution

```bash
# Linux (.AppImage + .deb + .snap)
npm run package

# macOS (.dmg + .zip)
npm run package:mac

# Windows (.exe installer + portable)
npm run package:win

# All platforms
npm run package:all
```

Built artifacts go to `dist/`.

---

## Project Structure

```
devdock/
├── src/
│   ├── main/               # Electron main process
│   │   ├── ipc/            # IPC handlers (17 modules, 191 channels)
│   │   └── services/       # Business logic (process manager, git, vault, etc.)
│   ├── renderer/           # React UI
│   │   └── src/
│   │       ├── pages/      # Page components (15 pages)
│   │       ├── components/ # Reusable UI components
│   │       └── stores/     # Zustand state
│   ├── preload/            # IPC bridge (contextBridge)
│   └── shared/             # Types and IPC channel constants
├── remote-web/             # Separate web UI for remote access
├── standalone-server/      # Express + Socket.IO server for remote mode
├── resources/              # App icons and assets
├── electron-builder.yml    # Packaging config
└── electron.vite.config.ts # Build config
```

---

## Remote Access

DevDock includes a standalone server that lets you manage your projects from a browser on any device — useful when you're away from your machine.

```bash
# On your server / VPS
cd standalone-server
npm install
node server.js
```

Access the web UI at `http://your-server-ip:7777`.

Set up remote credentials under **Profile → Remote Access**.

---

## Auto-Updates

DevDock uses `electron-updater` with GitHub Releases. When a new version is published, running instances detect it automatically and show a notification with a one-click install option.

Updates are published via GitHub Actions on every `v*` tag push.

---

## Contributing

1. Fork the repo
2. Create a branch: `git checkout -b feature/your-feature`
3. Commit your changes
4. Open a pull request

All contributions welcome — bug fixes, new features, docs, or UI improvements.

---

## License

MIT — see [LICENSE](LICENSE)

---

Built by [Arnold Masutha](https://github.com/arnoxide) / theboxco
