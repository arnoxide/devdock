import { ApiEndpointConfig } from '../../shared/types'
import { v4 as uuid } from 'uuid'

interface DetectedEndpoint {
    path: string
    method: string
    description?: string
}

/**
 * Detects API endpoints from project output and common patterns
 */
export class ApiEndpointDetector {
    // Common API endpoint patterns
    private readonly patterns = [
        // Express.js style
        /(?:app|router)\.(get|post|put|delete|patch)\(['"]([^'"]+)['"]/gi,
        // FastAPI/Flask style
        /@(?:app|router)\.(get|post|put|delete|patch)\(['"]([^'"]+)['"]/gi,
        // Next.js API routes (from file paths)
        /api\/([a-z0-9-_/]+)/gi,
        // Generic HTTP server logs
        /(?:GET|POST|PUT|DELETE|PATCH)\s+(\/[^\s]+)/gi
    ]

    // Common health/status endpoint paths
    private readonly commonEndpoints = [
        '/health',
        '/api/health',
        '/healthz',
        '/status',
        '/api/status',
        '/ping',
        '/api/ping',
        '/',
        '/api'
    ]

    /**
     * Detect endpoints from server output logs
     */
    detectFromLogs(output: string): DetectedEndpoint[] {
        const detected: DetectedEndpoint[] = []
        const seen = new Set<string>()

        for (const pattern of this.patterns) {
            let match
            while ((match = pattern.exec(output)) !== null) {
                const method = match[1]?.toUpperCase() || 'GET'
                const path = match[2] || match[1]
                const key = `${method}:${path}`

                if (!seen.has(key) && path.startsWith('/')) {
                    seen.add(key)
                    detected.push({
                        method,
                        path,
                        description: `Auto-detected from logs`
                    })
                }
            }
        }

        return detected
    }

    /**
   * Scan project files for API route definitions
   */
    async scanProjectRoutes(projectPath: string): Promise<DetectedEndpoint[]> {
        const fs = await import('fs/promises')
        const path = await import('path')
        const detected: DetectedEndpoint[] = []

        // Limits
        const MAX_FILES = 500
        const MAX_DEPTH = 5
        let filesScanned = 0

        const scanDir = async (dir: string, depth: number) => {
            if (depth > MAX_DEPTH || filesScanned >= MAX_FILES) return

            try {
                const entries = await fs.readdir(dir, { withFileTypes: true })

                for (const entry of entries) {
                    const fullPath = path.join(dir, entry.name)

                    if (entry.isDirectory()) {
                        if (['node_modules', '.git', 'dist', 'build', 'coverage', 'vendor', '__pycache__'].includes(entry.name)) continue
                        await scanDir(fullPath, depth + 1)
                    } else if (entry.isFile()) {
                        // Check extensions
                        if (!/\.(js|ts|jsx|tsx|py|php|go|java)$/.test(entry.name)) continue

                        filesScanned++
                        const content = await fs.readFile(fullPath, 'utf-8')
                        this.detectInContent(content, detected)
                    }
                }
            } catch (err) {
                // Ignore read errors
            }
        }

        await scanDir(projectPath, 0)
        return detected
    }

    private detectInContent(content: string, detected: DetectedEndpoint[]) {
        const seen = new Set(detected.map(d => `${d.method}:${d.path}`))

        for (const pattern of this.patterns) {
            let match
            // Reset regex state if global
            pattern.lastIndex = 0

            while ((match = pattern.exec(content)) !== null) {
                const method = match[1]?.toUpperCase() || 'GET'
                const rawPath = match[2] || match[1]

                // Clean up path (remove variable syntax or regex chars if possible)
                // This is a simple cleanup, complex regex routes might look messy
                let cleanPath = rawPath.replace(/\:[a-zA-Z0-9_]+/g, '{param}') // Express :param -> {param}
                    .replace(/<[^>]+>/g, '{param}')       // Python <param> -> {param}

                if (!cleanPath.startsWith('/')) cleanPath = '/' + cleanPath

                const key = `${method}:${cleanPath}`

                if (!seen.has(key)) {
                    seen.add(key)
                    detected.push({
                        method,
                        path: cleanPath,
                        description: 'Detected from source code'
                    })
                }
            }
        }
    }

    /**
     * Generate endpoints config from detections
     */
    generateEndpointsFromScan(
        projectId: string,
        projectName: string,
        port: number,
        detected: DetectedEndpoint[]
    ): ApiEndpointConfig[] {
        return detected.map(d => this.createEndpointConfig(projectId, projectName, port, d))
    }

    /**
     * Generate common endpoint configurations for a running project
     */
    generateCommonEndpoints(
        projectId: string,
        projectName: string,
        port: number
    ): ApiEndpointConfig[] {
        const baseUrl = `http://localhost:${port}`
        const endpoints: ApiEndpointConfig[] = []

        for (const path of this.commonEndpoints) {
            endpoints.push({
                id: uuid(),
                projectId,
                name: `${projectName} - ${path}`,
                url: `${baseUrl}${path}`,
                method: 'GET',
                expectedStatus: 200,
                intervalMs: 30000, // 30 seconds
                timeoutMs: 5000,
                enabled: true // Auto-enable so they start polling immediately
            })
        }

        return endpoints
    }

    /**
     * Create endpoint config from detected endpoint
     */
    createEndpointConfig(
        projectId: string,
        projectName: string,
        port: number,
        detected: DetectedEndpoint
    ): ApiEndpointConfig {
        return {
            id: uuid(),
            projectId,
            name: `${projectName} - ${detected.method} ${detected.path}`,
            url: `http://localhost:${port}${detected.path}`,
            method: detected.method as any,
            expectedStatus: 200,
            intervalMs: 30000,
            timeoutMs: 5000,
            enabled: true
        }
    }
}

export const apiEndpointDetector = new ApiEndpointDetector()
