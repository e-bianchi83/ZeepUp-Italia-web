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
  '/it': 'it/index.html',
  '/it/': 'it/index.html',
  '/uk': 'uk/index.html',
  '/uk/': 'uk/index.html',
  '/uk/terms-and-conditions': 'uk/terms-and-conditions.html',
  '/uk/privacy-policy': 'uk/privacy-policy.html',
  '/business': 'business-italia.html',
  '/business-italia': 'business-italia.html',
  '/business-registration': 'store-registration.html',
  '/store-registration': 'store-registration.html',
  '/homechef-registration': 'home-chef-registration.html',
  '/home-chef-registration': 'home-chef-registration.html',
  '/corporate-dinner': 'corporate-dinner.html',
  '/faq-italia': 'faq-italia.html',
  '/novita-italia': 'novita-italia.html',
  '/vendor-documentation': 'vendor-documentation.html',
  '/brand-assets': 'brand-assets.html',
  '/post-builder': 'post-builder.html',
  '/scarica-app': 'scarica-app.html',
  '/slowfood': 'slowfood.html',
  '/referral-italia': 'referral-italia.html',
  '/privacy-policy-italia': 'privacy-policy-italia.html',
  '/privacy-policy-italia/accountrimuovi': 'accountrimuovi.html',
  '/termini-e-condizioni': 'termini-e-condizioni.html',
  '/termini-e-condizioni/termini-e-condizioni-acquirenti': 'termini-e-condizioni-acquirenti.html',
  '/termini-e-condizioni-venditori': 'termini-e-condizioni-venditori.html'
};

const redirects = {
  '/termini-e-condizioni-clienti': '/termini-e-condizioni/termini-e-condizioni-acquirenti',
  '/termini-e-condizioni-acquirenti': '/termini-e-condizioni/termini-e-condizioni-acquirenti'
};

function countryFromHeader(countryCode) {
  switch (String(countryCode || '').toUpperCase()) {
    case 'IT': return 'it';
    case 'GB': return 'uk';
    default: return 'uk';
  }
}

http.createServer((request, response) => {
  const requestUrl = new URL(request.url, `http://${request.headers.host || 'localhost'}`);
  const requestPath = decodeURIComponent(requestUrl.pathname);

  if (requestPath === '/') {
    const requestedCountry = requestUrl.searchParams.get('country');
    const validQueryCountry = requestedCountry === 'it' || requestedCountry === 'uk';
    const cookieMatch = String(request.headers.cookie || '').match(/(?:^|;\s*)zeepup_country=(it|uk)(?:;|$)/);
    const savedCountry = cookieMatch ? cookieMatch[1] : null;
    const detectedCountry = String(request.headers['x-vercel-ip-country'] || '').toUpperCase();
    const country = validQueryCountry
      ? requestedCountry
      : savedCountry || countryFromHeader(detectedCountry);
    const headers = {
      Location: `/${country}`,
      'Cache-Control': 'private, no-store',
      Vary: 'Cookie, X-Vercel-IP-Country'
    };
    if (validQueryCountry) {
      headers['Set-Cookie'] = `zeepup_country=${country}; Max-Age=31536000; Path=/; SameSite=Lax; Secure`;
    }
    response.writeHead(307, headers).end();
    return;
  }

  if (redirects[requestPath]) {
    response.writeHead(308, { Location: redirects[requestPath] }).end();
    return;
  }

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
