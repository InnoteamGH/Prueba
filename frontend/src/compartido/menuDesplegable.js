/* M7-01: cierre común de los menús desplegables (Exportar, Descargar, ⋯ y Crear).
   Antes cada menú ponía encima de la página una capa transparente que lo cerraba al hacer clic:
     - Escape no lo cerraba (en Exportar y Descargar), y al volver a la misma ruta seguía abierto.
     - La capa se comía el primer clic: el clic fuera cerraba el menú, pero no llegaba a su
       destino (había que pulsar dos veces otro botón, una fila o el menú lateral).
   Ahora no hay capa: se escucha `pointerdown` en el documento y, si el clic cae fuera del menú,
   se cierra y el clic sigue su camino. Escape lo cierra y devuelve el foco al botón; se escucha
   en captura para que no cierre también el modal que lo contiene (lo mismo que M5-09 hizo con
   «Más acciones»). Las flechas ↑/↓ recorren las opciones, también desde el botón (M7-03: con el
   menú abierto con el ratón, ↓ no llevaba el foco a la lista).
   Sin JSX: lo usan comun.jsx, App.jsx y node --test. */
import { useEffect, useRef } from "react";

/** ¿El nodo `objetivo` está dentro de alguno de los contenedores (elementos del DOM)? */
export function esDentro(objetivo, contenedores = []) {
  if (!objetivo) return false;
  return (contenedores || []).some((c) => !!c && typeof c.contains === "function" && c.contains(objetivo));
}

/** Índice de la opción a la que pasa el foco con ↓ (paso 1) o ↑ (paso −1). Sin foco en la lista
    (actual −1), ↓ va a la primera y ↑ a la última; al final de la lista vuelve al principio. */
export function indiceSiguiente(actual, total, paso) {
  const n = Number(total) || 0;
  if (n <= 0) return -1;
  const p = paso < 0 ? -1 : 1;
  if (actual == null || actual < 0 || actual >= n) return p > 0 ? 0 : n - 1;
  return (actual + p + n) % n;
}

/** Opciones del menú que reciben el foco (las deshabilitadas no). */
const opcionesDe = (lista) => (lista ? [...lista.querySelectorAll("[role=menuitem], button")].filter((b) => !b.disabled) : []);

/** Mueve el foco con ↑/↓ dentro de la lista del menú. Devuelve true si atendió la tecla. */
export function moverFocoMenu(e, lista) {
  if (!e || (e.key !== "ArrowDown" && e.key !== "ArrowUp")) return false;
  const ops = opcionesDe(lista);
  if (!ops.length) return false;
  e.preventDefault();
  const i = indiceSiguiente(ops.indexOf(typeof document !== "undefined" ? document.activeElement : null), ops.length, e.key === "ArrowDown" ? 1 : -1);
  ops[i]?.focus({ preventScroll: true });
  return true;
}

/** Lleva el foco a la primera opción (al abrir el menú con el teclado). */
export function enfocarPrimera(lista) {
  opcionesDe(lista)[0]?.focus({ preventScroll: true });
}

/**
 * Cierra el menú con Escape o con un clic fuera de `dentro` (refs del botón y de la lista).
 * `boton` (ref) recibe el foco al cerrar con Escape.
 */
export function useMenuDesplegable(abierto, cerrar, { dentro = [], boton = null } = {}) {
  const cerrarRef = useRef(cerrar);
  cerrarRef.current = cerrar;
  const dentroRef = useRef(dentro);
  dentroRef.current = dentro;
  useEffect(() => {
    if (!abierto) return undefined;
    const alPulsar = (e) => {
      if (esDentro(e.target, (dentroRef.current || []).map((r) => r && r.current))) return;
      // Sin preventDefault: el clic fuera cierra el menú y además llega a su destino.
      cerrarRef.current();
    };
    const alTeclear = (e) => {
      if (e.key !== "Escape") return;
      e.preventDefault();
      e.stopPropagation();
      cerrarRef.current();
      boton?.current?.focus?.({ preventScroll: true });
    };
    document.addEventListener("pointerdown", alPulsar, true);
    window.addEventListener("keydown", alTeclear, true);
    return () => {
      document.removeEventListener("pointerdown", alPulsar, true);
      window.removeEventListener("keydown", alTeclear, true);
    };
  }, [abierto]); // eslint-disable-line react-hooks/exhaustive-deps
}
