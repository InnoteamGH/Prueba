/* Formato de WhatsApp en la bandeja: *negrita*, _cursiva_ y ~tachado~.
   El paciente ya lo ve con formato en su WhatsApp; la bandeja mostraba los asteriscos
   («*Jueves 24*»). Igual que WhatsApp, la marca va pegada al texto («* hola *» no cuenta)
   y no puede estar dentro de una palabra (un «_» en un link no es cursiva). */
const MARCAS = { "*": "b", _: "i", "~": "s" };
const RE = /([*_~])(\S(?:[^\n]*?\S)?)\1/g;
const esPalabra = (ch) => !!ch && /[\p{L}\p{N}]/u.test(ch);

// Devuelve los tramos del texto: [{ t, b?, i?, s? }]. Sin formato anidado.
export function partesWa(texto) {
  const s = String(texto ?? "");
  const out = [];
  let ult = 0;
  for (const m of s.matchAll(RE)) {
    const ini = m.index, fin = ini + m[0].length;
    if (esPalabra(s[ini - 1]) || esPalabra(s[fin])) continue;
    if (ini > ult) out.push({ t: s.slice(ult, ini) });
    out.push({ t: m[2], [MARCAS[m[1]]]: true });
    ult = fin;
  }
  if (ult < s.length) out.push({ t: s.slice(ult) });
  return out;
}

// Texto plano sin las marcas (vista previa de la lista de chats).
export const sinFormatoWa = (texto) => partesWa(texto).map((p) => p.t).join("");
