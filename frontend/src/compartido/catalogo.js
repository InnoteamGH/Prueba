/* Catálogo único de servicios (spec UX/UI §5.3, SRV-01).
   Una sola lista con código, nombre, especialidad, duración, precio y estado. La leen
   Agenda (duración), Odontograma y Presupuesto, Caja, Reportes y la IA de WhatsApp.
   Se edita en el menú Operación › Servicios y precios (precio base y precio por sede). */

// esp = id de ESPECIALIDADES (comun.jsx). hallazgos = estados del odontograma que,
// marcados «por hacer», proponen este servicio al presupuesto.
export const CATALOGO_SEED = [
  { id: 1, codigo: "C01", nombre: "Consulta / evaluación", esp: 1, duracionMin: 30, precio: 50, activo: true },
  { id: 2, codigo: "G01", nombre: "Limpieza y profilaxis", esp: 1, duracionMin: 30, precio: 80, activo: true },
  { id: 3, codigo: "G02", nombre: "Curación con resina", esp: 1, duracionMin: 30, precio: 120, activo: true, hallazgos: ["caries"], porPieza: true },
  { id: 4, codigo: "G03", nombre: "Reconstrucción estética", esp: 1, duracionMin: 45, precio: 180, activo: true, hallazgos: ["fractura"], porPieza: true },
  { id: 5, codigo: "G04", nombre: "Sellantes preventivos", esp: 5, duracionMin: 30, precio: 120, activo: true },
  { id: 6, codigo: "E01", nombre: "Endodoncia", esp: 3, duracionMin: 60, precio: 350, activo: true, hallazgos: ["endodoncia"], porPieza: true },
  { id: 7, codigo: "P01", nombre: "Corona", esp: 8, duracionMin: 60, precio: 450, activo: true, hallazgos: ["corona"], porPieza: true },
  { id: 8, codigo: "P02", nombre: "Implante dental", esp: 7, duracionMin: 90, precio: 900, activo: true, hallazgos: ["ausente"], porPieza: true },
  { id: 9, codigo: "X01", nombre: "Extracción simple", esp: 6, duracionMin: 30, precio: 120, activo: true, hallazgos: ["extraer"], porPieza: true },
  { id: 10, codigo: "B01", nombre: "Blanqueamiento dental", esp: 9, duracionMin: 60, precio: 400, activo: true },
  { id: 11, codigo: "O01", nombre: "Instalación de brackets", esp: 2, duracionMin: 60, precio: 1500, activo: true },
  { id: 12, codigo: "O02", nombre: "Control de ortodoncia", esp: 2, duracionMin: 30, precio: 150, activo: true },
  { id: 13, codigo: "R01", nombre: "Destartraje (limpieza profunda)", esp: 4, duracionMin: 45, precio: 180, activo: true, perio: true },
  { id: 14, codigo: "R02", nombre: "Control periodontal", esp: 4, duracionMin: 30, precio: 120, activo: true, perio: true },
  { id: 15, codigo: "R03", nombre: "Raspaje y alisado radicular (por cuadrante)", esp: 4, duracionMin: 45, precio: 200, activo: true, perio: true },
  { id: 16, codigo: "D01", nombre: "Radiografía periapical", esp: 10, duracionMin: 15, precio: 30, activo: true },
  { id: 17, codigo: "N01", nombre: "Evaluación pediátrica", esp: 5, duracionMin: 30, precio: 100, activo: true },
];

export const CATALOGO_KEY = "dc_data_v1_catalogo";

/** Catálogo vigente (lo que se guardó en Configuración o la semilla). */
export function leerCatalogo() {
  try {
    const s = JSON.parse(localStorage.getItem(CATALOGO_KEY) || "null");
    if (Array.isArray(s) && s.length) return s;
  } catch (e) { /* sin almacenamiento */ }
  return CATALOGO_SEED;
}

export const servicioPorId = (cat, id) => (cat || []).find((s) => String(s.id) === String(id)) || null;
export const servicioPorHallazgo = (cat, hallazgo) => (cat || []).find((s) => s.activo !== false && (s.hallazgos || []).includes(hallazgo)) || null;

// Nombre de un ítem del presupuesto: «Servicio · pieza 16 (O)».
export function nombreItem(servicio, pieza, cara) {
  const base = servicio ? servicio.nombre : "Procedimiento";
  if (!pieza) return base;
  return `${base} · pieza ${pieza}${cara ? ` (${cara})` : ""}`;
}

// Superficies del odontograma → letra clínica.
export const CARA_LETRA = { center: "O", top: "V", bottom: "L", left: "M", right: "D" };

/** Precio de un servicio en una sede (cada sede puede cobrar distinto).
    preciosSede = { [sedeId]: monto }; sin precio propio usa el precio base. */
export function precioServicio(servicio, sedeId) {
  if (!servicio) return 0;
  const p = sedeId != null && sedeId !== "todas" ? servicio.preciosSede?.[sedeId] : null;
  return p != null && p !== "" && Number.isFinite(Number(p)) ? Number(p) : Number(servicio.precio) || 0;
}

/** Precio de la cita según el servicio elegido en la agenda y la sede donde se atiende.
    El servicio de la agenda es una especialidad: se toma su primer servicio activo del catálogo. */
export function precioCita(cat, espId, sedeId) {
  const s = (cat || []).filter((x) => x.activo !== false && String(x.esp) === String(espId)).sort((a, b) => Number(a.id) - Number(b.id))[0];
  return s ? precioServicio(s, sedeId) : null;
}
