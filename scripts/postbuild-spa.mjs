import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const distDir = path.resolve(rootDir, 'dist');
const indexHtmlPath = path.resolve(distDir, 'index.html');

if (!fs.existsSync(indexHtmlPath)) {
  console.error('postbuild-spa: dist/index.html not found! Skipping SPA static generation.');
  process.exit(0);
}

const indexContent = fs.readFileSync(indexHtmlPath, 'utf8');

// Key routes that need static index.html or fallback for Render / static hosts
const staticRoutes = [
  'auth/callback',
  'auth/verify',
  'login',
  'register',
  'marketplace',
  'bins',
  'report-issue',
  'reports',
  'ai-scanner',
  'matches',
  'exchanges',
  'recycling-directory',
  'impact',
  'community',
  'admin'
];

for (const route of staticRoutes) {
  const routeDir = path.resolve(distDir, route);
  fs.mkdirSync(routeDir, { recursive: true });
  fs.writeFileSync(path.resolve(routeDir, 'index.html'), indexContent, 'utf8');
}

// Also create 404.html (Render static sites serve 404.html for any unmatched route)
fs.writeFileSync(path.resolve(distDir, '404.html'), indexContent, 'utf8');

// Copy _redirects to dist if present in public
const publicRedirects = path.resolve(rootDir, 'public', '_redirects');
if (fs.existsSync(publicRedirects)) {
  fs.copyFileSync(publicRedirects, path.resolve(distDir, '_redirects'));
}

console.log('🌿 GreenLoop: SPA static fallback and route files generated successfully in dist/');

