/** Rutas hash (#/modulo) — sincroniza navegación con la URL sin recargar la SPA. */

const DEFAULT = "dashboard";

/** Alias públicos → vista canónica del switch de MainApp / permisos. */
export const HASH_ALIAS = {
  caja: "facturacion",
  comisiones: "reportes",
  periodontograma: "perio",
  // agenda_cal NO se colapsa a agenda: es vista propia (calendario). NEW-26
  // metas es pantalla propia (DC-41) — no alias a reportes.
};

const MOD_IDS = new Set([
  "dashboard", "gerencial", "reportes", "comisiones", "metas", "miproduccion", "agenda", "agenda_cal",
  "espera", "pacientes", "odontograma", "periodontograma", "perio", "ortodoncia", "facturacion", "caja",
  "inventario", "laboratorio", "consentimientos", "resenas", "whatsapp", "integraciones",
  "config", "usuarios", "permisos", "auditoria", "plan", "plataforma", "servicios",
  "disponibilidad", "formularios", "seguros", "tratamientos", "recetas", "radiografias", "fotos", "recall",
  "recall_hist", "recall_sat", "reportes_aus",
  "inventario_compras", "inventario_consumo", "inventario_prov",
]);

/** UUID de sede demo/prod (backend Supabase). Si ya es UUID, se respeta. */
export const sedeApiUuid = (id) => {
  if (id == null || id === "" || id === "all") return null;
  const s = String(id);
  if (/^[0-9a-f-]{36}$/i.test(s)) return s;
  if (id === 2 || id === "2") return "00000000-0000-0000-0000-0000000000a2";
  if (id === 1 || id === "1") return "00000000-0000-0000-0000-0000000000a1";
  return s;
};

export function canonVista(vista) {
  return HASH_ALIAS[vista] || vista;
}

export function hashDeVista(vista, extra = {}) {
  const v = canonVista(vista);
  if (v === "pacientes" && extra.pacienteId) return `#/pacientes/${extra.pacienteId}`;
  const id = MOD_IDS.has(v) || MOD_IDS.has(vista) ? v : DEFAULT;
  return `#/${id}`;
}

export function parseHash(hash) {
  const raw = (hash || window.location.hash || "").replace(/^#/, "").trim();
  if (!raw || raw === "/") return { vista: DEFAULT, pacienteId: null, desconocida: false };
  const parts = raw.split("/").filter(Boolean);
  // NEW-18: #/login es ruta propia (cierra shell autenticado en App).
  if (parts[0] === "login") return { vista: "login", pacienteId: null, desconocida: false };
  if (parts[0] === "pacientes" && parts[1]) {
    return { vista: "pacientes", pacienteId: parts[1], desconocida: false };
  }
  // NEW-34: rutas inexistentes (#/sedes, #/inventario, #/admin…) → destino efectivo + flag.
  if (!MOD_IDS.has(parts[0])) {
    return { vista: DEFAULT, pacienteId: null, desconocida: true };
  }
  return { vista: canonVista(parts[0]), pacienteId: null, desconocida: false };
}

export function irHash(vista, extra = {}) {
  const h = hashDeVista(vista, extra);
  if (window.location.hash !== h) window.location.hash = h;
  return h;
}
