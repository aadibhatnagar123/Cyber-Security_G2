/*
 * Tiny static server for the attacker's page, on a DIFFERENT port (4000) from
 * ShopBase (3000). Different port = different origin, which is what makes this
 * a genuine *cross-site* request forgery rather than a same-site request.
 *
 * ZERO DEPENDENCIES — built-in modules only.
 *   node attacker/attacker-server.js
 * Then open: http://localhost:4000/evil.html  while logged into ShopBase.
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 4000;

http.createServer((req, res) => {
  // Only serves evil.html; anything else is 404.
  if (req.url === '/' || req.url === '/evil.html') {
    fs.readFile(path.join(__dirname, 'evil.html'), (err, data) => {
      if (err) { res.writeHead(500); return res.end('error'); }
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(data);
    });
  } else {
    res.writeHead(404);
    res.end('not found');
  }
}).listen(PORT, () => {
  console.log(`Attacker site ("evil.com") running at http://localhost:${PORT}/evil.html`);
});
