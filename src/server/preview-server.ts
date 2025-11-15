/**
 * Local preview server for SCORM content
 */

import * as http from 'http';
import * as fs from 'fs';
import * as path from 'path';

export interface PreviewServerOptions {
  port: number;
  directory: string;
  open?: boolean;
}

const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.xml': 'application/xml',
};

export class PreviewServer {
  private server: http.Server | null = null;
  private options: PreviewServerOptions;

  constructor(options: PreviewServerOptions) {
    this.options = options;
  }

  start(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.server = http.createServer((req, res) => {
        this.handleRequest(req, res);
      });

      this.server.listen(this.options.port, () => {
        console.log(`Preview server running at http://localhost:${this.options.port}/`);
        console.log(`Serving files from: ${this.options.directory}`);
        resolve();
      });

      this.server.on('error', (err) => {
        reject(err);
      });
    });
  }

  stop(): void {
    if (this.server) {
      this.server.close();
      this.server = null;
    }
  }

  private handleRequest(req: http.IncomingMessage, res: http.ServerResponse): void {
    // TODO: Implement full static file serving with SCORM runtime injection
    let filePath = path.join(this.options.directory, req.url || '/');
    
    if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
      filePath = path.join(filePath, 'index.html');
    }

    if (!fs.existsSync(filePath)) {
      res.writeHead(404);
      res.end('File not found');
      return;
    }

    const ext = path.extname(filePath);
    const mimeType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, { 'Content-Type': mimeType });
    fs.createReadStream(filePath).pipe(res);
  }
}

export function startPreviewServer(options: PreviewServerOptions): Promise<PreviewServer> {
  const server = new PreviewServer(options);
  return server.start().then(() => server);
}
