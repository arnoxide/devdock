# API Monitoring & Metrics

DevDock provides comprehensive API monitoring capabilities, including automatic endpoint detection and detailed performance metrics.

## Features

### 1. Automatic Endpoint Detection
When you start a project in DevDock, the system automatically:
- **Port Scanning:** Detects the port number from process output (e.g., "Listening on port 3000").
- **Source Code Analysis:** Scans your project files (e.g., `server.js`, `routes/`, `controllers/`) for API route definitions (Express, NestJS, Flask, etc.).
- **Common Endpoints:** Generates standard health check endpoints (`/health`, `/api/status`, etc.).

All detected endpoints are added to the API Monitor page in a "Disabled" state. You can:
1. Review the detected list.
2. Enable the ones you want to monitor.
3. Remove any that are not relevant.

### 2. Log Analysis & Events
DevDock now watches your application logs in real-time to detect key events:
- **Login Attempts**: Automatically detects "Login attempt" logs.
- **HTTP Requests**: Tracks standard GET/POST/PUT/DELETE logs.
- **DB Connections**: Detects "MongoDB connected" or similar messages.
- **Errors**: Highlights exceptions and errors in red.

These appear in the "Process Log Events" feed on the Metrics page.

### 3. Real-time Monitoring
- **Health Checks**: Periodically sends HTTP requests to your configured endpoints
- **Status Tracking**: Tracks Up/Down/Degraded status based on response codes and timing
- **Response Time**: Measures latency for every request

### 3. Comprehensive Metrics Page
Access via the **"View Metrics"** button on the API Monitor page.

**Metrics Dashboard Includes:**
- **Overview Cards**: Total endpoints, Average Response Time, System Uptime, and Health Distribution
- **Response Time Trends**: Interactive line chart showing performance over time for all endpoints
- **Detailed Table**: 
  - Current Status & Method
  - Latest Response Time
  - Status Code
  - Uptime Percentage (calculated from history)

## Architecture

1. **Backend (`src/main`)**:
   - `ProcessManager`: Detects ports from stdout/stderr references
   - `ApiEndpointDetector`: Generates endpoint configurations
   - `ApiMonitor`: Handles the actual polling and health checks

2. **Frontend (`src/renderer`)**:
   - `ApiMonitorStore`: Manages state and history
   - `ApiMetricsPage`: Visualizes the data using `recharts`

## Configuration

You can customize the monitoring behavior for each endpoint:
- **Interval**: How often to check (default: 30s)
- **Timeout**: Max time to wait for response (default: 5s)
- **Method**: GET, POST, PUT, DELETE, PATCH
- **Headers/Body**: Custom request configuration
