
  /* ================= Passwortschutz (AES-GCM 256, Schlüssel per PBKDF2-SHA-256) ================= */
  var SEC = (function () {
    var ITER = 400000, key = null, salt = null, iter = ITER, auto = 15, chain = Promise.resolve(), queued = null;
    function b64(buf) { var s = '', a = new Uint8Array(buf); for (var i = 0; i < a.length; i++) s += String.fromCharCode(a[i]); return btoa(s); }
    function unb64(s) { var b = atob(s), a = new Uint8Array(b.length); for (var i = 0; i < b.length; i++) a[i] = b.charCodeAt(i); return a; }
    function ok() {
      try { return !!(window.crypto && window.crypto.subtle && window.TextEncoder && window.TextDecoder && window.Promise && window.isSecureContext !== false); } catch (e) { return false; }
    }
    function derive(pw, s, it) {
      return crypto.subtle.importKey('raw', new TextEncoder().encode(pw), 'PBKDF2', false, ['deriveKey']).then(function (k) {
        return crypto.subtle.deriveKey({ name:'PBKDF2', salt:s, iterations:it, hash:'SHA-256' }, k, { name:'AES-GCM', length:256 }, false, ['encrypt', 'decrypt']);
      });
    }
    function seal(text, k, s, it) {
      var iv = crypto.getRandomValues(new Uint8Array(12));
      return crypto.subtle.encrypt({ name:'AES-GCM', iv:iv }, k, new TextEncoder().encode(text)).then(function (ct) {
        return JSON.stringify({ enc:'AES-GCM', kdf:'PBKDF2-SHA256', iter:it, salt:b64(s), iv:b64(iv), ct:b64(ct), autolock:auto });
      });
    }
    function isEnv(o) { return !!(o && o.enc === 'AES-GCM' && typeof o.ct === 'string' && typeof o.iv === 'string' && typeof o.salt === 'string'); }
    function tryEnv(env, pw) {
      var s = unb64(env.salt), it = Math.max(1000, env.iter | 0);
      return derive(pw, s, it).then(function (k) {
        return crypto.subtle.decrypt({ name:'AES-GCM', iv:unb64(env.iv) }, k, unb64(env.ct)).then(function (pt) {
          return { txt:new TextDecoder().decode(pt), k:k, s:s, it:it, auto:(env.autolock >= 0 ? env.autolock | 0 : 15) };
        });
      });
    }
    function adopt(r) { key = r.k; salt = r.s; iter = r.it; auto = r.auto; }
    function setPassword(pw) {
      var s = crypto.getRandomValues(new Uint8Array(16));
      return derive(pw, s, ITER).then(function (k) { key = k; salt = s; iter = ITER; });
    }
    function write(storeKey, text) {
      queued = text;
      chain = chain.then(function () {
        if (queued === null) return;
        var t = queued; queued = null;
        if (!key) { try { localStorage.setItem(storeKey, t); } catch (e) {} return; }
        return seal(t, key, salt, iter).then(function (env) { try { localStorage.setItem(storeKey, env); } catch (e) {} });
      }).catch(function () {});
      return chain;
    }
    function wipe(storeKey) {
      queued = null; key = null; salt = null;
      chain = chain.then(function () { try { localStorage.removeItem(storeKey); } catch (e) {} });
      return chain;
    }
    return {
      ok:ok, isEnv:isEnv, tryEnv:tryEnv, adopt:adopt, setPassword:setPassword, write:write, wipe:wipe,
      clear:function () { key = null; salt = null; },
      on:function () { return !!key; },
      auto:function () { return auto; }, setAuto:function (m) { auto = Math.max(0, m | 0); },
      sealNow:function (text) { return seal(text, key, salt, iter); }
    };
  })();

  function pwDialog(o) {
    return new Promise(function (resolve) {
      var ov = document.createElement('div'); ov.className = 'lockov';
      ov.innerHTML = '<div class="lockbox" role="dialog" aria-modal="true"><h2></h2><p class="t"></p>' +
        '<input type="password" class="pw p1" autocomplete="' + (o.twice ? 'new-password' : 'current-password') + '" placeholder="Passwort" aria-label="Passwort">' +
        (o.twice ? '<input type="password" class="pw p2" autocomplete="new-password" placeholder="Passwort wiederholen" aria-label="Passwort wiederholen">' : '') +
        '<label class="show"><input type="checkbox" class="sh"> Passwort anzeigen</label><div class="err" role="alert"></div>' +
        '<div class="btns"><button type="button" class="primary ok"></button>' + (o.cancel ? '<button type="button" class="cn">Abbrechen</button>' : '') + '</div>' +
        (o.onForgot ? '<div class="forgot"><button type="button" class="danger fg">Passwort vergessen – alle Daten löschen</button></div>' : '') + '</div>';
      ov.querySelector('h2').textContent = o.title;
      ov.querySelector('.t').textContent = o.text || '';
      var okb = ov.querySelector('.ok'), p1 = ov.querySelector('.p1'), p2 = ov.querySelector('.p2'), err = ov.querySelector('.err');
      okb.textContent = o.okText || 'OK';
      document.body.appendChild(ov);
      setTimeout(function () { try { p1.focus(); } catch (e) {} }, 30);
      function done(v) { if (ov.parentNode) ov.parentNode.removeChild(ov); resolve(v); }
      function go() {
        var a = p1.value;
        if (o.twice) {
          if (a.length < 8) { err.textContent = 'Bitte mindestens 8 Zeichen verwenden.'; return; }
          if (a !== p2.value) { err.textContent = 'Die beiden Eingaben stimmen nicht überein.'; return; }
        } else if (!a) { err.textContent = 'Bitte das Passwort eingeben.'; return; }
        if (!o.check) { done(a); return; }
        okb.disabled = true; err.textContent = 'Wird geprüft …';
        o.check(a).then(function (r) {
          if (r === true) { done(a); return; }
          okb.disabled = false; err.textContent = r || 'Falsches Passwort.'; p1.select();
        });
      }
      okb.addEventListener('click', go);
      ov.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') { e.preventDefault(); if (p2 && document.activeElement === p1) p2.focus(); else go(); }
        if (e.key === 'Escape' && o.cancel) done(null);
      });
      ov.querySelector('.sh').addEventListener('change', function (e) {
        var t = e.target.checked ? 'text' : 'password'; p1.type = t; if (p2) p2.type = t;
      });
      if (o.cancel) ov.querySelector('.cn').addEventListener('click', function () { done(null); });
      if (o.onForgot) ov.querySelector('.fg').addEventListener('click', function () { o.onForgot(); });
    });
  }
  function verifyPw(pw) {
    var env = null;
    try { env = JSON.parse(localStorage.getItem(KEY)); } catch (e) {}
    if (!SEC.isEnv(env)) return Promise.resolve('Gespeicherte Daten nicht gefunden.');
    return SEC.tryEnv(env, pw).then(function () { return true; }, function () { return 'Falsches Passwort.'; });
  }
  function lockNow() { flush().then(function () { location.reload(); }); }
  function updLockBtn() { var b = document.getElementById('lockbtn'); if (b) b.hidden = !SEC.on(); }
  function secHTML() {
    var h = '<div class="secbox"><h3>Passwortschutz</h3>';
    if (!canStore) return h + '<p class="note">Nicht verfügbar, weil dieser Browser hier nichts speichert.</p></div>';
    if (!SEC.ok()) return h + '<p class="bad">Dieser Browser unterstützt keine Verschlüsselung. Bitte einen aktuellen Browser (Chrome, Edge, Firefox, Safari) verwenden.</p></div>';
    if (!SEC.on()) {
      return h + '<p><span class="secoff">Aus.</span> Die Daten liegen unverschlüsselt im Browser. Mit Passwortschutz werden gespeicherte Daten und Sicherungsdateien mit AES-256 verschlüsselt; ohne Passwort sind sie nicht lesbar.</p>' +
        '<div class="secrow"><button type="button" class="primary" data-a="pwset">Passwortschutz einrichten</button></div></div>';
    }
    var opts = [[0, 'nie'], [5, 'nach 5 Minuten'], [15, 'nach 15 Minuten'], [30, 'nach 30 Minuten'], [60, 'nach 60 Minuten']];
    return h + '<p><span class="secon">Aktiv (AES-256).</span> Gespeicherte Daten und Sicherungsdateien sind verschlüsselt. CSV-Tabellen und PDF-Ausdrucke sind <b>nicht</b> verschlüsselt.</p>' +
      '<div class="secrow"><label class="secrow">Automatisch sperren <select data-a="autolock">' +
      opts.map(function (x) { return '<option value="' + x[0] + '"' + (x[0] === SEC.auto() ? ' selected' : '') + '>' + x[1] + '</option>'; }).join('') + '</select></label>' +
      '<button type="button" data-a="pwlock">Jetzt sperren</button><button type="button" data-a="pwchg">Passwort ändern</button>' +
      '<button type="button" class="danger" data-a="pwdel">Passwortschutz entfernen</button></div></div>';
  }
  function secClick(a) {
    if (a === 'pwset') {
      pwDialog({ title:'Passwortschutz einrichten', twice:true, cancel:true, okText:'Schützen',
        text:'Wählen Sie ein Passwort mit mindestens 8 Zeichen. Wichtig: Ohne dieses Passwort lassen sich die Daten nicht wiederherstellen. Notieren Sie es an einem sicheren Ort.' }).then(function (pw) {
        if (!pw) return;
        SEC.setPassword(pw).then(function () { SEC.setAuto(15); return flush(); }).then(function () {
          updLockBtn(); renderSetup();
          alert('Der Passwortschutz ist aktiv. Bitte jetzt eine neue Sicherung speichern – ältere Sicherungsdateien sind noch unverschlüsselt und sollten gelöscht werden.');
        });
      });
      return true;
    }
    if (a === 'pwchg') {
      pwDialog({ title:'Passwort ändern', text:'Bitte zuerst das bisherige Passwort eingeben.', cancel:true, okText:'Weiter', check:verifyPw }).then(function (old) {
        if (!old) return;
        return pwDialog({ title:'Neues Passwort', twice:true, cancel:true, okText:'Ändern', text:'Neues Passwort mit mindestens 8 Zeichen eingeben.' }).then(function (pw) {
          if (!pw) return;
          return SEC.setPassword(pw).then(flush).then(function () { renderSetup(); alert('Das Passwort wurde geändert. Ältere Sicherungsdateien lassen sich weiterhin nur mit dem alten Passwort öffnen.'); });
        });
      });
      return true;
    }
    if (a === 'pwdel') {
      pwDialog({ title:'Passwortschutz entfernen', text:'Zur Bestätigung das Passwort eingeben. Danach werden die Daten wieder unverschlüsselt gespeichert.', cancel:true, okText:'Entfernen', check:verifyPw }).then(function (pw) {
        if (!pw) return;
        SEC.clear(); flush().then(function () { updLockBtn(); renderSetup(); });
      });
      return true;
    }
    if (a === 'pwlock') { lockNow(); return true; }
    return false;
  }
  var lastAct = Date.now();
  function idleCheck() { if (SEC.on() && SEC.auto() > 0 && Date.now() - lastAct > SEC.auto() * 60000) lockNow(); }
  ['pointerdown', 'keydown', 'input', 'touchstart', 'wheel'].forEach(function (ev) { document.addEventListener(ev, function () { lastAct = Date.now(); }, true); });
  setInterval(idleCheck, 15000);
  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'visible') idleCheck(); });
  function unlockScreen(env, onData) {
    if (!SEC.ok()) {
      document.body.innerHTML = '<div style="max-width:600px;margin:40px auto;background:#fff;padding:20px;border-radius:8px;font:12pt Arial">Die gespeicherten Daten sind verschlüsselt, aber dieser Browser unterstützt die Entschlüsselung nicht. Bitte die Datei in einem aktuellen Chrome, Edge, Firefox oder Safari öffnen.</div>';
      return;
    }
    pwDialog({ title:'Gesperrt', okText:'Entsperren', text:'Die Daten auf diesem Gerät sind mit einem Passwort geschützt.',
      check:function (pw) {
        return SEC.tryEnv(env, pw).then(function (r) {
          var o = null; try { o = JSON.parse(r.txt); } catch (e) {}
          SEC.adopt(r); onData(o); return true;
        }, function () { return 'Falsches Passwort.'; });
      },
      onForgot:function () {
        if (!confirm('Ohne Passwort lassen sich die Daten nicht entschlüsseln. Alle Daten auf diesem Gerät endgültig löschen?')) return;
        if (!confirm('Wirklich löschen? Danach können Sie eine (unverschlüsselte oder verschlüsselte) Sicherung neu laden.')) return;
        SEC.wipe(KEY).then(function () { location.reload(); });
      } });
  }
  function readBackup(text, onObj) {
    var o = null;
    try { o = JSON.parse(text); } catch (e) {}
    if (!o) { alert('Die Datei konnte nicht gelesen werden.'); return; }
    if (!SEC.isEnv(o)) { onObj(o, null); return; }
    if (!SEC.ok()) { alert('Diese Sicherung ist verschlüsselt, der Browser unterstützt aber keine Entschlüsselung.'); return; }
    var found = null;
    pwDialog({ title:'Sicherung entschlüsseln', cancel:true, okText:'Öffnen', text:'Diese Sicherung ist verschlüsselt. Bitte das Passwort eingeben, mit dem sie erstellt wurde.',
      check:function (pw) { return SEC.tryEnv(o, pw).then(function (r) { found = r; return true; }, function () { return 'Falsches Passwort.'; }); } }).then(function (pw) {
      if (!pw || !found) return;
      var obj = null; try { obj = JSON.parse(found.txt); } catch (e) {}
      if (!obj) { alert('Die Sicherung ist beschädigt.'); return; }
      onObj(obj, found);
    });
  }
  function exportBackup(name, text) {
    if (SEC.on()) SEC.sealNow(text).then(function (env) { download(name.replace(/\.json$/, '_verschluesselt.json'), env, 'application/json'); });
    else download(name, text, 'application/json');
  }
