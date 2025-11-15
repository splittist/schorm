import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as http from 'http';
import { PreviewServer } from '../../src/server/preview-server.js';

const TEST_DIR = path.join(__dirname, '..', '..', 'test-output', 'preview-test');
const BUILD_DIR = path.join(TEST_DIR, 'build');

describe('schorm preview server', () => {
  let server: PreviewServer | null = null;

  beforeEach(() => {
    // Create test build directory with sample HTML
    if (!fs.existsSync(BUILD_DIR)) {
      fs.mkdirSync(BUILD_DIR, { recursive: true });
    }

    // Create a simple HTML file
    fs.writeFileSync(
      path.join(BUILD_DIR, 'test-lesson.html'),
      `<!DOCTYPE html>
<html>
<head>
    <title>Test Lesson</title>
</head>
<body>
    <h1>Test Lesson Content</h1>
    <script src="assets/schorm-runtime.js"></script>
</body>
</html>`
    );

    // Create assets directory with a CSS file
    const assetsDir = path.join(BUILD_DIR, 'assets');
    if (!fs.existsSync(assetsDir)) {
      fs.mkdirSync(assetsDir, { recursive: true });
    }
    fs.writeFileSync(path.join(assetsDir, 'styles.css'), 'body { margin: 0; }');
  });

  afterEach(async () => {
    // Stop server if running
    if (server) {
      server.stop();
      server = null;
    }

    // Clean up test directory
    if (fs.existsSync(TEST_DIR)) {
      fs.rmSync(TEST_DIR, { recursive: true, force: true });
    }
  });

  it('should start server and serve HTML files', async () => {
    const port = 9876;
    server = new PreviewServer({
      port,
      directory: BUILD_DIR,
      open: false,
    });

    await server.start();

    // Make HTTP request to server
    const response = await new Promise<string>((resolve, reject) => {
      http.get(`http://localhost:${port}/test-lesson.html`, (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => resolve(data));
      }).on('error', reject);
    });

    expect(response).toContain('Test Lesson Content');
  });

  it('should inject mock SCORM API into HTML files', async () => {
    const port = 9877;
    server = new PreviewServer({
      port,
      directory: BUILD_DIR,
      open: false,
    });

    await server.start();

    const response = await new Promise<string>((resolve, reject) => {
      http.get(`http://localhost:${port}/test-lesson.html`, (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => resolve(data));
      }).on('error', reject);
    });

    // Check that mock API is injected
    expect(response).toContain('window.API_1484_11');
    expect(response).toContain('Initialize: function(parameter)');
    expect(response).toContain('SetValue: function(element, value)');
    expect(response).toContain('GetValue: function(element)');
    expect(response).toContain('Terminate: function(parameter)');
    expect(response).toContain('Commit: function(parameter)');
    expect(response).toContain('[SCHORM Preview] Mock SCORM API ready');
  });

  it('should serve CSS files without modification', async () => {
    const port = 9878;
    server = new PreviewServer({
      port,
      directory: BUILD_DIR,
      open: false,
    });

    await server.start();

    const response = await new Promise<string>((resolve, reject) => {
      http.get(`http://localhost:${port}/assets/styles.css`, (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => resolve(data));
      }).on('error', reject);
    });

    expect(response).toBe('body { margin: 0; }');
  });

  it('should return 404 for non-existent files', async () => {
    const port = 9879;
    server = new PreviewServer({
      port,
      directory: BUILD_DIR,
      open: false,
    });

    await server.start();

    const statusCode = await new Promise<number>((resolve, reject) => {
      http.get(`http://localhost:${port}/nonexistent.html`, (res) => {
        resolve(res.statusCode || 0);
      }).on('error', reject);
    });

    expect(statusCode).toBe(404);
  });

  it('should inject API before closing head tag', async () => {
    const port = 9880;
    server = new PreviewServer({
      port,
      directory: BUILD_DIR,
      open: false,
    });

    await server.start();

    const response = await new Promise<string>((resolve, reject) => {
      http.get(`http://localhost:${port}/test-lesson.html`, (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => resolve(data));
      }).on('error', reject);
    });

    // Check that API is injected before </head>
    const headEndIndex = response.indexOf('</head>');
    const apiIndex = response.indexOf('window.API_1484_11');
    
    expect(headEndIndex).toBeGreaterThan(0);
    expect(apiIndex).toBeGreaterThan(0);
    expect(apiIndex).toBeLessThan(headEndIndex);
  });
});
