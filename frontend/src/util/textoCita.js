/* Motivo de una cita para mostrar en pantalla. El agendamiento por WhatsApp guarda marcas
   internas en el motivo («parentesco=titular», «grupo=<uuid>», «paciente 36 años»); aquí se
   quitan, el origen se acorta y va al final, después de lo que se atiende. */
const INTERNO = [/^[a-z_]+=/i, /^(paciente\s+)?\d{1,3}\s+años$/i, /^[0-9a-f]{8}-[0-9a-f-]{20,}$/i];
const ORIGEN = [
  [/^agendado por whatsapp ia tras pago izipay$/i, "WhatsApp IA, pagada con Izipay"],
  [/^agendado por whatsapp \(ia\)$/i, "WhatsApp IA"],
  [/^agendado por whatsapp ia$/i, "WhatsApp IA"],
  [/^agendado por whatsapp$/i, "WhatsApp"],
];

export function motivoVisible(motivo) {
  const partes = String(motivo ?? "").split("·").map((p) => p.trim()).filter((p) => p && !INTERNO.some((re) => re.test(p)));
  const origen = [], resto = [];
  for (const p of partes) {
    const o = ORIGEN.find(([re]) => re.test(p));
    if (o) origen.push(o[1]); else resto.push(p);
  }
  return [...new Set([...resto, ...origen])].join(" · ");
}
