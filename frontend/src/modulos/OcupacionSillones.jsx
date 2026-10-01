/* Ocupación de sillones por semana (Panel gerencial): minutos agendados sobre las horas
   que abre la sede, por sillón y por día. Sirve para ver qué sillón o qué día sobra y
   dónde conviene mover doctores o abrir más cupos. */
import React, { useContext, useEffect, useMemo, useState } from "react";
import { Armchair, ChevronLeft, ChevronRight, Info } from "lucide-react";
import api, { auth } from "../api/client";
import { DatosDemoCtx, fmt, horarioDeSede, jornadaClinica, nombreSede, toMin } from "../comun";
import { useReglasAgenda } from "../compartido/useReglasAgenda";

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

  if (!sillones.length) return null;
  return (
    <section className="dc-ocs" aria-label="Ocupación de sillones">
      <header className="dc-ocs__cab">
        <span className="dc-ocs__ico"><Armchair size={18} strokeWidth={2} /></span>
        <div><h3>Ocupación de sillones</h3><span>Minutos agendados sobre las horas que abre cada sede · {rango}</span></div>
        <div className="dc-ocs__nav">
          <button type="button" aria-label="Semana anterior" onClick={() => setOff(off - 1)}><ChevronLeft size={15} strokeWidth={2} /></button>
          <button type="button" className={off === 0 ? "is-on" : ""} onClick={() => setOff(0)}>Esta semana</button>
          <button type="button" aria-label="Semana siguiente" onClick={() => setOff(off + 1)}><ChevronRight size={15} strokeWidth={2} /></button>
        </div>
      </header>
      <div className="dc-ocs__kpis">
        <div><small>Ocupación de la semana</small><b>{datos.pct ?? "—"}%</b><i><u style={{ width: `${datos.pct || 0}%` }} /></i></div>
        <div><small>Horas libres en sillón</small><b>{horasLibres} h</b><em>cupos que se pueden llenar</em></div>
        {masLibre && <div><small>Sillón más libre</small><b>{masLibre.s.nombre}</b><em>{nomSede(masLibre.s.sede)} · {masLibre.pct}%</em></div>}
        {diaLleno && <div><small>Día más lleno</small><b>{DIAS[datos.porDia.indexOf(diaLleno)]} {diaLleno.fecha.slice(8)}</b><em>{diaLleno.pct}% de ocupación</em></div>}
      </div>
      <div className="dc-ocs__tabla" role="table" aria-label="Ocupación por sillón y día">
        <div className="dc-ocs__fila is-cab" role="row"><span role="columnheader">Sillón</span>{dias.map((f, i) => <span key={f} role="columnheader">{DIAS[i]} <small>{f.slice(8)}</small></span>)}<span role="columnheader">Semana</span></div>
        {sedes.map((sd) => (
          <React.Fragment key={sd}>
            {sedes.length > 1 && <div className="dc-ocs__sede" role="row"><span role="cell">{nomSede(sd)}</span></div>}
            {datos.filas.filter((f) => String(f.s.sede) === sd).map((f) => (
              <div key={f.s.id} className="dc-ocs__fila" role="row">
                <span role="cell" className="dc-ocs__nom">{f.s.nombre}</span>
                {f.celdas.map((c) => <span key={c.fecha} role="cell" className={`dc-ocs__c ${tono(c.pct)}`} title={c.pct == null ? "Cerrado" : `${Math.round(c.min / 60 * 10) / 10} h de ${Math.round(c.cap / 60)} h`}>{c.pct == null ? "—" : `${c.pct}%`}</span>)}
                <span role="cell" className={`dc-ocs__c is-tot ${tono(f.pct)}`}>{f.pct == null ? "—" : `${f.pct}%`}</span>
              </div>
            ))}
          </React.Fragment>
        ))}
        <div className="dc-ocs__fila is-pie" role="row"><span role="cell">Total</span>{datos.porDia.map((d) => <span key={d.fecha} role="cell" className={`dc-ocs__c ${tono(d.pct)}`}>{d.pct == null ? "—" : `${d.pct}%`}</span>)}<span role="cell" className={`dc-ocs__c is-tot ${tono(datos.pct)}`}>{datos.pct ?? "—"}%</span></div>
      </div>
      <p className="dc-ocs__nota"><Info size={13} strokeWidth={2} /> Bajo 30 % conviene ofrecer esos cupos (recall, lista de espera) o asignar ese sillón a otro doctor; sobre 85 % hay riesgo de demoras.</p>
    </section>
  );
}

/* Tarjeta compacta para el Panel gerencial: solo el dato y el enlace al detalle en la Agenda. */
export function ResumenOcupacion({ onVer }) {
  const { sillones, datos } = useOcupacionSillones(0);
  if (!sillones.length) return null;
  const libres = Math.round((datos.cap - datos.min) / 60);
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
