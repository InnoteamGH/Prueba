/**
 * WhatsApp por sede: número peruano (validar y normalizar a E.164), chat → sede y estado por sede.
 * Ejecutar: node --test src/compartido/whatsappSede.test.js
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  digitosWhatsapp, normalizarWhatsappPe, validarWhatsappPe, formatearWhatsappPe, mismoNumero,
  validarPhoneNumberId, whatsappDeSede, sedeDeConversacion, sedeDePacienteObj, numeroDeSalida,
  sedesSinNumero, filasWhatsappSedes,
} from "./whatsappSede.js";

const S1 = "5f1c2a8e-1111-4c1a-9d1e-00000000c001";
const S2 = "5f1c2a8e-2222-4c1a-9d1e-00000000c002";
const S3 = "5f1c2a8e-3333-4c1a-9d1e-00000000c003";
const SEDES = [
  { id: S1, nombre: "Sede Miraflores", whatsappNumero: "+51911111111" },
  { id: S2, nombre: "Sede Los Olivos", whatsappNumero: "+51 922 222 222" },
  { id: S3, nombre: "Sede Chorrillos" },
];

describe("normalizarWhatsappPe", () => {
  it("acepta el celular con o sin +51, con espacios, guiones o paréntesis", () => {
    for (const v of ["+51 987 654 321", "+51987654321", "51987654321", "987654321", "987 654 321", "(+51) 987-654-321", "0051 987 654 321", " +51 987 654 321 "]) {
      assert.equal(normalizarWhatsappPe(v), "+51987654321", v);
    }
  });
  it("rechaza fijos, otros países y largos equivocados", () => {
    for (const v of ["01 234 5678", "012345678", "+51 1 234 5678", "+52 987 654 321", "98765432", "9876543210", "+51 9876 543 210", "", null, undefined, "abc"]) {
      assert.equal(normalizarWhatsappPe(v), null, String(v));
    }
  });
  it("digitosWhatsapp pone el 51 a un celular de 9 dígitos y quita el 00", () => {
    assert.equal(digitosWhatsapp("987 654 321"), "51987654321");
    assert.equal(digitosWhatsapp("0051987654321"), "51987654321");
    assert.equal(digitosWhatsapp("51948000000"), "51948000000");
  });
});

describe("validarWhatsappPe", () => {
  it("vacío es válido (el campo es opcional) y el celular correcto también", () => {
    assert.equal(validarWhatsappPe(""), "");
    assert.equal(validarWhatsappPe("   "), "");
    assert.equal(validarWhatsappPe("+51 987 654 321"), "");
  });
  it("explica qué falla", () => {
    assert.match(validarWhatsappPe("+51 987 654 32"), /Faltan dígitos/);
    assert.match(validarWhatsappPe("+51 987 654 3210"), /Sobran dígitos/);
    assert.match(validarWhatsappPe("98765432"), /Faltan dígitos/);
    assert.match(validarWhatsappPe("9876543210"), /Sobran dígitos/);
    assert.match(validarWhatsappPe("01 234 5678"), /celular/);
    assert.match(validarWhatsappPe("+51 1 234 5678"), /celular/);
    assert.match(validarWhatsappPe("+34 612 345 678"), /Perú/);
    assert.match(validarWhatsappPe("nueve ocho siete"), /solo el número/);
  });
});

describe("formatear y comparar", () => {
  it("formatea en grupos de tres", () => {
    assert.equal(formatearWhatsappPe("51987654321"), "+51 987 654 321");
    assert.equal(formatearWhatsappPe("+1 555 0100"), "+1 555 0100");
    assert.equal(formatearWhatsappPe(null), "");
  });
  it("mismoNumero compara aunque venga escrito distinto", () => {
    assert.ok(mismoNumero("+51 987 654 321", "51987654321"));
    assert.ok(mismoNumero("987654321", "+51987654321"));
    assert.ok(!mismoNumero("+51987654321", "+51987654322"));
    assert.ok(!mismoNumero("", ""));
  });
  it("whatsappDeSede lee whatsappNumero (o whatsapp) y lo deja en E.164", () => {
    assert.equal(whatsappDeSede(SEDES[1]), "+51922222222");
    assert.equal(whatsappDeSede({ whatsapp: "999 888 777" }), "+51999888777");
    assert.equal(whatsappDeSede(SEDES[2]), "");
    assert.equal(whatsappDeSede(null), "");
  });
  it("ID del número en Meta: solo dígitos", () => {
    assert.equal(validarPhoneNumberId(""), "");
    assert.equal(validarPhoneNumberId("109876543210001"), "");
    assert.match(validarPhoneNumberId("abc-123"), /solo dígitos/);
  });
});

describe("sedeDeConversacion", () => {
  const delPaciente = (c) => (c.pacienteId === "p3" ? S3 : null);
  it("1) usa el sedeId de la conversación", () => {
    const r = sedeDeConversacion({ sedeId: S2, numeroSede: "51911111111" }, { sedes: SEDES });
    assert.equal(r.sedeId, S2); assert.equal(r.origen, "conversacion"); assert.equal(r.sede.nombre, "Sede Los Olivos");
    // El número que recibió el chat manda sobre el de la sede.
    assert.equal(r.numero, "+51911111111");
  });
  it("2) si no, cruza el número que recibió el chat con el whatsappNumero de las sedes", () => {
    assert.equal(sedeDeConversacion({ numeroSede: "51922222222" }, { sedes: SEDES }).sedeId, S2);
    assert.equal(sedeDeConversacion({ numeroClinica: "+51 911 111 111" }, { sedes: SEDES }).sedeId, S1);
    const r = sedeDeConversacion({ telefonoClinica: "922222222" }, { sedes: SEDES });
    assert.equal(r.sedeId, S2); assert.equal(r.origen, "numero"); assert.equal(r.numero, "+51922222222");
  });
  it("3) si el número no es de ninguna sede, la sede del paciente", () => {
    const r = sedeDeConversacion({ numeroSede: "51948000000", pacienteId: "p3" }, { sedes: SEDES, sedeDePaciente: delPaciente });
    assert.equal(r.sedeId, S3); assert.equal(r.origen, "paciente");
    assert.equal(r.numero, "+51948000000");
  });
  it("4) sin nada: «Sin sede» (null)", () => {
    const r = sedeDeConversacion({ telefono: "51900000000" }, { sedes: SEDES, sedeDePaciente: delPaciente });
    assert.equal(r.sedeId, null); assert.equal(r.origen, null);
    assert.equal(sedeDeConversacion(null).sedeId, null);
  });
  it("acepta un comparador de ids (id corto ↔ UUID)", () => {
    const igual = (a, b) => String(a) === String(b) || (String(a) === "2" && b === S2) || (a === S2 && String(b) === "2");
    const r = sedeDeConversacion({ sedeId: 2 }, { sedes: SEDES, igual });
    assert.equal(r.sedeId, S2); assert.equal(r.numero, "+51922222222");
  });
  it("sedeDePacienteObj: API (sedeRegistroId, sedeIds) y demo (sede, sedes)", () => {
    assert.equal(sedeDePacienteObj({ sedeRegistroId: S1 }), S1);
    assert.equal(sedeDePacienteObj({ sedeIds: [S2] }), S2);
    assert.equal(sedeDePacienteObj({ sedes: [2, 1] }), 2);
    assert.equal(sedeDePacienteObj({ sede: 1 }), 1);
    assert.equal(sedeDePacienteObj({ sedes: [{ id: S3 }] }), S3);
    assert.equal(sedeDePacienteObj({}), null);
  });
});

describe("número de salida y sedes sin número", () => {
  it("sale del número que recibió el chat, si no del de la sede, si no del compartido", () => {
    assert.deepEqual(numeroDeSalida({ recibido: "51911111111", sedeId: S2, sedes: SEDES }), { numero: "+51911111111", propio: true, compartido: false });
    assert.deepEqual(numeroDeSalida({ sedeId: S2, sedes: SEDES, compartido: "+51 948 000 000" }), { numero: "+51922222222", propio: true, compartido: false });
    assert.deepEqual(numeroDeSalida({ sedeId: S3, sedes: SEDES, compartido: "+51 948 000 000" }), { numero: "+51948000000", propio: false, compartido: true });
    assert.deepEqual(numeroDeSalida({ sedeId: S3, sedes: SEDES }), { numero: "", propio: false, compartido: false });
  });
  it("sedesSinNumero deja fuera las inactivas", () => {
    assert.deepEqual(sedesSinNumero([...SEDES, { id: "x", nombre: "Cerrada", activa: false }]).map((s) => s.id), [S3]);
  });
});

describe("filasWhatsappSedes", () => {
  const salud = { ok: true, estado: "conectado", numero: "+51 948 000 000", fallos24h: 0, semaforo: "verde" };
  it("sin porSede: número compartido y «Sin número propio» en las sedes sin whatsappNumero", () => {
    const r = filasWhatsappSedes({ sedes: SEDES, salud });
    assert.equal(r.modo, "compartido");
    assert.equal(r.compartido.numero, "+51948000000"); assert.equal(r.compartido.estado, "operativo");
    const chorrillos = r.filas.find((f) => f.sedeId === S3);
    assert.equal(chorrillos.sinNumero, true); assert.equal(chorrillos.estado.etiqueta, "Sin número propio"); assert.equal(chorrillos.numero, "+51948000000");
    const olivos = r.filas.find((f) => f.sedeId === S2);
    assert.equal(olivos.numero, "+51922222222"); assert.equal(olivos.estado.etiqueta, "Sin estado");
  });
  it("la sede cuyo número es el de la salud general toma ese estado", () => {
    const r = filasWhatsappSedes({ sedes: SEDES, salud: { ...salud, numero: "51911111111" } });
    assert.equal(r.filas.find((f) => f.sedeId === S1).estado.estado, "operativo");
  });
  it("con porSede: el estado de cada número", () => {
    const r = filasWhatsappSedes({ sedes: SEDES, salud: { ...salud, porSede: [
      { sedeId: S1, numero: "51911111111", estado: "conectado", fallos24h: 0 },
      { sedeId: S2, numero: "51922222222", estado: "conectado", fallos24h: 2 },
      { sedeId: S3, estado: "por_activar" },
    ] } });
    assert.equal(r.modo, "porSede"); assert.equal(r.compartido, null);
    assert.equal(r.filas[0].estado.estado, "operativo");
    assert.equal(r.filas[1].estado.etiqueta, "Con fallos");
    assert.equal(r.filas[2].estado.etiqueta, "Por activar"); assert.equal(r.filas[2].sinNumero, true);
  });
  it("las respuestas de ?sedeId= sirven igual que porSede", () => {
    const r = filasWhatsappSedes({ sedes: SEDES, salud, porSede: [{ sedeId: S1, ok: false, mensaje: "Token vencido" }] });
    assert.equal(r.modo, "porSede");
    assert.equal(r.filas[0].estado.etiqueta, "Desconectado");
    assert.equal(r.filas[1].estado.etiqueta, "Sin estado");
    assert.equal(r.filas[2].estado.etiqueta, "Sin número propio");
  });
  it("mientras carga, las sedes con número dicen «Comprobando…»", () => {
    const r = filasWhatsappSedes({ sedes: SEDES, salud: null });
    assert.equal(r.compartido, null);
    assert.equal(r.filas[0].estado.etiqueta, "Comprobando…");
  });
});
