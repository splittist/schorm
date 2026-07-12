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
  
  // Values written via SetValue, so GetValue can echo them back and the
  // collection _count queries (cmi.interactions._count, cmi.objectives._count)
  // behave like a real LMS. The model persists to localStorage per SCO so
  // suspend/resume can be exercised in preview: reload the page and
  // cmi.entry reports 'resume' with the saved values intact.
  var storageKey = 'schorm:scorm:' + window.location.pathname;
  var dataModel = {};
  var isResumedSession = false;

  try {
    var persisted = localStorage.getItem(storageKey);
    if (persisted) {
      dataModel = JSON.parse(persisted) || {};
      isResumedSession = Object.keys(dataModel).length > 0;
    }
  } catch (e) {
    console.warn('[SCHORM Preview] Could not read persisted SCORM state', e);
  }

  function persistDataModel() {
    try {
      localStorage.setItem(storageKey, JSON.stringify(dataModel));
    } catch (e) {
      console.warn('[SCHORM Preview] Could not persist SCORM state', e);
    }
  }

  function collectionCount(collection) {
    var maxIndex = -1;
    var pattern = new RegExp('^cmi\\\\.' + collection + '\\\\.(\\\\d+)\\\\.');
    for (var key in dataModel) {
      var match = key.match(pattern);
      if (match) {
        maxIndex = Math.max(maxIndex, parseInt(match[1], 10));
      }
    }
    return String(maxIndex + 1);
  }

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
      if (element === 'cmi.interactions._count') return collectionCount('interactions');
      if (element === 'cmi.objectives._count') return collectionCount('objectives');
      if (element in dataModel) return dataModel[element];
      // Return empty string for most values, except specific cases
      if (element === 'cmi.completion_status') return 'unknown';
      if (element === 'cmi.success_status') return 'unknown';
      if (element === 'cmi.entry') return isResumedSession ? 'resume' : 'ab-initio';
      if (element === 'cmi.mode') return 'normal';
      return '';
    },

    SetValue: function(element, value) {
      console.log('[SCORM API] SetValue called:', element, '=', value);
      dataModel[element] = String(value);
      persistDataModel();
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
    const filePath = this.resolveRequestPath(req.url || '/');

    // Reject requests that resolve outside the served directory
    if (filePath === null) {
      res.writeHead(403, { 'Content-Type': 'text/html' });
      res.end('<h1>403 - Forbidden</h1>');
      return;
    }

    this.serveFile(filePath, res);
  }

  /**
   * Resolve a request URL to a file path inside the served directory.
   * Returns null if the URL is malformed or escapes the served directory.
   */
  private resolveRequestPath(url: string): string | null {
    let pathname: string;
    try {
      pathname = decodeURIComponent(new URL(url, 'http://localhost').pathname);
    } catch {
      return null;
    }

    const root = path.resolve(this.options.directory);
    const resolved = path.resolve(root, '.' + path.posix.normalize('/' + pathname));

    if (resolved !== root && !resolved.startsWith(root + path.sep)) {
      return null;
    }

    return resolved;
  }

  private serveFile(requestedPath: string, res: http.ServerResponse): void {
    let filePath = requestedPath;

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
