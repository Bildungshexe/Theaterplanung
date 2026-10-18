# Erzeugt die beiden Theaterkurs-Dateien (mit und ohne Passwortschutz) aus theaterkurs.src.html.
import os
here = os.path.dirname(os.path.abspath(__file__))
src = open(os.path.join(here, 'theaterkurs.src.html'), encoding='utf-8').read()
css = open(os.path.join(here, 'sec.css'), encoding='utf-8').read()
js = open(os.path.join(here, 'sec.js'), encoding='utf-8').read()
HELP = (' <b>Empfehlung:</b> Unter „Einrichtung“ → „Daten auf diesem Gerät“ einen Passwortschutz einrichten. '
        'Dann sind gespeicherte Daten und Sicherungsdateien mit AES-256 verschlüsselt. Ein vergessenes Passwort kann niemand wiederherstellen.')
for name, pw, title, helptext in [
    ('Theaterkurs_Bewertung_Offline.html', 'true', 'Theaterkurs – Bewertung', HELP),
    ('Theaterkurs_Bewertung_Offline_ohne_Passwort.html', 'false', 'Theaterkurs – Bewertung (ohne Passwortschutz)', ''),
]:
    out = (src.replace('/*@@SECCSS@@*/', css).replace('/*@@SECJS@@*/', js)
              .replace('/*@@PW@@*/true', pw).replace('/*@@TITLE@@*/', title).replace('/*@@HELPPW@@*/', helptext))
    assert '@@' not in out, name
    open(os.path.join(here, '..', name), 'w', encoding='utf-8').write(out)
    print('geschrieben:', name)
