import * as http from 'http';
import * as fs from 'fs';
import * as path from 'path';

export const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

export function serveStatic(res: http.ServerResponse, filePath: string): void {
  const ext = path.extname(filePath);
  const mimeType = MIME_TYPES[ext] ?? 'application/octet-stream';

  const stream = fs.createReadStream(filePath);

  stream.once('readable', () => {
    res.writeHead(200, { 'Content-Type': mimeType });
    stream.pipe(res);
  });

  stream.on('error', (err: NodeJS.ErrnoException) => {
    if (!res.headersSent) {
      if (err.code === 'ENOENT') {
        res.writeHead(404);
        res.end('Not found');
      } else {
        res.writeHead(500);
        res.end('Internal server error');
      }
    } else if (!res.writableEnded) {
      res.end();
    }
    console.error('[reqlog] static file error:', err.message);
  });
}
