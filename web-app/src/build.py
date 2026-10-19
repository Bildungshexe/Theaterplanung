# Baut die installierbare Web-App (iPad/iPhone "Zum Home-Bildschirm") aus Bewertungstool.html.
import os, hashlib
from PIL import Image, ImageDraw, ImageFont
here = os.path.dirname(os.path.abspath(__file__))
root = os.path.abspath(os.path.join(here, '..', '..'))
out = os.path.join(root, 'docs')  # GitHub Pages: Quelle "/docs"
os.makedirs(out, exist_ok=True)
open(os.path.join(out, '.nojekyll'), 'w').close()

HEAD = ('<meta http-equiv="Content-Security-Policy" content="default-src \'none\'; script-src \'unsafe-inline\'; style-src \'unsafe-inline\'; img-src \'self\' data: blob:; worker-src \'self\'; manifest-src \'self\'; form-action \'none\'; base-uri \'none\'">\n'
        '<meta name="referrer" content="no-referrer">\n'
        '<link rel="manifest" href="manifest.webmanifest">\n'
        '<meta name="apple-mobile-web-app-capable" content="yes">\n'
        '<meta name="mobile-web-app-capable" content="yes">\n'
        '<meta name="apple-mobile-web-app-title" content="Bewertung">\n'
        '<meta name="apple-mobile-web-app-status-bar-style" content="black">\n'
        '<meta name="theme-color" content="#2b2b2b">\n'
        '<link rel="apple-touch-icon" href="apple-touch-icon.png">')
SW_REG = ("<script>if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) "
          "navigator.serviceWorker.register('sw.js').catch(function () {});</script>\n</body>")

src = os.path.join(root, 'Bewertungstool', 'Bewertungstool.html')
s = open(src, encoding='utf-8').read()
reps = [
    ('<meta name="viewport" content="width=device-width, initial-scale=1">',
     '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n' + HEAD),
    ('body { font-family: Arial, Helvetica, sans-serif; font-size: 11pt; color:#111; background:#d9d9d9; touch-action: manipulation; }',
     'body { font-family: Arial, Helvetica, sans-serif; font-size: 11pt; color:#111; background:#d9d9d9; touch-action: manipulation; padding-top:env(safe-area-inset-top); }'),
    ('</body>', SW_REG),
]
for a, b in reps:
    assert s.count(a) == 1, a
    s = s.replace(a, b, 1)

idx_path = os.path.join(out, 'index.html')
open(idx_path, 'w', encoding='utf-8').write(s)
open(os.path.join(out, 'manifest.webmanifest'), 'w', encoding='utf-8').write(open(os.path.join(here, 'manifest.webmanifest'), encoding='utf-8').read())

h = hashlib.sha256(s.encode('utf-8')).hexdigest()[:12]
sw = open(os.path.join(here, 'sw.js'), encoding='utf-8').read().replace('/*@@VERSION@@*/', h)
open(os.path.join(out, 'sw.js'), 'w', encoding='utf-8').write(sw)

font = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
for size, name in [(512, 'icon-512.png'), (192, 'icon-192.png'), (180, 'apple-touch-icon.png')]:
    im = Image.new('RGB', (size, size), '#8B1E2D'); d = ImageDraw.Draw(im)
    f = ImageFont.truetype(font, int(size * 0.52)) if os.path.exists(font) else ImageFont.load_default()
    d.text((size / 2, size * 0.46), 'B', fill='white', font=f, anchor='mm')
    d.rectangle([size * 0.22, size * 0.78, size * 0.78, size * 0.82], fill='white')
    im.save(os.path.join(out, name))
print('Web-App gebaut in', out, '(Version', h, ')')
