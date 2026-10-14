# /// script
# requires-python = ">=3.11"
# dependencies = ["markdown-it-py", "pillow"]
# ///
"""Servar free roam-sidan och ett json-api över idéfilerna i features/.

    make features                                    # startar servern och öppnar sidan i Firefox
    uv run features/serve_features.py [--port 8850] [--host 127.0.0.1]

Status: Klar om filen ligger i features/implemented/, Köad om raden står under "Gör dessa grejer"
i TODO.md, annars Redo. Sidan byggs om (build_free_roam_html.py) när en idéfil, TODO.md eller
byggskriptet har ändrats, så den stämmer vid varje omladdning.

API (json):
    GET  /api                         adresserna och antal per status
    GET  /api/features                alla idéer; filter ?status=koad|redo|klar ?effort=S|M|L ?q=<text>
    GET  /api/features/<id>           en idé, med hela markdown-texten
    GET  /api/queue                   de köade idéerna i TODO.md-ordning
    POST /api/features/<id>/queue     Redo -> Köad: raden flyttas sist under "Gör dessa grejer"
    POST /api/features/<id>/unqueue   Köad -> Redo: raden flyttas till "Vänta med dessa ...", i nummerordning
<id> är ankaret (barra-hem-berra-igen), filnamnet (barra_hem_berra_igen) eller numret (2).
POST kräver headern X-Free-Roam: 1 och en Host på den här datorn, så att en annan webbsida inte kan
ändra TODO.md.
"""
import argparse
import errno
import json
import os
import sys
import threading
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, unquote, urlsplit

import build_free_roam_html as build

HERE = build.HERE
PAGE = build.OUT
TODO = build.TODO
QUEUE_HEADING = "# Gör dessa grejer"
WAIT_HEADING = "# Vänta med dessa tills spelaren säger till"

_lock = threading.Lock()   # ett bygge eller en TODO.md-ändring i taget
_stamp = None


# ---------- sidan ----------

def stamp():
    paths = [Path(build.__file__), TODO]
    for folder in (HERE, build.IMPLEMENTED):
        if folder.is_dir():
            paths += folder.glob("*.md")
    return frozenset((str(p), p.stat().st_mtime_ns) for p in paths if p.is_file())


def fresh_page():
    """Bygger om sidan om någon källa har ändrats sedan förra bygget."""
    global _stamp
    with _lock:
        now = stamp()
        if now != _stamp or not PAGE.is_file():
            build.main()
            _stamp = now


# ---------- idéerna ----------

def features():
    """[(json-data, fil)] för alla idéer, i nummerordning."""
    out = []
    for d, _body, path in build.collect():
        out.append(({
            "id": d["id"],
            "number": d["n"] if d["n"] < 9999 else None,
            "title": d["title"],
            "status": d["status"],
            "queue_position": d["queue"],
            "file": d["file"],
            "category": d["cat"] or None,
            "effort": d["insats"] if d["insats"] in ("S", "M", "L") else None,
            "score": d["betyg"] or None,
            "wow": d["wow"] or None,
            "film": d["film"] or None,
            "stig_helmer": d["stig"] or None,
            "pitch": d["lead"] or None,
            "verdict": d["verdict"] or None,
            "page": f"/#{d['id']}",
            "api": f"/api/features/{d['id']}",
        }, path))
    return out


def find(key, all_features=None):
    key = key.strip()
    for f, path in all_features or features():
        if key in (f["id"], path.stem) or (key.isdigit() and f["number"] == int(key)):
            return f, path
    return None


def counts(fs):
    return {s: sum(f["status"] == s for f, _ in fs) for s in build.STATUS}


def listing(query):
    fs = features()
    status = query.get("status", [None])[0]
    effort = (query.get("effort", [""])[0] or "").upper() or None
    q = (query.get("q", [""])[0] or "").lower()
    picked = []
    for f, path in fs:
        if status and f["status"] != status:
            continue
        if effort and f["effort"] != effort:
            continue
        if q and q not in f["title"].lower() and q not in path.read_text(encoding="utf-8").lower():
            continue
        picked.append(f)
    return {"count": len(picked), "counts": counts(fs), "features": picked}


def queue():
    fs = [f for f, _ in features() if f["status"] == "koad"]
    return {"count": len(fs), "features": sorted(fs, key=lambda f: f["queue_position"])}


def index():
    return {
        "app": "free-roam-features",
        "counts": counts(features()),
        "status": {"koad": "raden står under \"Gör dessa grejer\" i TODO.md",
                   "redo": "raden står under \"Vänta med dessa tills spelaren säger till\" (eller inte alls i TODO.md)",
                   "klar": "filen ligger i features/implemented/"},
        "endpoints": {
            "GET /api/features": "alla idéer; filter ?status=koad|redo|klar ?effort=S|M|L ?q=<text>",
            "GET /api/features/<id>": "en idé med hela markdown-texten; <id> = ankare, filnamn eller nummer",
            "GET /api/queue": "de köade idéerna i TODO.md-ordning",
            "POST /api/features/<id>/queue": "Redo -> Köad (kräver headern X-Free-Roam: 1)",
            "POST /api/features/<id>/unqueue": "Köad -> Redo (kräver headern X-Free-Roam: 1)",
        },
    }


# ---------- TODO.md ----------

def move_in_todo(stem, target, feature, numbers):
    """Flyttar idéns rad till avsnittet för target (koad/redo) i TODO.md. Finns ingen rad skrivs en ny
    i samma form som de andra; saknas avsnittet läggs det till."""
    lines = TODO.read_text(encoding="utf-8").split("\n") if TODO.is_file() else [""]
    item = None
    for i, ln in enumerate(lines):
        if (m := build.TODO_ITEM.match(ln)) and m[1] == stem:
            item = lines.pop(i)
            break
    if item is None:
        number = f"{feature['number']}. " if feature["number"] else ""
        effort = f" [{feature['effort']}]" if feature["effort"] else ""
        item = f"- features/{feature['file']} – {number}{feature['title']}{effort}"
    section = next((s for s in build.todo_sections(lines) if s[0] == target), None)
    if section is None:
        if target == "koad":
            lines[0:0] = [QUEUE_HEADING, item, ""]
        else:
            while lines and lines[-1] == "":
                lines.pop()
            lines += ["", WAIT_HEADING, item, ""]
    else:
        _, start, end = section
        body = start + 1
        while body < end and build.TODO_HEADING.match(lines[body]):   # rubrikens fortsättningsrader
            body += 1
        rows = [i for i in range(body, end) if build.TODO_ITEM.match(lines[i])]
        at = rows[-1] + 1 if rows else body          # kön: sist
        n = numbers.get(stem)
        if target == "redo" and n is not None:       # Vänta-listan: i nummerordning
            at = next((i for i in rows if numbers.get(build.TODO_ITEM.match(lines[i])[1], 0) > n), at)
        lines.insert(at, item)
    tmp = TODO.with_name(TODO.name + ".tmp")
    tmp.write_text("\n".join(lines), encoding="utf-8")
    os.replace(tmp, TODO)


def set_queued(key, queued):
    """(svar, http-status) för köa / ta ur kön."""
    with _lock:
        fs = features()
        hit = find(key, fs)
        if not hit:
            return {"error": f"ingen idé heter {key}"}, 404
        f, path = hit
        if f["status"] == "klar":
            return {"error": f"{f['title']} är Klar (filen ligger i implemented/) och kan inte köas"}, 409
        target = "koad" if queued else "redo"
        if f["status"] != target:
            numbers = {p.stem: x["number"] for x, p in fs if x["number"] is not None}
            move_in_todo(path.stem, target, f, numbers)
        return find(f["id"])[0], 200


# ---------- http ----------

class Handler(SimpleHTTPRequestHandler):
    extensions_map = {**SimpleHTTPRequestHandler.extensions_map, ".md": "text/plain; charset=utf-8"}

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(HERE), **kwargs)

    def do_GET(self):
        url = urlsplit(self.path)
        path = unquote(url.path).rstrip("/") or "/"
        if path == "/api" or path.startswith("/api/"):
            return self.get_api(path.split("/")[2:], parse_qs(url.query))
        if path == "/favicon.ico":
            return self.send_bytes(b"", "image/x-icon", 204)
        if path in ("/", "/" + PAGE.name):
            try:
                fresh_page()
            except Exception as e:  # ett trasigt idédokument ska synas, inte döda servern
                return self.send_json({"error": f"sidan kunde inte byggas: {e!r}"}, 500)
            return self.send_bytes(PAGE.read_bytes(), "text/html; charset=utf-8")
        return super().do_GET()

    def get_api(self, parts, query):
        if not parts:
            return self.send_json(index())
        if parts == ["features"]:
            return self.send_json(listing(query))
        if parts == ["queue"]:
            return self.send_json(queue())
        if len(parts) == 2 and parts[0] == "features":
            hit = find(parts[1])
            if not hit:
                return self.send_json({"error": f"ingen idé heter {parts[1]}"}, 404)
            f, path = hit
            return self.send_json({**f, "markdown": path.read_text(encoding="utf-8")})
        return self.send_json({"error": "okänd adress", "se": "/api"}, 404)

    def do_POST(self):
        self.rfile.read(int(self.headers.get("Content-Length") or 0))
        parts = unquote(urlsplit(self.path).path).rstrip("/").split("/")[1:]
        if self.headers.get("Host") not in self.server.allowed_hosts or self.headers.get("X-Free-Roam") != "1":
            return self.send_json({"error": "POST kräver headern X-Free-Roam: 1 och en lokal Host"}, 403)
        if len(parts) != 4 or parts[:2] != ["api", "features"] or parts[3] not in ("queue", "unqueue"):
            return self.send_json({"error": "okänd adress", "se": "/api"}, 404)
        body, code = set_queued(parts[2], parts[3] == "queue")
        return self.send_json(body, code)

    def send_json(self, obj, code=200):
        self.send_bytes(json.dumps(obj, ensure_ascii=False, indent=2).encode(), "application/json; charset=utf-8", code)

    def send_bytes(self, data, ctype, code=200):
        self.send_response(code)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(data)

    def log_request(self, code="-", size="-"):
        # Bilder och sidan loggas inte, api-anrop och fel gör det.
        if self.path.startswith("/api") or str(getattr(code, "value", code))[:1] in "45":
            super().log_request(code, size)


class Server(ThreadingHTTPServer):
    daemon_threads = True

    def handle_error(self, request, client_address):
        if not isinstance(sys.exc_info()[1], ConnectionError):   # webbläsaren avbröt en bildladdning
            super().handle_error(request, client_address)


def main():
    ap = argparse.ArgumentParser(description="Servar free roam-sidan och ett json-api över features/.")
    ap.add_argument("--port", type=int, default=8850)
    ap.add_argument("--host", default="127.0.0.1")
    args = ap.parse_args()
    fresh_page()
    try:
        server = Server((args.host, args.port), Handler)
    except OSError as e:
        if e.errno == errno.EADDRINUSE:
            sys.exit(f"Porten {args.port} är upptagen.")
        raise
    server.allowed_hosts = {f"{h}:{args.port}" for h in (args.host, "127.0.0.1", "localhost")}
    print(f"Free roam-features på http://{args.host}:{args.port}/  (api: /api, Ctrl-C stoppar)", flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print()


if __name__ == "__main__":
    main()
