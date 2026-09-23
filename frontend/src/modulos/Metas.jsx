/* Pantalla #/metas — meta mensual por médico (DC-41 / DC-09). */
import React, { useEffect, useState } from "react";
import { Check, Target } from "lucide-react";
import api, { auth } from "../api/client";
import { Btn, Card, DISPLAY_FONT, DS, KpiCard, ModHead, NAVY, Vacio } from "../comun";

export default function Metas({ notify = () => {}, can }) {
  const conectado = !!auth.token;
  const puedeEditar = can ? can("metas", "editar") : true;
  const [meds, setMeds] = useState([]);
  const [draft, setDraft] = useState({});
  const [saving, setSaving] = useState(null);
  const [error, setError] = useState(null);

  const cargar = () => {
    if (!conectado) return;
    setError(null);
    api.catalogo.medicos()
      .then((rows) => {
        const list = (rows || []).filter((m) => m.activo !== false);
        setMeds(list);
        const d = {};
        list.forEach((m) => { d[m.id] = m.metaMensual != null ? String(m.metaMensual) : ""; });
        setDraft(d);
      })
      .catch((e) => {
        setMeds([]);
        setError(e?.status === 404
          ? "No se pudo cargar el catálogo de médicos."
          : "No se pudieron cargar las metas.");
      });
  };
  useEffect(() => { cargar(); }, []); // eslint-disable-line

  const guardar = (m) => {
    if (!puedeEditar) { notify("Sin permiso para editar metas."); return; }
    const raw = draft[m.id];
    const n = raw === "" || raw == null ? null : Number(raw);
    if (n != null && (!Number.isFinite(n) || n < 0)) { notify("Meta inválida."); return; }
    setSaving(m.id);
    api.catalogo.fijarMeta(m.id, n)
      .then(() => { notify(`Meta de ${m.nombre} guardada.`); cargar(); })
      .catch((e) => notify(e?.message || "No se pudo guardar la meta."))
      .finally(() => setSaving(null));
  };

  const conMeta = meds.filter((m) => Number(m.metaMensual) > 0).length;
  const inp = { width: "100%", maxWidth: 160, padding: "8px 10px", borderRadius: "var(--dc-r-md)", border: "1.5px solid var(--dc-line)", fontSize: 14, color: NAVY, outline: "none", boxSizing: "border-box" };

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <ModHead icon={<Target size={20} strokeWidth={1.75} />} color={DS.c.primary} titulo="Metas de producción" sub="Meta mensual (S/) por odontólogo — se usa en reportes y comisiones." />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 12 }}>
        <KpiCard label="Médicos" value={error ? "—" : meds.length} color={NAVY} icon={<Target size={18} strokeWidth={1.75} />} />
        <KpiCard label="Con meta" value={error ? "—" : conMeta} color={DS.c.primary} icon={<Check size={18} strokeWidth={1.75} />} />
      </div>
      {error && (
        <Card style={{ padding: 14, background: "var(--dc-danger-soft)", border: "1px solid var(--dc-danger-mid)" }}>
          <div style={{ fontSize: 13, color: "var(--dc-danger-700)" }}>{error}</div>
        </Card>
      )}
      {!conectado && (
        <Card style={{ padding: 16 }}>
          <div style={{ fontSize: 13, color: "var(--dc-warn-600)" }}>Inicia sesión para ver y editar metas reales de la clínica.</div>
        </Card>
      )}
      {conectado && !error && meds.length === 0 && (
        <Vacio icon={<Target size={22} strokeWidth={1.75} />} titulo="Sin médicos" sub="Registra odontólogos en Configuración → Doctores." />
      )}
      {meds.length > 0 && (
        <Card style={{ overflow: "hidden" }}>
          <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--dc-line)" }}>
            <h3 style={{ margin: 0, color: NAVY, fontSize: 15, fontWeight: 700, fontFamily: DISPLAY_FONT }}>Metas mensuales</h3>
          </div>
          <div style={{ display: "grid" }}>
            {meds.map((m, i) => (
              <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 18px", borderTop: i ? "1px solid var(--dc-line)" : "none", flexWrap: "wrap" }}>
                <div style={{ flex: 1, minWidth: 160 }}>
                  <div style={{ fontWeight: 600, color: NAVY, fontSize: 15 }}>{m.nombre}</div>
                  <div style={{ fontSize: 12, color: "var(--dc-ink-500)" }}>
                    {[m.especialidad, m.cop].filter(Boolean).join(" · ") || "Sin especialidad"}
                    {m.porcentajeComision != null ? ` · comisión ${m.porcentajeComision}%` : ""}
                  </div>
                </div>
                <label style={{ fontSize: 12, fontWeight: 600, color: "var(--dc-ink-500)", display: "flex", alignItems: "center", gap: 8 }}>
                  Meta S/
                  <input
                    className="dc-premium-inp"
                    type="number"
                    min="0"
                    step="100"
                    disabled={!puedeEditar}
                    value={draft[m.id] ?? ""}
                    onChange={(e) => setDraft((d) => ({ ...d, [m.id]: e.target.value }))}
                    placeholder="Sin meta"
                    style={inp}
                  />
                </label>
                {puedeEditar && (
                  <Btn small disabled={saving === m.id} onClick={() => guardar(m)}>
                    <Check size={14} strokeWidth={1.75} /> {saving === m.id ? "…" : "Guardar"}
                  </Btn>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
