/* Ocupación de sillones por semana (Panel gerencial): minutos agendados sobre las horas
   que abre la sede, por sillón y por día. Sirve para ver qué sillón o qué día sobra y
   dónde conviene mover doctores o abrir más cupos. */
import React, { useContext, useEffect, useMemo, useState } from "react";
import { Armchair, ChevronLeft, ChevronRight, Clock, Info, Send } from "lucide-react";
import api, { auth } from "../api/client";
import { DatosDemoCtx, ESPECIALIDADES, MEDICOS, fmt, horarioDeSede, jornadaClinica, nombreSede, toMin } from "../comun";
import { useReglasAgenda } from "../compartido/useReglasAgenda";
import { etiquetaUso } from "../compartido/sillones";

const DIAS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const INACTIVAS = ["cancelada", "no_show", "reprogramada", "cerrada_sistema"];
const tono = (p) => p == null ? "is-na" : p === 0 ? "is-cero" : p >= 85 ? "is-full" : p >= 60 ? "is-alta" : p >= 30 ? "is-media" : "is-baja";

export function useOcupacionSillones(off = 0) {
  const conectado = !!auth.token;
  const demoDb = useContext(DatosDemoCtx);
  const reglas = useReglasAgenda();
  const [remotas, setRemotas] = useState([]);
  const [horario, setHorario] = useState({ horario: {}, feriados: [] });
  const lunes = useMemo(() => { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - ((d.getDay() + 6) % 7) + off * 7); return d; }, [off]);
  const dias = useMemo(() => DIAS.map((_, i) => { const d = new Date(lunes); d.setDate(d.getDate() + i); return fmt(d); }), [lunes]);
  useEffect(() => {
    if (!conectado) return;
    api.citas.listar(null, dias[0], dias[5]).then((r) => setRemotas((r || []).map((c) => ({ ...c, sede: c.sedeId ?? c.sede, hora: String(c.hora || "").slice(0, 5) })))).catch(() => setRemotas([]));
    api.clinica.get().then((r) => setHorario({ horario: r?.horario || {}, feriados: r?.feriados || [] })).catch(() => {});
  }, [conectado, dias]);
  const citas = conectado ? remotas : (demoDb?.citas || []);
  const hor = conectado ? horario : (demoDb?.horarioClinica || horario);
  const sillones = (reglas.sillones || []).filter((s) => s.activo !== false);

  const datos = useMemo(() => {
    const capDia = (sede, fecha) => {
      const j = jornadaClinica(horarioDeSede(hor.horario || {}, typeof sede === "number" ? sede : null), hor.feriados || [], fecha);
      if (!j.abierta) return 0;
      return Math.max(0, toMin(j.cierra || "19:00") - toMin(j.abre || "09:00"));
    };
    const filas = sillones.map((s) => {
      const celdas = dias.map((fecha) => {
        const cap = capDia(s.sede, fecha);
        const min = citas.filter((c) => c.fecha === fecha && !INACTIVAS.includes(c.estado) && String(c.sede) === String(s.sede) && String(c.sillon) === String(s.numero)).reduce((a, c) => a + (Number(c.duracionMin) || 30), 0);
        return { fecha, cap, min, pct: cap ? Math.min(100, Math.round(min / cap * 100)) : null };
      });
      const cap = celdas.reduce((a, c) => a + c.cap, 0), min = celdas.reduce((a, c) => a + c.min, 0);
      return { s, celdas, cap, min, pct: cap ? Math.round(min / cap * 100) : null };
    });
    const porDia = dias.map((fecha, i) => { const cap = filas.reduce((a, f) => a + f.celdas[i].cap, 0), min = filas.reduce((a, f) => a + f.celdas[i].min, 0); return { fecha, cap, min, pct: cap ? Math.round(min / cap * 100) : null }; });
    const cap = filas.reduce((a, f) => a + f.cap, 0), min = filas.reduce((a, f) => a + f.min, 0);
    return { filas, porDia, cap, min, pct: cap ? Math.round(min / cap * 100) : null };
  }, [sillones, dias, citas, hor]);

  return { conectado, sillones, dias, datos };
}

export default function OcupacionSillones() {
  const [off, setOff] = useState(0);
  const { conectado, sillones, dias, datos } = useOcupacionSillones(off);
  const conPct = datos.filas.filter((f) => f.pct != null);
  const masLibre = [...conPct].sort((a, b) => a.pct - b.pct)[0];
  const diaLleno = [...datos.porDia].filter((d) => d.pct != null).sort((a, b) => b.pct - a.pct)[0];
  const horasLibres = Math.round((datos.cap - datos.min) / 60);
  const sedes = [...new Set(sillones.map((s) => String(s.sede)))];
  const nomSede = (id) => (conectado ? "" : nombreSede(Number(id))) || "Sede";
  const rango = `${dias[0].split("-").reverse().slice(0, 2).join("/")} – ${dias[5].split("-").reverse().slice(0, 2).join("/")}`;

  const hoyF = fmt(new Date());
  const usoTxt = (s) => { try { return etiquetaUso(s, { medicos: MEDICOS, especialidades: ESPECIALIDADES })?.txt || "Flexible"; } catch (e) { return "Flexible"; } };
  // Los tres sillón-día (de hoy en adelante) con más horas libres: lo primero que ofrecer.
  const huecos = datos.filas.flatMap((f) => f.celdas.map((c, i) => ({ k: `${f.s.id}-${c.fecha}`, sillon: `${f.s.nombre}${sedes.length > 1 ? ` (${nomSede(f.s.sede).replace(/^Sede\s+/i, "")})` : ""}`, dia: `${DIAS[i]} ${c.fecha.slice(8)}`, fecha: c.fecha, libres: Math.round(((c.cap - c.min) / 60) * 10) / 10 })))
    .filter((h) => h.fecha >= hoyF && h.libres > 0).sort((a, b) => b.libres - a.libres).slice(0, 3);
  if (!sillones.length) return null;
  return (
    <section className="dc-ocs dc-ocs--rep" aria-label="Ocupación de sillones">
      {/* Misma franja que el resto de pantallas: cifra principal, cifras con punto y acción. */}
      <section className="dc-esp-hero dc-ocs-hero">
        <div className="dc-esp-hero__txt">
          <div className="dc-esp-hero__num"><b>{datos.pct ?? "—"}%</b><span>ocupación de la semana</span></div>
          <p>Minutos agendados sobre las horas que abre cada sede · {rango}</p>
        </div>
        <div className="dc-esp-hero__cifras">
          <div><b>{horasLibres} h</b><span>Horas libres en sillón</span></div>
          {masLibre && <div><b>{masLibre.s.nombre}</b><span>Más libre · {masLibre.pct}%</span></div>}
          {diaLleno && <div><b>{DIAS[datos.porDia.indexOf(diaLleno)]} {diaLleno.fecha.slice(8)}</b><span>Día más lleno · {diaLleno.pct}%</span></div>}
        </div>
        <span />
        <div className="dc-ocs__nav dc-ocs__nav--hero">
          <button type="button" aria-label="Semana anterior" onClick={() => setOff(off - 1)}><ChevronLeft size={15} strokeWidth={2} /></button>
          <button type="button" className={off === 0 ? "is-on" : ""} onClick={() => setOff(0)}>Esta semana</button>
          <button type="button" aria-label="Semana siguiente" onClick={() => setOff(off + 1)}><ChevronRight size={15} strokeWidth={2} /></button>
        </div>
      </section>
      {/* Una tarjeta por sede: mapa de calor por sillón y día, y la semana como barra. */}
      {sedes.map((sd) => {
        const filas = datos.filas.filter((f) => String(f.s.sede) === sd);
        const cap = filas.reduce((a, f) => a + f.cap, 0), min = filas.reduce((a, f) => a + f.min, 0);
        const pctS = cap ? Math.round((min / cap) * 100) : null;
        return (
          <article key={sd} className="dc-ocx">
            <header className="dc-ocx__cab">
              <h3>{nomSede(sd)}</h3>
              <span className="dc-ocx__pill">{pctS ?? "—"}% ocupado</span>
              <span className="dc-ocx__libre"><Clock size={13} strokeWidth={2} /> {Math.round((cap - min) / 60)} h libres esta semana</span>
            </header>
            <div className="dc-ocx__grid" role="table" aria-label={`Ocupación ${nomSede(sd)}`}>
              <div className="dc-ocx__fila is-cab" role="row">
                <span role="columnheader">Sillón</span>
                {dias.map((f, i) => <span key={f} role="columnheader" className={f === hoyF ? "is-hoy" : ""}>{DIAS[i]} <small>{f.slice(8)}</small></span>)}
                <span role="columnheader">Semana</span>
              </div>
              {filas.map((f) => (
                <div key={f.s.id} className="dc-ocx__fila" role="row">
                  <span role="cell" className="dc-ocx__nom"><b>{f.s.nombre}</b><small>{usoTxt(f.s)}</small></span>
                  {f.celdas.map((c) => (
                    <span key={c.fecha} role="cell" className={`dc-ocx__c${c.pct == null ? " is-na" : ""}${c.pct >= 85 ? " is-full" : c.pct >= 55 ? " is-osc" : ""}${c.pct === 0 ? " is-cero" : ""}${c.fecha === hoyF ? " is-hoy" : ""}`}
                          style={c.pct == null ? undefined : { "--a": `${Math.round(6 + c.pct * 0.8)}%` }}
                          title={c.pct == null ? "Cerrado" : `${Math.round((c.min / 60) * 10) / 10} h ocupadas de ${Math.round(c.cap / 60)} h · ${Math.round(((c.cap - c.min) / 60) * 10) / 10} h libres`}>
                      {c.pct == null ? "Cerrado" : <><b>{c.pct === 0 ? "Libre" : `${c.pct}%`}</b><small>{Math.round(((c.cap - c.min) / 60) * 10) / 10} h libres</small></>}
                    </span>
                  ))}
                  <span role="cell" className="dc-ocx__sem">
                    <i><u style={{ width: `${f.pct || 0}%` }} /></i>
                    <b>{f.pct ?? "—"}%</b>
                  </span>
                </div>
              ))}
            </div>
          </article>
        );
      })}
      <div className="dc-ocx__pie">
        <div className="dc-ocx__ley" aria-label="Escala">
          <span><i className="is-na" />Cerrado</span>
          <span><i style={{ "--a": "8%" }} />Libre</span>
          <span><i style={{ "--a": "40%" }} />Media</span>
          <span><i style={{ "--a": "75%" }} />Alta</span>
          <span><i className="is-full" />Saturado (85 % o más)</span>
        </div>
        {huecos.length > 0 && (
          <div className="dc-ocx__huecos">
            <b>Huecos para vender</b>
            {huecos.map((h) => <span key={h.k}>{h.sillon} · {h.dia} · {h.libres} h</span>)}
            <button type="button" onClick={() => { window.location.hash = "#/espera"; }}><Send size={13} strokeWidth={2} /> Ofrecer a la lista de espera</button>
          </div>
        )}
      </div>
      <p className="dc-ocs__nota"><Info size={13} strokeWidth={2} /> Bajo 30 % conviene ofrecer esos cupos (recordatorios, lista de espera) o asignar ese sillón a otro doctor; sobre 85 % hay riesgo de demoras.</p>
    </section>
  );
}

/* Tarjeta compacta para el Panel gerencial: solo el dato y el enlace al detalle en la Agenda. */
export function ResumenOcupacion({ onVer, variante }) {
  const { sillones, datos } = useOcupacionSillones(0);
  if (!sillones.length) return null;
  const libres = Math.round((datos.cap - datos.min) / 60);
  if (variante === "hoy") return (
    <div className="dc-hoy__t" role="button" tabIndex={0} onClick={onVer}>
      <span className="dc-hoy__ico" style={{ background: "#EFEAFE", color: "#6D4FD1" }} aria-hidden="true"><Armchair size={16} strokeWidth={2} /></span>
      <div className="dc-hoy__tb">
        <div className="dc-hoy__tl">Ocupación de sillones · semana</div>
        <div className="dc-hoy__tv">{datos.pct ?? 0}%</div>
        <div className="dc-hoy__ts">{libres} h libres en {sillones.length} sillones</div>
      </div>
    </div>
  );
  return (
    <div className="dc-kpi dc-kpi--ocs">
      <span className="dc-kpi__icon" style={{ background: "#EFEAFE", color: "#6D4FD1" }} aria-hidden="true"><Armchair size={16} strokeWidth={2} /></span>
      <div className="dc-kpi__body">
        <div className="dc-kpi__label">Ocupación de sillones · semana</div>
        <div className="dc-kpi__value">{datos.pct ?? 0}%</div>
        <div className="dc-kpi__sub">{sillones.length} sillones · {libres} h libres{onVer && <> · <button type="button" className="dc-kpi__link" onClick={onVer}>Ver detalle</button></>}</div>
      </div>
    </div>
  );
}
