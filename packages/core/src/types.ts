export interface ReqlogOptions {
  port?: number;
  maxRequests?: number;
  slowThreshold?: number;
  autoOpen?: boolean;
  allowInProd?: boolean;
}

export interface ReqlogEntry {
  id: string;
  timestamp: number;
  method: string;
  url: string;
  statusCode: number;
  latency: number;
  slow: boolean;
  requestHeaders: Record<string, string>;
  responseHeaders: Record<string, string>;
  requestBody: unknown;
  responseBody: unknown;
  appHost: string;
}
