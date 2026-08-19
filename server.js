const http = require('http');
const fs = require('fs');
const path = require('path');

const root = __dirname;
const port = 4173;
const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml'
};

const routes = {
  '/': 'index.html',
  '/business': 'business-italia.html',
  '/business-italia': 'business-italia.html',
  '/business-registration': 'store-registration.html',
  '/store-registration': 'store-registration.html',
  '/homechef-registration': 'home-chef-registration.html',
  '/home-chef-registration': 'home-chef-registration.html',
  '/corporate-dinner': 'corporate-dinner.html',
  '/faq-italia': 'faq-italia.html',
  '/vendor-documentation': 'vendor-documentation.html',
  '/scarica-app': 'scarica-app.html',
  '/slowfood': 'slowfood.html',
  '/referral-italia': 'referral-italia.html',
  '/privacy-policy-italia': 'privacy-policy-italia.html',
  '/termini-e-condizioni': 'termini-e-condizioni.html',
  '/termini-e-condizioni-clienti': 'termini-e-condizioni-clienti.html',
  '/termini-e-condizioni-venditori': 'termini-e-condizioni-venditori.html'
};

http.createServer((request, response) => {
  const requestPath = decodeURIComponent(request.url.split('?')[0]);

  if (requestPath.toLowerCase().endsWith('.html')) {
    const cleanPath = requestPath.toLowerCase() === '/index.html'
      ? '/'
      : requestPath.slice(0, -'.html'.length);
    response.writeHead(308, { Location: cleanPath }).end();
    return;
  }

  const relativePath = routes[requestPath] || requestPath.replace(/^\/+/, '');
  const filePath = path.resolve(root, relativePath);

  if (!filePath.startsWith(root)) {
    response.writeHead(403).end('Forbidden');
    return;
  }

  fs.readFile(filePath, (error, data) => {
    if (error) {
      response.writeHead(404).end('Not found');
      return;
    }
    response.writeHead(200, {
      'Content-Type': types[path.extname(filePath).toLowerCase()] || 'application/octet-stream',
      'Cache-Control': 'no-store'
    });
    response.end(data);
  });
}).listen(port, '0.0.0.0', () => {
  console.log(`ZeepUp preview ready on http://localhost:${port}`);
});
