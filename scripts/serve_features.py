# /// script
# requires-python = ">=3.11"
# dependencies = ["markdown-it-py", "pillow"]
# ///
"""Free roam-features: en sida och ett json-api över idéfilerna i features/.

    make features                                    # startar servern och öppnar sidan i Firefox
    uv run scripts/serve_features.py [--port 8850] [--host 127.0.0.1]

En idé är en md-fil i features/ eller features/implemented/ vars första rubrik är "# <nr>. <titel>".
Status:
    Klar   filen ligger i features/implemented/ (gäller före TODO.md)
    Köad   raden står under "Gör dessa grejer" i features/TODO.md
    Redo   annars (under "Vänta med dessa tills spelaren säger till", eller inte alls i TODO.md)
Sidan byggs i minnet och byggs om när en idéfil, TODO.md eller det här skriptet har ändrats. Den gamla
samlingsfilen features/saker_att_lagga_till_i_free_roam.md läses inte (den är deprecated).

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
import html
import json
import os
import re
import sys
import threading
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, unquote, urlsplit

from markdown_it import MarkdownIt
from PIL import Image

FEATURES = Path(__file__).resolve().parent.parent / "features"
IMPLEMENTED = FEATURES / "implemented"
TODO = FEATURES / "TODO.md"
NOT_IDEAS = {"TODO.md", "saker_att_lagga_till_i_free_roam.md"}
STATUS = {"koad": "Köad", "redo": "Redo", "klar": "Klar"}
QUEUE_HEADING = "# Gör dessa grejer"
WAIT_HEADING = "# Vänta med dessa tills spelaren säger till"

md = MarkdownIt("commonmark", {"html": True}).enable("table")
esc = html.escape

HEAD1 = re.compile(r"^# (?:(\d+)\.\s+)?(.+?)\s*$")
IMG = re.compile(r"^!\[(.*?)\]\((\S+?)\)\s*$")
CAP = re.compile(r"^Bild (\d+) \(([^)]*)\):\s*(.*)$", re.S)
LABEL = re.compile(r"^\*\*([^*]{2,60}?)\.\*\*\s*(.*)$")
WHOLE_BOLD = re.compile(r"^\*\*([^*]+)\*\*\s*$")
BETYG = re.compile(r"^\*\*Betyg:\*\*.*?—\s*\*(.*)\*\s*$")
SCORES = re.compile(
    r"^\*\*Betyg:\*\*\s*([\d,]+)/10\s*·\s*wow ([\d,]+)\s*·\s*film ([\d,]+)\s*·\s*Stig-Helmer ([\d,]+)"
)
FACTS = re.compile(r"(?:^|\s·\s)\*\*([^*]+?):\*\*\s*")
LINK = re.compile(r'<a href="([^"]*)">(.*?)</a>', re.S)
MD_LINK = re.compile(r"(?:\.\./)*(?:features/)?(?:implemented/)?([\w-]+)\.md")
TODO_HEADING = re.compile(r"^#+\s+(.*)$")
TODO_ITEM = re.compile(r"^\s*[-*]\s+(?:features/)?(?:implemented/)?([\w-]+)\.md\b")

_lock = threading.Lock()   # ett bygge eller en TODO.md-ändring i taget
_page = None               # (källornas stämpel, sidan som bytes)
_sizes: dict[Path, tuple[int, int]] = {}


# ---------- markdown till html ----------

def size(path):
    if path not in _sizes:
        with Image.open(path) as im:
            _sizes[path] = im.size
    return _sizes[path]


def inline(s):
    return md.renderInline(s)


def plain(s):
    return html.unescape(re.sub(r"<[^>]+>", "", inline(s))).strip()


def num(s):
    return float(s.replace(",", "."))


def fmt(x):
    return f"{x:g}".replace(".", ",")


def resolve(src, base):
    """En bildväg från en idéfil, som väg relativt features/ (som servern servar från roten)."""
    for cand in (base / src, FEATURES / src, FEATURES / "free_roam_bilder" / Path(src).name):
        if cand.is_file():
            return Path(os.path.relpath(os.path.normpath(cand), FEATURES)).as_posix(), cand
    print(f"  varning: bilden {src} finns inte")
    return src, None


def figure(alt, src, cap, base):
    src, path = resolve(src, base)
    dims = 'width="{}" height="{}" '.format(*size(path)) if path else ""
    tag = ""
    text = cap or ""
    skiss = False
    if cap and (m := CAP.match(cap)):
        n, kind, text = m.groups()
        skiss = kind.startswith("SKISS")
        label = "SKISS" if skiss else kind.upper()
        tag = f'<span class="tag" title="{esc(kind)}">{esc(label)}</span><b>Bild {n}.</b> '
    cls = "shot skiss" if skiss else "shot"
    return (
        f'<figure class="{cls}"><img src="{esc(src)}" alt="{esc(alt)}" {dims}'
        f'loading="lazy" decoding="async"><figcaption>{tag}{inline(text)}</figcaption></figure>'
    )


def facts(line):
    parts = FACTS.split(line)[1:]
    rows = "".join(
        f"<dt>{esc(k)}</dt><dd>{inline(v.strip())}</dd>" for k, v in zip(parts[::2], parts[1::2])
    )
    return f'<dl class="facts">{rows}</dl>'


def render(lines, base):
    """Markdown till html, med bilder som <figure> och idéernas fasta rader som egna block."""
    out = []
    seen_betyg = lead_done = False
    i = 0
    while i < len(lines):
        ln = lines[i]
        s = ln.strip()
        if m := IMG.match(s):
            cap = None
            nxt = lines[i + 1].strip() if i + 1 < len(lines) else ""
            if nxt.startswith("*") and nxt.endswith("*") and not nxt.startswith("**"):
                cap = nxt[1:-1]
                i += 1
            out += ["", figure(m[1], m[2], cap, base), ""]
        elif m := BETYG.match(s):
            out += ["", f'<blockquote class="verdict"><span class="who">Domarna</span>{inline(m[1])}</blockquote>', ""]
            seen_betyg = True
        elif seen_betyg and not lead_done and s.startswith("*") and s.endswith("*") and not s.startswith("**"):
            out += ["", f'<p class="lead">{inline(s[1:-1])}</p>', ""]
            lead_done = True
        elif s.startswith("**Kategori:**"):
            out += ["", facts(s), ""]
        elif m := LABEL.match(s):
            out += ["", f'<h3 class="sect">{inline(m[1])}</h3>', ""]
            if m[2]:
                out.append(m[2])
        elif m := WHOLE_BOLD.match(s):
            out += ["", f"<h3>{inline(m[1])}</h3>", ""]
        else:
            out.append(ln)
        i += 1
    return md.render("\n".join(out))


# ---------- TODO.md ----------

def section_kind(heading):
    """Vilken status ett avsnitt i TODO.md ger: koad, redo, klar eller None."""
    for prefix, kind in (("Gör", "koad"), ("Vänta", "redo"), ("Färdig", "klar")):
        if heading.startswith(prefix):
            return kind
    return None


def todo_sections(lines):
    """[(avsnitt, rubrikrad, raden efter avsnittet)]. En #-rad som börjar med gemen fortsätter
    rubriken ovanför (som "# flytta den till ..." under "# Gör dessa grejer (...")."""
    heads = [(i, section_kind(m[1])) for i, ln in enumerate(lines)
             if (m := TODO_HEADING.match(ln)) and m[1][:1].isupper()]
    return [(kind, i, heads[k + 1][0] if k + 1 < len(heads) else len(lines)) for k, (i, kind) in enumerate(heads)]


def read_todo():
    """{filnamn utan .md: (avsnitt, radnummer)} ur TODO.md."""
    lines = TODO.read_text(encoding="utf-8").split("\n") if TODO.is_file() else []
    out = {}
    for kind, start, end in todo_sections(lines):
        for i in range(start + 1, end):
            if m := TODO_ITEM.match(lines[i]):
                out.setdefault(m[1], (kind, i))
    return out


def move_in_todo(stem, target, feature, numbers):
    """Flyttar idéns rad till avsnittet för target (koad/redo) i TODO.md. Finns ingen rad skrivs en ny
    i samma form som de andra; saknas avsnittet läggs det till."""
    lines = TODO.read_text(encoding="utf-8").split("\n") if TODO.is_file() else [""]
    item = None
    for i, ln in enumerate(lines):
        if (m := TODO_ITEM.match(ln)) and m[1] == stem:
            item = lines.pop(i)
            break
    if item is None:
        number = f"{feature['number']}. " if feature["number"] else ""
        effort = f" [{feature['effort']}]" if feature["effort"] else ""
        item = f"- features/{feature['file']} – {number}{feature['title']}{effort}"
    section = next((s for s in todo_sections(lines) if s[0] == target), None)
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
        while body < end and TODO_HEADING.match(lines[body]):   # rubrikens fortsättningsrader
            body += 1
        rows = [i for i in range(body, end) if TODO_ITEM.match(lines[i])]
        at = rows[-1] + 1 if rows else body          # kön: sist
        n = numbers.get(stem)
        if target == "redo" and n is not None:       # Vänta-listan: i nummerordning
            at = next((i for i in rows if numbers.get(TODO_ITEM.match(lines[i])[1], 0) > n), at)
        lines.insert(at, item)
    tmp = TODO.with_name(TODO.name + ".tmp")
    tmp.write_text("\n".join(lines), encoding="utf-8")
    os.replace(tmp, TODO)


# ---------- idéerna ----------

def idea_files():
    """{namn: (fil, klar)}; en fil i implemented/ vinner över en kvarglömd kopia i features/."""
    found = {}
    for folder, done in ((FEATURES, False), (IMPLEMENTED, True)):
        if not folder.is_dir():
            continue
        for path in sorted(folder.glob("*.md")):
            if path.name in NOT_IDEAS:
                continue
            first = next((ln for ln in path.read_text(encoding="utf-8").split("\n") if ln.startswith("# ")), "")
            if re.match(r"^# \d+\.", first):
                found[path.stem] = (path, done)
    return found


def parse(path, status):
    lines = path.read_text(encoding="utf-8").split("\n")
    k = next(k for k, ln in enumerate(lines) if ln.startswith("# "))
    head = HEAD1.match(lines[k])
    body = lines[k + 1 :]
    d = dict(
        id=path.stem.replace("_", "-"), file=Path(os.path.relpath(path, FEATURES)).as_posix(), status=status,
        n=int(head[1]) if head[1] else 9999, title=head[2], cat="", insats="?",
        betyg=0, betygText="–", wow=0, film=0, stig=0,
    )
    for ln in body:
        s = ln.strip()
        if m := SCORES.match(s):
            d.update(betygText=m[1], betyg=num(m[1]), wow=num(m[2]), film=num(m[3]), stig=num(m[4]))
        elif s.startswith("**Kategori:**") and not d["cat"]:
            parts = FACTS.split(s)[1:]
            f = dict(zip(parts[::2], parts[1::2]))
            d["cat"] = plain(f.get("Kategori", ""))
            if (ins := f.get("Insats", "").strip()[:1]) and ins in "SML":
                d["insats"] = ins
    first_img = next((m[2] for ln in body if (m := IMG.match(ln.strip()))), "")
    d["thumb"] = resolve(first_img, path.parent)[0] if first_img else ""
    lead = next((s[1:-1] for ln in body if (s := ln.strip()).startswith("*") and s.endswith("*")
                 and not s.startswith("**") and not s.startswith("*Bild")), "")
    d["lead"] = plain(lead)
    d["verdict"] = plain(next((m[1] for ln in body if (m := BETYG.match(ln.strip()))), ""))
    return d, body


def collect():
    """[(data, brödtextrader, fil)] för alla idéer, i nummerordning, med status och köplats."""
    todo = read_todo()
    ideas = []
    for stem, (path, done) in idea_files().items():
        kind, line = todo.get(stem, (None, None))
        d, body = parse(path, "klar" if done else "koad" if kind == "koad" else "redo")
        d["todoLine"] = line
        ideas.append((d, body, path))
    queued = sorted((d for d, _, _ in ideas if d["status"] == "koad"), key=lambda d: d["todoLine"])
    for pos, d in enumerate(queued, 1):
        d["queue"] = pos
    for d, _, _ in ideas:
        d.setdefault("queue", None)
    ideas.sort(key=lambda x: (x[0]["n"], x[0]["title"]))
    assert len({d["id"] for d, _, _ in ideas}) == len(ideas), "två idéfiler ger samma ankare"
    return ideas


def api_feature(d):
    return {
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
    }


def features():
    """[(json-data, fil)] för alla idéer, i nummerordning."""
    return [(api_feature(d), path) for d, _body, path in collect()]


def find(key, all_features=None):
    key = key.strip()
    for f, path in all_features or features():
        if key in (f["id"], path.stem) or (key.isdigit() and f["number"] == int(key)):
            return f, path
    return None


def counts(fs):
    return {s: sum(f["status"] == s for f, _ in fs) for s in STATUS}


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


# ---------- sidan ----------

def fix_links(h, ids, klar):
    """Länkar till andra idéer (#ankare eller namn.md) pekar in i sidan; en idé som inte är med blir text."""
    def sub(m):
        href, text = m[1], m[2]
        if href.startswith("#"):
            target = href[1:]
        elif mm := MD_LINK.fullmatch(href):
            target = mm[1].replace("_", "-")
            if target not in ids:
                return m[0]
        else:
            return m[0]
        if target not in ids:
            return f'<span class="gone" title="Inte med bland de valda idéerna">{text}</span>'
        cls = ' class="klar"' if target in klar else ""
        return f'<a href="#{target}"{cls}>{text}</a>'

    return LINK.sub(sub, h)


def status_pill(d):
    # data-st låter sidan måla om etiketten när någon köar eller tar ur kön.
    return f'<span class="st {d["status"]}" data-st="{d["id"]}">{STATUS[d["status"]]}</span>'


def overview(data):
    count = {s: sum(d["status"] == s for d in data) for s in STATUS}
    mix = " · ".join(f"{sum(d['insats'] == s for d in data)} {s}" for s in "SML")
    rows = "".join(
        f'<tr data-id="{d["id"]}" data-status="{d["status"]}"><td>{d["n"]}</td>'
        f'<td><a href="#{d["id"]}">{esc(d["title"])}</a></td><td>{status_pill(d)}</td><td>{esc(d["cat"])}</td>'
        f'<td class="c">{d["insats"]}</td><td class="r">{d["betygText"]}</td>'
        f'<td class="nw">{fmt(d["wow"])} / {fmt(d["film"])} / {fmt(d["stig"])}</td></tr>'
        for d in data
    )
    tiles = "".join(
        f'<div class="stat {s}"><span class="v" id="stat-{s}">{count[s]}</span><span class="l">{label.lower()}</span></div>'
        for s, label in STATUS.items()
    )
    return f"""<article class="page" data-id="oversikt" data-title="Översikt" hidden><div class="md">
<h1>Free roam-features</h1>
<div class="stats"><div class="stat"><span class="v">{len(data)}</span><span class="l">valda idéer</span></div>{tiles}
<div class="stat"><span class="v small">{mix}</span><span class="l">insats</span></div></div>
<p>De valda idéerna för free roam på ön, med en fil per idé i <code>features/</code>. Statusen kommer från
<code>features/TODO.md</code> och mappen <code>features/implemented/</code>:</p>
<ul><li><b>Köad</b>: raden står under ”Gör dessa grejer” i <code>TODO.md</code>.</li>
<li><b>Redo</b>: raden står under ”Vänta med dessa tills spelaren säger till”, eller inte alls i <code>TODO.md</code>.</li>
<li><b>Klar</b>: filen ligger i <code>features/implemented/</code>.</li></ul>
<p class="note"><b>Köa</b> och <b>Ta ur kön</b> på en idé (knappen i topplisten, eller <kbd>q</kbd>) flyttar dess rad i
<code>TODO.md</code>. Statusen hämtas om när fliken får fokus, och sidan byggs om när en idéfil eller
<code>TODO.md</code> har ändrats.</p>
<p><b>Betyg</b> är medelvärdet av tre domares betyg (filmnördens, SHAR-spelarens och producentens) på 1–10.
<b>Wow</b>, <b>film</b> och <b>Stig-Helmer</b> går från 1 till 5 och mäter hur kul det är, hur tydligt det är en
referens till filmen och hur mycket det känns som Stig-Helmer. <b>Insats</b> är S, M eller L. Bilderna kommer från
det riktiga spelet: NULÄGE visar hur det ser ut i dag, och SKISS är en scen som ställdes upp tillfälligt för att visa
idén och inte finns i spelet.</p>
<table class="ov"><thead><tr><th>#</th><th>Idé</th><th>Status</th><th>Kategori</th><th class="c">Insats</th>
<th class="r">Betyg</th><th>wow / film / Stig</th></tr></thead><tbody>{rows}</tbody></table>
</div></article>"""


def render_page():
    ideas = collect()
    ids = {d["id"] for d, _, _ in ideas}
    klar = {d["id"] for d, _, _ in ideas if d["status"] == "klar"}
    articles = []
    for d, body, path in ideas:
        bars = "".join(
            f'<div class="sc bar"><span class="l">{lab}</span><span class="track"><i style="width:{d[k] / 5 * 100:.0f}%">'
            f'</i></span><span class="v">{fmt(d[k])}</span></div>'
            for k, lab in (("wow", "Wow"), ("film", "Film"), ("stig", "Stig-Helmer"))
        )
        rank = f'<span class="rank">#{d["n"]}</span>' if d["n"] < 9999 else ""
        cat = f"{esc(d['cat'])} · " if d["cat"] else ""
        articles.append(
            f'<article class="page idea" data-id="{d["id"]}" data-title="{esc(d["title"])}" hidden>'
            f'<header class="idea-head"><div class="eyebrow">{rank}{status_pill(d)}{cat}'
            f'<a class="file" href="{esc(d["file"])}">{esc(d["file"])}</a></div><h1>{esc(d["title"])}</h1>'
            f'<div class="scores"><div class="sc big"><span class="v">{d["betygText"]}</span>'
            f'<span class="l">betyg av 10</span></div>{bars}'
            f'<div class="sc ins"><span class="v">{d["insats"]}</span><span class="l">insats</span></div></div></header>'
            f'<div class="md">{fix_links(render(body, path.parent), ids, klar)}</div></article>'
        )
    meta = [d for d, _, _ in ideas]
    blob = json.dumps(meta, ensure_ascii=False).replace("</", "<\\/")
    out = TEMPLATE.strip().replace("/*IDEAS*/", blob).replace("<!--PAGES-->", "\n".join([overview(meta), *articles]))
    count = {s: sum(d["status"] == s for d in meta) for s in STATUS}
    print(f"sidan byggd: {len(meta)} idéer ({count['koad']} köade, {count['redo']} redo, {count['klar']} klara)", flush=True)
    return out


def stamp():
    paths = [Path(__file__), TODO]
    for folder in (FEATURES, IMPLEMENTED):
        if folder.is_dir():
            paths += folder.glob("*.md")
    return frozenset((str(p), p.stat().st_mtime_ns) for p in paths if p.is_file())


def page_bytes():
    """Sidan, byggd om ifall någon källa har ändrats sedan förra bygget."""
    global _page
    with _lock:
        now = stamp()
        if _page is None or _page[0] != now:
            _page = (now, render_page().encode())
        return _page[1]


# ---------- api ----------

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
        "status": {"koad": "raden står under \"Gör dessa grejer\" i features/TODO.md",
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


# ---------- http ----------

class Handler(SimpleHTTPRequestHandler):
    extensions_map = {**SimpleHTTPRequestHandler.extensions_map, ".md": "text/plain; charset=utf-8"}

    def __init__(self, *args, **kwargs):
        # Allt annat än sidan och api:t (bilderna, md-filerna) servas direkt ur features/.
        super().__init__(*args, directory=str(FEATURES), **kwargs)

    def do_GET(self):
        url = urlsplit(self.path)
        path = unquote(url.path).rstrip("/") or "/"
        if path == "/api" or path.startswith("/api/"):
            return self.get_api(path.split("/")[2:], parse_qs(url.query))
        if path == "/favicon.ico":
            return self.send_bytes(b"", "image/x-icon", 204)
        if path in ("/", "/index.html"):
            try:
                page = page_bytes()
            except Exception as e:  # ett trasigt idédokument ska synas, inte döda servern
                return self.send_json({"error": f"sidan kunde inte byggas: {e!r}"}, 500)
            return self.send_bytes(page, "text/html; charset=utf-8")
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
    page_bytes()   # ett trasigt idédokument syns direkt, inte först vid första sidladdningen
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


TEMPLATE = r"""
<!doctype html>
<html lang="sv">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Free roam-features</title>
<!-- Byggs i minnet av scripts/serve_features.py från features/ när något där har ändrats. -->
<style>
:root {
  --bg: #f4ecdf; --side: #ede2cf; --surface: #fffcf6; --ink: #2a2017; --muted: #75655a; --faint: #a8988a;
  --line: #ddcfb9; --hover: #e4d7c2; --accent: #b84a26; --accent-ink: #fffaf3; --sea: #1b6a86; --skiss: #7442ab;
  --klar: #23803f; --klar-bg: #dcefe0; --redo: #1b6a86; --redo-bg: #dbe9ee; --koad: #b84a26; --koad-bg: #f6ddd1;
  --shadow: 0 1px 2px rgb(60 40 20 / .08), 0 6px 20px rgb(60 40 20 / .08);
  color-scheme: light;
}
@media (prefers-color-scheme: dark) {
  :root {
    --bg: #17130f; --side: #1d1813; --surface: #241d17; --ink: #efe5d6; --muted: #ab9b8c; --faint: #776a5e;
    --line: #3a3027; --hover: #2d251d; --accent: #e8804f; --accent-ink: #1a120c; --sea: #62b3cf; --skiss: #b892e6;
    --klar: #62c482; --klar-bg: #1c3324; --redo: #62b3cf; --redo-bg: #16303a; --koad: #f09062; --koad-bg: #40241a;
    --shadow: 0 1px 2px rgb(0 0 0 / .4), 0 6px 20px rgb(0 0 0 / .28);
    color-scheme: dark;
  }
}
* { box-sizing: border-box; }
[hidden] { display: none !important; }
html, body { margin: 0; height: 100%; }
body {
  background: var(--bg); color: var(--ink);
  font: 15px/1.55 system-ui, -apple-system, "Segoe UI", Ubuntu, Roboto, sans-serif;
  display: grid; grid-template-columns: 400px minmax(0, 1fr); overflow: hidden;
}
a { color: var(--sea); }
button, input, select { font: inherit; color: inherit; }
kbd {
  font: 600 11px/1 ui-monospace, SFMono-Regular, Menlo, monospace; padding: 2px 4px; border-radius: 4px;
  border: 1px solid var(--line); background: var(--surface); color: var(--muted);
}
.st {
  display: inline-flex; align-items: center; gap: 4px; font-size: 10.5px; font-weight: 750; letter-spacing: .05em;
  text-transform: uppercase; padding: 2px 8px; border-radius: 999px; white-space: nowrap; line-height: 1.5;
}
.st.klar { background: var(--klar-bg); color: var(--klar); }
.st.klar::before { content: "✓"; }
.st.redo { background: var(--redo-bg); color: var(--redo); }
.st.koad { background: var(--koad-bg); color: var(--koad); }

/* ---------- vänsterspalten ---------- */
.side { height: 100vh; display: flex; flex-direction: column; background: var(--side); border-right: 1px solid var(--line); min-width: 0; }
.side-top { padding: 16px 16px 10px; display: grid; gap: 10px; border-bottom: 1px solid var(--line); }
.kicker { font-size: 11px; letter-spacing: .12em; text-transform: uppercase; color: var(--accent); font-weight: 700; }
.brand { display: flex; align-items: flex-end; justify-content: space-between; gap: 10px; }
.brand h1 { margin: 2px 0 0; font-size: 19px; line-height: 1.2; }
.brand a {
  font-size: 13px; text-decoration: none; color: var(--ink); padding: 4px 10px; border-radius: 999px;
  border: 1px solid var(--line); background: var(--surface); white-space: nowrap;
}
.brand a:hover { border-color: var(--faint); }
.brand a[aria-current] { background: var(--ink); color: var(--bg); border-color: var(--ink); }
.progress { display: grid; gap: 4px; font-size: 12px; color: var(--muted); }
.prog { height: 6px; border-radius: 3px; background: var(--line); overflow: hidden; }
.prog i { display: block; height: 100%; background: var(--klar); }
#search {
  width: 100%; padding: 8px 12px; border-radius: 8px; border: 1px solid var(--line); background: var(--surface); outline: none;
}
#search:focus { border-color: var(--sea); box-shadow: 0 0 0 3px color-mix(in srgb, var(--sea) 20%, transparent); }
.seg { display: grid; grid-template-columns: repeat(4, 1fr); border: 1px solid var(--line); border-radius: 8px; overflow: hidden; background: var(--surface); }
.seg button {
  border: 0; border-left: 1px solid var(--line); background: none; padding: 5px 2px; cursor: pointer;
  display: flex; justify-content: center; align-items: baseline; gap: 6px; font-size: 12.5px; color: var(--muted);
}
.seg button:first-child { border-left: 0; }
.seg button span { font-size: 14px; font-weight: 700; color: var(--ink); font-variant-numeric: tabular-nums; }
.seg button[aria-pressed="true"] { background: var(--ink); color: var(--bg); }
.seg button[aria-pressed="true"] span { color: var(--bg); }
.row { display: flex; align-items: center; gap: 10px; font-size: 12.5px; color: var(--muted); }
.row select { padding: 3px 6px; border-radius: 6px; border: 1px solid var(--line); background: var(--surface); margin-left: 4px; }
.insf { display: inline-flex; gap: 3px; }
.insf button {
  width: 26px; height: 24px; border-radius: 6px; border: 1px solid var(--line); background: var(--surface);
  font-weight: 700; font-size: 12px; cursor: pointer; color: var(--faint);
}
.insf button[aria-pressed="true"] { color: var(--ink); border-color: var(--ink); }
.shown { margin-left: auto; white-space: nowrap; }
.list { flex: 1; overflow: auto; padding: 8px 8px 16px; overscroll-behavior: contain; }
.item {
  display: grid; grid-template-columns: 64px minmax(0, 1fr) auto; gap: 10px; align-items: center;
  padding: 6px 8px 6px 6px; border-radius: 8px; text-decoration: none; color: inherit; border-left: 3px solid transparent;
}
.item:hover { background: var(--hover); }
.item[aria-current="page"] { background: var(--surface); box-shadow: var(--shadow); }
.item.dim { opacity: .45; }
.item[data-status="klar"] { border-left-color: var(--klar); }
.item[data-status="koad"] { border-left-color: var(--koad); }
.thumb { width: 64px; aspect-ratio: 16 / 9; border-radius: 5px; overflow: hidden; background: var(--line); }
.thumb img { width: 100%; height: 100%; object-fit: cover; display: block; }
.it {
  font-size: 13.5px; line-height: 1.3; font-weight: 560; display: -webkit-box; -webkit-line-clamp: 2;
  -webkit-box-orient: vertical; overflow: hidden;
}
.it .n { color: var(--accent); margin-right: 5px; font-variant-numeric: tabular-nums; }
.is { display: block; font-size: 12px; color: var(--muted); margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.is b { color: var(--ink); font-weight: 650; }
.empty-list { padding: 24px 12px; color: var(--muted); font-size: 13.5px; text-align: center; }
.side-foot { border-top: 1px solid var(--line); padding: 10px 16px 12px; font-size: 11.5px; color: var(--muted); line-height: 1.9; }
.side-foot code { font: 11px ui-monospace, SFMono-Regular, Menlo, monospace; }

/* ---------- högerspalten ---------- */
main { height: 100vh; overflow: auto; min-width: 0; }
.topbar {
  position: sticky; top: 0; z-index: 5; display: flex; align-items: center; gap: 10px; padding: 10px 24px;
  background: color-mix(in srgb, var(--bg) 90%, transparent); backdrop-filter: blur(8px); border-bottom: 1px solid var(--line);
}
.topbar .nav {
  flex: none; width: 34px; height: 34px; border-radius: 8px; border: 1px solid var(--line); background: var(--surface);
  cursor: pointer; font-size: 20px; line-height: 1;
}
.topbar .nav:hover:not(:disabled) { border-color: var(--faint); }
.topbar .nav:disabled { opacity: .35; cursor: default; }
.tb-title { flex: 1; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-weight: 600; font-size: 14px; }
.tb-title .n { color: var(--accent); margin-right: 6px; }
.topbar .st { font-size: 12px; padding: 5px 12px; }
.qbtn {
  flex: none; display: inline-flex; align-items: center; gap: 7px; padding: 6px 14px; border-radius: 999px; cursor: pointer;
  border: 1.5px solid var(--koad); background: var(--surface); color: var(--koad); font-weight: 650; font-size: 14px;
}
.qbtn:hover:not(:disabled) { background: var(--koad-bg); }
.qbtn.out { border-color: var(--line); color: var(--ink); }
.qbtn.out:hover:not(:disabled) { background: var(--hover); }
.qbtn:disabled { opacity: .5; cursor: progress; }
#tb-msg { flex: none; font-size: 12.5px; color: var(--muted); transition: opacity .4s; }
#tb-msg.err { color: var(--koad); }
#tb-msg.fade { opacity: 0; }
.wrap { max-width: 900px; margin: 0 auto; padding: 28px 36px 72px; }

.idea-head { margin-bottom: 18px; }
.eyebrow { font-size: 12.5px; color: var(--muted); font-weight: 600; display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
.eyebrow .rank { background: var(--accent); color: var(--accent-ink); border-radius: 6px; padding: 1px 7px; font-weight: 750; }
.eyebrow .file { font: 12px ui-monospace, SFMono-Regular, Menlo, monospace; color: var(--muted); }
h1 { font-size: 30px; line-height: 1.15; margin: 8px 0 14px; letter-spacing: -.01em; text-wrap: balance; }
.scores { display: flex; flex-wrap: wrap; gap: 10px 24px; align-items: center; }
.sc .l { font-size: 12px; color: var(--muted); }
.sc.big { display: flex; align-items: baseline; gap: 6px; }
.sc.big .v { font-size: 30px; font-weight: 760; color: var(--accent); font-variant-numeric: tabular-nums; line-height: 1; }
.sc.bar { display: grid; grid-template-columns: auto 64px auto; align-items: center; gap: 7px; }
.sc.bar .v { font-weight: 650; font-size: 13.5px; font-variant-numeric: tabular-nums; }
.track { height: 6px; border-radius: 3px; background: var(--line); overflow: hidden; }
.track i { display: block; height: 100%; background: var(--sea); border-radius: 3px; }
.sc.ins { display: flex; align-items: center; gap: 6px; }
.sc.ins .v { display: inline-grid; place-items: center; width: 26px; height: 26px; border-radius: 7px; border: 1.5px solid var(--ink); font-weight: 760; font-size: 13px; }

.md > :first-child { margin-top: 0; }
.md h1 { margin-top: 0; }
.md h2 { font-size: 20px; margin: 34px 0 10px; }
.md h3 { font-size: 16px; margin: 26px 0 8px; }
.md h3.sect { font-size: 12px; letter-spacing: .1em; text-transform: uppercase; color: var(--accent); margin: 30px 0 6px; }
.md p { margin: 0 0 12px; }
.md p, .md li { max-width: 74ch; }
.md ul, .md ol { padding-left: 22px; margin: 0 0 14px; }
.md li { margin: 5px 0; }
.md code { font: 13px ui-monospace, SFMono-Regular, Menlo, monospace; background: var(--hover); padding: 1px 5px; border-radius: 4px; overflow-wrap: anywhere; }
.md img { max-width: 100%; height: auto; }
.md .note { color: var(--muted); font-size: 14px; }
.md a.klar::after { content: " ✓"; color: var(--klar); font-weight: 700; }
.md .gone { color: var(--muted); }
.verdict {
  margin: 0 0 18px; padding: 12px 16px; background: var(--surface); border-left: 3px solid var(--accent);
  border-radius: 0 10px 10px 0; font-style: italic; box-shadow: var(--shadow);
}
.verdict .who { display: block; font-style: normal; font-size: 11px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; color: var(--muted); margin-bottom: 2px; }
.md .lead { font-size: 18px; line-height: 1.5; margin: 0 0 16px; max-width: 64ch; }
.facts {
  display: grid; grid-template-columns: max-content minmax(0, 1fr); gap: 6px 16px; margin: 0 0 22px;
  padding: 12px 16px; border: 1px solid var(--line); border-radius: 10px; font-size: 14px;
}
.facts dt { font-size: 11.5px; font-weight: 700; text-transform: uppercase; letter-spacing: .08em; color: var(--muted); padding-top: 2px; }
.facts dd { margin: 0; }
figure.shot { margin: 18px 0 24px; }
figure.shot img { display: block; width: 100%; height: auto; border-radius: 10px; box-shadow: var(--shadow); cursor: zoom-in; background: var(--line); }
figure.shot figcaption { font-size: 13.5px; color: var(--muted); margin-top: 8px; line-height: 1.5; }
figure.shot figcaption b { color: var(--ink); }
.tag {
  display: inline-block; font-size: 10.5px; font-weight: 760; letter-spacing: .08em; padding: 1px 6px; border-radius: 4px;
  margin-right: 7px; background: var(--sea); color: var(--bg); vertical-align: 1px;
}
.skiss .tag { background: var(--skiss); }
.stats { display: flex; flex-wrap: wrap; gap: 10px; margin: 0 0 20px; }
.stat { display: grid; padding: 10px 16px; border-radius: 10px; background: var(--surface); box-shadow: var(--shadow); min-width: 110px; }
.stat .v { font-size: 26px; font-weight: 760; font-variant-numeric: tabular-nums; line-height: 1.15; }
.stat .v.small { font-size: 16px; line-height: 1.9; }
.stat .l { font-size: 12px; color: var(--muted); }
.stat.redo .v { color: var(--redo); }
.stat.klar .v { color: var(--klar); }
.stat.koad .v { color: var(--koad); }
.md table { border-collapse: collapse; width: 100%; font-size: 13.5px; margin-top: 18px; }
.md th, .md td { padding: 6px 8px; border-bottom: 1px solid var(--line); vertical-align: top; text-align: left; }
.md th { position: sticky; top: 0; background: var(--bg); font-size: 12px; color: var(--muted); }
.md td:first-child { color: var(--muted); font-variant-numeric: tabular-nums; }
.md .c { text-align: center; } .md .r { text-align: right; } .md .nw { white-space: nowrap; }
.md tr[data-status="klar"] td:first-child { box-shadow: inset 3px 0 var(--klar); }
.md tr[data-status="koad"] td:first-child { box-shadow: inset 3px 0 var(--koad); }

.pager { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 44px; padding-top: 20px; border-top: 1px solid var(--line); }
.pager a { display: block; padding: 12px 14px; border: 1px solid var(--line); border-radius: 10px; text-decoration: none; color: inherit; background: var(--surface); font-weight: 600; font-size: 14px; }
.pager a:hover { border-color: var(--faint); }
.pager small { display: block; color: var(--muted); font-size: 12px; font-weight: 500; margin-bottom: 2px; }
.pager .next { grid-column: 2; text-align: right; }

/* ---------- bildvisaren ---------- */
.lb { position: fixed; inset: 0; z-index: 50; background: rgb(12 9 6 / .93); display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 24px 72px; }
.lb img { max-width: 100%; max-height: calc(100vh - 150px); border-radius: 6px; }
.lb .cap { color: #e8dccb; max-width: 960px; font-size: 14px; margin-top: 14px; line-height: 1.5; }
.lb .cap b { color: #fff; }
.lb .cnt { color: #a99a89; font-size: 12px; margin-top: 6px; }
.lb button { position: absolute; background: rgb(255 255 255 / .12); color: #fff; border: 0; width: 46px; height: 46px; border-radius: 50%; font-size: 24px; cursor: pointer; line-height: 1; }
.lb button:hover { background: rgb(255 255 255 / .22); }
.lb .x { top: 16px; right: 16px; }
.lb .pv { left: 14px; top: calc(50% - 23px); }
.lb .nx { right: 14px; top: calc(50% - 23px); }

@media (max-width: 880px) {
  body { display: block; overflow: auto; }
  .side { height: auto; }
  .list { max-height: 45vh; }
  main { height: auto; overflow: visible; }
  .wrap { padding: 20px 16px 56px; }
  .topbar { padding: 8px 16px; }
  .lb { padding: 16px; }
  h1 { font-size: 24px; }
  .md table { display: block; overflow-x: auto; }
}
</style>
</head>
<body>
<aside class="side">
  <div class="side-top">
    <div class="brand">
      <div><div class="kicker">Charter &amp; Run · Nueva Estocolmo</div><h1>Free roam-features</h1></div>
      <a href="#oversikt">Översikt</a>
    </div>
    <div class="progress"><div class="prog"><i id="prog"></i></div><span id="prog-text"></span></div>
    <input id="search" type="search" placeholder="Sök i alla idéer, eller ett nummer  ( / )" autocomplete="off" spellcheck="false">
    <div class="seg" role="group" aria-label="Visa">
      <button type="button" data-vf="alla">Alla <span id="seg-alla"></span></button>
      <button type="button" data-vf="koad">Köad <span id="seg-koad"></span></button>
      <button type="button" data-vf="redo">Redo <span id="seg-redo"></span></button>
      <button type="button" data-vf="klar">Klar <span id="seg-klar"></span></button>
    </div>
    <div class="row">
      <label>Sortera<select id="sort">
        <option value="rank">Betyg</option><option value="wow">Wow</option><option value="film">Film</option>
        <option value="stig">Stig-Helmer</option><option value="insats">Insats S → L</option><option value="queue">Köordning</option>
      </select></label>
      <span class="insf" role="group" aria-label="Insats"><button type="button" data-ins="S" title="Litet bygge">S</button><button type="button" data-ins="M" title="Mellan">M</button><button type="button" data-ins="L" title="Stort bygge">L</button></span>
      <span id="shown" class="shown"></span>
    </div>
  </div>
  <nav id="list" class="list" aria-label="Idéer"></nav>
  <div class="side-foot">
    <kbd>j</kbd> <kbd>k</kbd> nästa / förra · <kbd>/</kbd> sök · <kbd>q</kbd> köa / ta ur kön<br>
    Köa och ta ur kön skriver till <code>features/TODO.md</code>.
  </div>
</aside>
<main id="main">
  <div class="topbar" id="topbar" hidden>
    <button class="nav" id="tb-prev" type="button" aria-label="Förra idén" title="Förra (k)">‹</button>
    <div class="tb-title"><span class="n" id="tb-n"></span><span id="tb-t"></span></div>
    <span id="tb-msg" role="status"></span>
    <span id="tb-st"></span>
    <button class="qbtn" id="tb-q" type="button" hidden></button>
    <button class="nav" id="tb-next" type="button" aria-label="Nästa idé" title="Nästa (j)">›</button>
  </div>
  <div class="wrap">
<!--PAGES-->
    <nav class="pager" id="pager" aria-label="Bläddra" hidden></nav>
  </div>
</main>
<div class="lb" id="lb" hidden>
  <button class="x" type="button" aria-label="Stäng">×</button>
  <button class="pv" type="button" aria-label="Förra bilden">‹</button>
  <img alt="">
  <div class="cap"></div>
  <div class="cnt"></div>
  <button class="nx" type="button" aria-label="Nästa bild">›</button>
</div>
<script>
(() => {
'use strict';
const IDEAS = /*IDEAS*/;
const BY = new Map(IDEAS.map(i => [i.id, i]));
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const main = $('#main'), list = $('#list'), topbar = $('#topbar'), pager = $('#pager'), search = $('#search');
const PAGES = new Map($$('article.page').map(a => [a.dataset.id, a]));
const STATUS = { koad: 'Köad', redo: 'Redo', klar: 'Klar' };
const ORDER = { koad: 0, redo: 1, klar: 2 };
const UKEY = 'charter-and-run/free-roam/ui-v2';
const narrow = matchMedia('(max-width: 880px)');
const pill = i => `<span class="st ${i.status}" data-st="${i.id}">${STATUS[i.status]}</span>`;

const store = {
  get(k, d) { try { const v = JSON.parse(localStorage.getItem(k)); return v && typeof v === 'object' ? v : d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
};
const ui = Object.assign({ q: '', vf: 'alla', sort: 'rank', ins: 'SML' }, store.get(UKEY, {}));
if (ui.vf !== 'alla' && !STATUS[ui.vf]) ui.vf = 'alla';
const saveUi = () => store.set(UKEY, ui);
let current = null, wordRes = [], numQuery = null;

// ---------- listan ----------
const items = new Map(IDEAS.map(i => {
  const a = document.createElement('a');
  a.className = 'item'; a.href = '#' + i.id; a.dataset.id = i.id; a.dataset.status = i.status;
  a.innerHTML = `<span class="thumb">${i.thumb ? `<img src="${esc(i.thumb)}" alt="" loading="lazy" decoding="async">` : ''}</span>`
    + `<span class="ib"><span class="it">${i.n < 9999 ? `<span class="n">${i.n}</span>` : ''}${esc(i.title)}</span>`
    + `<span class="is">${i.cat ? esc(i.cat) + ' · ' : ''}insats <b>${i.insats}</b> · <b>${i.betygText}</b></span></span>${pill(i)}`;
  return [i.id, a];
}));
const emptyList = Object.assign(document.createElement('div'), { className: 'empty-list', textContent: 'Inga idéer matchar.' });

const SORTS = {
  rank: (a, b) => a.n - b.n,
  wow: (a, b) => b.wow - a.wow || a.n - b.n,
  film: (a, b) => b.film - a.film || a.n - b.n,
  stig: (a, b) => b.stig - a.stig || a.n - b.n,
  insats: (a, b) => 'SML?'.indexOf(a.insats) - 'SML?'.indexOf(b.insats) || a.n - b.n,
  // Köade i TODO.md-ordning, sedan redo och klara.
  queue: (a, b) => ORDER[a.status] - ORDER[b.status] || (a.queue || 0) - (b.queue || 0) || a.n - b.n,
};
const ordered = () => [...IDEAS].sort(SORTS[ui.sort] || SORTS.rank);

const textCache = new Map();
function textOf(i) {
  if (!textCache.has(i.id)) textCache.set(i.id, `${i.title} ${i.cat} ${PAGES.get(i.id).textContent}`.toLowerCase());
  return textCache.get(i.id);
}
// Varje sökord matchar från en ordbörjan, så att "tomat" inte hittar "automatiska".
const wordRe = w => new RegExp('(?:^|[^\\p{L}\\p{N}])' + w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'u');
function setQuery(q) {
  ui.q = q;
  const words = q.toLowerCase().split(/\s+/).filter(Boolean);
  numQuery = words.length === 1 && /^#?\d+$/.test(words[0]) ? +words[0].replace('#', '') : null;
  wordRes = words.map(wordRe);
}
function matches(i) {
  if (STATUS[ui.vf] && i.status !== ui.vf) return false;
  if (!ui.ins.includes(i.insats) && 'SML'.includes(i.insats)) return false;
  if (numQuery !== null) return i.n === numQuery;
  return !wordRes.length || wordRes.every(r => r.test(textOf(i)));
}

function renderList() {
  const top = list.scrollTop, frag = document.createDocumentFragment();
  let shown = 0;
  for (const i of ordered()) {
    const ok = matches(i);
    if (!ok && i.id !== current) continue;   // den öppna idén stannar kvar, nedtonad
    const el = items.get(i.id);
    el.classList.toggle('dim', !ok);
    frag.append(el);
    shown += ok;
  }
  if (!shown) frag.append(emptyList);
  list.replaceChildren(frag);
  list.scrollTop = top;
  $('#shown').textContent = shown === IDEAS.length ? `${shown} idéer` : `${shown} av ${IDEAS.length}`;
}

// Grannarna i listans ordning, så j/k och bläddringen följer det man ser.
function neighbours() {
  const o = ordered().filter(i => i.id === current || matches(i));
  const k = o.findIndex(i => i.id === current);
  return k < 0 ? { prev: null, next: o[0] } : { prev: o[k - 1], next: o[k + 1] };
}

function renderCounts() {
  const c = { koad: 0, redo: 0, klar: 0 };
  for (const i of IDEAS) c[i.status]++;
  $('#seg-alla').textContent = IDEAS.length;
  for (const s in c) {
    $('#seg-' + s).textContent = c[s];
    const tile = $('#stat-' + s);
    if (tile) tile.textContent = c[s];
  }
  $('#prog').style.width = (IDEAS.length ? c.klar / IDEAS.length * 100 : 0) + '%';
  $('#prog-text').textContent = `${c.klar} av ${IDEAS.length} klara · ${c.koad} köade`;
}

// ---------- sidorna ----------
function show(id, fromUser = true) {
  if (!PAGES.has(id)) id = 'oversikt';
  if (current && PAGES.has(current)) PAGES.get(current).hidden = true;
  current = id;
  const pg = PAGES.get(id);
  pg.hidden = false;
  document.title = `${pg.dataset.title} · Free roam-features`;
  for (const a of $$('.brand a')) a.toggleAttribute('aria-current', a.getAttribute('href') === '#' + id);
  for (const el of items.values()) el.removeAttribute('aria-current');
  renderList();
  renderNav();
  if (narrow.matches) { if (fromUser) main.scrollIntoView(); }
  else main.scrollTop = 0;
  const it = items.get(id);
  if (it) { it.setAttribute('aria-current', 'page'); if (!narrow.matches) it.scrollIntoView({ block: 'nearest' }); }
}
function renderNav() {
  const i = BY.get(current);
  topbar.hidden = pager.hidden = !i;
  if (!i) return;
  const { prev, next } = neighbours();
  $('#tb-n').textContent = i.n < 9999 ? '#' + i.n : '';
  $('#tb-t').textContent = i.title;
  $('#tb-st').innerHTML = pill(i);
  $('#tb-st').title = {
    klar: `Klar: ${i.file}`,
    koad: `Köad: står under "Gör dessa grejer" i TODO.md (plats ${i.queue} i kön)`,
    redo: 'Redo: står inte i kön i TODO.md',
  }[i.status];
  const q = $('#tb-q');
  q.hidden = i.status === 'klar';
  q.disabled = busy;
  q.classList.toggle('out', i.status === 'koad');
  q.innerHTML = i.status === 'koad' ? '<kbd>q</kbd>Ta ur kön' : '<kbd>q</kbd>Köa';
  q.title = i.status === 'koad'
    ? 'Flytta raden till "Vänta med dessa tills spelaren säger till" i TODO.md'
    : 'Flytta raden sist under "Gör dessa grejer" i TODO.md';
  $('#tb-prev').disabled = !prev;
  $('#tb-next').disabled = !next;
  const label = x => `${x.n < 9999 ? '#' + x.n + ' ' : ''}${esc(x.title)}`;
  pager.innerHTML = (prev ? `<a class="prev" href="#${prev.id}"><small>← Förra</small>${label(prev)}</a>` : '')
    + (next ? `<a class="next" href="#${next.id}"><small>Nästa →</small>${label(next)}</a>` : '');
}
// Synkront, så att j/k direkt efter varandra inte väntar på hashchange.
const go = id => { if (id !== current) { history.pushState(null, '', '#' + id); show(id); } };
function step(d) { const n = neighbours(), t = d > 0 ? n.next : n.prev; if (t) go(t.id); }

// ---------- servern ----------
// Köa / ta ur kön skriver till TODO.md, och statusen hämtas om när fliken får fokus (en agent kan ha
// flyttat en fil under tiden).
let busy = false, msgTimer = 0;
function paintStatus() {
  for (const el of $$('[data-st]')) {
    const i = BY.get(el.dataset.st);
    if (i) { el.className = 'st ' + i.status; el.textContent = STATUS[i.status]; }
  }
  for (const [id, el] of items) el.dataset.status = BY.get(id).status;
  for (const tr of $$('tr[data-id]')) { const i = BY.get(tr.dataset.id); if (i) tr.dataset.status = i.status; }
}
async function refresh() {
  try {
    const r = await fetch('/api/features', { cache: 'no-store' });
    if (!r.ok) return;
    let changed = false;
    for (const f of (await r.json()).features) {
      const i = BY.get(f.id);
      if (i && (i.status !== f.status || i.queue !== f.queue_position)) {
        i.status = f.status; i.queue = f.queue_position; changed = true;
      }
    }
    if (changed) { paintStatus(); renderCounts(); renderList(); renderNav(); }
  } catch {}
}
function flash(text, err = false) {
  const m = $('#tb-msg');
  clearTimeout(msgTimer);
  m.textContent = text; m.className = err ? 'err' : '';
  msgTimer = setTimeout(() => m.classList.add('fade'), err ? 6000 : 2500);
}
async function toggleQueue() {
  const i = BY.get(current);
  if (busy || !i || i.status === 'klar') return;
  const action = i.status === 'koad' ? 'unqueue' : 'queue';
  busy = true; renderNav();
  try {
    const r = await fetch(`/api/features/${encodeURIComponent(i.id)}/${action}`, { method: 'POST', headers: { 'X-Free-Roam': '1' } });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.error || `HTTP ${r.status}`);
    flash(action === 'queue' ? 'Köad i TODO.md' : 'Tillbaka under Vänta i TODO.md');
  } catch (e) { flash('Kunde inte ändra TODO.md: ' + e.message, true); }
  busy = false;
  await refresh();   // köplatserna flyttas för fler än den här idén
  renderNav();
}

// ---------- bildvisaren ----------
const lb = $('#lb'), lbImg = $('img', lb);
let lbList = [], lbIdx = 0;
function lbShow() {
  const im = lbList[lbIdx];
  lbImg.src = im.currentSrc || im.src; lbImg.alt = im.alt;
  $('.cap', lb).innerHTML = im.closest('figure').querySelector('figcaption')?.innerHTML || '';
  $('.cnt', lb).textContent = lbList.length > 1 ? `${lbIdx + 1} / ${lbList.length}` : '';
  $('.pv', lb).hidden = $('.nx', lb).hidden = lbList.length < 2;
}
function lbOpen(img) { lbList = $$('figure.shot img', img.closest('article')); lbIdx = Math.max(0, lbList.indexOf(img)); lbShow(); lb.hidden = false; }
const lbStep = d => { lbIdx = (lbIdx + d + lbList.length) % lbList.length; lbShow(); };
const lbClose = () => { lb.hidden = true; lbImg.removeAttribute('src'); };

// ---------- händelser ----------
document.addEventListener('click', e => {
  const t = e.target;
  if (t.closest('#tb-prev')) { step(-1); return; }
  if (t.closest('#tb-next')) { step(1); return; }
  if (t.closest('#tb-q')) { toggleQueue(); return; }
  const img = t.closest('figure.shot img');
  if (img) { lbOpen(img); return; }
  if (!lb.hidden) {
    if (t.closest('.pv')) lbStep(-1);
    else if (t.closest('.nx')) lbStep(1);
    else if (t === lb || t.closest('.x') || t === lbImg) lbClose();
  }
});
function refilter() { saveUi(); renderList(); renderNav(); }
search.addEventListener('input', () => { setQuery(search.value); refilter(); });
$('#sort').addEventListener('change', e => { ui.sort = e.target.value; refilter(); list.scrollTop = 0; });
for (const b of $$('.seg button')) b.addEventListener('click', () => {
  ui.vf = b.dataset.vf; syncControls(); refilter(); list.scrollTop = 0;
});
for (const b of $$('.insf button')) b.addEventListener('click', () => {
  const s = b.dataset.ins, next = ui.ins.includes(s) ? ui.ins.replace(s, '') : 'SML'.split('').filter(x => x === s || ui.ins.includes(x)).join('');
  ui.ins = next || 'SML'; syncControls(); refilter();
});
function syncControls() {
  search.value = ui.q; $('#sort').value = ui.sort;
  for (const b of $$('.seg button')) b.setAttribute('aria-pressed', b.dataset.vf === ui.vf);
  for (const b of $$('.insf button')) b.setAttribute('aria-pressed', ui.ins.includes(b.dataset.ins));
}
document.addEventListener('keydown', e => {
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  if (!lb.hidden) {
    if (e.key === 'Escape') lbClose();
    else if (e.key === 'ArrowRight') lbStep(1);
    else if (e.key === 'ArrowLeft') lbStep(-1);
    else return;
    e.preventDefault(); return;
  }
  if (e.target.closest('input, textarea, select')) {
    if (e.key === 'Escape') e.target.blur();
    else if (e.key === 'Enter' && e.target === search) { const f = ordered().find(matches); if (f) go(f.id); search.blur(); }
    return;
  }
  if (e.key === '/') { search.focus(); search.select(); }
  else if (e.key === 'j') step(1);
  else if (e.key === 'k') step(-1);
  else if (e.key === 'q') toggleQueue();
  else return;
  e.preventDefault();
});
addEventListener('hashchange', () => { const id = decodeURIComponent(location.hash.slice(1)); if (id !== current) show(id); });
addEventListener('popstate', () => { const id = decodeURIComponent(location.hash.slice(1)) || 'oversikt'; if (id !== current) show(id); });

setQuery(ui.q);
syncControls();
renderCounts();
show(decodeURIComponent(location.hash.slice(1)), false);
addEventListener('focus', refresh);
document.addEventListener('visibilitychange', () => { if (!document.hidden) refresh(); });
})();
</script>
</body>
</html>
"""

if __name__ == "__main__":
    main()
