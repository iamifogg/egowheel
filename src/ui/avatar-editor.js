/* EgoWheel — pixel-art avatar editor (modal). Cosmetic only: no gameplay effects.
 * EW.avatarEditor.open({ appearance, kit, title, priceFor(key, value, original) → yen or 0, cash, onSave(appearance, cost) })
 */
(function (root) {
  'use strict';
  const EW = root.EW = root.EW || {};
  const doc = root.document;
  const LABEL = { hairStyle: 'Hairstyle', hairColor: 'Hair colour', hairTip: 'Hair tips', hairLen: 'Hair length', skin: 'Skin tone', eyeColor: 'Eye colour', eyeShape: 'Eye shape',
    brow: 'Eyebrows', face: 'Face shape', nose: 'Nose', eyeGap: 'Eye spacing', facialHair: 'Facial hair', mark: 'Marking', accessory: 'Accessory', accent: 'Signature colour', number: 'Shirt number' };
  const GROUPS = [['Hair', ['hairStyle', 'hairColor', 'hairTip', 'hairLen']], ['Face', ['skin', 'face', 'eyeShape', 'eyeColor', 'eyeGap', 'brow', 'nose', 'facialHair']], ['Details', ['mark', 'accessory', 'accent', 'number']]];
  const SWATCH = { skin: k => EW.sprites.SKIN[k][0], hairColor: k => EW.sprites.HAIR[k][0], hairTip: k => k === 'none' ? null : EW.sprites.HAIR[k][0], eyeColor: k => EW.sprites.EYES[k], accent: k => k };
  let st = null;

  function values(key) { if (key === 'hairLen') return [0, 1, 2]; if (key === 'eyeGap') return [2, 3, 4]; return EW.sprites.OPTIONS[key]; }
  function nice(key, v) { if (key === 'hairLen') return ['Short', 'Medium', 'Long'][v]; if (key === 'eyeGap') return ['Close', 'Normal', 'Wide'][v - 2]; if (key === 'accent') return ''; return String(v).replace(/([A-Z])/g, ' $1').replace(/^./, c => c.toUpperCase()); }
  function fmtYen(n) { return n >= 1000 ? '¥' + (n / 1000).toFixed(1) + 'm' : '¥' + n + 'k'; }
  function cost() { if (!st.priceFor) return 0; let t = 0; for (const k of Object.keys(LABEL)) if (st.a[k] !== st.orig[k]) t += st.priceFor(k, st.a[k], st.orig[k]) || 0; return t; }

  function render() {
    const m = doc.getElementById('avatarModal'); if (!m) return;
    const ex = EW.sprites.EXPRESSIONS[st.exIdx];
    const src = EW.sprites.portrait(EW.appearances.normalize(st.a), ex, st.kit);
    const total = cost(), over = st.cash != null && total > st.cash;
    let rows = '';
    for (const [g, keys] of GROUPS) {
      if (st.group !== g) continue;
      for (const k of keys) {
        if (k === 'number') { rows += '<div class="av-row"><span>' + LABEL[k] + '</span><div class="av-ctl"><button type="button" data-step="number:-1" aria-label="Lower number">◀</button><b>#' + st.a.number + '</b><button type="button" data-step="number:1" aria-label="Higher number">▶</button></div></div>'; continue; }
        const vals = values(k), v = st.a[k], price = st.priceFor ? st.priceFor(k, v, st.orig[k]) : 0;
        const sw = SWATCH[k] ? '<div class="av-swatches" role="radiogroup" aria-label="' + LABEL[k] + '">' + vals.map(x => { const c = SWATCH[k](x); return '<button type="button" role="radio" aria-checked="' + (x === v) + '" class="sw' + (x === v ? ' on' : '') + (c ? '' : ' none') + '" style="' + (c ? 'background:' + c : '') + '" data-set="' + k + ':' + x + '" title="' + nice(k, x) + '"></button>'; }).join('') + '</div>' : '';
        rows += '<div class="av-row"><span>' + LABEL[k] + (price && v !== st.orig[k] ? ' <em>' + fmtYen(price) + '</em>' : '') + '</span>' + (sw || '<div class="av-ctl"><button type="button" data-step="' + k + ':-1" aria-label="Previous ' + LABEL[k] + '">◀</button><b>' + nice(k, v) + '</b><button type="button" data-step="' + k + ':1" aria-label="Next ' + LABEL[k] + '">▶</button></div>') + '</div>';
      }
    }
    m.innerHTML = '<div class="modal-card av-card"><button type="button" class="icon-button modal-close" data-av="cancel" aria-label="Close editor">✕</button>' +
      '<span class="kicker">' + (st.title || 'A FACE FOR YOUR EGO') + '</span>' +
      '<div class="av-layout"><div class="av-preview"><img class="px-portrait av-img" src="' + src + '" alt="Avatar preview" width="168" height="196"><div class="av-ex"><button type="button" data-ex="-1" aria-label="Previous expression">◀</button><span>' + ex + '</span><button type="button" data-ex="1" aria-label="Next expression">▶</button></div></div>' +
      '<div class="av-controls"><div class="tab-row av-tabs">' + GROUPS.map(([g]) => '<button type="button" class="tab' + (st.group === g ? ' active' : '') + '" data-group="' + g + '">' + g + '</button>').join('') + '</div>' + rows + '</div></div>' +
      (st.priceFor ? '<p class="av-cost' + (over ? ' over' : '') + '">' + (total ? 'Cost of changes: ' + fmtYen(total) + (st.cash != null ? ' · You have ' + fmtYen(Math.round(st.cash)) : '') : 'Basic changes are free. Premium styling costs money.') + '</p>' : '') +
      '<div class="av-actions"><button type="button" class="button secondary" data-av="random">Randomise</button><button type="button" class="button ghost" data-av="reset">Reset</button><button type="button" class="button primary" data-av="save"' + (over ? ' disabled' : '') + '>Save appearance</button></div></div>';
  }

  function onClick(e) {
    const t = e.target.closest('button'); if (!t || !st) return;
    if (t.dataset.group) st.group = t.dataset.group;
    if (t.dataset.ex) st.exIdx = (st.exIdx + Number(t.dataset.ex) + EW.sprites.EXPRESSIONS.length) % EW.sprites.EXPRESSIONS.length;
    if (t.dataset.set) { const [k, v] = t.dataset.set.split(':'); st.a[k] = v; }
    if (t.dataset.step) {
      const [k, d] = t.dataset.step.split(':');
      if (k === 'number') st.a.number = ((st.a.number - 1 + Number(d) + 99) % 99) + 1;
      else { const vals = values(k), i = vals.indexOf(st.a[k]); st.a[k] = vals[(i + Number(d) + vals.length) % vals.length]; }
    }
    if (t.dataset.av === 'random') { const keep = st.a.number; st.a = EW.appearances.randomAppearance(EW.rng.current); st.a.number = keep; }
    if (t.dataset.av === 'reset') st.a = Object.assign({}, st.orig);
    if (t.dataset.av === 'cancel') return close();
    if (t.dataset.av === 'save') { const a = EW.appearances.normalize(st.a), c = cost(), cb = st.onSave; close(); if (cb) cb(a, c); return; }
    render();
  }
  function onKey(e) { if (e.key === 'Escape' && st) close(); }

  function open(opts) {
    let m = doc.getElementById('avatarModal');
    if (!m) { m = doc.createElement('div'); m.id = 'avatarModal'; m.className = 'modal av-modal'; m.setAttribute('role', 'dialog'); m.setAttribute('aria-modal', 'true'); m.setAttribute('aria-label', 'Avatar editor'); doc.body.appendChild(m); m.addEventListener('click', onClick); doc.addEventListener('keydown', onKey); }
    const a = EW.appearances.normalize(opts.appearance);
    st = { a: Object.assign({}, a), orig: Object.assign({}, a), kit: opts.kit, title: opts.title, priceFor: opts.priceFor || null, cash: opts.cash ?? null, onSave: opts.onSave, group: 'Hair', exIdx: 1 };
    m.hidden = false; render();
    const first = m.querySelector('[data-group]'); if (first) first.focus();
  }
  function close() { const m = doc.getElementById('avatarModal'); if (m) m.hidden = true; st = null; }

  EW.avatarEditor = { open, close, isOpen: () => !!st };
})(typeof globalThis !== 'undefined' ? globalThis : this);
