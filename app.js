/* Detrás de la pantalla: siete etapas que se arman tocando o arrastrando, se suben y se califican solas, y un reporte al final.
   Nada del contenido está en claro: cada etapa se abre con la llave que deja la anterior resuelta (ver cifra.js). */
(() => {
  'use strict';
  const D = window.DATOS, C = window.Cifra, app = document.querySelector('#app');
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const CLAVE = 'detras-de-la-pantalla-v2';
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const suma = a => (a || []).reduce((x, y) => x + (y || 0), 0);
  const norma = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z ]/g, ' ').replace(/\s+/g, ' ').trim();
  let M = null, E = null, S = null, ocupado = 0, ultimaSalida = 0, avisar = false, descargando = false;
  let sel = null, par = null;                                              // ficha o entidad elegida; pareja que se está editando
  const guardar = () => { try { localStorage.setItem(CLAVE, JSON.stringify(E)); } catch { /* sin almacenamiento: sigue en memoria */ } };
  const maximo = () => suma(M.etapas.map(e => e.n));
  const minutos = hasta => Math.max(1, Math.round(((hasta || Date.now()) - E.t0) / 60000));
  async function tarea(f) { ocupado++; try { return await f(); } catch (e) { console.error(e); throw e; } finally { ocupado--; } }
  const accion = f => () => { if (!ocupado) tarea(f); };                  // un clic doble no repite la acción
  window.__rp = { ocupado: () => ocupado > 0, estado: () => E };          // para el robot de pruebas

  // ---------- piezas de pantalla
  function cabecera() {
    const pasos = M.etapas.map((e, i) => `<i class="${i < E.i ? 'ok' : i === E.i ? 'ya' : ''}" title="${esc(e.t)}">${e.ico}</i>`).join('') + `<i class="${E.i >= M.etapas.length ? 'ya' : ''}" title="Cierre">🏁</i>`;
    return `<header class="barra-sup"><div><b>Detrás de la pantalla</b><span>${esc(E.nom)} · Caso ${esc(E.l)}</span></div>
      <div class="pasos" aria-label="Avance">${pasos}</div>
      <div class="cifras"><span><b id="puntos">${suma(E.pts)}</b> / ${maximo()} pts</span><span><b id="reloj">${minutos(E.t1)}</b> min</span></div></header>`;
  }
  function ficha(f, titulo, abierta) {
    return `<details class="ficha"${abierta ? ' open' : ''}><summary>${esc(titulo)} · ${esc(f.t)}</summary><div class="dos">
      <div class="app"><div class="barra">${esc(f.pt)}<i>●●●</i></div>${f.p.map(l => `<p>${esc(l)}</p>`).join('')}</div>
      <div><h3>Reglas del negocio</h3><ol>${f.r.map(l => `<li>${esc(l)}</li>`).join('')}</ol></div></div></details>`;
  }
  function toast(t) {
    let el = $('#toast'); if (!el) { el = document.createElement('div'); el.id = 'toast'; el.className = 'toast no-imp'; document.body.appendChild(el); }
    el.textContent = t; el.classList.add('ver'); clearTimeout(toast.t); toast.t = setTimeout(() => el.classList.remove('ver'), 6000);
  }
  function fiesta() {                                                      // confeti al superar una etapa
    const c = document.createElement('div'); c.className = 'fiesta no-imp';
    c.innerHTML = Array.from({ length: 36 }, (_, i) => `<i style="left:${Math.random() * 100}%;background:hsl(${i * 37 % 360} 85% 55%);animation-delay:${Math.random() * .4}s"></i>`).join('');
    document.body.appendChild(c); setTimeout(() => c.remove(), 2200);
  }

  // ---------- inicio
  function inicio() {
    app.innerHTML = `<section class="tarjeta portada">
      <p class="ceja">Modelado de datos · 60 minutos · individual</p><h1>📱 Detrás de la pantalla</h1>
      <p class="mision">${esc(M.mision)}</p><ol class="reglas">${M.reglas.map(r => `<li>${esc(r)}</li>`).join('')}</ol>
      <form id="f" autocomplete="off">
        <label>Sus nombres y apellidos<input id="nom" type="text" minlength="5" maxlength="80" required></label>
        <p class="aviso" id="aviso"></p><button class="btn" id="empezar">Empezar</button>
      </form></section>`;
    $('#f').onsubmit = ev => { ev.preventDefault(); if (ocupado) return; tarea(async () => {
      const nom = $('#nom').value.trim().replace(/\s+/g, ' '), nn = norma(nom);
      if (nn.split(' ').length < 2 || nn.length < 5) { $('#aviso').textContent = 'Escriba sus nombres y apellidos completos.'; $('#aviso').classList.add('alerta'); return; }
      const l = M.letras[parseInt((await C.huella(D.sal, 'nombre', nn)).slice(0, 8), 16) % M.letras.length];   // el caso sale del nombre
      E = { nom, nn, l, t0: Date.now(), t1: 0, i: 0, k: [await C.huella(D.sal, 'caso', l)], r: {}, m: {}, env: [], pts: [], fal: [], sal: 0, hecho: false, nota: '', sec: '', fin: null, svg: '' };
      guardar(); await pintar();
    }); };
  }

  // ---------- las vistas de una etapa: cada una dibuja la zona de juego a partir de E.r (lo respondido) y E.m (las marcas)
  const libre = id => !E.hecho && E.m[id] !== true;
  const marca = id => E.m[id] === true ? ' bien' : E.m[id] === false ? ' mal' : '';
  const dm = id => E.m[id] === true ? ' data-marca="bien"' : E.m[id] === false ? ' data-marca="mal"' : '';
  const ico = e => (S.ico && S.ico[e] ? S.ico[e] + ' ' : '');
  const conj = id => (E.r[id] || '').split('+').filter(Boolean);
  const VISTAS = {
    parejas() {                                                            // conceptos (fichas) que se llevan a su frase
      const ops = S.items[0].o.map(o => o.t), usado = k => S.items.some(it => E.r[it.id] === it.o[k].id);
      const chip = k => `<button class="chip op${sel === k ? ' sel' : ''}" data-a="chip" data-v="${k}" draggable="true">${esc(ops[k])}</button>`;
      return `<div class="bandeja" data-a="destino" data-k="-1"><span class="rot">Conceptos</span>${ops.map((_, k) => usado(k) ? '' : chip(k)).join('') || '<em>Todos colocados</em>'}</div>
        <div class="pares">${S.items.map(it => { const k = it.o.findIndex(o => o.id === E.r[it.id]);
          return `<div class="par${marca(it.id)}"${dm(it.id)} data-a="destino" data-item="${it.id}"><p>${esc(it.t)}</p><div class="hueco">${k < 0 ? '<span class="vacio">toque un concepto y luego aquí</span>' : libre(it.id) ? chip(k) : `<span class="chip op fijo">${esc(ops[k])}</span>`}</div></div>`; }).join('')}</div>`;
    },
    cubos() {                                                              // fichas (ítems) que se llevan a su caja
      const cajas = S.items[0].o.map(o => o.t), sin = S.items.filter(it => !E.r[it.id]);
      const chip = it => libre(it.id) ? `<button class="chip it${sel === it.id ? ' sel' : ''}${marca(it.id)}"${dm(it.id)} data-a="chip" data-v="${it.id}" draggable="true">${esc(it.t)}</button>`
        : `<span class="chip it fijo${marca(it.id)}"${dm(it.id)}>${esc(it.t)}</span>`;
      return `<div class="bandeja" data-a="destino" data-k="-1"><span class="rot">Fichas por colocar: ${sin.length}</span>${sin.map(chip).join('')}</div>
        <div class="cubos c${cajas.length}">${cajas.map((b, k) => `<div class="cubo" data-a="destino" data-k="${k}"><h4>${ico(b)}${esc(b)}</h4>${S.items.filter(it => E.r[it.id] === it.o[k].id).map(chip).join('')}</div>`).join('')}</div>`;
    },
    llaves() {                                                             // tocar el atributo que es la clave
      return `<div class="tablas">${S.items.map(it => `<div class="tcard${marca(it.id)}"${dm(it.id)}><h4>${ico(it.t)}${esc(it.t)}</h4>${it.o.map(o =>
        `<button class="col${E.r[it.id] === o.id ? ' on' : ''}" data-a="op" data-item="${it.id}" data-op="${o.id}"${libre(it.id) ? '' : ' disabled'}><i>${E.r[it.id] === o.id ? '🔑' : ''}</i>${esc(o.t)}</button>`).join('')}</div>`).join('')}</div>`;
    },
    diagrama() {                                                           // tocar dos entidades para unirlas y elegir la relación
      const P = [[320, 50], [530, 200], [468, 440], [172, 440], [110, 200]], pos = e => P[S.ents.indexOf(e)];
      let lineas = '';
      for (const it of S.items) {
        const k = it.o.findIndex(o => o.id === E.r[it.id]); if (k <= 0) continue;
        const [x1, y1] = pos(it.par[0]), [x2, y2] = pos(it.par[1]), mx = (x1 + x2) / 2, my = (y1 + y2) / 2, ex = k === 1 ? ['1', 'N'] : k === 2 ? ['N', '1'] : ['N', 'M'];
        const d = Math.hypot(x2 - x1, y2 - y1), ux = (x2 - x1) / d, uy = (y2 - y1) / d, fuera = Math.min(100 / Math.abs(ux || 1e-9), 28 / Math.abs(uy || 1e-9)) + 17;      // justo al salir de la caja
        const ax = x1 + ux * fuera, ay = y1 + uy * fuera, bx = x2 - ux * fuera, by = y2 - uy * fuera;
        lineas += `<g class="rel${marca(it.id)}${par === it.id ? ' sel' : ''}" data-a="par" data-item="${it.id}"><line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>
          <polygon points="${mx},${my - 16} ${mx + 26},${my} ${mx},${my + 16} ${mx - 26},${my}"/><text class="card" x="${ax}" y="${ay + 7}">${ex[0]}</text><text class="card" x="${bx}" y="${by + 7}">${ex[1]}</text></g>`;
      }
      const nodos = S.ents.map(en => { const [x, y] = pos(en); return `<g class="nodo${sel === en ? ' sel' : ''}" data-a="nodo" data-ent="${en}"><rect x="${x - 100}" y="${y - 28}" width="200" height="56" rx="10"/><text x="${x}" y="${y + 7}">${ico(en)}${esc(en)}</text></g>`; }).join('');
      const act = par && S.items.find(it => it.id === par), n = S.items.filter(it => it.o.findIndex(o => o.id === E.r[it.id]) > 0).length;
      const panel = act ? (libre(act.id) ? `<div class="elige"><b>${esc(act.t)}</b>: ¿qué relación tienen?<div>${act.o.map((o, k) => `<button class="opc${(E.r[act.id] || act.o[0].id) === o.id ? ' on' : ''}" data-a="rel" data-k="${k}">${esc(o.t)}</button>`).join('')}</div></div>`
        : `<div class="elige"><b>${esc(act.t)}</b>: esta pareja ya está bien.</div>`)
        : `<div class="elige suave">${sel ? `Ahora toque la entidad con la que se relaciona <b>${esc(sel)}</b>.` : `Toque dos entidades para unirlas. Para cambiar una relación, toque su rombo. Relaciones dibujadas: <b>${n}</b>.`}</div>`;
      const lista = (E.env[E.i] || 0) ? `<ul class="pares-l">${S.items.map(it => { const k = Math.max(0, it.o.findIndex(o => o.id === E.r[it.id]));
        return `<li class="${marca(it.id).trim()}"${dm(it.id)} data-a="par" data-item="${it.id}"><b>${esc(it.t)}</b> · ${esc(it.o[k].t)} <span>${E.m[it.id] === true ? '✓' : E.m[it.id] === false ? '✗' : ''}</span></li>`; }).join('')}</ul>` : '';
      return `<svg class="lienzo" viewBox="0 0 640 490" role="img" aria-label="Diagrama entidad-relación en construcción">${lineas}${nodos}</svg>${panel}${lista}`;
    },
    tablas() {                                                             // agregar claves foráneas a cada tabla y resolver la N:M
      const t = S.items.filter(it => it.tabla).map(it => { const act = conj(it.id), fijo = !libre(it.id);
        return `<div class="tcard${marca(it.id)}"${dm(it.id)}><h4>${ico(it.tabla)}${esc(it.tabla)}</h4>${it.cols.map((c, j) => `<div class="col"><i>${j ? '' : '🔑'}</i>${esc(c)}</div>`).join('')}
          ${it.o.filter(o => act.includes(o.id)).map(o => `<div class="col fk"><i>🔗</i>${esc(o.t)}</div>`).join('')}
          <div class="mas"><span>Clave foránea:</span>${it.o.map(o => `<button class="chip${act.includes(o.id) ? ' on' : ''}" data-a="op" data-item="${it.id}" data-op="${o.id}"${fijo ? ' disabled' : ''}>${act.includes(o.id) ? '−' : '+'} ${esc(o.t.split(' ')[0])}</button>`).join('')}</div></div>`; }).join('');
      const q = S.items.filter(it => !it.tabla).map(it => `<div class="preg${marca(it.id)}"${dm(it.id)}><p><b>${esc(it.t)}</b></p>${it.o.map(o =>
        `<button class="opc${E.r[it.id] === o.id ? ' on' : ''}" data-a="op" data-item="${it.id}" data-op="${o.id}"${libre(it.id) ? '' : ' disabled'}>${esc(o.t)}</button>`).join('')}</div>`).join('');
      return `<div class="tablas">${t}</div>${q}`;
    },
    sellos() {                                                             // poner un diagnóstico a cada tabla
      return `<div class="tablas">${S.items.map(it => `<div class="tcard ancha${marca(it.id)}"${dm(it.id)}><h4>${ico(it.tabla)}${esc(it.tabla)}</h4>
        ${it.cols.map(c => `<div class="col${c.fk ? ' fk' : ''}"><i>${c.pk ? '🔑' : ''}${c.fk ? '🔗' : ''}</i>${esc(c.n)}${c.fk ? ` <small>→ ${esc(c.fk)}</small>` : ''}</div>`).join('')}
        <div class="sellos">${it.o.map(o => `<button class="opc${E.r[it.id] === o.id ? ' on' : ''}" data-a="op" data-item="${it.id}" data-op="${o.id}"${libre(it.id) ? '' : ' disabled'}>${esc(o.t)}</button>`).join('')}</div></div>`).join('')}</div>`;
    },
  };
  function zona() { $('#zona').innerHTML = VISTAS[S.vista](); }
  function jugada(b) {                                                     // un toque (o una ficha soltada) en la zona de juego
    if (E.hecho) return;
    const d = b.dataset, it = d.item && S.items.find(x => x.id === d.item);
    if (d.a === 'chip') { const v = isNaN(d.v) ? d.v : +d.v; sel = sel === v ? null : v; }
    else if (d.a === 'destino' && sel !== null) {
      if (S.vista === 'parejas') {                                         // sel = número de concepto; el destino es una frase o la bandeja
        for (const x of S.items) if (libre(x.id) && E.r[x.id] === x.o[sel].id) delete E.r[x.id];
        if (it && libre(it.id)) E.r[it.id] = it.o[sel].id;
      } else {                                                             // sel = ítem; el destino es una caja o la bandeja
        const x = S.items.find(y => y.id === sel);
        if (x && libre(x.id)) { if (+d.k < 0) delete E.r[x.id]; else E.r[x.id] = x.o[+d.k].id; }
      }
      sel = null;
    }
    else if (d.a === 'op' && it && libre(it.id)) {
      if (it.tipo === 'varios') { const s = new Set(conj(it.id)); s.has(d.op) ? s.delete(d.op) : s.add(d.op); E.r[it.id] = [...s].sort().join('+'); }
      else E.r[it.id] = d.op;
    }
    else if (d.a === 'nodo') {
      if (sel === null) { sel = d.ent; par = null; }
      else if (sel === d.ent) sel = null;
      else { par = S.items.find(x => x.par.includes(sel) && x.par.includes(d.ent)).id; sel = null; }
    }
    else if (d.a === 'par') { par = par === d.item ? null : d.item; sel = null; }
    else if (d.a === 'rel' && par) { const x = S.items.find(y => y.id === par); if (libre(x.id)) { E.r[x.id] = x.o[+d.k].id; } par = null; }
    else return;
    guardar(); zona();
    const a = $('#aviso'); if (a && a.classList.contains('alerta')) { a.classList.remove('alerta'); a.textContent = 'Los puntos se ganan en el primer envío. Revise antes de subir.'; }
  }
  async function etapa() {
    S = await C.abrir(await C.llave(E.k[E.i], 'etapa', E.l, E.i), D.casos[E.l][E.i].c); sel = null; par = null;
    const n = S.items.length, env = E.env[E.i] || 0, e = M.etapas[E.i];
    const pie = E.hecho
      ? `<div class="logro"><b>🎉 Etapa superada.</b> Puntos del primer envío: <b>${E.pts[E.i]} de ${n}</b> · envíos: ${env}.<p>${esc(E.nota)}</p>${S.vista === 'diagrama' && E.svg ? `<div class="dia">${E.svg}</div>` : ''}<button class="btn" id="continuar">Continuar</button></div>`
      : `<p class="aviso" id="aviso">${env ? `Primer envío: <b>${E.pts[E.i]} de ${n}</b> puntos. Corrija lo marcado en rojo y vuelva a subir: ya no suma, pero debe quedar bien para avanzar.` : 'Los puntos se ganan en el primer envío. Revise antes de subir.'}</p>
         <button class="btn" id="subir">Subir y calificar</button>${E.i === 0 && !env ? ' <button class="btn sec" id="volver">Corregir mi nombre</button>' : ''}`;
    app.innerHTML = cabecera() + ficha(M.casos[E.l], 'Su caso', E.i > 0 && E.i < 6) + `<section class="tarjeta etapa">
      <p class="ceja">Etapa ${E.i + 1} de ${M.etapas.length} · unos ${S.m} minutos · ${n} puntos</p><h2>${e.ico} ${esc(S.t)}</h2>
      ${S.intro.map(p => `<p>${esc(p)}</p>`).join('')}
      ${S.vista === 'tablas' && E.svg ? `<div class="dia">${E.svg}</div>` : ''}${S.ficha ? ficha(S.ficha, 'El otro caso', true) : ''}
      <div class="zona v-${S.vista}" id="zona"></div>${pie}</section>`;
    zona();
    const z = $('#zona');
    z.addEventListener('click', ev => { const b = ev.target.closest('[data-a]'); if (b && z.contains(b)) jugada(b); });
    z.addEventListener('dragstart', ev => { const c = ev.target.closest && ev.target.closest('[data-a="chip"]'); if (c) { sel = isNaN(c.dataset.v) ? c.dataset.v : +c.dataset.v; ev.dataTransfer.setData('text/plain', c.dataset.v); } });
    z.addEventListener('dragover', ev => { if (ev.target.closest && ev.target.closest('[data-a="destino"]')) ev.preventDefault(); });
    z.addEventListener('drop', ev => { const d = ev.target.closest && ev.target.closest('[data-a="destino"]'); if (d) { ev.preventDefault(); jugada(d); } });
    if ($('#subir')) $('#subir').onclick = accion(subir);
    if ($('#continuar')) $('#continuar').onclick = accion(async () => { E.i++; E.hecho = false; E.r = {}; E.m = {}; E.nota = ''; guardar(); await pintar(); window.scrollTo(0, 0); });
    if ($('#volver')) $('#volver').onclick = accion(async () => { try { localStorage.removeItem(CLAVE); } catch { /* nada */ } E = null; await pintar(); });
  }
  async function subir() {
    const resp = {}; let faltan = 0;
    for (const it of S.items) {
      if (it.tipo === 'varios') resp[it.id] = conj(it.id).sort().join('+') || '-';
      else { resp[it.id] = E.r[it.id] || (S.vista === 'diagrama' ? it.o[0].id : ''); if (!resp[it.id]) faltan++; }      // en el diagrama, lo que no se une queda sin relación
    }
    if (faltan) { $('#aviso').innerHTML = `<b>Falta responder ${faltan}.</b> Complete todo antes de subir.`; $('#aviso').classList.add('alerta'); return; }
    const ok = {};
    for (const it of S.items) ok[it.id] = (await C.huella(E.k[E.i], 'item', it.id, resp[it.id])) === it.h;
    const bien = S.items.filter(it => ok[it.id]).length;
    if (E.env[E.i] === undefined || E.env[E.i] === null) { E.env[E.i] = 0; E.pts[E.i] = bien; E.fal[E.i] = S.items.filter(it => !ok[it.id]).map(it => it.t); }
    E.env[E.i]++; E.m = ok;
    for (const it of S.items) if (it.tipo !== 'varios') E.r[it.id] = resp[it.id];
    if (bien === S.items.length) {
      const fin = await C.abrir(await C.llave(E.k[E.i], 'fin', E.l, E.i, S.items.map(it => resp[it.id]).join(';')), D.casos[E.l][E.i].x);
      E.k[E.i + 1] = fin.sig; E.nota = fin.nota; if (fin.sec) E.sec = fin.sec; if (fin.svg) E.svg = fin.svg; E.hecho = true;
    }
    guardar(); await etapa();
    if (E.hecho) fiesta();
    ($('[data-marca="mal"]') || $('.logro') || app).scrollIntoView({ block: 'center' });
  }

  // ---------- cierre y reporte
  function cierre() {
    app.innerHTML = cabecera() + `<section class="tarjeta etapa"><p class="ceja">Cierre · unos 4 minutos</p><h2>🏁 Antes del reporte</h2>
      <p>Complete estas dos líneas. No tienen puntos: sirven para saber qué reforzar en la próxima clase.</p>
      <form id="f"><label>Lo que recordé sin problema<textarea id="fa" rows="2" minlength="5" maxlength="400" required></textarea></label>
      <label>Lo que no recordé o más me costó<textarea id="fb" rows="2" minlength="5" maxlength="400" required></textarea></label>
      <button class="btn" id="cerrar">Ver mi reporte</button></form></section>`;
    $('#f').onsubmit = ev => { ev.preventDefault(); if (ocupado) return; tarea(async () => {
      E.fin = { a: $('#fa').value.trim(), b: $('#fb').value.trim() }; E.t1 = Date.now(); guardar(); await pintar(); window.scrollTo(0, 0); fiesta();
    }); };
  }
  async function informe() {
    const pts = suma(E.pts), mx = maximo(), env = suma(E.env), min = minutos(E.t1), apr = pts / mx >= 0.7;
    const cod = (await C.huella(E.sec, E.nn, E.l, pts, env, min)).slice(0, 8).toUpperCase();
    const f = t => new Date(t).toLocaleString('es-EC', { dateStyle: 'short', timeStyle: 'short' });
    const fallos = M.etapas.map((e, i) => (E.fal[i] || []).length ? `<li><b>${esc(e.t)}:</b> ${E.fal[i].map(esc).join(' · ')}</li>` : '').join('');
    app.innerHTML = `<section class="tarjeta informe" id="informe">
      <div class="enc"><div><p class="ceja">Detrás de la pantalla · Modelado de datos</p><h1 id="quien">${esc(E.nom)}</h1></div>
        <span class="sello ${apr ? 'si' : 'no'}">${apr ? 'APROBADO PARA PRODUCCIÓN' : 'DEVUELTO A REVISIÓN'}</span></div>
      <dl class="datos"><dt>Caso</dt><dd>${esc(E.l)} · ${esc(M.casos[E.l].t)}</dd>
        <dt>Inicio y fin</dt><dd>${f(E.t0)} – ${f(E.t1)} · ${min} min</dd><dt>Salidas de la página</dt><dd id="salidas">${E.sal}</dd></dl>
      <div class="barras">${M.etapas.map((e, i) => `<div><span>${e.ico} ${esc(e.t)}</span><i><b style="width:${E.pts[i] / e.n * 100}%"></b></i><em>${E.pts[i]}/${e.n} · ${E.env[i]} ${E.env[i] === 1 ? 'envío' : 'envíos'}</em></div>`).join('')}</div>
      <p class="total">Total: <b id="total" data-pts="${pts}">${pts} de ${mx}</b> puntos · <b>${(pts / mx * 10).toFixed(1).replace('.', ',')} sobre 10</b> · ${env} envíos</p>
      <h3>Lo que falló en el primer envío</h3>${fallos ? `<ul class="fallos">${fallos}</ul>` : '<p>Nada: todo salió bien en el primer envío.</p>'}
      <h3>En sus palabras</h3><p><b>Recordé sin problema:</b> ${esc(E.fin.a)}</p><p><b>No recordé o me costó:</b> ${esc(E.fin.b)}</p>
      ${E.svg ? `<h3>El modelo que reconstruyó</h3><div class="dia">${E.svg}</div>` : ''}
      <p class="verif">Verificación: <code id="linea">${esc(E.l)}-${pts}-${env}-${min}-${cod}</code></p>
      <div class="botones no-imp"><button class="btn" id="imprimir">Imprimir o guardar en PDF</button><button class="btn sec" id="otro">Empezar de nuevo (otra persona)</button></div></section>`;
    $('#imprimir').onclick = () => window.print();
    $('#otro').onclick = () => { if (confirm('Se borrará este reporte de este dispositivo. ¿Ya lo guardó o lo imprimió?')) { try { localStorage.removeItem(CLAVE); } catch { /* nada */ } E = null; pintar(); } };
  }

  // ---------- revisión de un reporte (para quien dirige la clase): …/#revisar
  function revisar() {
    app.innerHTML = `<section class="tarjeta portada"><p class="ceja">Revisión</p><h1>¿Es auténtico el reporte?</h1>
      <form id="f" autocomplete="off"><label>Clave de revisión<input id="cl" type="password" required></label>
      <label>Nombre, tal como aparece en el reporte<input id="no" type="text" required></label>
      <label>Línea de verificación del reporte<input id="li" type="text" placeholder="A-52-9-47-1A2B3C4D" required></label>
      <button class="btn" id="ver">Revisar</button></form><p class="aviso" id="res"></p></section>`;
    $('#f').onsubmit = ev => { ev.preventDefault(); if (ocupado) return; tarea(async () => {
      const m = $('#li').value.trim().toUpperCase().match(/^([A-Z])-(\d+)-(\d+)-(\d+)-([0-9A-F]{8})$/), res = $('#res'), nn = norma($('#no').value);
      res.className = 'aviso alerta';
      if (!m) { res.textContent = 'La línea no tiene el formato del reporte.'; return; }
      let sec; try { sec = (await C.abrir(await C.llaveClave($('#cl').value.trim(), D.sal), D.rev)).sec; } catch { res.textContent = 'Clave de revisión incorrecta.'; return; }
      const bien = (await C.huella(sec, nn, m[1], +m[2], +m[3], +m[4])).slice(0, 8).toUpperCase() === m[5];
      res.className = 'aviso ' + (bien ? 'bueno' : 'alerta');
      res.textContent = bien ? `Auténtico: caso ${m[1]}, ${+m[2]} puntos, ${+m[3]} envíos, ${+m[4]} minutos.` : 'No coincide: el reporte fue alterado, o el nombre o la línea están mal copiados.';
    }); };
  }

  // ---------- salidas de la página: se cuentan y se muestran en el reporte
  function salida() {
    if (!E || E.t1 || descargando) return;                                // recargar o cerrar la pestaña no cuenta como salida
    const a = Date.now(); if (a - ultimaSalida < 1500) return;
    ultimaSalida = a; E.sal++; avisar = true; guardar();
  }
  function regreso() { if (avisar && E && !E.t1) { avisar = false; toast(`Salió de esta página. Queda anotado en el reporte (${E.sal}).`); } }
  document.addEventListener('visibilitychange', () => { if (document.hidden) salida(); else regreso(); });
  window.addEventListener('blur', () => setTimeout(() => { if (!document.hasFocus()) salida(); }, 250));
  window.addEventListener('focus', regreso);
  window.addEventListener('beforeunload', () => { descargando = true; });
  window.addEventListener('pagehide', () => { descargando = true; });
  setInterval(() => { const r = $('#reloj'); if (r && E && !E.t1) r.textContent = minutos(); }, 20000);

  async function pintar() {
    const t = $('#toast'); if (t) t.classList.remove('ver');
    if (location.hash === '#revisar') return revisar();
    if (!E) return inicio();
    if (E.t1) return informe();
    if (E.i >= M.etapas.length) return cierre();
    return etapa();
  }
  tarea(async () => {
    M = await C.abrir(await C.llave(D.sal, 'meta'), D.meta);
    try { E = JSON.parse(localStorage.getItem(CLAVE) || 'null'); } catch { E = null; }
    await pintar();
  }).catch(() => { app.innerHTML = '<p class="cargando">No se pudo abrir la plataforma. Recargue la página.</p>'; });
  window.addEventListener('hashchange', () => { if (!ocupado) tarea(pintar); });
})();
