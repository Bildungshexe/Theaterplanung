# Baut die installierbare Web-App (für iPad/iPhone „Zum Home-Bildschirm“) aus den Offline-Dateien.
import os, hashlib
from PIL import Image, ImageDraw, ImageFont
here = os.path.dirname(os.path.abspath(__file__))
root = os.path.abspath(os.path.join(here, '..', '..'))
out = os.path.join(root, 'docs')  # GitHub Pages: Quelle „/docs“
os.makedirs(out, exist_ok=True)
open(os.path.join(out, '.nojekyll'), 'w').close()
HEAD = ('<link rel="manifest" href="manifest.webmanifest">\n'
        '<meta name="apple-mobile-web-app-capable" content="yes">\n'
        '<meta name="mobile-web-app-capable" content="yes">\n'
        '<meta name="apple-mobile-web-app-title" content="Bewertung">\n'
        '<meta name="apple-mobile-web-app-status-bar-style" content="black">\n'
        '<meta name="theme-color" content="#2b2b2b">\n'
        '<link rel="apple-touch-icon" href="apple-touch-icon.png">')
CSP_OLD = "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data: blob:;"
CSP_NEW = "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src 'self' data: blob:; worker-src 'self'; manifest-src 'self';"
HOME_CSS = ('  .homebtn { display:inline-flex; align-items:center; padding:8px 12px; min-height:44px; border-radius:6px; border:1px solid #777; background:#fff; color:#111; text-decoration:none; }\n'
            '  body { padding-top:env(safe-area-inset-top); }\n')
SW_REG = ("<script>if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) "
          "navigator.serviceWorker.register('sw.js').catch(function () {});</script>\n</body>")
tools = [('referat-bewertung/Referat_Bewertung_Offline.html', 'referat.html'),
         ('unterrichtsbeitraege/Unterrichtsbeitraege_Bewertung_Offline.html', 'unterricht.html'),
         ('theaterkurs/Theaterkurs_Bewertung_Offline.html', 'theater.html')]
h = hashlib.sha256()
for src, dst in tools:
    s = open(os.path.join(root, src), encoding='utf-8').read()
    for a, b in [(CSP_OLD, CSP_NEW),
                 ('<meta name="referrer" content="no-referrer">', '<meta name="referrer" content="no-referrer">\n' + HEAD),
                 ('<style>\n', '<style>\n' + HOME_CSS),
                 (('<div class="gbar" id="gbar">' if '<div class="gbar" id="gbar">' in s else '<div class="bar" id="bar">'),
                  ('<div class="gbar" id="gbar">' if '<div class="gbar" id="gbar">' in s else '<div class="bar" id="bar">') + '\n  <a class="homebtn" href="index.html">⌂ Start</a>'),
                 ('</body>', SW_REG)]:
        assert s.count(a) >= 1, (src, a)
        s = s.replace(a, b, 1)
    s = s.replace('width=device-width, initial-scale=1"', 'width=device-width, initial-scale=1, viewport-fit=cover"', 1)
    open(os.path.join(out, dst), 'w', encoding='utf-8').write(s)
    h.update(s.encode('utf-8'))
idx = open(os.path.join(here, 'index.html'), encoding='utf-8').read().replace('/*@@HEAD@@*/', HEAD)
open(os.path.join(out, 'index.html'), 'w', encoding='utf-8').write(idx); h.update(idx.encode('utf-8'))
open(os.path.join(out, 'manifest.webmanifest'), 'w', encoding='utf-8').write(open(os.path.join(here, 'manifest.webmanifest'), encoding='utf-8').read())
sw = open(os.path.join(here, 'sw.js'), encoding='utf-8').read().replace('/*@@VERSION@@*/', h.hexdigest()[:12])
open(os.path.join(out, 'sw.js'), 'w', encoding='utf-8').write(sw)
font = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
for size, name in [(512, 'icon-512.png'), (192, 'icon-192.png'), (180, 'apple-touch-icon.png')]:
    im = Image.new('RGB', (size, size), '#6B2D5C'); d = ImageDraw.Draw(im)
    f = ImageFont.truetype(font, int(size * 0.5)) if os.path.exists(font) else ImageFont.load_default()
    d.text((size / 2, size / 2), 'B', fill='white', font=f, anchor='mm')
    d.rectangle([size * 0.2, size * 0.8, size * 0.8, size * 0.84], fill='white')
    im.save(os.path.join(out, name))
print('Web-App gebaut in', out)
