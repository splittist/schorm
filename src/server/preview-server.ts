/**
 * Local preview server for SCORM content
 */

import * as http from 'http';
import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';

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

// Mock SCORM 2004 API that gets injected into HTML pages during preview
const MOCK_SCORM_API = `
<script>
(function() {
  'use strict';
  
  console.log('[SCHORM Preview] Injecting mock SCORM 2004 API...');
  
  // Mock SCORM 2004 4th Edition API (API_1484_11)
  window.API_1484_11 = {
    Initialize: function(parameter) {
      console.log('[SCORM API] Initialize called with:', parameter);
      return 'true';
    },
    
    Terminate: function(parameter) {
      console.log('[SCORM API] Terminate called with:', parameter);
      return 'true';
    },
    
    GetValue: function(element) {
      console.log('[SCORM API] GetValue called for:', element);
      // Return empty string for most values, except specific cases
      if (element === 'cmi.completion_status') return 'unknown';
      if (element === 'cmi.success_status') return 'unknown';
      if (element === 'cmi.entry') return 'ab-initio';
      if (element === 'cmi.mode') return 'normal';
      return '';
    },
    
    SetValue: function(element, value) {
      console.log('[SCORM API] SetValue called:', element, '=', value);
      return 'true';
    },
    
    Commit: function(parameter) {
      console.log('[SCORM API] Commit called with:', parameter);
      return 'true';
    },
    
    GetLastError: function() {
      return '0';
    },
    
    GetErrorString: function(errorCode) {
      console.log('[SCORM API] GetErrorString called with:', errorCode);
      return 'No error';
    },
    
    GetDiagnostic: function(errorCode) {
      console.log('[SCORM API] GetDiagnostic called with:', errorCode);
      return 'No diagnostic available';
    }
  };
  
  console.log('[SCHORM Preview] Mock SCORM API ready. All API calls will be logged to console.');
})();
</script>
`;

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
        console.log(`\n🌐 Preview server running at http://localhost:${this.options.port}/`);
        console.log(`📁 Serving files from: ${this.options.directory}`);
        console.log(`🔧 Mock SCORM API injected - check browser console for API calls\n`);

        if (this.options.open) {
          this.openBrowser();
        }

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

  private openBrowser(): void {
    const url = `http://localhost:${this.options.port}/`;
    const platform = process.platform;

    let command: string;
    if (platform === 'darwin') {
      command = `open ${url}`;
    } else if (platform === 'win32') {
      command = `start ${url}`;
    } else {
      command = `xdg-open ${url}`;
    }

    exec(command, (error) => {
      if (error) {
        console.log(`ℹ️  Could not open browser automatically. Please navigate to ${url}`);
      }
    });
  }

  private handleRequest(req: http.IncomingMessage, res: http.ServerResponse): void {
    let filePath = path.join(this.options.directory, req.url || '/');

    // Handle directory requests
    if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
      filePath = path.join(filePath, 'index.html');
    }

    // Handle 404
    if (!fs.existsSync(filePath)) {
      res.writeHead(404, { 'Content-Type': 'text/html' });
      res.end('<h1>404 - File Not Found</h1>');
      return;
    }

    const ext = path.extname(filePath);
    const mimeType = MIME_TYPES[ext] || 'application/octet-stream';

    // For HTML files, inject the mock SCORM API
    if (ext === '.html') {
      try {
        let html = fs.readFileSync(filePath, 'utf-8');

        // Inject mock SCORM API right before closing </head> tag
        // If no </head> tag, inject before </body> or at the end
        if (html.includes('</head>')) {
          html = html.replace('</head>', `${MOCK_SCORM_API}\n</head>`);
        } else if (html.includes('</body>')) {
          html = html.replace('</body>', `${MOCK_SCORM_API}\n</body>`);
        } else {
          html = html + MOCK_SCORM_API;
        }

        res.writeHead(200, { 'Content-Type': mimeType });
        res.end(html);
      } catch (error) {
        res.writeHead(500, { 'Content-Type': 'text/html' });
        res.end('<h1>500 - Internal Server Error</h1>');
      }
    } else {
      // For non-HTML files, serve as-is
      res.writeHead(200, { 'Content-Type': mimeType });
      fs.createReadStream(filePath).pipe(res);
    }
  }
}

export function startPreviewServer(options: PreviewServerOptions): Promise<PreviewServer> {
  const server = new PreviewServer(options);
  return server.start().then(() => server);
}
