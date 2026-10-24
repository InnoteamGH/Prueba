/* Ocupación de sillones por semana (Panel gerencial): minutos agendados sobre las horas
   que abre la sede, por sillón y por día. Sirve para ver qué sillón o qué día sobra y
   dónde conviene mover doctores o abrir más cupos. */
import React, { useContext, useEffect, useMemo, useState } from "react";
import { Armchair, ChevronLeft, ChevronRight, Clock, Info, Send } from "lucide-react";
import api, { auth } from "../api/client";
import { BotonExportar, DatosDemoCtx, ESPECIALIDADES, MEDICOS, fechaLegible, fmt, horarioDeSede, jornadaClinica, mismaSede, nombreSede, toMin } from "../comun";
import { useReglasAgenda } from "../compartido/useReglasAgenda";
import { horarioConfigurado } from "../compartido/horarioReal";
import { etiquetaUso } from "../compartido/sillones";
import { tienePermiso } from "../compartido/permisos";
import NoDisponible from "../ui/NoDisponible";
import { pctTxt, rotuloPeriodo } from "./produccionComisionesUtil";
import "./reportes.css";

// En minúscula, como fechaLegible («vie 23 oct»).
const DIAS = ["lun", "mar", "mié", "jue", "vie", "sáb"];
const INACTIVAS = ["cancelada", "no_show", "reprogramada", "cerrada_sistema"];

export function useOcupacionSillones(off = 0, sedesVisibles = null) {
  const conectado = !!auth.token;
  const demoDb = useContext(DatosDemoCtx);
  const reglas = useReglasAgenda();
  const [remotas, setRemotas] = useState([]);
  const [horario, setHorario] = useState({ horario: {}, feriados: [] });
  const [horarioListo, setHorarioListo] = useState(false);
  // R5-02: sin las citas de la semana la ocupación no es 0 %: es «no disponible».
  const [citasErr, setCitasErr] = useState(false);
  const [nRecarga, setNRecarga] = useState(0);
  const lunes = useMemo(() => { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - ((d.getDay() + 6) % 7) + off * 7); return d; }, [off]);
  const dias = useMemo(() => DIAS.map((_, i) => { const d = new Date(lunes); d.setDate(d.getDate() + i); return fmt(d); }), [lunes]);
  useEffect(() => {
    if (!conectado) return;
    api.citas.listar(null, dias[0], dias[5]).then((r) => { setCitasErr(false); setRemotas((r || []).map((c) => ({ ...c, sede: c.sedeId ?? c.sede, hora: String(c.hora || "").slice(0, 5) }))); }).catch(() => { setCitasErr(true); setRemotas([]); });
    api.clinica.get().then((r) => setHorario({ horario: r?.horario || {}, feriados: r?.feriados || [] })).catch(() => {}).finally(() => setHorarioListo(true));
  }, [conectado, dias, nRecarga]);
  const citas = conectado ? remotas : (demoDb?.citas || []);
  const hor = conectado ? horario : (demoDb?.horarioClinica || horario);
  // Con sesión y sin horario cargado no se supone 09–19: la pantalla lo dice.
  const sinHorario = conectado && horarioListo && !horarioConfigurado(hor.horario);
  const sillones = (reglas.sillones || []).filter((s) => s.activo !== false && (!sedesVisibles || sedesVisibles.some((v) => mismaSede(v, s.sede))));

  const datos = useMemo(() => {
    const capDia = (sede, fecha) => {
      if (conectado && !horarioConfigurado(hor.horario)) return 0;
      const j = jornadaClinica(horarioDeSede(hor.horario || {}, sede), hor.feriados || [], fecha);
      if (!j.abierta) return 0;
      return Math.max(0, toMin(j.cierra || "19:00") - toMin(j.abre || "09:00"));
    };
    const filas = sillones.map((s) => {
      const celdas = dias.map((fecha) => {
        const cap = capDia(s.sede, fecha);
        const min = citas.filter((c) => c.fecha === fecha && !INACTIVAS.includes(c.estado) && mismaSede(c.sede, s.sede) && String(c.sillon) === String(s.numero)).reduce((a, c) => a + (Number(c.duracionMin) || 30), 0);
        return { fecha, cap, min, pct: cap ? Math.min(100, Math.round(min / cap * 100)) : null };
      });
      const cap = celdas.reduce((a, c) => a + c.cap, 0), min = celdas.reduce((a, c) => a + c.min, 0);
      return { s, celdas, cap, min, pct: cap ? Math.round(min / cap * 100) : null };
    });
    // Citas activas sin sillón (o con uno que ya no existe): la IA y muchas altas no lo asignan.
    // Ocupan la sede igual; antes no se contaban y la sede salía en 0 % con citas agendadas.
    const sedesS = [...new Set(sillones.map((s) => String(s.sede)))];
    const sueltasDe = (sd, fecha) => citas.filter((c) => c.fecha === fecha && !INACTIVAS.includes(c.estado) && mismaSede(c.sede, sd) && !sillones.some((s) => mismaSede(s.sede, sd) && String(s.numero) === String(c.sillon)));
    const sinSillon = Object.fromEntries(sedesS.map((sd) => [sd, dias.map((fecha) => sueltasDe(sd, fecha).reduce((a, c) => a + (Number(c.duracionMin) || 30), 0))]));
    const sinSillonN = Object.fromEntries(sedesS.map((sd) => [sd, dias.map((fecha) => sueltasDe(sd, fecha).length)]));
    const sueltoDia = (i) => sedesS.reduce((a, sd) => a + sinSillon[sd][i], 0);
    const porDia = dias.map((fecha, i) => { const cap = filas.reduce((a, f) => a + f.celdas[i].cap, 0), min = filas.reduce((a, f) => a + f.celdas[i].min, 0) + sueltoDia(i); return { fecha, cap, min, pct: cap ? Math.min(100, Math.round(min / cap * 100)) : null }; });
    const cap = filas.reduce((a, f) => a + f.cap, 0), min = porDia.reduce((a, d) => a + d.min, 0);
    return { filas, porDia, cap, min, sinSillon, sinSillonN, pct: cap ? Math.min(100, Math.round(min / cap * 100)) : null };
  }, [sillones, dias, citas, hor]); // eslint-disable-line react-hooks/exhaustive-deps

  // Médicos y especialidades para la etiqueta de uso: los del servidor con sesión.
  return { conectado, sillones, dias, datos, sinHorario, citasErr: conectado && citasErr, recargar: () => setNRecarga((n) => n + 1), medicos: reglas.medicos || [], especialidades: reglas.especialidades || [] };
}

// Punto decimal, como los montos («1.5 h»).
const horas = (min) => { const h = Math.round((min / 60) * 10) / 10; return Number.isInteger(h) ? String(h) : h.toFixed(1); };
// % ocupado: con citas nunca «0%» (se lee «<1%»); sin horas de atención, «—».
const ocupTxt = (min, cap) => (cap ? pctTxt(Math.min(100, (min / cap) * 100)) : "—");
const diaNum = (fecha) => String(Number(fecha.slice(8)));

/* Anillo con el % de la semana (conic-gradient, sin librerías). */
function Anillo({ pct, txt, size = 44 }) {
  const p = pct == null ? 0 : Math.max(0, Math.min(100, pct));
  return (
    <span className={`dc-ocz__ring${pct != null && pct >= 85 ? " is-full" : ""}`} style={{ "--p": p, width: size, height: size }} aria-hidden="true">
      <b>{txt}</b>
    </span>
  );
}

export default function OcupacionSillones({ sedes: sedesVer = null }) {
  const [off, setOff] = useState(0);
  const { conectado, sillones, dias, datos, sinHorario, citasErr, recargar, medicos, especialidades } = useOcupacionSillones(off, sedesVer);
  const conPct = datos.filas.filter((f) => f.pct != null);
  const sedes = [...new Set(sillones.map((s) => String(s.sede)))];
  const nomSede = (id) => { const n = nombreSede(/^\d+$/.test(String(id)) ? Number(id) : id); return n && n !== "—" ? n : "Sede"; };
  const corta = (id) => nomSede(id).replace(/^Sede\s+/i, "");
  const hayCitas = datos.min > 0;
  // «Más libre» y «Día más lleno» solo dicen algo si hay diferencias: sin citas no.
  const masLibre = conPct.some((f) => f.min > 0) ? [...conPct].sort((a, b) => a.min / a.cap - b.min / b.cap)[0] : null;
  const diaLleno = [...datos.porDia].filter((d) => d.cap && d.min > 0).sort((a, b) => b.min / b.cap - a.min / a.cap)[0];
  const horasLibres = Math.max(0, Math.round((datos.cap - datos.min) / 60));
  const semanaTxt = off === 0 ? "esta semana" : "esa semana";
  const rango = rotuloPeriodo(dias[0], dias[5]);
  const hoyF = fmt(new Date());
  // «Flexible» es jerga: un sillón sin doctor ni especialidad fijos no lleva rótulo.
  const usoTxt = (s) => { try { const u = etiquetaUso(s, { medicos: conectado ? medicos : MEDICOS, especialidades: conectado ? especialidades : ESPECIALIDADES }); return u && u.tono !== "flex" ? u.txt : ""; } catch (e) { return ""; } };
  // Los tres sillón-día (de hoy en adelante) con más horas libres: lo primero que ofrecer.
  const huecos = datos.filas.flatMap((f) => f.celdas.map((c, i) => ({ k: `${f.s.id}-${c.fecha}`, sillon: f.s.nombre, sede: sedes.length > 1 ? corta(f.s.sede) : "", diaSem: DIAS[i], fecha: c.fecha, libres: (c.cap - c.min) / 60, min: c.min, cap: c.cap })))
    .filter((h) => h.fecha >= hoyF && h.libres > 0).sort((a, b) => b.libres - a.libres).slice(0, 3);
  if (!sillones.length) return conectado ? <section className="dc-ocs dc-ocs--rep"><p style={{ color: "var(--dc-ink-500)", fontSize: 14 }}>No hay sillones activos registrados en las sedes que se ven. Se dan de alta en Configuración › Sillones.</p></section> : null;
  if (sinHorario) return <section className="dc-ocs dc-ocs--rep"><p style={{ color: "var(--dc-ink-500)", fontSize: 14 }}>La clínica todavía no tiene cargado su horario de atención: sin él no se puede calcular la ocupación. Se configura en Configuración › Horarios.</p></section>;
  if (citasErr) return <section className="dc-ocs dc-ocs--rep"><NoDisponible bloque onReintentar={recargar} texto="Ocupación no disponible" detalle={`No se pudieron leer las citas de la semana (${rango}). Sin ellas la ocupación no es 0%: falta el dato.`} /></section>;
  // H-29: la misma exportación Excel/PDF que el resto de reportes: un sillón por fila, el %
  // de cada día y el total de la semana (números, para poder sumarlos en el Excel).
  const pctExp = (p) => (p == null ? "Cerrado" : `${p}%`);
  const colsExp = [
    ...(sedes.length > 1 ? [{ key: "sede", label: "Sede", get: (f) => nomSede(f.s.sede) }] : []),
    { key: "sillon", label: "Sillón", get: (f) => f.s.nombre },
    { key: "uso", label: "Uso", get: (f) => usoTxt(f.s) || "Cualquier doctor" },
    ...dias.map((fecha, i) => ({ key: `d${i}`, label: fechaLegible(fecha), get: (f) => pctExp(f.celdas[i].pct) })),
    { key: "semana", label: "Semana", get: (f) => pctExp(f.pct) },
    { key: "agendadas", label: "Horas agendadas", get: (f) => Math.round((f.min / 60) * 10) / 10 },
    { key: "libres", label: "Horas libres", get: (f) => Math.round(((f.cap - f.min) / 60) * 10) / 10 },
  ];
  // Una celda sin citas no es «0%»: queda atenuada y sin texto; solo resaltan las ocupadas.
  const tonoCelda = (c) => (c.pct == null ? "is-na" : !c.min ? "is-cero" : c.pct >= 85 ? "is-full" : c.pct >= 60 ? "is-alta" : c.pct >= 30 ? "is-media" : "is-baja");
  return (
    <section className="dc-ocs dc-ocs--rep" aria-label="Ocupación de sillones">
      {/* Misma franja que el resto de pantallas: cifra principal, cifras con punto y acción. */}
      <section className="dc-esp-hero dc-ocs-hero">
        <div className="dc-esp-hero__txt">
          <div className="dc-esp-hero__num"><b>{ocupTxt(datos.min, datos.cap)}</b><span>ocupación {off === 0 ? "de esta semana" : off === 1 ? "de la próxima semana" : off === -1 ? "de la semana pasada" : `de la semana del ${fechaLegible(dias[0])}`}</span></div>
          <p>Horas agendadas sobre las horas que abre cada sede · {rango}</p>
        </div>
        <div className="dc-esp-hero__cifras">
          <div><b>{horasLibres} h</b><span>Libres en sillón</span></div>
          {!hayCitas && <div><b>0</b><span>Citas agendadas {semanaTxt}</span></div>}
          {masLibre && <div><b>{masLibre.s.nombre}{sedes.length > 1 ? ` · ${corta(masLibre.s.sede)}` : ""}</b><span>Más libre · {ocupTxt(masLibre.min, masLibre.cap)}</span></div>}
          {/* Con varias sedes el día se mide sobre todas: no coincide con el «Total del día» de cada tabla. */}
          {diaLleno && <div><b>{fechaLegible(diaLleno.fecha)}</b><span>Día más lleno · {ocupTxt(diaLleno.min, diaLleno.cap)}{sedes.length > 1 ? " (todas las sedes)" : ""}</span></div>}
        </div>
        <span />
        <div className="dc-hero-acc">
        <div className="dc-ocs__nav dc-ocs__nav--hero">
          <button type="button" aria-label="Semana anterior" onClick={() => setOff(off - 1)}><ChevronLeft size={15} strokeWidth={2} /></button>
          {/* Dice qué semana se ve; fuera de la actual, un clic vuelve a esta semana. */}
          <button type="button" className={off === 0 ? "is-on" : "is-otra"} onClick={() => setOff(0)} title={off === 0 ? "Semana actual" : "Volver a esta semana"}>{off === 0 ? "Esta semana" : <>{rango}<small>Volver a hoy</small></>}</button>
          <button type="button" aria-label="Semana siguiente" onClick={() => setOff(off + 1)}><ChevronRight size={15} strokeWidth={2} /></button>
        </div>
        <BotonExportar titulo={`Ocupación de sillones · ${rango}`} cols={colsExp} filas={datos.filas} sub="sillones" />
        </div>
      </section>

      {/* Una tarjeta por sede: cada celda se llena desde abajo según lo agendado. */}
      {sedes.map((sd) => {
        const filas = datos.filas.filter((f) => String(f.s.sede) === sd);
        const sueltas = datos.sinSillon?.[sd] || dias.map(() => 0);
        const sueltasN = datos.sinSillonN?.[sd] || dias.map(() => 0);
        const minSuelto = sueltas.reduce((a, m) => a + m, 0);
        const cap = filas.reduce((a, f) => a + f.cap, 0), min = filas.reduce((a, f) => a + f.min, 0) + minSuelto;
        const pctS = cap ? Math.min(100, Math.round((min / cap) * 100)) : null;
        const porDia = dias.map((fecha, i) => { const c = filas.reduce((a, f) => a + f.celdas[i].cap, 0), m = filas.reduce((a, f) => a + f.celdas[i].min, 0) + sueltas[i]; return { fecha, cap: c, min: m, pct: c ? Math.min(100, Math.round((m / c) * 100)) : null }; });
        return (
          <article key={sd} className="dc-ocz">
            <header className="dc-ocz__cab">
              <Anillo pct={pctS} txt={ocupTxt(min, cap)} size={48} />
              <div className="dc-ocz__tit">
                <h3>{nomSede(sd)}</h3>
                <span>{filas.length} {filas.length === 1 ? "sillón" : "sillones"} · {horas(min)} h agendadas de {horas(cap)} h{minSuelto > 0 ? ` · ${horas(minSuelto)} h sin sillón asignado` : ""}</span>
              </div>
              <span className="dc-ocz__libre"><Clock size={14} strokeWidth={2} /><b>{Math.max(0, Math.round((cap - min) / 60))} h</b> libres {semanaTxt}</span>
            </header>
            {min === 0 ? (
              <p className="dc-ocz__vacio">Sin citas agendadas {semanaTxt}: los {filas.length} {filas.length === 1 ? "sillón está libre" : "sillones están libres"}.</p>
            ) : (
            <div className="dc-ocz__scroll">
              <div className="dc-ocz__grid" role="table" aria-label={`Ocupación ${nomSede(sd)}`} style={{ "--dias": dias.length }}>
                <div className="dc-ocz__fila is-cab" role="row">
                  <span role="columnheader">Sillón</span>
                  {dias.map((f, i) => <span key={f} role="columnheader" className={f === hoyF ? "is-hoy" : ""}><small>{f === hoyF ? "hoy" : DIAS[i]}</small><b>{diaNum(f)}</b></span>)}
                  <span role="columnheader">Semana</span>
                </div>
                {filas.map((f) => { const uso = usoTxt(f.s); return (
                  <div key={f.s.id} className="dc-ocz__fila" role="row">
                    <span role="cell" className="dc-ocz__nom"><span className="dc-ocz__ico"><Armchair size={15} strokeWidth={1.9} /></span><span><b>{f.s.nombre}</b>{uso && <small>{uso}</small>}</span></span>
                    {f.celdas.map((c) => (
                      <span key={c.fecha} role="cell" className={`dc-ocz__c ${tonoCelda(c)}${c.fecha === hoyF ? " is-hoy" : ""}`}
                            style={c.pct == null ? undefined : { "--p": `${c.pct}%` }}
                            aria-label={c.pct != null && !c.min ? `Libre, ${horas(c.cap)} h` : undefined}
                            title={c.pct == null ? "Cerrado" : `${horas(c.min)} h agendadas de ${horas(c.cap)} h · ${horas(c.cap - c.min)} h libres`}>
                        {c.pct == null ? <small>Cerrado</small> : c.min > 0 && <><b>{ocupTxt(c.min, c.cap)}</b><small>{horas(c.min)} de {horas(c.cap)} h</small></>}
                      </span>
                    ))}
                    <span role="cell" className="dc-ocz__sem"><Anillo pct={f.pct} txt={ocupTxt(f.min, f.cap)} size={38} /><small>{horas(f.cap - f.min)} h<br />libres</small></span>
                  </div>
                ); })}
                {minSuelto > 0 && (
                  <div className="dc-ocz__fila is-suelta" role="row">
                    <span role="cell" className="dc-ocz__nom"><span className="dc-ocz__ico"><Armchair size={15} strokeWidth={1.9} /></span><span><b>Sin sillón</b><small>Asígnalo en la Agenda</small></span></span>
                    {sueltas.map((m, i) => (
                      <span key={dias[i]} role="cell" className={`dc-ocz__c ${m ? "is-suelta" : "is-cero"}${dias[i] === hoyF ? " is-hoy" : ""}`} title={m ? `${horas(m)} h de citas sin sillón` : "Sin citas sin sillón"}>
                        {m ? <><b>{horas(m)} h</b><small>{sueltasN[i]} {sueltasN[i] === 1 ? "cita" : "citas"}</small></> : <small>0 h</small>}
                      </span>
                    ))}
                    <span role="cell" className="dc-ocz__sem"><small>{horas(minSuelto)} h<br />sin asignar</small></span>
                  </div>
                )}
                <div className="dc-ocz__fila is-tot" role="row">
                  <span role="cell">Total del día</span>
                  {porDia.map((d) => <span key={d.fecha} role="cell" className={`${d.fecha === hoyF ? "is-hoy" : ""}`}>{d.pct == null ? "—" : <><b>{ocupTxt(d.min, d.cap)}</b><i><u style={{ width: `${d.pct}%` }} /></i></>}</span>)}
                  <span role="cell"><b>{ocupTxt(min, cap)}</b></span>
                </div>
              </div>
            </div>
            )}
          </article>
        );
      })}

      <div className="dc-ocz__pie">
        {hayCitas && huecos.length > 0 && (
          <section className="dc-ocz__huecos" aria-label="Huecos para llenar">
            <header>
              <div><h3>Huecos para llenar</h3><span>Los sillones con más horas libres de hoy en adelante.</span></div>
              {/* R4-10: solo quien tiene la Lista de espera; a gerencia la ruta la devolvía al Panel. */}
              {tienePermiso("espera", "ver") && <button type="button" onClick={() => { window.location.hash = "#/espera"; }}><Send size={13} strokeWidth={2} /> Ofrecer a la lista de espera</button>}
            </header>
            <div className="dc-ocz__hlist">
              {huecos.map((h) => (
                <div key={h.k} className="dc-ocz__h">
                  <span className="dc-ocz__hdia"><small>{h.diaSem}</small><b>{diaNum(h.fecha)}</b></span>
                  <span className="dc-ocz__htxt"><b>{h.sillon}</b><small>{h.sede ? `${h.sede} · ` : ""}{ocupTxt(h.min, h.cap)} ocupado</small></span>
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
            <span><i className="is-baja" />Menos de 30%</span>
            <span><i className="is-media" />30 a 59%</span>
            <span><i className="is-alta" />60 a 84%</span>
            <span><i className="is-full" />85% o más</span>
            <span><i className="is-na" />Cerrado</span>
          </div>
          <p><Info size={13} strokeWidth={2} /> Bajo 30% conviene ofrecer esos cupos (recordatorios, lista de espera) o asignar el sillón a otro doctor. Sobre 85% hay riesgo de demoras.</p>
        </aside>
      </div>
    </section>
  );
}

/* Tarjeta compacta para el Panel gerencial: solo el dato y el enlace al detalle en la Agenda. */
export function ResumenOcupacion({ onVer, variante, sedes = null }) {
  const { sillones, datos, sinHorario, citasErr, recargar } = useOcupacionSillones(0, sedes);
  if (!sillones.length || sinHorario) return null;
  const libres = Math.round((datos.cap - datos.min) / 60);
  if (variante === "hoy") return (
    <div className="dc-hoy__t" role="button" tabIndex={0} onClick={onVer}>
      <span className="dc-hoy__ico" style={{ background: "#EFEAFE", color: "#6D4FD1" }} aria-hidden="true"><Armchair size={16} strokeWidth={2} /></span>
      <div className="dc-hoy__tb">
        <div className="dc-hoy__tl">Ocupación de sillones · semana</div>
        <div className="dc-hoy__tv">{citasErr ? "—" : ocupTxt(datos.min, datos.cap)}</div>
        <div className="dc-hoy__ts">{citasErr ? <NoDisponible onReintentar={recargar} /> : `${libres} h libres en ${sillones.length} sillones`}</div>
      </div>
    </div>
  );
  return (
    <div className="dc-kpi dc-kpi--ocs">
      <span className="dc-kpi__icon" style={{ background: "#EFEAFE", color: "#6D4FD1" }} aria-hidden="true"><Armchair size={16} strokeWidth={2} /></span>
      <div className="dc-kpi__body">
        <div className="dc-kpi__label">Ocupación de sillones · semana</div>
        <div className="dc-kpi__value">{citasErr ? "—" : ocupTxt(datos.min, datos.cap)}</div>
        <div className="dc-kpi__sub">{citasErr ? <NoDisponible onReintentar={recargar} /> : <>{sillones.length} sillones · {libres} h libres{onVer && <> · <button type="button" className="dc-kpi__link" onClick={onVer}>Ver detalle</button></>}</>}</div>
      </div>
    </div>
  );
}
