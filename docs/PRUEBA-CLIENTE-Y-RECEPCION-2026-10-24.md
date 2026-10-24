# Prueba de punta a punta: el paciente por WhatsApp y la recepción en la app (24/10/2026, repetida a las 15:40)

**Para qué sirve:** probar el proceso como lo vive la clínica:
- el paciente empieza por WhatsApp queriendo agendar;
- la recepción sigue el proceso en la app: bandeja de WhatsApp, registro del paciente, agenda, confirmación, cambios y cobro.

**Cómo se probó el 24/10, de 13:12 a 13:49, hora de Lima:**
- **Paciente:** sus mensajes entraron por `POST /conversaciones/{id}/simular`, el mismo camino que usa la IA con un WhatsApp real. Se usaron chats QA con números ficticios.
- **Recepción:** todo se hizo en `app.odontosonrisa.biz`, con el usuario de recepción de Surco (Karina Soto) y clics en las pantallas, como lo haría la persona. Las capturas están en `capturas-r39/`.
- **Mensajes de recepción:** salen por el número real de la clínica. A estos números ficticios no llegan: quedan como «fallido». Con un WhatsApp real del lado del paciente se puede hacer igual.

**Qué falta:** el día de la cita (jueves 29/10) hay que seguir con las dos citas QA de este recorrido. Ver la sección 3.

---

## 1. Recorrido A: el paciente quiere agendar y la recepción hace todo

Chat 51900000831, conversación `64508a64-cf3e-4255-a52a-478ffb93aba0`. Paciente nuevo, Sede Surco.

| # | Quién | Qué hace | Qué pasó | |
|---|---|---|---|---|
| A1 | Paciente | «Hola, quiero agendar una cita» | «¿En qué sede le atendemos?» | ✅ |
| A2 | Paciente | «Prefiero que me atienda una persona, por favor» | Repite «¿En qué sede le atendemos?». No lo pasa a recepción. | ❌ |
| A3 | Paciente | «En Surco» → «Consulta general» → «El jueves 29» | Ofrece 9:00, 10:30 y 11:00. | ✅ |
| A4 | Recepción | Busca el chat en la bandeja | **El chat no aparece hasta que la IA busca cupos (A3).** Aunque el paciente ya dijo «En Surco», el chat sigue sin sede, y la recepción de Surco no ve los chats sin sede. | ❌ |
| A5 | Paciente | «¿Cuánto cuesta y aceptan seguro Rímac?» | «¿Cuál le reservo?»: no responde la pregunta. | ❌ |
| A6 | Recepción | Abre el chat → **Tomar control** | «Tomaste el control de la conversación». Captura `01`. | ✅ |
| A7 | Recepción | Escribe el precio, el seguro y la propuesta de hora, y pide nombre y DNI | El mensaje aparece como «Recepción». Captura `02`. | ✅ |
| A8 | Paciente | «Sí, el jueves 29 a las 10:30… Soy QA Recepción Cliente Uno, DNI 99771276…» | La IA no contesta (bien) y el chat queda «por responder». | ✅ |
| A9 | Recepción | **Registrar como paciente** → DNI, nombre, fecha de nacimiento → **Registrar y agendar** | El formulario trae el celular del chat. «QA Recepción Cliente Uno registrado como paciente». Captura `03`. | ✅ |
| A10 | Recepción | **Agendar cita**: Odontología general, Dr. Miguel Flores, jueves 29/10 10:30, «¿Cómo llegó?» WhatsApp, sillón 1 | Cita creada, «pendiente», y el chat queda vinculado al paciente. Capturas `04a` y `04`. | ✅ |
| | | | **La fecha por defecto es el domingo 25**, un día sin atención. No trae el día y la hora que se hablaron en el chat. | ⚠️ |
| | | | **Precio distinto:** muestra «Precio en Sede Surco: S/ 80.00» (Odontología general). La IA cobra S/ 50.00 por «Consulta general», que en `/servicios` es «Consulta / evaluación». En «Servicio» solo aparecen especialidades. | ❌ |
| A11 | Recepción | Avisa por el chat que la cita quedó y que paga en la clínica | Enviado. | ✅ |
| A12 | Recepción | **Agenda** → jueves 29 → **Confirmar** | La cita pasa a «confirmada». Captura `05`. | ✅ |
| | | | En la agenda dice **«Agendada por IA»**, aunque la agendó recepción. | ⚠️ |
| A13 | Recepción | Cobro por adelantado | **No se puede.** En Caja, «Nuevo link» solo avisa: «Los links se crean desde el chat de WhatsApp al reservar un cupo». La cita agendada por recepción se cobra en la clínica. | ⚠️ |
| A14 | Recepción | **Devolver a la IA** | La IA vuelve a responder. | ✅ |
| A15 | Paciente | «Gracias. ¿A qué hora era mi cita?» | «¿Cuál le reservo?»: retoma la oferta de antes de que entrara recepción y no ve la cita. | ❌ |
| A16 | Paciente | «Ver el estado de mi cita» | «¿En qué sede le atendemos?» | ❌ |
| A17 | Paciente | «¿Me la puede pasar al viernes 30 en la mañana?» → «A las 9:00» → «Sí, para mí» | Arma una **reserva nueva** para el viernes 30 a las 9:00 y llega al resumen. No menciona la cita del jueves 29. Al confirmar, quedarían dos citas. No se confirmó. | ❌ |

**El expediente** (captura `06`) muestra la próxima cita del jueves 29 a las 10:30 y la edad calculada.

---

## 2. Recorrido B: el paciente agendó y pagó con la IA, y la recepción cambia la cita

Chat 51900000920, conversación `fa7ea56f-b031-4c6a-9ffb-b99d80069fdd`. «QA Izipay Cincuenta Uno» pagó en R38 su cita del viernes 30/10 a las 10:30.

| # | Quién | Qué hace | Qué pasó | |
|---|---|---|---|---|
| B1 | Paciente | «Hola» → «¿Puedo pasar mi cita al jueves 29 a las 11:00?» | «Para cambiar una cita ya pagada, recepción le escribirá por aquí en breve. Su cita del viernes 30/10 a las 10:30 sigue confirmada. Anotamos su pedido de pasar a jueves 29/10 a las 11:00. No creamos una reserva nueva ni un cobro aparte.» El chat pasa a recepción. | ✅ |
| B2 | Recepción | Entra a la app | **«Pendientes de hoy» dice «Todo al día»** con el chat recién derivado. Solo se ve en la bandeja de WhatsApp («Recepción» / «Pendientes»). Captura `07`. | ❌ |
| B3 | Recepción | **Agenda** → viernes 30 → **⋯ → Reprogramar** → 29/10 11:00 → **Guardar cambio** | «…reprogramada». Captura `08`. | ✅ |
| | | | **La cita pagada pasó de «confirmada» a «pendiente».** Ya está pagada; debería seguir confirmada. | ⚠️ |
| | | | **Cobro:** se mantiene uno solo (S/ 50.00), sin cobro nuevo. | ✅ |
| B4 | Recepción | Avisa por el chat → **Devolver a la IA** | Enviado; la IA vuelve a responder. | ✅ |
| B5 | Paciente | «Gracias. ¿A qué hora es mi cita?» | «¿En qué sede le atendemos?» | ❌ |
| B6 | Paciente | «Hola» → «2» (Ver o cambiar una cita) | «Su cita está agendada para el jueves 29 de octubre a las 11:00 en la Sede Surco». Ve el cambio de recepción. | ✅ |

---

## 3. Lo que falta: el día de la cita (jueves 29/10)

Quedan cuatro citas QA de estos recorridos en Surco con el Dr. Miguel Flores:

| Hora | Paciente | Estado | Pago |
|---|---|---|---|
| 9:00 | QA Izipay Cincuenta Siete (DNI 99771279) | pendiente | pagada por link, S/ 50.00 |
| 10:30 | QA Recepción Cliente Uno (DNI 99771276) | confirmada | por cobrar en la clínica |
| 11:00 | QA Izipay Cincuenta Uno (DNI 99771272) | pendiente | pagada por link, S/ 50.00 |
| 12:30 | QA Recepción Cliente Dos (DNI 99771280) | confirmada | por cobrar en la clínica |

**Ese día, en la app:**
1. **Recordatorio:** el miércoles 28 debe salir para las dos.
2. **Recepción:** «Marcar llegada» y luego «Pasar a sillón».
3. **Doctor:** «Iniciar», nota de evolución y «Finalizar».
4. **Recepción:** «Finalizar y cobrar» → Caja.
   - Para Cliente Uno, cobro en la clínica.
   - Para Cincuenta Uno, no debe cobrarse otra vez: el pago por link queda aplicado.
5. **Al cierre:** revisar que cada pago figure una sola vez.

Estos pasos solo se habilitan el mismo día de la cita.

---

## 4. Cómo repetir esta prueba

**Lado del paciente:**
- **Con la API:** `POST /conversaciones` con un número ficticio y luego `POST /conversaciones/{id}/simular` con cada frase.
- **Con un celular:** escribir al número de la clínica.

**Lado de la recepción, en la app:**
1. WhatsApp + IA → filtros «Pendientes» y «Recepción».
2. Abrir el chat → «Tomar control».
3. Responder.
4. «Registrar como paciente» → «Registrar y agendar».
5. Agenda → «Confirmar».
6. Volver al chat → «Devolver a la IA».

**Cambios de cita:** Agenda → ⋯ → «Reprogramar» o «Cancelar cita».

**Qué revisar en cada paso:**
- **Bandeja:** que el chat aparezca para la recepción de su sede.
- **IA con recepción:** que no conteste mientras recepción tiene el control.
- **Cita:** que tenga el precio correcto.
- **IA de vuelta:** que, al recibir el chat, sepa de la cita.
- **Cobro:** que no haya cobros duplicados.

---

## 5. Repetición del 24/10, 15:40 a 15:55 (R40)

Se repitieron los dos recorridos con pacientes nuevos y los mismos pasos en la app.

**Recorrido A:** chat 51900000849, `3cbf8d2e-76c9-49f3-898c-3160d421edc6`, «QA Recepción Cliente Dos», cita del jueves 29 a las 12:30.

**Recorrido B:** chat 51900000848, `3e048177-7185-4e68-bde4-8f710b210542`, «QA Izipay Cincuenta Siete», reprogramada del viernes 30 a las 10:30 al jueves 29 a las 9:00.

| Paso | R39 | R40 |
|---|---|---|
| A2. «Prefiero que me atienda una persona» | ❌ | ❌ Igual. |
| A4. Recepción ve el chat antes de que la IA busque cupos | ❌ | ❌ Igual: el chat 838 dijo «En Surco» y sigue sin sede. |
| A5. Pregunta de precio | ❌ | ❌ «¿Cuánto cuesta?» → «No entendí. ¿Puede indicarme sede, día u hora…?» |
| A6–A12. Tomar control, responder, registrar, agendar, confirmar, devolver | ✅ | ✅ Igual. |
| A10. Precio S/ 80 frente a S/ 50; fecha por defecto en domingo; nombre del contacto precargado | ❌ / ⚠️ | ❌ / ⚠️ Igual. |
| A15. «¿A qué hora es mi cita?» | ❌ | ❌ «¿Puede indicarme sede, día u hora de la cita?» |
| A17. Pedir cambio → reserva nueva | ❌ | ❌ Igual: «Resumen: viernes 30/10 a las 09:00… ¿Confirma?» |
| B1. Pedir cambio de una cita pagada → deriva | ✅ | ✅ |
| B2. «Pendientes de hoy» | ❌ | ❌ «Todo al día». |
| B3. Reprogramar en la agenda | ✅ / ⚠️ pendiente | ✅ / ⚠️ Igual: queda «pendiente». Un solo cobro. |
| B5. «¿A qué hora es mi cita?» | ❌ | ❌ «¿En qué sede…?» |
| B6. «Hola» → «2» | ✅ Mostraba la cita. | ❌ Abre un submenú («1) Saber horario 2) Cambiar fecha/hora 3) Cancelar»), y «1» → «¿En qué sede…?». En el chat 920 «2» sí la muestra. |

**Nuevo:** la bandeja de WhatsApp tarda 10 a 12 segundos en cargar la lista de chats (`GET /conversaciones`), aun sin otra carga.
