/* Cifra: las respuestas no están en la página. Se guarda su huella (SHA-256) y el contenido que las revela va
   cifrado con AES-GCM; la llave sale de la respuesta correcta (o de una clave, con PBKDF2). Igual que cifra.py. */
(function (global) {
  'use strict';
  const te = new TextEncoder(), td = new TextDecoder();
  const hex = b => Array.from(new Uint8Array(b), x => x.toString(16).padStart(2, '0')).join('');
  const b64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
  const unir = partes => te.encode(partes.map(String).join('|'));
  async function huella(...partes) { return hex(await crypto.subtle.digest('SHA-256', unir(partes))); }
  async function llave(...partes) {
    const raw = await crypto.subtle.digest('SHA-256', unir(partes));
    return crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['decrypt']);
  }
  async function llaveClave(clave, sal) {
    const base = await crypto.subtle.importKey('raw', te.encode(clave), 'PBKDF2', false, ['deriveKey']);
    return crypto.subtle.deriveKey({ name: 'PBKDF2', salt: te.encode(sal), iterations: 200000, hash: 'SHA-256' },
      base, { name: 'AES-GCM', length: 256 }, false, ['decrypt']);
  }
  async function abrir(k, dato) {
    const b = b64(dato);
    const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: b.slice(0, 12) }, k, b.slice(12));
    return JSON.parse(td.decode(pt));
  }
  global.Cifra = { huella, llave, llaveClave, abrir };
})(typeof window !== 'undefined' ? window : globalThis);
