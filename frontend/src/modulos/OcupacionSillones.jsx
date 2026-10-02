/* Ocupación de sillones por semana (Panel gerencial): minutos agendados sobre las horas
   que abre la sede, por sillón y por día. Sirve para ver qué sillón o qué día sobra y
   dónde conviene mover doctores o abrir más cupos. */
import React, { useContext, useEffect, useMemo, useState } from "react";
import { Armchair, ChevronLeft, ChevronRight, Clock, Info, Send } from "lucide-react";
import api, { auth } from "../api/client";
import { DatosDemoCtx, ESPECIALIDADES, MEDICOS, fmt, horarioDeSede, jornadaClinica, mismaSede, nombreSede, toMin } from "../comun";
import { useReglasAgenda } from "../compartido/useReglasAgenda";
import { etiquetaUso } from "../compartido/sillones";

const DIAS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const INACTIVAS = ["cancelada", "no_show", "reprogramada", "cerrada_sistema"];

export function useOcupacionSillones(off = 0, sedesVisibles = null) {
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
  const sillones = (reglas.sillones || []).filter((s) => s.activo !== false && (!sedesVisibles || sedesVisibles.some((v) => mismaSede(v, s.sede))));

  const datos = useMemo(() => {
    const capDia = (sede, fecha) => {
      const j = jornadaClinica(horarioDeSede(hor.horario || {}, sede), hor.feriados || [], fecha);
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

const horas = (min) => { const h = Math.round((min / 60) * 10) / 10; return Number.isInteger(h) ? String(h) : h.toFixed(1).replace(".", ","); };

/* Anillo con el % de la semana (conic-gradient, sin librerías). */
function Anillo({ pct, size = 44 }) {
  const p = pct == null ? 0 : Math.max(0, Math.min(100, pct));
  return (
    <span className={`dc-ocz__ring${pct != null && pct >= 85 ? " is-full" : ""}`} style={{ "--p": p, width: size, height: size }} aria-hidden="true">
      <b>{pct == null ? "—" : `${pct}%`}</b>
    </span>
  );
}

export default function OcupacionSillones({ sedes: sedesVer = null }) {
  const [off, setOff] = useState(0);
  const { conectado, sillones, dias, datos } = useOcupacionSillones(off, sedesVer);
  const conPct = datos.filas.filter((f) => f.pct != null);
  const sedes = [...new Set(sillones.map((s) => String(s.sede)))];
  const nomSede = (id) => { const n = nombreSede(/^\d+$/.test(String(id)) ? Number(id) : id); return n && n !== "—" ? n : "Sede"; };
  const corta = (id) => nomSede(id).replace(/^Sede\s+/i, "");
  const masLibre = [...conPct].sort((a, b) => a.pct - b.pct)[0];
  const diaLleno = [...datos.porDia].filter((d) => d.pct != null).sort((a, b) => b.pct - a.pct)[0];
  const horasLibres = Math.round((datos.cap - datos.min) / 60);
  const rango = `${dias[0].split("-").reverse().slice(0, 2).join("/")} – ${dias[5].split("-").reverse().slice(0, 2).join("/")}`;
  const hoyF = fmt(new Date());
  const usoTxt = (s) => { try { return etiquetaUso(s, { medicos: MEDICOS, especialidades: ESPECIALIDADES })?.txt || "Flexible"; } catch (e) { return "Flexible"; } };
  // Los tres sillón-día (de hoy en adelante) con más horas libres: lo primero que ofrecer.
  const huecos = datos.filas.flatMap((f) => f.celdas.map((c, i) => ({ k: `${f.s.id}-${c.fecha}`, sillon: f.s.nombre, sede: sedes.length > 1 ? corta(f.s.sede) : "", dia: `${DIAS[i]} ${c.fecha.slice(8)}`, fecha: c.fecha, libres: (c.cap - c.min) / 60, pct: c.pct })))
    .filter((h) => h.fecha >= hoyF && h.libres > 0).sort((a, b) => b.libres - a.libres).slice(0, 3);
  if (!sillones.length) return null;
  const tonoCelda = (p) => (p == null ? "is-na" : p === 0 ? "is-cero" : p >= 85 ? "is-full" : p >= 60 ? "is-alta" : p >= 30 ? "is-media" : "is-baja");
  return (
    <section className="dc-ocs dc-ocs--rep" aria-label="Ocupación de sillones">
      {/* Misma franja que el resto de pantallas: cifra principal, cifras con punto y acción. */}
      <section className="dc-esp-hero dc-ocs-hero">
        <div className="dc-esp-hero__txt">
          <div className="dc-esp-hero__num"><b>{datos.pct ?? "—"}%</b><span>ocupación {off === 0 ? "de esta semana" : off === 1 ? "de la próxima semana" : off === -1 ? "de la semana pasada" : `de la semana del ${rango.split(" – ")[0]}`}</span></div>
          <p>Horas agendadas sobre las horas que abre cada sede · {rango}</p>
        </div>
        <div className="dc-esp-hero__cifras">
          <div><b>{horasLibres} h</b><span>Libres en sillón</span></div>
          {masLibre && <div><b>{masLibre.s.nombre}{sedes.length > 1 ? ` · ${corta(masLibre.s.sede)}` : ""}</b><span>Más libre · {masLibre.pct}%</span></div>}
          {diaLleno && <div><b>{DIAS[datos.porDia.indexOf(diaLleno)]} {diaLleno.fecha.slice(8)}</b><span>Día más lleno · {diaLleno.pct}%</span></div>}
        </div>
        <span />
        <div className="dc-ocs__nav dc-ocs__nav--hero">
          <button type="button" aria-label="Semana anterior" onClick={() => setOff(off - 1)}><ChevronLeft size={15} strokeWidth={2} /></button>
          {/* Dice qué semana se ve; fuera de la actual, un clic vuelve a esta semana. */}
          <button type="button" className={off === 0 ? "is-on" : "is-otra"} onClick={() => setOff(0)} title={off === 0 ? "Semana actual" : "Volver a esta semana"}>{off === 0 ? "Esta semana" : <>{rango}<small>Volver a hoy</small></>}</button>
          <button type="button" aria-label="Semana siguiente" onClick={() => setOff(off + 1)}><ChevronRight size={15} strokeWidth={2} /></button>
        </div>
      </section>

      {/* Una tarjeta por sede: cada celda se llena desde abajo según lo agendado. */}
      {sedes.map((sd) => {
        const filas = datos.filas.filter((f) => String(f.s.sede) === sd);
        const cap = filas.reduce((a, f) => a + f.cap, 0), min = filas.reduce((a, f) => a + f.min, 0);
        const pctS = cap ? Math.round((min / cap) * 100) : null;
        const porDia = dias.map((fecha, i) => { const c = filas.reduce((a, f) => a + f.celdas[i].cap, 0), m = filas.reduce((a, f) => a + f.celdas[i].min, 0); return { fecha, cap: c, min: m, pct: c ? Math.round((m / c) * 100) : null }; });
        return (
          <article key={sd} className="dc-ocz">
            <header className="dc-ocz__cab">
              <Anillo pct={pctS} size={48} />
              <div className="dc-ocz__tit">
                <h3>{nomSede(sd)}</h3>
                <span>{filas.length} {filas.length === 1 ? "sillón" : "sillones"} · {horas(min)} h agendadas de {horas(cap)} h</span>
              </div>
              <span className="dc-ocz__libre"><Clock size={14} strokeWidth={2} /><b>{Math.round((cap - min) / 60)} h</b> libres {off === 0 ? "esta semana" : "esa semana"}</span>
            </header>
            <div className="dc-ocz__scroll">
              <div className="dc-ocz__grid" role="table" aria-label={`Ocupación ${nomSede(sd)}`} style={{ "--dias": dias.length }}>
                <div className="dc-ocz__fila is-cab" role="row">
                  <span role="columnheader">Sillón</span>
                  {dias.map((f, i) => <span key={f} role="columnheader" className={f === hoyF ? "is-hoy" : ""}><small>{f === hoyF ? "Hoy" : DIAS[i]}</small><b>{f.slice(8)}</b></span>)}
                  <span role="columnheader">Semana</span>
                </div>
                {filas.map((f) => (
                  <div key={f.s.id} className="dc-ocz__fila" role="row">
                    <span role="cell" className="dc-ocz__nom"><span className="dc-ocz__ico"><Armchair size={15} strokeWidth={1.9} /></span><span><b>{f.s.nombre}</b><small>{usoTxt(f.s)}</small></span></span>
                    {f.celdas.map((c) => (
                      <span key={c.fecha} role="cell" className={`dc-ocz__c ${tonoCelda(c.pct)}${c.fecha === hoyF ? " is-hoy" : ""}`}
                            style={c.pct == null ? undefined : { "--p": `${c.pct}%` }}
                            title={c.pct == null ? "Cerrado" : `${horas(c.min)} h agendadas de ${horas(c.cap)} h · ${horas(c.cap - c.min)} h libres`}>
                        {c.pct == null ? <small>Cerrado</small> : c.pct === 0 ? <><b>Libre</b><small>{horas(c.cap)} h</small></> : <><b>{c.pct}%</b><small>{horas(c.min)} de {horas(c.cap)} h</small></>}
                      </span>
                    ))}
                    <span role="cell" className="dc-ocz__sem"><Anillo pct={f.pct} size={38} /><small>{horas(f.cap - f.min)} h<br />libres</small></span>
                  </div>
                ))}
                <div className="dc-ocz__fila is-tot" role="row">
                  <span role="cell">Total del día</span>
                  {porDia.map((d) => <span key={d.fecha} role="cell" className={`${d.fecha === hoyF ? "is-hoy" : ""}`}>{d.pct == null ? "—" : <><b>{d.pct}%</b><i><u style={{ width: `${d.pct}%` }} /></i></>}</span>)}
                  <span role="cell"><b>{pctS ?? "—"}%</b></span>
                </div>
              </div>
            </div>
          </article>
        );
      })}

      <div className="dc-ocz__pie">
        {huecos.length > 0 && (
          <section className="dc-ocz__huecos" aria-label="Huecos para llenar">
            <header>
              <div><h3>Huecos para llenar</h3><span>Los sillones con más horas libres de hoy en adelante.</span></div>
              <button type="button" onClick={() => { window.location.hash = "#/espera"; }}><Send size={13} strokeWidth={2} /> Ofrecer a la lista de espera</button>
            </header>
            <div className="dc-ocz__hlist">
              {huecos.map((h) => (
                <div key={h.k} className="dc-ocz__h">
                  <span className="dc-ocz__hdia"><small>{h.dia.split(" ")[0]}</small><b>{h.dia.split(" ")[1]}</b></span>
                  <span className="dc-ocz__htxt"><b>{h.sillon}</b><small>{h.sede ? `${h.sede} · ` : ""}{h.pct ?? 0}% ocupado</small></span>
                  <span className="dc-ocz__hh"><b>{horas(h.libres * 60)} h</b><small>libres</small></span>
                </div>
              ))}
            </div>
          </section>
        )}
        <aside className="dc-ocz__guia">
          <h3>Cómo leerlo</h3>
          <div className="dc-ocz__ley" aria-label="Escala">
            <span><i className="is-cero" />Sin citas</span>
            <span><i className="is-baja" />Menos de 30 %</span>
            <span><i className="is-media" />30 a 59 %</span>
            <span><i className="is-alta" />60 a 84 %</span>
            <span><i className="is-full" />85 % o más</span>
            <span><i className="is-na" />Cerrado</span>
          </div>
          <p><Info size={13} strokeWidth={2} /> Bajo 30 % conviene ofrecer esos cupos (recordatorios, lista de espera) o asignar el sillón a otro doctor. Sobre 85 % hay riesgo de demoras.</p>
        </aside>
      </div>
    </section>
  );
}

/* Tarjeta compacta para el Panel gerencial: solo el dato y el enlace al detalle en la Agenda. */
export function ResumenOcupacion({ onVer, variante, sedes = null }) {
  const { sillones, datos } = useOcupacionSillones(0, sedes);
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
