/* Texto de los consentimientos informados (M4-11).
   La pantalla registraba el consentimiento solo con `tipo` y `titulo`: el documento firmado no
   decía qué procedimiento se autorizaba ni con qué riesgos («El paciente firmó y aceptó este
   consentimiento…»). Ahora cada tipo tiene su plantilla con el procedimiento, los beneficios,
   los riesgos, las alternativas y la declaración del paciente; se guarda en `contenido` al
   registrarlo y es lo que el paciente lee antes de firmar. Los ya registrados sin contenido se
   imprimen con la plantilla de su tipo.
   Módulo puro (sin React). */

const DECLARACION = "Declaro que se me explicó en un lenguaje claro el procedimiento, sus beneficios, riesgos y alternativas; que pude hacer todas las preguntas que consideré necesarias y que fueron respondidas. Sé que puedo revocar este consentimiento en cualquier momento antes del procedimiento, sin que ello afecte mi atención. Autorizo al profesional tratante y a su equipo a realizarlo (Ley 26842, Ley General de Salud, y Ley 29414).";

const PLANTILLAS = {
  "Consentimiento informado de tratamiento": {
    procedimiento: "Atención odontológica según el plan de tratamiento indicado por el profesional: evaluación, profilaxis, restauraciones (curaciones) y demás procedimientos de odontología general que figuren en el presupuesto aceptado.",
    beneficios: "Recuperar y mantener la salud bucal, aliviar el dolor y evitar que las lesiones avancen.",
    riesgos: "Sensibilidad o molestia pasajera en las piezas tratadas; inflamación leve de la encía; reacción a la anestesia local (adormecimiento prolongado, hematoma en la zona de la punción, rara vez alergia); fractura de una restauración o de la pieza si hay poco tejido sano; necesidad de un tratamiento adicional (p. ej. endodoncia) si la lesión era más profunda de lo previsto.",
    alternativas: "Postergar el tratamiento (con el riesgo de que la lesión avance), otros materiales u opciones que el profesional explicó, o no tratarse.",
  },
  "Endodoncia": {
    procedimiento: "Tratamiento de conductos: se retira la pulpa (nervio) inflamada o infectada, se limpian, conforman y desinfectan los conductos de la raíz y se sellan con material de obturación. Puede requerir varias sesiones y radiografías de control.",
    beneficios: "Conservar la pieza dental, eliminar el dolor y la infección.",
    riesgos: "Dolor o inflamación los días siguientes; fractura de un instrumento dentro del conducto; perforación de la raíz; conductos calcificados o curvos que impidan completar el tratamiento; fractura de la pieza si no se restaura a tiempo (suele necesitar corona o reconstrucción); fracaso del tratamiento que obligue a repetirlo, a una cirugía o a la extracción.",
    alternativas: "Extracción de la pieza y su reemplazo posterior (implante, puente o prótesis), o no tratarla (con riesgo de infección y pérdida de la pieza).",
  },
  "Exodoncia (extracción)": {
    procedimiento: "Extracción de la pieza dental indicada, con anestesia local. Puede requerir separar la pieza en partes, retirar hueso alrededor de ella y poner puntos de sutura.",
    beneficios: "Eliminar el foco de dolor o infección, o preparar la boca para otro tratamiento (ortodoncia, prótesis o implante).",
    riesgos: "Dolor, inflamación y hematoma; sangrado los primeros días; infección o alveolitis (alvéolo seco); adormecimiento temporal o, rara vez, permanente del labio, mentón o lengua por cercanía a un nervio; comunicación con el seno maxilar en piezas superiores; fractura de la raíz o de la pieza vecina; limitación para abrir la boca.",
    alternativas: "Conservar la pieza con otro tratamiento (endodoncia, restauración) cuando sea posible, o no tratarla.",
  },
  "Ortodoncia": {
    procedimiento: "Colocación de aparatos (brackets, alineadores u otros) para mover los dientes y corregir la mordida, con controles periódicos durante el tiempo estimado por el profesional y uso de retenedores al terminar.",
    beneficios: "Mejorar la posición de los dientes, la mordida, la higiene y la estética.",
    riesgos: "Molestias o llagas los primeros días y tras cada control; descalcificación o caries si la higiene no es buena; reabsorción de las raíces; inflamación de la encía; desprendimiento de piezas del aparato; recidiva (los dientes vuelven a moverse) si no se usan los retenedores; el tiempo de tratamiento puede alargarse si no se asiste a los controles.",
    alternativas: "Otro tipo de aparato, tratamientos restauradores o protésicos para disimular la posición, o no tratarse.",
  },
  "Cirugía / implante": {
    procedimiento: "Cirugía oral con anestesia local: colocación de uno o más implantes de titanio en el hueso maxilar, injertos óseos o de encía u otra cirugía indicada. La prótesis sobre el implante se coloca después del tiempo de integración que indique el profesional.",
    beneficios: "Reponer piezas perdidas con una base fija, recuperar la función al masticar y la estética.",
    riesgos: "Dolor, inflamación, hematoma y sangrado; infección; falta de integración del implante con el hueso, que obligue a retirarlo; lesión de un nervio con adormecimiento temporal o permanente del labio o mentón; comunicación con el seno maxilar; pérdida de hueso o de encía alrededor del implante con el tiempo (periimplantitis). El tabaco, la diabetes mal controlada y una mala higiene aumentan estos riesgos.",
    alternativas: "Puente fijo, prótesis removible o no reponer la pieza.",
  },
  "Uso de datos personales (Ley 29733)": {
    procedimiento: "Tratamiento de mis datos personales y de salud (historia clínica, radiografías, fotografías clínicas y datos de contacto) por la clínica, para mi atención, la facturación, los recordatorios de citas por WhatsApp, correo o teléfono y el cumplimiento de obligaciones legales.",
    beneficios: "Una historia clínica completa y la continuidad de mi atención en todas las sedes de la clínica.",
    riesgos: "Los datos se guardan con medidas de seguridad y solo los ven las personas autorizadas. No se comparten con terceros salvo obligación legal o con mi autorización.",
    alternativas: "Puedo ejercer en cualquier momento mis derechos de acceso, rectificación, cancelación y oposición (ARCO) ante la clínica.",
    declaracion: "Autorizo el tratamiento de mis datos personales en los términos descritos, conforme a la Ley 29733, Ley de Protección de Datos Personales, y su reglamento.",
  },
};

/** Plantilla del tipo (o la general si el tipo no tiene una propia). */
export const plantillaConsentimiento = (tipo) => PLANTILLAS[tipo] || PLANTILLAS["Consentimiento informado de tratamiento"];

/** Texto completo del consentimiento para guardarlo en `contenido` e imprimirlo.
    detalle: lo que el profesional precisa (pieza, zona…), opcional. */
export function textoConsentimiento(tipo, { paciente = "", detalle = "" } = {}) {
  const p = plantillaConsentimiento(tipo);
  const esDatos = /datos personales/i.test(String(tipo || ""));
  return [
    paciente ? `Yo, ${paciente}, ${esDatos ? "paciente de la clínica" : "paciente o su representante"}, declaro lo siguiente.` : "",
    `${esDatos ? "Finalidad" : "Procedimiento"}: ${p.procedimiento}${detalle && String(detalle).trim() ? ` Detalle: ${String(detalle).trim()}.` : ""}`,
    `Beneficios: ${p.beneficios}`,
    `${esDatos ? "Seguridad" : "Riesgos y posibles complicaciones"}: ${p.riesgos}`,
    `${esDatos ? "Mis derechos" : "Alternativas"}: ${p.alternativas}`,
    `Declaración: ${p.declaracion || DECLARACION}`,
  ].filter(Boolean).join("\n\n");
}
