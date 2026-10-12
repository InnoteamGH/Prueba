/* Reintentos y cola de lecturas del cliente API (R5-01, R-19, M5-04).
 *
 * El servidor responde 500 «Ocurrió un error inesperado» o 503 cuando recibe muchas lecturas a
 * la vez (el Panel gerencial lanza unas 25 juntas; la ficha, unas 15). Una pantalla que abría
 * en ese momento se quedaba con la mitad de sus bloques en S/ 0 o «sin datos».
 *   - Las GET se repiten hasta 2 veces ante 500, 502, 503, 504 o un fallo de red, con una
 *     espera creciente y al azar (400–800 ms y luego 1–2 s), para que las lecturas que fallaron
 *     juntas no vuelvan a llegar juntas.
 *   - POST, PUT, PATCH y DELETE nunca se repiten: la escritura pudo llegar al servidor aunque
 *     la respuesta se perdiera, y repetirla duplicaría el cobro, la cita o el paciente.
 *     La excepción es la que se marca `idempotente`: hoy solo el inicio de sesión
 *     (POST /auth/login y /auth/portal/login), que no crea ni cambia nada (R6-10: a las 09:10
 *     el login dio 500 y la persona quedó en la pantalla de acceso).
 *   - Como mucho 6 GET a la vez: las demás esperan su turno en una cola.
 * Sin imports ni import.meta: lo usan client.js y node --test.
 */

/** Estados que se reintentan en una lectura: el servidor falló o se saturó (500, 502, 503,
    504) o no hubo respuesta (0: red caída o respuesta sin cabecera CORS). */
export const ESTADOS_REINTENTABLES = new Set([0, 500, 502, 503, 504]);
/** Reintentos después del primer intento (3 intentos en total). */
export const MAX_REINTENTOS = 2;
/** Lecturas simultáneas como máximo. */
export const MAX_GET_SIMULTANEAS = 6;
/** Espera antes de cada reintento, [mínimo, máximo] en ms: el 1.º y el 2.º. */
export const ESPERAS_MS = [[400, 800], [1000, 2000]];

const estadoDeError = (e) => (e ? (e.status ?? e._httpStatus) : undefined);

/** ¿Se puede repetir esta petición? Las GET (o una escritura marcada `idempotente`, sin
    efectos secundarios, como el login) y solo ante un estado reintentable. */
export function esReintentable(method, status, idempotente = false) {
  return (idempotente || String(method || "").toUpperCase() === "GET") && ESTADOS_REINTENTABLES.has(Number(status));
}

/** ¿El fallo es del servidor o de la red (500, 502, 503, 504 o sin respuesta)? Para decir
    «el servidor no responde» en vez de culpar a la persona o a sus datos. */
export const esFalloDeServidor = (status) => ESTADOS_REINTENTABLES.has(Number(status));

/** Milisegundos a esperar antes del reintento n (1 = el primero). `azar` devuelve [0, 1). */
export function esperaReintento(n, azar = Math.random) {
  const [min, max] = ESPERAS_MS[Math.min(Math.max(1, Number(n) || 1), ESPERAS_MS.length) - 1];
  const r = Math.min(1, Math.max(0, Number(azar()) || 0));
  return Math.round(min + (max - min) * r);
}

const dormirMs = (ms) => new Promise((ok) => setTimeout(ok, ms));

/** Ejecuta fn(intento) y, si falla con un estado reintentable y es una GET (o una escritura
    `idempotente`), la repite hasta `max` veces esperando entre una y otra. Si no se puede
    repetir, el error sale tal cual. */
export async function conReintentos(fn, { method = "GET", idempotente = false, max = MAX_REINTENTOS, dormir = dormirMs, azar = Math.random, estadoDe = estadoDeError, alReintentar = null } = {}) {
  for (let intento = 0; ; intento += 1) {
    try {
      return await fn(intento);
    } catch (e) {
      if (intento >= max || !esReintentable(method, estadoDe(e), idempotente)) throw e;
      const ms = esperaReintento(intento + 1, azar);
      if (alReintentar) { try { alReintentar(e, intento + 1, ms); } catch { /* un aviso roto no corta el reintento */ } }
      await dormir(ms);
    }
  }
}

/** Cola simple: como mucho `max` tareas en curso; las demás esperan en orden de llegada.
    ejecutar(tarea) devuelve la promesa de la tarea; al terminar (bien o mal) entra la siguiente. */
export function crearCola(max = MAX_GET_SIMULTANEAS) {
  const limite = Math.max(1, Number(max) || 1);
  let activas = 0;
  const pendientes = [];
  const siguiente = () => {
    while (activas < limite && pendientes.length) {
      const { tarea, ok, mal } = pendientes.shift();
      activas += 1;
      // then(ok, mal) antes de soltar el lugar: el error es de quien pidió la tarea, no de la cola.
      Promise.resolve().then(tarea).then(ok, mal).then(() => { activas -= 1; siguiente(); });
    }
  };
  return {
    ejecutar(tarea) {
      return new Promise((ok, mal) => { pendientes.push({ tarea, ok, mal }); siguiente(); });
    },
    get activas() { return activas; },
    get enEspera() { return pendientes.length; },
  };
}

/** R6-10: lo que dice la pantalla de acceso cuando el login falla después de los reintentos.
    Antes decía «No se pudo conectar con el servidor. Revisa el backend o usa un acceso demo.»
    ante cualquier error: texto de desarrollo y falso (el servidor sí respondió, con 500).
    `servidor` es el motivo que mandó el servidor (si lo mandó); `portal`, el acceso por DNI. */
export const MSG_SERVIDOR_NO_RESPONDE = "El servidor no responde en este momento. Intenta de nuevo en unos segundos.";
export function mensajeErrorLogin(status, { portal = false, servidor = "" } = {}) {
  const st = Number(status);
  if (portal && (st === 401 || st === 403)) return "DNI o contraseña del portal incorrectos.";
  if (!portal && st === 401) return "Credenciales inválidas.";
  if (esFalloDeServidor(st)) return MSG_SERVIDOR_NO_RESPONDE;
  if (st === 429) return "Demasiados intentos seguidos. Espera un minuto e intenta de nuevo.";
  // «Error 400» es lo que pone el cliente cuando el servidor no dio motivo: no dice nada.
  const m = String(servidor || "").trim().replace(/^Error \d{3}$/, "");
  if (m) return /[.!?]$/.test(m) ? m : `${m}.`;
  return portal ? "No se pudo abrir el portal. Intenta de nuevo en unos segundos." : "No se pudo iniciar sesión. Intenta de nuevo en unos segundos.";
}
