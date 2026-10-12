/* R7-09: textos del servidor con plurales a medias («2 sede(s)», «6 doctor(es)», «22 servicio(s)»,
   «28 bloque(s)», «0 plantilla(s)») en Configuración › Puesta en marcha. Se escriben en pantalla
   con el número que los acompaña: «1 sede», «2 sedes», «0 plantillas», «6 doctores».
   Sin imports: lo usan Configuracion.jsx y node --test. */

const LETRA = "A-Za-zÁÉÍÓÚÜÑáéíóúüñ";
const PALABRA_PAR = new RegExp(`([${LETRA}]+)\\((es|s)\\)`, "g");
const NUMERO = /\d+(?:[.,]\d+)?/g;

const numDe = (txt) => Number(String(txt).replace(",", "."));

/**
 * Cambia cada «palabra(s)» o «palabra(es)» por su singular o su plural según el número más
 * cercano que la precede en el texto (en español, 1 es singular; 0 y los demás, plural). Sin
 * número antes, queda en plural.
 */
export function pluralizarParentesis(texto) {
  if (texto == null) return texto;
  const s = String(texto);
  if (!/\((?:es|s)\)/.test(s)) return s;
  return s.replace(PALABRA_PAR, (todo, palabra, sufijo, pos) => {
    const antes = s.slice(0, pos).match(NUMERO);
    const n = antes ? numDe(antes[antes.length - 1]) : null;
    return n === 1 ? palabra : palabra + sufijo;
  });
}
