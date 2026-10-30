#!/usr/bin/env python3
# 更新履歴ページ（games/rireki/index.html）を作る。おもちゃ箱（games/index.html）に載っているゲームだけを、git の記録から集める。
# 使い方：リポジトリの一番上で  python3 tools/rireki.py
import html, json, os, re, subprocess
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
hub = open(os.path.join(ROOT, 'games/index.html'), encoding='utf-8').read()
cards = re.findall(r'<a class="game (g\d+)" href="([^"]+)">\s*<div class="top"><div class="ic">(.*?)</div>\s*<div><h2>(.*?)</h2>', hub, re.S)
css = re.search(r'<style>(.*?)</style>', hub, re.S).group(1)
color_css = '\n'.join(l for l in css.split('\n') if l.startswith('.g1{') or l.startswith('@media (prefers-color-scheme:dark){:root:not([data-theme="light"]) .g1'))

ALIASES = ['ヘキサまわし', 'ふしぎ盤面の地雷さがし', '六角形パズル', '変な形のマインスイーパー', 'キモチ王']
# 書き方が特殊な記録の言いかえ（記録の書き出し → 載せる文）
OVERRIDE = {'ふしぎ盤面の地雷さがし v1': ('v1', 'ばらばら・球・双曲の3つの盤面で公開（このときは「ふしぎ盤面の地雷さがし」）')}
def clean(msg, name, path, paths):
    m = msg.strip()
    for k, v in OVERRIDE.items():
        if m.startswith(k): return v
    if m.lower().startswith('add files via upload'): return '', '最初の公開'
    # ほかのゲームのことを書いた記録（同じ更新でいっしょに触っただけ）は載せない
    for p2 in re.findall(r'/([a-z]+)/', m):
        if p2 in paths and p2 != path: return '', ''
    m = m.replace('（URLに ?siege を付けたときだけ選べる）', '')  # 隠し機能の入り方は書かない
    ver = ''
    mv = re.search(r'(?:試作\s*)?v(\d+(?:\.\d+)*)', m)
    if mv: ver = 'v' + mv.group(1)
    # 「名前 v3：本文」「名前：本文（v3）」「v0.31: 本文」の形から、名前と版を外して本文だけにする
    m = re.sub(r'^[^：:]{0,30}?(?:試作\s*)?v\d+(?:\.\d+)*\s*[：:]\s*', '', m)
    m = re.sub(r'[（(]v\d+(?:\.\d+)*[）)]\s*$', '', m)
    m = re.sub(r'[：:]\s*/[a-z]+/.*$', '', m)  # 「〜を追加：/kimochi/」の場所の部分
    head = re.match(r'^([^：:]{1,24})[：:]\s*', m)
    if head and (name[:2] in head.group(1) or head.group(1) in ALIASES) and m[head.end():].strip(): m = m[head.end():]
    return ver, m.strip()

PATHS = {h.replace('../', '').strip('/') for _, h, _, _ in cards if not h.startswith('http') and h != '../'}
games = []
for cls, href, icon, name in cards:
    if href.startswith('http'):
        games.append(dict(cls=cls, href=href, icon=icon, name=html.unescape(name), id='ext' + cls, ext=True, log=[])); continue
    path = 'index.html' if href == '../' else href.replace('../', '').strip('/')
    gid = 'top' if path == 'index.html' else path
    out = subprocess.run(['git', 'log', '--date=format-local:%Y-%m-%d %H:%M', '--format=%ad\t%s', '--', path], cwd=ROOT, capture_output=True, text=True, env=dict(os.environ, TZ='Asia/Tokyo')).stdout
    log = []
    for line in out.strip().split('\n'):
        if not line.strip(): continue
        d, s = line.split('\t', 1)
        v, t = clean(s, html.unescape(name), path, PATHS)
        if t: log.append(dict(d=d, v=v, t=t))
    games.append(dict(cls=cls, href=href, icon=icon, name=html.unescape(name), id=gid, ext=False, log=log))

def entry(e):
    return f'<li><time>{e["d"][5:10].replace("-", "/")}</time>{f"<b>{html.escape(e["v"])}</b>" if e["v"] else ""}<span>{html.escape(e["t"])}</span></li>'

secs = []
for g in games:
    head = f'<div class="top"><div class="ic">{g["icon"]}</div><div><h2>{html.escape(g["name"])}</h2>'
    if g['ext']:
        secs.append(f'<section class="game {g["cls"]}" id="{g["id"]}">{head}<div class="what">別の場所で作っているので、履歴はここにはありません</div></div></div><a class="go" href="{g["href"]}">遊ぶ →</a></section>'); continue
    L = g['log']; last = L[0] if L else None
    meta = f'更新 {len(L)}回・最新 {last["d"][:10].replace("-", "/")}' if last else ''
    first, rest = L[:5], L[5:]
    more = f'<details><summary>前の{len(rest)}件を見る</summary><ol>{"".join(entry(e) for e in rest)}</ol></details>' if rest else ''
    secs.append(f'<section class="game {g["cls"]}" id="{g["id"]}">{head}<div class="what">{meta}</div></div></div><ol>{"".join(entry(e) for e in first)}</ol>{more}<a class="go" href="{g["href"].replace("../", "../../")}">遊ぶ →</a></section>')

nav = ''.join(f'<a class="{g["cls"]}" href="#{g["id"]}">{html.escape(g["name"])}</a>' for g in games if not g['ext'])
page = f'''<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>更新履歴</title>
<meta name="description" content="自作のおもちゃ箱にあるゲームの更新履歴">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=M+PLUS+Rounded+1c:wght@500;700;800&display=swap" rel="stylesheet">
<style>
/* おもちゃ箱と同じ見た目。tools/rireki.py が作るページなので、直接は書きかえない */
:root{{--bg:#f5f1ea;--surface:#fffdf9;--ink:#29241f;--muted:#776c61;--rule:#e4dbcf;--shadow:0 2px 0 rgba(41,36,31,.07);
  --font:"M PLUS Rounded 1c","Hiragino Maru Gothic ProN","Hiragino Sans","Yu Gothic",system-ui,sans-serif}}
@media (prefers-color-scheme:dark){{:root:not([data-theme="light"]){{--bg:#191613;--surface:#24201c;--ink:#f2ece4;--muted:#a99e92;--rule:#3a332c;--shadow:0 2px 0 rgba(0,0,0,.3)}}}}
:root[data-theme="dark"]{{--bg:#191613;--surface:#24201c;--ink:#f2ece4;--muted:#a99e92;--rule:#3a332c;--shadow:0 2px 0 rgba(0,0,0,.3)}}
*{{box-sizing:border-box}}html{{-webkit-text-size-adjust:100%;scroll-behavior:smooth}}
body{{margin:0;background:var(--bg);color:var(--ink);font-family:var(--font);font-weight:500;line-height:1.6}}
.wrap{{max-width:760px;margin:0 auto;padding:28px 16px 48px}}
header h1{{margin:0 0 6px;font-size:28px;font-weight:800;letter-spacing:.04em}}
header a.back{{color:var(--muted);font-size:14px;text-decoration:none}}
nav{{display:flex;flex-wrap:wrap;gap:6px;margin:16px 0 20px}}
nav a{{font-size:13px;border:1px solid var(--rule);border-radius:999px;padding:3px 12px;text-decoration:none;color:var(--c);background:var(--surface);font-weight:700}}
.game{{background:var(--surface);border:1px solid var(--rule);border-radius:18px;padding:16px;box-shadow:var(--shadow);margin-bottom:14px;scroll-margin-top:12px}}
.top{{display:flex;align-items:center;gap:12px;margin-bottom:8px}}
.ic{{flex:none;width:44px;height:44px;border-radius:12px;background:var(--cs);display:flex;align-items:center;justify-content:center;color:var(--c)}}
.ic svg{{width:28px;height:28px}}
.game h2{{margin:0;font-size:19px;font-weight:800;line-height:1.3}}
.what{{font-size:12px;color:var(--muted)}}
ol{{list-style:none;margin:0;padding:0}}
li{{display:grid;grid-template-columns:3.4em auto 1fr;gap:4px 8px;padding:7px 0;border-top:1px dashed var(--rule);font-size:14px;align-items:baseline}}
li time{{color:var(--muted);font-size:12px;font-variant-numeric:tabular-nums}}
li b{{font-size:11px;color:var(--c);border:1px solid var(--c);border-radius:999px;padding:0 7px;white-space:nowrap}}
li b:empty{{visibility:hidden;border:0}}li span{{grid-column:3}}
details summary{{cursor:pointer;color:var(--muted);font-size:13px;padding:6px 0;border-top:1px dashed var(--rule)}}
.go{{display:inline-block;margin-top:10px;font-weight:800;color:var(--c);text-decoration:none}}
{color_css}
</style>
</head>
<body>
<div class="wrap">
  <header><a class="back" href="../">← 自作のおもちゃ箱</a><h1>更新履歴</h1></header>
  <nav>{nav}</nav>
  <main>
{chr(10).join(secs)}
  </main>
</div>
</body>
</html>
'''
os.makedirs(os.path.join(ROOT, 'games/rireki'), exist_ok=True)
open(os.path.join(ROOT, 'games/rireki/index.html'), 'w', encoding='utf-8').write(page)
print('games', len(games), 'entries', sum(len(g['log']) for g in games))
