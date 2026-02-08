import { createHmac, createHash } from 'node:crypto'
import {
  PlatformCredentials,
  ProdService,
  ProdDeployment,
  ProdPerformanceMetrics,
  ProdResourceMetrics,
  DeployStatus
} from '../../../shared/types'
import { PlatformProviderAdapter } from './platform-provider'

// AWS Signature V4 signing (no SDK dependency)
function sha256(data: string): string {
  return createHash('sha256').update(data, 'utf8').digest('hex')
}

function hmacSha256(key: Buffer | string, data: string): Buffer {
  return createHmac('sha256', key).update(data, 'utf8').digest()
}

function getSignatureKey(
  secretKey: string,
  dateStamp: string,
  region: string,
  service: string
): Buffer {
  const kDate = hmacSha256(`AWS4${secretKey}`, dateStamp)
  const kRegion = hmacSha256(kDate, region)
  const kService = hmacSha256(kRegion, service)
  return hmacSha256(kService, 'aws4_request')
}

interface AwsRequestOptions {
  service: string
  action: string
  region: string
  accessKeyId: string
  secretAccessKey: string
  body?: string
  version?: string
  method?: string
  extraHeaders?: Record<string, string>
}

async function awsRequest(opts: AwsRequestOptions): Promise<Record<string, unknown>> {
  const {
    service,
    action,
    region,
    accessKeyId,
    secretAccessKey,
    body = '',
    version = '2014-11-13',
    method = 'POST'
  } = opts

  const host = `${service}.${region}.amazonaws.com`
  const endpoint = `https://${host}`
  const now = new Date()
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '')
  const dateStamp = amzDate.slice(0, 8)

  const headers: Record<string, string> = {
    Host: host,
    'X-Amz-Date': amzDate,
    'Content-Type': 'application/x-amz-json-1.1',
    'X-Amz-Target': `${getTargetPrefix(service, version)}.${action}`,
    ...opts.extraHeaders
  }

  const signedHeaders = Object.keys(headers)
    .map((k) => k.toLowerCase())
    .sort()
    .join(';')

  const canonicalHeaders = Object.keys(headers)
    .map((k) => `${k.toLowerCase()}:${headers[k].trim()}`)
    .sort()
    .join('\n')

  const payloadHash = sha256(body)

  const canonicalRequest = [
    method,
    '/',
    '',
    canonicalHeaders + '\n',
    signedHeaders,
    payloadHash
  ].join('\n')

  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`
  const stringToSign = [
    'AWS4-HMAC-SHA256',
    amzDate,
    credentialScope,
    sha256(canonicalRequest)
  ].join('\n')

  const signingKey = getSignatureKey(secretAccessKey, dateStamp, region, service)
  const signature = createHmac('sha256', signingKey)
    .update(stringToSign, 'utf8')
    .digest('hex')

  headers[
    'Authorization'
  ] = `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`

  const res = await fetch(endpoint, {
    method,
    headers,
    body: body || undefined
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`AWS ${service}:${action} HTTP ${res.status}: ${text.slice(0, 200)}`)
  }

  return (await res.json()) as Record<string, unknown>
}

function getTargetPrefix(service: string, _version: string): string {
  switch (service) {
    case 'ecs':
      return 'AmazonEC2ContainerServiceV20141113'
    case 'lambda':
      return 'AWSLambda'
    case 'monitoring':
      return 'GraniteServiceVersion20100801'
    case 'logs':
      return 'Logs_20140328'
    case 'sts':
      return 'AWSSecurityTokenServiceV20110615'
    default:
      return service
  }
}

function mapEcsStatus(status: string): DeployStatus {
  switch (status?.toUpperCase()) {
    case 'ACTIVE':
    case 'RUNNING':
      return 'live'
    case 'PENDING':
    case 'ACTIVATING':
      return 'deploying'
    case 'DRAINING':
    case 'DEACTIVATING':
      return 'canceled'
    case 'INACTIVE':
    case 'STOPPED':
      return 'unknown'
    default:
      return 'unknown'
  }
}

export class AwsProvider implements PlatformProviderAdapter {
  readonly provider = 'aws' as const

  private getAuth(creds: PlatformCredentials) {
    return {
      accessKeyId: creds.accessKeyId || '',
      secretAccessKey: creds.secretAccessKey || '',
      region: creds.region || 'us-east-1'
    }
  }

  async testConnection(
    creds: PlatformCredentials
  ): Promise<{ ok: boolean; error?: string }> {
    try {
      const auth = this.getAuth(creds)
      // STS GetCallerIdentity uses a query-string API, not JSON
      const host = `sts.${auth.region}.amazonaws.com`
      const body = 'Action=GetCallerIdentity&Version=2011-06-15'
      const now = new Date()
      const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '')
      const dateStamp = amzDate.slice(0, 8)

      const headers: Record<string, string> = {
        Host: host,
        'X-Amz-Date': amzDate,
        'Content-Type': 'application/x-www-form-urlencoded'
      }

      const signedHeaders = Object.keys(headers)
        .map((k) => k.toLowerCase())
        .sort()
        .join(';')
      const canonicalHeaders = Object.keys(headers)
        .map((k) => `${k.toLowerCase()}:${headers[k].trim()}`)
        .sort()
        .join('\n')
      const payloadHash = sha256(body)
      const canonicalRequest = [
        'POST',
        '/',
        '',
        canonicalHeaders + '\n',
        signedHeaders,
        payloadHash
      ].join('\n')
      const credentialScope = `${dateStamp}/${auth.region}/sts/aws4_request`
      const stringToSign = [
        'AWS4-HMAC-SHA256',
        amzDate,
        credentialScope,
        sha256(canonicalRequest)
      ].join('\n')
      const signingKey = getSignatureKey(
        auth.secretAccessKey,
        dateStamp,
        auth.region,
        'sts'
      )
      const signature = createHmac('sha256', signingKey)
        .update(stringToSign, 'utf8')
        .digest('hex')

      headers[
        'Authorization'
      ] = `AWS4-HMAC-SHA256 Credential=${auth.accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`

      const res = await fetch(`https://${host}`, {
        method: 'POST',
        headers,
        body
      })

      if (!res.ok) {
        const text = await res.text()
        return { ok: false, error: `HTTP ${res.status}: ${text.slice(0, 200)}` }
      }
      return { ok: true }
    } catch (err) {
      return { ok: false, error: (err as Error).message }
    }
  }

  async fetchServices(creds: PlatformCredentials): Promise<ProdService[]> {
    const auth = this.getAuth(creds)
    const services: ProdService[] = []

    // Fetch ECS services
    try {
      const clustersData = await awsRequest({
        service: 'ecs',
        action: 'ListClusters',
        ...auth,
        body: '{}'
      })
      const clusterArns = (clustersData.clusterArns as string[]) || []

      for (const clusterArn of clusterArns.slice(0, 5)) {
        const svcData = await awsRequest({
          service: 'ecs',
          action: 'ListServices',
          ...auth,
          body: JSON.stringify({ cluster: clusterArn, maxResults: 50 })
        })
        const svcArns = (svcData.serviceArns as string[]) || []
        if (svcArns.length === 0) continue

        const descData = await awsRequest({
          service: 'ecs',
          action: 'DescribeServices',
          ...auth,
          body: JSON.stringify({ cluster: clusterArn, services: svcArns })
        })
        const ecsSvcs = (descData.services as Array<Record<string, unknown>>) || []

        for (const svc of ecsSvcs) {
          services.push({
            id: (svc.serviceArn as string) || (svc.serviceName as string),
            provider: 'aws',
            name: (svc.serviceName as string) || 'unknown',
            url: null,
            type: 'ecs_service',
            region: auth.region,
            createdAt: svc.createdAt
              ? new Date(svc.createdAt as string).toISOString()
              : new Date().toISOString()
          })
        }
      }
    } catch {
      // ECS not available or no permissions
    }

    // Fetch Lambda functions
    try {
      const lambdaHost = `lambda.${auth.region}.amazonaws.com`
      const now = new Date()
      const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '')
      const dateStamp = amzDate.slice(0, 8)

      const headers: Record<string, string> = {
        Host: lambdaHost,
        'X-Amz-Date': amzDate
      }

      const signedHeaders = Object.keys(headers)
        .map((k) => k.toLowerCase())
        .sort()
        .join(';')
      const canonicalHeaders = Object.keys(headers)
        .map((k) => `${k.toLowerCase()}:${headers[k].trim()}`)
        .sort()
        .join('\n')
      const payloadHash = sha256('')
      const canonicalRequest = [
        'GET',
        '/2015-03-31/functions/',
        '',
        canonicalHeaders + '\n',
        signedHeaders,
        payloadHash
      ].join('\n')
      const credentialScope = `${dateStamp}/${auth.region}/lambda/aws4_request`
      const stringToSign = [
        'AWS4-HMAC-SHA256',
        amzDate,
        credentialScope,
        sha256(canonicalRequest)
      ].join('\n')
      const signingKey = getSignatureKey(auth.secretAccessKey, dateStamp, auth.region, 'lambda')
      const signature = createHmac('sha256', signingKey)
        .update(stringToSign, 'utf8')
        .digest('hex')

      headers[
        'Authorization'
      ] = `AWS4-HMAC-SHA256 Credential=${auth.accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`

      const res = await fetch(`https://${lambdaHost}/2015-03-31/functions/`, {
        method: 'GET',
        headers
      })

      if (res.ok) {
        const data = (await res.json()) as Record<string, unknown>
        const functions = (data.Functions as Array<Record<string, unknown>>) || []
        for (const fn of functions) {
          services.push({
            id: (fn.FunctionArn as string) || (fn.FunctionName as string),
            provider: 'aws',
            name: (fn.FunctionName as string) || 'unknown',
            url: null,
            type: 'lambda_function',
            region: auth.region,
            createdAt: (fn.LastModified as string) || new Date().toISOString()
          })
        }
      }
    } catch {
      // Lambda not available or no permissions
    }

    return services
  }

  async fetchDeployments(
    creds: PlatformCredentials,
    serviceId: string,
    _limit = 20
  ): Promise<ProdDeployment[]> {
    const auth = this.getAuth(creds)

    // For ECS, show task definition revisions as "deployments"
    if (serviceId.includes('ecs') || !serviceId.includes('function')) {
      try {
        const data = await awsRequest({
          service: 'ecs',
          action: 'DescribeServices',
          ...auth,
          body: JSON.stringify({
            cluster: serviceId.split('/').slice(0, -1).join('/'),
            services: [serviceId]
          })
        })
        const svcs = (data.services as Array<Record<string, unknown>>) || []
        if (svcs.length > 0) {
          const deployments =
            (svcs[0].deployments as Array<Record<string, unknown>>) || []
          return deployments.map((d) => ({
            id: (d.id as string) || 'unknown',
            serviceId,
            provider: 'aws' as const,
            status: mapEcsStatus((d.status as string) || ''),
            commitHash: null,
            commitMessage: (d.taskDefinition as string) || null,
            branch: null,
            createdAt: d.createdAt
              ? new Date(d.createdAt as string).toISOString()
              : new Date().toISOString(),
            finishedAt: null,
            duration: null
          }))
        }
      } catch {
        // ignore
      }
    }

    return []
  }

  async fetchDeployLogs(
    creds: PlatformCredentials,
    _serviceId: string,
    _deployId: string
  ): Promise<string> {
    const auth = this.getAuth(creds)

    try {
      const data = await awsRequest({
        service: 'logs',
        action: 'DescribeLogGroups',
        ...auth,
        body: JSON.stringify({ limit: 10 })
      })
      const groups = (data.logGroups as Array<Record<string, unknown>>) || []
      return groups.length > 0
        ? `Available log groups:\n${groups.map((g) => g.logGroupName).join('\n')}`
        : 'No log groups found'
    } catch {
      return 'CloudWatch logs not available'
    }
  }

  async fetchPerformanceMetrics(
    creds: PlatformCredentials,
    serviceId: string
  ): Promise<ProdPerformanceMetrics[]> {
    const auth = this.getAuth(creds)
    const endTime = new Date()
    const startTime = new Date(endTime.getTime() - 3600000)

    try {
      const data = await awsRequest({
        service: 'monitoring',
        action: 'GetMetricData',
        ...auth,
        body: JSON.stringify({
          MetricDataQueries: [
            {
              Id: 'requests',
              MetricStat: {
                Metric: {
                  Namespace: 'AWS/ApplicationELB',
                  MetricName: 'RequestCount',
                  Dimensions: [{ Name: 'ServiceName', Value: serviceId.split('/').pop() }]
                },
                Period: 300,
                Stat: 'Sum'
              }
            }
          ],
          StartTime: startTime.toISOString(),
          EndTime: endTime.toISOString()
        })
      })

      const results = (data.MetricDataResults as Array<Record<string, unknown>>) || []
      if (results.length > 0 && Array.isArray(results[0].Timestamps)) {
        const timestamps = results[0].Timestamps as string[]
        const values = results[0].Values as number[]
        return timestamps.map((ts, i) => ({
          serviceId,
          provider: 'aws' as const,
          timestamp: ts,
          responseTimeMs: null,
          requestCount: values[i] || null,
          errorRate: null,
          bandwidthBytes: null,
          functionInvocations: null
        }))
      }
    } catch {
      // ignore
    }

    return []
  }

  async fetchResourceMetrics(
    creds: PlatformCredentials,
    serviceId: string
  ): Promise<ProdResourceMetrics[]> {
    const auth = this.getAuth(creds)
    const endTime = new Date()
    const startTime = new Date(endTime.getTime() - 3600000)

    try {
      const data = await awsRequest({
        service: 'monitoring',
        action: 'GetMetricData',
        ...auth,
        body: JSON.stringify({
          MetricDataQueries: [
            {
              Id: 'cpu',
              MetricStat: {
                Metric: {
                  Namespace: 'AWS/ECS',
                  MetricName: 'CPUUtilization',
                  Dimensions: [{ Name: 'ServiceName', Value: serviceId.split('/').pop() }]
                },
                Period: 300,
                Stat: 'Average'
              }
            },
            {
              Id: 'memory',
              MetricStat: {
                Metric: {
                  Namespace: 'AWS/ECS',
                  MetricName: 'MemoryUtilization',
                  Dimensions: [{ Name: 'ServiceName', Value: serviceId.split('/').pop() }]
                },
                Period: 300,
                Stat: 'Average'
              }
            }
          ],
          StartTime: startTime.toISOString(),
          EndTime: endTime.toISOString()
        })
      })

      const results = (data.MetricDataResults as Array<Record<string, unknown>>) || []
      const cpuResult = results.find((r) => (r.Id as string) === 'cpu')
      const memResult = results.find((r) => (r.Id as string) === 'memory')

      if (cpuResult && Array.isArray(cpuResult.Timestamps)) {
        const timestamps = cpuResult.Timestamps as string[]
        const cpuValues = (cpuResult.Values as number[]) || []
        const memValues = (memResult?.Values as number[]) || []

        return timestamps.map((ts, i) => ({
          serviceId,
          provider: 'aws' as const,
          timestamp: ts,
          cpuPercent: cpuValues[i] || null,
          memoryPercent: memValues[i] || null,
          memoryUsedBytes: null,
          memoryLimitBytes: null,
          diskUsedBytes: null,
          diskLimitBytes: null
        }))
      }
    } catch {
      // ignore
    }

    return []
  }

  async triggerRollback(
    creds: PlatformCredentials,
    serviceId: string,
    deployId: string
  ): Promise<{ ok: boolean; error?: string }> {
    const auth = this.getAuth(creds)

    try {
      await awsRequest({
        service: 'ecs',
        action: 'UpdateService',
        ...auth,
        body: JSON.stringify({
          cluster: serviceId.split('/').slice(0, -1).join('/'),
          service: serviceId,
          taskDefinition: deployId,
          forceNewDeployment: true
        })
      })
      return { ok: true }
    } catch (err) {
      return { ok: false, error: (err as Error).message }
    }
  }
}
