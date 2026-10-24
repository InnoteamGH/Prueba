/* «WhatsApp» desde un paciente (menú «…» de Pacientes, alerta de Satisfacción): la bandeja
   abre el chat de ESE paciente o avisa que no tiene uno. R-37: antes solo se iba a
   #/whatsapp y quedaba abierto el primer chat de la lista, de otra persona.
   El pedido vive aquí (no en la URL: lleva el teléfono) hasta que la bandeja lo lee.
   Sin React ni comun.jsx: lo usan App, Recall, WhatsAppInbox y node --test. */
import { mismoNumero } from "./whatsappSede.js";

let pedido = null;

/** Pide abrir el chat de un paciente ({ id, telefono, nombre }) la próxima vez que se monte la
    bandeja. Sin id ni número no se encuentra ningún chat y la bandeja avisa (no abre otro). */
export function pedirChatPaciente(p) {
  pedido = p ? { pacienteId: p.id ?? null, telefono: p.telefono || "", nombre: p.nombre || "" } : null;
}

/** El pedido pendiente, sin borrarlo (la bandeja lo lee al montarse). */
export const verChatPedido = () => pedido;

/** Olvida el pedido: entrar luego a WhatsApp por el menú no debe volver a buscarlo. */
export function olvidarChatPedido() { pedido = null; }

const idsDeChat = (c) => [c?.pacienteId, ...(Array.isArray(c?.pacientes) ? c.pacientes.map((x) => x && x.id) : [])]
  .filter((x) => x != null && x !== "").map(String);
const masReciente = (lst) => [...lst].sort((a, b) => String(b.actualizado || "").localeCompare(String(a.actualizado || "")))[0] || null;

/**
 * Chat de un paciente en la lista de la bandeja, o null si no tiene.
 * Primero por el paciente ligado al chat (pacienteId o uno de sus `pacientes`: un número
 * puede gestionar a varios familiares); si ninguno, por el número normalizado
 * (+51 987…, 51987…, 987 654 321 son el mismo). Nunca por nombre: dos personas se
 * llaman igual. Si hay varios, el de actividad más reciente.
 */
export function chatDePaciente(chats, { pacienteId = null, telefono = "" } = {}) {
  const lista = Array.isArray(chats) ? chats.filter(Boolean) : [];
  if (pacienteId != null && pacienteId !== "") {
    const pid = String(pacienteId);
    const porId = lista.filter((c) => idsDeChat(c).includes(pid));
    if (porId.length) return masReciente(porId);
  }
  if (telefono) {
    const porTel = lista.filter((c) => mismoNumero(c.tel ?? c.telefono, telefono));
    if (porTel.length) return masReciente(porTel);
  }
  return null;
}
