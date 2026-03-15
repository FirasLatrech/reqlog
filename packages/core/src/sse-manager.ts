import * as http from 'http';

const MAX_SSE_CLIENTS = 50;

export class SseManager {
  private clients: Set<http.ServerResponse> = new Set();

  add(req: http.IncomingMessage, res: http.ServerResponse): void {
    if (this.clients.size >= MAX_SSE_CLIENTS) {
      res.writeHead(503, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Too many SSE connections' }));
      return;
    }

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    });

    this.clients.add(res);

    const ping = setInterval(() => {
      if (!res.writableEnded) {
        res.write(': ping\n\n');
      } else {
        clearInterval(ping);
        this.clients.delete(res);
      }
    }, 30000);

    // Single close handler: clears interval and removes client
    req.on('close', () => {
      clearInterval(ping);
      this.clients.delete(res);
    });
  }

  broadcast(data: string): void {
    for (const client of this.clients) {
      if (!client.writableEnded) {
        try {
          client.write(data);
        } catch {
          this.clients.delete(client);
        }
      } else {
        this.clients.delete(client);
      }
    }
  }

  closeAll(): void {
    for (const client of this.clients) {
      if (!client.writableEnded) {
        client.end();
      }
    }
    this.clients.clear();
  }
}
