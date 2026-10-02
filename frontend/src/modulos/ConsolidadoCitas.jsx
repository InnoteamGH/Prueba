/* Consolidado de citas: todas las citas de un rango, por estado, por doctor y por día.
 *
 * Recepción ve las sedes a su cargo (o la elegida en el menú); el doctor solo sus citas.
 * Conectado: GET /citas?desde=YYYY-MM-DD&hasta=YYYY-MM-DD&sedeIds=… (el backend restringe por rol;
 * además se filtra aquí por si aún no aplica la sede).
 * Demo: usa las citas en memoria de la agenda (ya filtradas por sede).
 */
import React, { useEffect, useMemo, useState } from "react";
import { CalendarRange, CheckCircle2, Clock, Download, UserX, XCircle, Users, CalendarDays, Stethoscope, TrendingUp } from "lucide-react";
import api from "../api/client";
import { sedeApiUuid } from "../routing";
import { ListaFiltrable, PersonaCelda, ESTADO_BADGE, Card, Vacio, fmt, hoy, addDays, fechaLegible, nombreSede, exportarExcel, colorDe, useSede } from "../comun";
import { estadoCita } from "../compartido/estados";

const PROGRAMADA = ["pendiente", "confirmada", "en_sala", "en_atencion"];
const PERDIDA = ["cancelada", "reprogramada", "cerrada_sistema"];
const lunes = (d) => { const x = new Date(d); const dia = (x.getDay() + 6) % 7; x.setDate(x.getDate() - dia); return x; };
const ymd = (d) => fmt(d);

export default function ConsolidadoCitas({ citas = [], medicos = [], rol, usuario, conectado, notify = () => {}, onAbrirCita }) {
  const esMedico = rol === "medico";
  // Sedes que se ven con el filtro del menú: KPIs, tabla y Excel cuentan solo esas.
  const { sede, ids: sedesVer, enSede, global } = useSede();
  const sedesKey = (sedesVer || []).join(",");
  const [preset, setPreset] = useState("semana");
  const [rango, setRango] = useState(() => ({ desde: ymd(lunes(hoy)), hasta: ymd(addDaysD(lunes(hoy), 6)) }));
  const [remotas, setRemotas] = useState(null);
  const [cargando, setCargando] = useState(false);

  const aplicarPreset = (p) => {
    setPreset(p);
    if (p === "hoy") setRango({ desde: fmt(hoy), hasta: fmt(hoy) });
    if (p === "semana") { const l = lunes(hoy); setRango({ desde: ymd(l), hasta: ymd(addDaysD(l, 6)) }); }
    if (p === "mes") { const a = new Date(hoy.getFullYear(), hoy.getMonth(), 1); const b = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0); setRango({ desde: ymd(a), hasta: ymd(b) }); }
    if (p === "30") setRango({ desde: addDays(-29), hasta: fmt(hoy) });
  };

  useEffect(() => {
    if (!conectado) return;
    setCargando(true);
    api.citas.listar(null, rango.desde, rango.hasta, sedesVer ? sedesVer.map(sedeApiUuid).filter(Boolean) : null)
      .then((r) => setRemotas((r || []).map((c) => ({ id: c.id, paciente: c.paciente || "—", pacienteId: c.pacienteId || null, medicoId: c.medicoId, medico: c.medico || "Sin asignar", sede: c.sedeId, sedeNombre: c.sede || "", fecha: (c.fecha || "").slice(0, 10), hora: (c.hora || "").slice(0, 5), motivo: c.motivo || "", estado: c.estado }))))
      .catch(() => { setRemotas([]); notify("No se pudieron cargar las citas del rango."); })
      .finally(() => setCargando(false));
  }, [conectado, rango.desde, rango.hasta, sedesKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const miId = esMedico && !conectado ? (medicos.find((m) => m.nombre === usuario?.nombre) || { id: "__ninguno" }).id : null;   // sin coincidencia no muestra las de otro doctor
  const nomMed = (c) => c.medico || (medicos.find((m) => m.id === c.medicoId) || {}).nombre || "Sin asignar";
  const filas = useMemo(() => {
    const base = (conectado ? (remotas || []) : citas.filter((c) => c.fecha >= rango.desde && c.fecha <= rango.hasta && (miId == null || c.medicoId === miId)))
      .filter((c) => enSede(c.sede));
    return base.map((c) => ({ ...c, medico: nomMed(c), sedeNombre: c.sedeNombre || nombreSede(c.sede) || "" }))
      .sort((a, b) => (a.fecha + a.hora).localeCompare(b.fecha + b.hora));
  }, [conectado, remotas, citas, rango.desde, rango.hasta, miId, sedesKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const k = useMemo(() => {
    const cnt = (f) => filas.filter(f).length;
    const atendidas = cnt((c) => c.estado === "atendida");
    const noShow = cnt((c) => c.estado === "no_show");
    const perdidas = cnt((c) => PERDIDA.includes(c.estado));
    const programadas = cnt((c) => PROGRAMADA.includes(c.estado));
    const cerradas = atendidas + noShow;
    return { total: filas.length, atendidas, noShow, perdidas, programadas, asistencia: cerradas ? Math.round((atendidas / cerradas) * 100) : null };
  }, [filas]);

  const porDoctor = useMemo(() => {
    const m = new Map();
    filas.forEach((c) => { const key = c.medico; const x = m.get(key) || { medico: key, total: 0, atendidas: 0, noShow: 0, programadas: 0 }; x.total++; if (c.estado === "atendida") x.atendidas++; if (c.estado === "no_show") x.noShow++; if (PROGRAMADA.includes(c.estado)) x.programadas++; m.set(key, x); });
    return [...m.values()].sort((a, b) => b.total - a.total);
  }, [filas]);
  const maxDoc = Math.max(1, ...porDoctor.map((d) => d.total));

  const badge = (e) => { const b = ESTADO_BADGE[e] || { l: e, bg: "var(--dc-bg)", fg: "var(--dc-ink-500)" }; return <span className="dc-pill" style={{ background: b.bg, color: b.fg }}>{b.l}</span>; };
  const exportar = () => exportarExcel({
    nombreArchivo: `citas_${rango.desde}_${rango.hasta}.xlsx`, hoja: "Citas", titulo: `Consolidado de citas${sede !== "all" ? ` · ${nombreSede(sede)}` : ""} — ${fechaLegible(rango.desde)} al ${fechaLegible(rango.hasta)}`,
    columnas: [{ key: "fecha", label: "Fecha", w: 12 }, { key: "hora", label: "Hora", w: 8 }, { key: "paciente", label: "Paciente", w: 26 }, { key: "medico", label: "Doctor", w: 24 }, { key: "motivo", label: "Motivo", w: 26 }, { key: "estadoL", label: "Estado", w: 14 }, { key: "sedeNombre", label: "Sede", w: 16 }],
    filas: filas.map((c) => ({ ...c, estadoL: (ESTADO_BADGE[estadoCita(c)] || {}).l || c.estado })),
  }).catch(() => notify("No se pudo generar el Excel."));

  const KPIS = [
    ["Total", k.total, CalendarRange, "#0E9199", `${fechaLegible(rango.desde)}${rango.hasta !== rango.desde ? ` – ${fechaLegible(rango.hasta)}` : ""}`],
    ["Programadas", k.programadas, Clock, "#2563EB", "Pendientes o confirmadas"],
    ["Atendidas", k.atendidas, CheckCircle2, "#16A36A", k.asistencia == null ? "Sin citas cerradas" : `${k.asistencia}% de asistencia`],
    ["No asistió", k.noShow, UserX, "#D97706", "Para reprogramar"],
    ["Canceladas", k.perdidas, XCircle, "#E0694F", "Incluye reprogramadas"],
  ];

  return (
    <div className="dc-cons">
      <section className="dc-cons__hero">
        <div>
          <span className="dc-cons__ico"><CalendarRange size={22} strokeWidth={1.9} /></span>
          <div><h2>Consolidado de citas</h2><p>{esMedico ? "Tus citas en el rango elegido" : sede !== "all" ? `Citas de ${nombreSede(sede)} en el rango elegido` : global ? "Todas las citas de la clínica en el rango elegido" : "Citas de tus sedes en el rango elegido"}</p></div>
        </div>
        <div className="dc-cons__rango">
          <div className="dc-moneda-sel" role="radiogroup" aria-label="Rango">
            {[["hoy", "Hoy"], ["semana", "Semana"], ["mes", "Mes"], ["30", "30 días"]].map(([id, l]) => <button key={id} type="button" role="radio" aria-checked={preset === id} className={preset === id ? "is-on" : ""} onClick={() => aplicarPreset(id)}>{l}</button>)}
          </div>
          <label><span>Desde</span><input type="date" value={rango.desde} max={rango.hasta} onChange={(e) => { setPreset("x"); setRango({ ...rango, desde: e.target.value }); }} /></label>
          <label><span>Hasta</span><input type="date" value={rango.hasta} min={rango.desde} onChange={(e) => { setPreset("x"); setRango({ ...rango, hasta: e.target.value }); }} /></label>
          {/* GLO-04: se exporta desde la barra de la tabla (lo filtrado). */}
        </div>
        <dl className="dc-cons__cifras">
          {KPIS.map(([l, v, , c, s]) => (
            <div key={l} style={{ "--c": c }} title={s}><dt>{l}</dt><dd>{cargando ? "…" : v}</dd></div>
          ))}
        </dl>
      </section>


      {/* AGE-07: la vista Lista es solo filtros, conteo y tabla. Citas por doctor está en
          el Panel y la Ocupación de sillones en Reportes. */}

      {filas.length === 0 ? (
        <Card><Vacio icon={<CalendarDays size={24} strokeWidth={1.75} />} titulo={cargando ? "Cargando citas…" : "Sin citas en el rango"} sub="Cambia las fechas para ver otro periodo." /></Card>
      ) : (
        <ListaFiltrable rows={filas} sub="citas" vistaClave="citas_consolidado"
          exportTitulo={`Consolidado de citas${rol === "medico" && usuario?.nombre ? ` · ${usuario.nombre}` : ""}${sede !== "all" ? ` · ${nombreSede(sede)}` : ""} — ${fechaLegible(rango.desde)} al ${fechaLegible(rango.hasta)}`}
          vistas={[{ id: "dia", label: "Por día", icon: CalendarDays }]}
          tabla={{ primero: true, minWidth: 860, onRowClick: onAbrirCita, cols: [
            { key: "f", label: "Fecha", w: "120px", cell: (c) => <span className="dc-tp__num">{fechaLegible(c.fecha)}</span> },
            { key: "h", label: "Hora", w: "70px", cell: (c) => <span className="dc-tp__num">{c.hora}</span> },
            { key: "p", label: "Paciente", w: "minmax(170px,1.2fr)", get: (c) => c.paciente, cell: (c) => <PersonaCelda nombre={c.paciente} /> },
            { key: "m", label: "Motivo", w: "minmax(150px,1.1fr)", get: (c) => c.motivo || "—" },
            ...(esMedico ? [] : [{ key: "d", label: "Doctor", w: "minmax(150px,1fr)", get: (c) => c.medico }]),
            { key: "s", label: "Sede", w: "130px", get: (c) => c.sedeNombre },
            { key: "e", label: "Estado", w: "130px", a: "center", cell: (c) => badge(estadoCita(c)) },
          ] }}
          cols={[
            { key: "fecha", label: "Fecha", get: (c) => c.fecha },
            { key: "hora", label: "Hora", get: (c) => c.hora },
            { key: "paciente", label: "Paciente", get: (c) => c.paciente },
            ...(esMedico ? [] : [{ key: "medico", label: "Doctor", get: (c) => c.medico }]),
            { key: "estado", label: "Estado", get: (c) => (ESTADO_BADGE[estadoCita(c)] || {}).l || c.estado },
            { key: "sede", label: "Sede", get: (c) => c.sedeNombre },
          ]}>
          {(lista, vista) => {
            const clave = vista === "doctor" ? (c) => c.medico : (c) => c.fecha;
            const grupos = [];
            lista.forEach((c) => { const g = clave(c); let x = grupos.find((y) => y.g === g); if (!x) { x = { g, items: [] }; grupos.push(x); } x.items.push(c); });
            return (
              <div className="dc-cons__grupos">
                {grupos.map(({ g, items }) => {
                  const at = items.filter((c) => c.estado === "atendida").length;
                  return (
                    <Card key={g} className="dc-cons__grupo">
                      <header>
                        {vista === "doctor" ? <PersonaCelda nombre={g} size={32} /> : <div className="dc-cons__fecha"><b>{fechaLegible(g)}</b>{g === fmt(hoy) && <span>Hoy</span>}</div>}
                        <span className="dc-cons__gtot"><TrendingUp size={13} strokeWidth={2} /> {items.length} {items.length === 1 ? "cita" : "citas"} · {at} atendidas</span>
                      </header>
                      <ul>
                        {items.map((c) => (
                          <li key={c.id} onClick={onAbrirCita ? () => onAbrirCita(c) : undefined} className={onAbrirCita ? "is-link" : ""}>
                            <span className="dc-cons__hora">{vista === "doctor" ? <><b>{c.hora}</b><small>{fechaLegible(c.fecha)}</small></> : <b>{c.hora}</b>}</span>
                            <span className="dc-cons__dot" style={{ background: colorDe(c.paciente) }} />
                            <div><b>{c.paciente}</b><small>{c.motivo || "Consulta"}{vista !== "doctor" && !esMedico ? ` · ${c.medico}` : ""}</small></div>
                            {badge(estadoCita(c))}
                          </li>
                        ))}
                      </ul>
                    </Card>
                  );
                })}
              </div>
            );
          }}
        </ListaFiltrable>
      )}
    </div>
  );
}

function addDaysD(d, n) { const x = new Date(d); x.setDate(x.getDate() + n); return x; }
