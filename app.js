/* Detrás de la pantalla: siete etapas que se suben y se califican solas, y un reporte al final.
   Nada del contenido está en claro: cada etapa se abre con la llave que deja la anterior resuelta (ver cifra.js). */
(() => {
  'use strict';
  const D = window.DATOS, C = window.Cifra, app = document.querySelector('#app');
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const CLAVE = 'detras-de-la-pantalla-v1';
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const suma = a => (a || []).reduce((x, y) => x + (y || 0), 0);
  let M = null, E = null, S = null, ocupado = 0, ultimaSalida = 0, avisar = false, descargando = false;
  const guardar = () => { try { localStorage.setItem(CLAVE, JSON.stringify(E)); } catch { /* sin almacenamiento: sigue en memoria */ } };
  const maximo = () => suma(M.etapas.map(e => e.n));
  const minutos = hasta => Math.max(1, Math.round(((hasta || Date.now()) - E.t0) / 60000));
  async function tarea(f) { ocupado++; try { return await f(); } catch (e) { console.error(e); throw e; } finally { ocupado--; } }
  const accion = f => () => { if (!ocupado) tarea(f); };                  // un clic doble no repite la acción
  window.__rp = { ocupado: () => ocupado > 0, estado: () => E };          // para el robot de pruebas

  // ---------- piezas de pantalla
  function cabecera() {
    const pasos = M.etapas.map((e, i) => `<i class="${i < E.i ? 'ok' : i === E.i ? 'ya' : ''}" title="${esc(e.t)}"></i>`).join('') + `<i class="${E.i >= M.etapas.length ? 'ya' : ''}" title="Cierre"></i>`;
    return `<header class="barra-sup"><div><b>Detrás de la pantalla</b><span>Equipo ${E.g} · Caso ${esc(E.l)}</span></div>
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

  // ---------- inicio
  function inicio() {
    app.innerHTML = `<section class="tarjeta portada">
      <p class="ceja">Modelado de datos · 60 minutos · en equipo</p><h1>Detrás de la pantalla</h1>
      <p class="mision">${esc(M.mision)}</p><ol class="reglas">${M.reglas.map(r => `<li>${esc(r)}</li>`).join('')}</ol>
      <form id="f" autocomplete="off">
        <label>Número de su equipo<input id="g" type="number" min="1" max="60" inputmode="numeric" required></label>
        <label>Integrantes (nombres y apellidos, separados por comas)<textarea id="nom" rows="2" minlength="5" maxlength="300" required></textarea></label>
        <button class="btn" id="empezar">Empezar</button>
      </form></section>`;
    $('#f').onsubmit = ev => { ev.preventDefault(); tarea(async () => {
      const g = parseInt($('#g').value, 10), nom = $('#nom').value.trim().replace(/\s+/g, ' ');
      if (!(g >= 1) || nom.length < 5) return;
      const l = M.letras[(g - 1) % M.letras.length];
      E = { g, l, nom, t0: Date.now(), t1: 0, i: 0, k: [await C.huella(D.sal, 'caso', l)], r: {}, m: {}, env: [], pts: [], fal: [], sal: 0, hecho: false, nota: '', sec: '', fin: null };
      guardar(); await pintar();
    }); };
  }

  // ---------- una etapa
  function item(it) {
    const marca = E.m[it.id], fijo = E.hecho || marca === true, v = E.r[it.id] || '';
    const campo = it.tipo === 'uno'
      ? `<select data-id="${it.id}"${fijo ? ' disabled' : ''}><option value="">— elijan —</option>${it.o.map(o => `<option value="${o.id}"${v === o.id ? ' selected' : ''}>${esc(o.t)}</option>`).join('')}</select>`
      : `<div class="ops">${it.o.map(o => `<label><input type="checkbox" data-id="${it.id}" value="${o.id}"${v.split('+').includes(o.id) ? ' checked' : ''}${fijo ? ' disabled' : ''}> ${esc(o.t)}</label>`).join('')}</div>`;
    return `<div class="item${marca === true ? ' bien' : marca === false ? ' mal' : ''}" data-id="${it.id}" data-tipo="${it.tipo}">
      <div class="enun${it.mono ? ' mono' : ''}">${esc(it.t)}</div>${campo}<span class="marca">${marca === true ? '✓' : marca === false ? '✗' : ''}</span></div>`;
  }
  async function etapa() {
    S = await C.abrir(await C.llave(E.k[E.i], 'etapa', E.l, E.i), D.casos[E.l][E.i].c);
    const n = S.items.length, env = E.env[E.i] || 0, propia = M.casos[E.l];
    const pie = E.hecho
      ? `<div class="logro"><b>Etapa superada.</b> Puntos del primer envío: <b>${E.pts[E.i]} de ${n}</b> · envíos: ${env}.<p>${esc(E.nota)}</p><button class="btn" id="continuar">Continuar</button></div>`
      : `<p class="aviso" id="aviso">${env ? `Primer envío: <b>${E.pts[E.i]} de ${n}</b> puntos. Corrijan lo marcado con ✗ y vuelvan a subir: ya no suma, pero debe quedar bien para avanzar.` : 'Los puntos se ganan en el primer envío. Revisen antes de subir.'}</p>
         <button class="btn" id="subir">Subir y calificar</button>${E.i === 0 && !env ? ' <button class="btn sec" id="volver">Nos equivocamos de equipo</button>' : ''}`;
    app.innerHTML = cabecera() + ficha(propia, 'Su caso', E.i > 0 && E.i < 6) + `<section class="tarjeta etapa">
      <p class="ceja">Etapa ${E.i + 1} de ${M.etapas.length} · unos ${S.m} minutos · ${n} puntos</p><h2>${esc(S.t)}</h2>
      ${S.intro.map(p => `<p>${esc(p)}</p>`).join('')}
      ${S.res ? `<pre class="res">${esc(S.res.join('\n'))}</pre>` : ''}${S.ficha ? ficha(S.ficha, 'El caso del otro equipo', true) : ''}
      <div class="items">${S.items.map(item).join('')}</div>${pie}</section>`;
    $$('select[data-id], input[data-id]').forEach(c => c.onchange = () => {            // lo que van marcando se guarda
      const id = c.dataset.id;
      E.r[id] = c.tagName === 'SELECT' ? c.value : $$(`input[data-id="${id}"]:checked`).map(x => x.value).sort().join('+');
      guardar();
    });
    if ($('#subir')) $('#subir').onclick = accion(subir);
    if ($('#continuar')) $('#continuar').onclick = accion(async () => { E.i++; E.hecho = false; E.r = {}; E.m = {}; E.nota = ''; guardar(); await pintar(); window.scrollTo(0, 0); });
    if ($('#volver')) $('#volver').onclick = accion(async () => { try { localStorage.removeItem(CLAVE); } catch { /* nada */ } E = null; await pintar(); });
  }
  async function subir() {
    const resp = {}; let faltan = 0;
    for (const it of S.items) {
      if (it.tipo === 'uno') { resp[it.id] = $(`select[data-id="${it.id}"]`).value; if (!resp[it.id]) faltan++; }
      else resp[it.id] = $$(`input[data-id="${it.id}"]:checked`).map(x => x.value).sort().join('+') || '-';
    }
    if (faltan) { $('#aviso').innerHTML = `<b>Falta responder ${faltan}.</b> Completen todo antes de subir.`; $('#aviso').classList.add('alerta'); return; }
    const ok = {};
    for (const it of S.items) ok[it.id] = (await C.huella(E.k[E.i], 'item', it.id, resp[it.id])) === it.h;
    const bien = S.items.filter(it => ok[it.id]).length;
    if (E.env[E.i] === undefined || E.env[E.i] === null) { E.env[E.i] = 0; E.pts[E.i] = bien; E.fal[E.i] = S.items.filter(it => !ok[it.id]).map(it => it.t); }
    E.env[E.i]++; E.r = resp; E.m = ok;
    if (bien === S.items.length) {
      const fin = await C.abrir(await C.llave(E.k[E.i], 'fin', E.l, E.i, S.items.map(it => resp[it.id]).join(';')), D.casos[E.l][E.i].x);
      E.k[E.i + 1] = fin.sig; E.nota = fin.nota; if (fin.sec) E.sec = fin.sec; E.hecho = true;
    }
    guardar(); await etapa();
    ($('.item.mal') || $('.logro') || app).scrollIntoView({ block: 'center' });
  }

  // ---------- cierre y reporte
  function cierre() {
    app.innerHTML = cabecera() + `<section class="tarjeta etapa"><p class="ceja">Cierre · unos 4 minutos</p><h2>Antes del reporte</h2>
      <p>Completen estas dos líneas entre todos. No tienen puntos: sirven para saber qué reforzar en la próxima clase.</p>
      <form id="f"><label>Lo que recordamos sin problema<textarea id="fa" rows="2" minlength="5" maxlength="400" required></textarea></label>
      <label>Lo que no recordamos o más nos costó<textarea id="fb" rows="2" minlength="5" maxlength="400" required></textarea></label>
      <button class="btn" id="cerrar">Ver el reporte del equipo</button></form></section>`;
    $('#f').onsubmit = ev => { ev.preventDefault(); tarea(async () => {
      E.fin = { a: $('#fa').value.trim(), b: $('#fb').value.trim() }; E.t1 = Date.now(); guardar(); await pintar(); window.scrollTo(0, 0);
    }); };
  }
  async function informe() {
    const pts = suma(E.pts), mx = maximo(), env = suma(E.env), min = minutos(E.t1), apr = pts / mx >= 0.7;
    const cod = (await C.huella(E.sec, E.g, E.l, pts, env, min)).slice(0, 8).toUpperCase();
    const f = t => new Date(t).toLocaleString('es-EC', { dateStyle: 'short', timeStyle: 'short' });
    const fallos = M.etapas.map((e, i) => (E.fal[i] || []).length ? `<li><b>${esc(e.t)}:</b> ${E.fal[i].map(esc).join(' · ')}</li>` : '').join('');
    app.innerHTML = `<section class="tarjeta informe" id="informe">
      <div class="enc"><div><p class="ceja">Detrás de la pantalla · Modelado de datos</p><h1>Reporte del equipo ${E.g}</h1></div>
        <span class="sello ${apr ? 'si' : 'no'}">${apr ? 'APROBADO PARA PRODUCCIÓN' : 'DEVUELTO A REVISIÓN'}</span></div>
      <dl class="datos"><dt>Caso</dt><dd>${esc(E.l)} · ${esc(M.casos[E.l].t)}</dd><dt>Integrantes</dt><dd>${esc(E.nom)}</dd>
        <dt>Inicio y fin</dt><dd>${f(E.t0)} – ${f(E.t1)} · ${min} min</dd><dt>Salidas de la página</dt><dd>${E.sal}</dd></dl>
      <table><thead><tr><th>Etapa</th><th>Puntos del primer envío</th><th>Envíos</th></tr></thead><tbody>
        ${M.etapas.map((e, i) => `<tr><td>${i + 1}. ${esc(e.t)}</td><td>${E.pts[i]} de ${e.n}</td><td>${E.env[i]}</td></tr>`).join('')}
        <tr class="tot"><td>Total</td><td id="total" data-pts="${pts}">${pts} de ${mx} · ${(pts / mx * 10).toFixed(1).replace('.', ',')} sobre 10</td><td>${env}</td></tr></tbody></table>
      <h3>Lo que falló en el primer envío</h3>${fallos ? `<ul class="fallos">${fallos}</ul>` : '<p>Nada: todo salió bien en el primer envío.</p>'}
      <h3>Lo que dice el equipo</h3><p><b>Recordamos sin problema:</b> ${esc(E.fin.a)}</p><p><b>No recordamos o nos costó:</b> ${esc(E.fin.b)}</p>
      <p class="verif">Verificación: <code id="linea">G${E.g}-${esc(E.l)}-${pts}-${env}-${min}-${cod}</code></p>
      <div class="botones no-imp"><button class="btn" id="imprimir">Imprimir o guardar en PDF</button><button class="btn sec" id="otro">Empezar con otro equipo</button></div></section>`;
    $('#imprimir').onclick = () => window.print();
    $('#otro').onclick = () => { if (confirm('Se borrará este reporte de este dispositivo. ¿Ya lo guardaron o imprimieron?')) { localStorage.removeItem(CLAVE); E = null; pintar(); } };
  }

  // ---------- revisión de un reporte (para quien dirige la clase): …/#revisar
  function revisar() {
    app.innerHTML = `<section class="tarjeta portada"><p class="ceja">Revisión</p><h1>¿Es auténtico el reporte?</h1>
      <form id="f" autocomplete="off"><label>Clave de revisión<input id="cl" type="password" required></label>
      <label>Línea de verificación del reporte<input id="li" placeholder="G5-A-52-9-47-1A2B3C4D" required></label>
      <button class="btn" id="ver">Revisar</button></form><p class="aviso" id="res"></p></section>`;
    $('#f').onsubmit = ev => { ev.preventDefault(); tarea(async () => {
      const m = $('#li').value.trim().toUpperCase().match(/^G(\d+)-([A-Z])-(\d+)-(\d+)-(\d+)-([0-9A-F]{8})$/), res = $('#res');
      res.className = 'aviso alerta';
      if (!m) { res.textContent = 'La línea no tiene el formato del reporte.'; return; }
      let sec; try { sec = (await C.abrir(await C.llaveClave($('#cl').value.trim(), D.sal), D.rev)).sec; } catch { res.textContent = 'Clave de revisión incorrecta.'; return; }
      const bien = (await C.huella(sec, +m[1], m[2], +m[3], +m[4], +m[5])).slice(0, 8).toUpperCase() === m[6];
      res.className = 'aviso ' + (bien ? 'bueno' : 'alerta');
      res.textContent = bien ? `Auténtico: equipo ${+m[1]}, caso ${m[2]}, ${+m[3]} puntos, ${+m[4]} envíos, ${+m[5]} minutos.` : 'No coincide: el reporte fue alterado o la línea está mal copiada.';
    }); };
  }

  // ---------- salidas de la página: se cuentan y se muestran en el reporte
  function salida() {
    if (!E || E.t1 || descargando) return;                              // recargar o cerrar la pestaña no cuenta como salida
    const a = Date.now(); if (a - ultimaSalida < 1500) return;
    ultimaSalida = a; E.sal++; avisar = true; guardar();
  }
  function regreso() { if (avisar && E && !E.t1) { avisar = false; toast(`Salieron de esta página. Queda anotado en el reporte (${E.sal}).`); } }
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
  }).catch(() => { app.innerHTML = '<p class="cargando">No se pudo abrir la plataforma. Recarguen la página.</p>'; });
  window.addEventListener('hashchange', () => tarea(pintar));
})();
