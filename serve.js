// 開発用の簡易サーバー（依存なし）。
// node serve.js → http://localhost:8080/prototype/
// GitHub Pages と同じパス構成で配信する（リポジトリ直下がルート）。

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const port = Number(process.env.PORT) || 8080;
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.md': 'text/plain; charset=utf-8',
};

http.createServer((req, res) => {
  const urlPath = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  // ルートは試作へ飛ばす（リポジトリ直下に index.html はない）
  if (urlPath === '/') {
    res.writeHead(302, { Location: '/prototype/' });
    res.end();
    return;
  }
  const file = path.normalize(path.join(root, urlPath));
  if (!file.startsWith(root)) {
    res.writeHead(403);
    res.end();
    return;
  }
  fs.stat(file, (err, st) => {
    if (!err && st.isDirectory()) {
      if (!urlPath.endsWith('/')) {
        res.writeHead(301, { Location: `${urlPath}/` });
        res.end();
        return;
      }
      sendFile(path.join(file, 'index.html'), res);
      return;
    }
    sendFile(file, res);
  });
}).listen(port, () => {
  console.log(`http://localhost:${port}/prototype/`);
});

function sendFile(file, res) {
  fs.readFile(file, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end(`404 Not Found: ${path.relative(root, file).replace(/\\/g, '/')}\n試作は /prototype/ にあります`);
      return;
    }
    res.writeHead(200, {
      'Content-Type': MIME[path.extname(file)] || 'application/octet-stream',
      'Cache-Control': 'no-store',
    });
    res.end(data);
  });
}
