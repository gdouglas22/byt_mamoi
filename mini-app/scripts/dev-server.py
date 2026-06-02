#!/usr/bin/env python3
"""Локальный dev-сервер для mini-app: статика + прокси к API Фролова.

Запуск:
    cd mini-app && python3 scripts/dev-server.py [PORT]
Доступ:
    http://localhost:8080/?token=bm_xxx   (один раз, потом из localStorage)

Что делает:
    /api/frolov?p=/api/me   →   GET https://bytmamoi-production.up.railway.app/api/me
    /api/frolov?p=...       →   проксирование с пробрасыванием заголовков/тела
    /*                      →   статика из текущей папки (где лежит index.html)
"""
import os
import sys
import json
import urllib.request
import urllib.error
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse, parse_qs

TARGET_BASE = "https://bytmamoi-production.up.railway.app"
HOP_BY_HOP = {"connection", "keep-alive", "proxy-authenticate", "proxy-authorization",
              "te", "trailer", "transfer-encoding", "upgrade", "host"}


class DevHandler(SimpleHTTPRequestHandler):
    def _is_proxy(self):
        return urlparse(self.path).path == "/api/frolov"

    def _proxy(self):
        qs = parse_qs(urlparse(self.path).query)
        p = (qs.get("p") or ["/"])[0]
        if not p.startswith("/"):
            p = "/" + p
        target = TARGET_BASE + p

        length = int(self.headers.get("Content-Length") or 0)
        body = self.rfile.read(length) if length > 0 else None

        headers = {k: v for k, v in self.headers.items() if k.lower() not in HOP_BY_HOP}
        req = urllib.request.Request(target, data=body, method=self.command, headers=headers)
        try:
            with urllib.request.urlopen(req, timeout=30) as resp:
                self._respond(resp.status, dict(resp.getheaders()), resp.read())
        except urllib.error.HTTPError as e:
            self._respond(e.code, dict(e.headers), e.read())
        except Exception as e:
            self._respond(502, {"Content-Type": "application/json"},
                          json.dumps({"error": "proxy_upstream_unreachable", "message": str(e)}).encode())

    def _respond(self, status, headers, body):
        self.send_response(status)
        for k, v in headers.items():
            if k.lower() in HOP_BY_HOP or k.lower() == "content-length":
                continue
            self.send_header(k, v)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def end_headers(self):
        # Статику отдаём без кэша, чтобы правки в .js/.css сразу подхватывались (proxy уже ставит no-store сам).
        if not self._is_proxy():
            self.send_header("Cache-Control", "no-store, must-revalidate")
        super().end_headers()

    def do_GET(self):
        if self._is_proxy():
            return self._proxy()
        super().do_GET()

    def do_POST(self):
        return self._proxy() if self._is_proxy() else self.send_error(405)

    def do_PATCH(self):
        return self._proxy() if self._is_proxy() else self.send_error(405)

    def do_DELETE(self):
        return self._proxy() if self._is_proxy() else self.send_error(405)

    # Подавляем громкие логи на каждый файл, оставляем только не-200 и проксирование
    def log_message(self, fmt, *args):
        if self._is_proxy() or (args and str(args[1]).startswith(("4", "5"))):
            sys.stderr.write("[%s] %s\n" % (self.log_date_time_string(), fmt % args))


def main():
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8080
    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))  # mini-app/
    os.chdir(root)
    server = ThreadingHTTPServer(("0.0.0.0", port), DevHandler)
    print(f"dev-server: http://localhost:{port}  (root: {root})")
    print(f"proxy:      /api/frolov?p=/api/...   →   {TARGET_BASE}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        server.server_close()


if __name__ == "__main__":
    main()
