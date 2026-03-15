import * as http from 'http';
import * as path from 'path';
import { RingBuffer } from './ring-buffer.js';
import { EventBus } from './event-bus.js';
import { serveStatic } from './static-handler.js';
import { SseManager } from './sse-manager.js';
import { handleReplay } from './replay-handler.js';
import type { ReqlogEntry, ReqlogOptions } from './types.js';

export class ReqlogServer {
  public readonly ringBuffer: RingBuffer<ReqlogEntry>;
  private readonly eventBus: EventBus;
  private sseManager: SseManager;
  private httpServer: http.Server;
  private options: Required<ReqlogOptions>;
  #opened = false;

  constructor(options: ReqlogOptions = {}) {
    this.options = {
      port: options.port ?? 9000,
      maxRequests: options.maxRequests ?? 200,
      slowThreshold: options.slowThreshold ?? 200,
      autoOpen: options.autoOpen ?? true,
    };
    this.ringBuffer = new RingBuffer<ReqlogEntry>(this.options.maxRequests);
    this.eventBus = new EventBus();
    this.sseManager = new SseManager();
    this.httpServer = this.createHttpServer();
  }

  get slowThreshold(): number {
    return this.options.slowThreshold;
  }

  private dashboardDir(): string {
    // When running from dist/esm/index.js, dashboard is in ../dashboard
    // When running from dist/index.js, dashboard is in ./dashboard
    // But we build dashboard to dist/dashboard
    
    // Check if we are in dist/esm
    if (__dirname.endsWith('esm')) {
        return path.resolve(__dirname, '..', 'dashboard');
    }
    return path.resolve(__dirname, 'dashboard');
  }

  private createHttpServer(): http.Server {
    return http.createServer((req, res) => {
      const origin = req.headers.origin ?? '';
      const isLocalOrigin = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
      if (isLocalOrigin) {
        res.setHeader('Access-Control-Allow-Origin', origin);
      }
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

      if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
      }

      const url = req.url ?? '/';

      if (url === '/events' && req.method === 'GET') {
        const existing = this.ringBuffer.toArray();
        this.sseManager.add(req, res);
        for (const entry of existing) {
          res.write(`data: ${JSON.stringify(entry)}\n\n`);
        }
        return;
      }

      if (url === '/api/requests' && req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(this.ringBuffer.toArray()));
        return;
      }

      const replayMatch = url.match(/^\/api\/replay\/(.+)$/);
      if (replayMatch && req.method === 'POST') {
        handleReplay(replayMatch[1], res, this.ringBuffer);
        return;
      }

      if (url === '/' || url === '/index.html') {
        serveStatic(res, path.join(this.dashboardDir(), 'index.html'));
        return;
      }

      if (url.startsWith('/assets/') || url === '/favicon.svg' || url === '/brand-logo.svg' || url === '/brand-logo-light.svg') {
        const dashDir = this.dashboardDir();
        const safePath = path.resolve(dashDir, '.' + url);
        if (!safePath.startsWith(dashDir + path.sep) && safePath !== dashDir) {
          res.writeHead(403);
          res.end('Forbidden');
          return;
        }
        serveStatic(res, safePath);
        return;
      }

      serveStatic(res, path.join(this.dashboardDir(), 'index.html'));
    });
  }

  broadcast(entry: ReqlogEntry): void {
    const data = `data: ${JSON.stringify(entry)}\n\n`;
    this.sseManager.broadcast(data);
  }

  async start(): Promise<void> {
    if (process.env.NODE_ENV === 'production') {
      console.warn(
        '[reqlog] WARNING: reqlog is a development tool and should not be used in production. ' +
        'Set NODE_ENV to something other than "production" or remove reqlog from your app.'
      );
    }
    return new Promise((resolve) => {
      this.httpServer.listen(this.options.port, () => {
        console.log(`[reqlog] Dashboard running at http://localhost:${this.options.port}`);
        if (this.options.autoOpen && !this.#opened) {
          this.#opened = true;
          import('open')
            .then(({ default: open }) => { open(`http://localhost:${this.options.port}`); })
            .catch(() => {});
        }
        resolve();
      });
    });
  }

  stop(): Promise<void> {
    this.sseManager.closeAll();
    return new Promise((resolve, reject) => {
      this.httpServer.close((err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }
}
