# WhatsApp con IA: escenarios para reproducir (23/10/2026, 12:15)

**Estado tras la nueva versión** (probada de 11:57 a 12:15, hora de Lima): pasan **11 de 16** conversaciones de aceptación. A las 11:30 pasaban 7.

**Lo que queda, por orden de prioridad:**
1. **Bloqueo:** elegir una hora de la lista que ofrece la IA no funciona (0 de 9 intentos). Hoy solo se puede reservar si el paciente dice la hora antes de ver la lista.
2. **Regresiones:**
   - ya no se anula un link sin pagar desde el chat;
   - al paciente registrado se le vuelven a pedir nombre, DNI y edad.
3. **Sigue igual:**
   - «2 pm» se rechaza aunque esté libre;
   - dos mensajes sin sentido no pasan a recepción.
4. **Detalles:**
   - un nombre escrito solo no se reconoce;
   - pide «sí, confirmo» dos veces;
   - el saludo dice «Odonto Sonrisa».

**Para reproducir:**
- **Paso 1:** crear un chat de prueba con un número ficticio (`POST /conversaciones`).
- **Paso 2:** mandar las frases una por una con `POST /conversaciones/{id}/simular`, esperando cada respuesta. También se puede escribir desde un WhatsApp real.
- **Horas:** de Lima, del 23/10/2026.
- **Logs:** el id de conversación sirve para buscarlos.

---

## B1. Elegir una hora de la lista: falla siempre (bloqueo)

**Pasos (chat 51900000938, conversación `d1c3d984-8580-49d5-9356-2f5c291fa8b1`):**

| Hora | Paciente | IA |
|---|---|---|
| 11:57:54 | Hola | Saludo con menú. |
| 11:58:07 | Quiero una cita | ¿En qué sede le atendemos? |
| 11:58:19 | En Surco | ¿Qué servicio necesita? |
| 11:58:31 | El viernes 30 | ¿Qué servicio necesita? (guarda el día ✅) |
| 11:59:03 | Consulta general | 🕐 *Viernes 30* — 9:00, 9:30, 10:00. ¿Cuál le reservo? |
| 11:59:35 | **A las 10** | ❌ «Esa hora no está disponible el viernes 30/10.» 🕐 11:30, 12:00, 12:30 |
| 11:59:48 | Para mí | ❌ «Esa hora no está disponible…» 🕐 14:00, 14:30, 15:00 |
| 12:00:30 | **A las 14:00** | ❌ No disponible. 🕐 16:30, 17:00, 17:30 |
| 12:01:13 | **El de las 16:30** | ❌ No disponible. «El viernes 30 no hay odontología general en Sede Surco; el siguiente día es el sábado 31» (antes ofreció 9 horas ese día). |
| 12:07:45 | **8:30** (del sábado 31) | ❌ «Esa hora no está disponible el **viernes 30**/10.» |

**Lo mismo en otros chats:**

| Chat (conversación) | Hora | Elige | Respuesta |
|---|---|---|---|
| 51900000942 (`32cde693-6511-49cb-8033-8d6e6c58113a`) | 12:02:04 | «A las 11:30» (ofrecida) | No disponible |
| 51900000942 | 12:07:32 | «1» | No disponible |
| 51900000941 (`336873ad-3c11-45a7-b6ee-ea32fcac22ac`) | 12:02:06 | «El de las 9:00» (ofrecida para el jueves 29) | «No disponible el **martes 27**/10» (el día pedido, no el ofrecido) |
| 51900000941 | 12:07:27 | «12:30» | Igual |
| 51900000975 (`ba793442-bd4f-4af9-b4fc-15f402d47500`) | 11:58:36 | «La primera» | «No entendí…» y vuelve a preguntar la sede |

**Debería:** reservar la hora elegida, sea «A las 10», «10», «10:00», «el de las 10», «1» o «la primera», siempre que esté en la lista.

**Pista:** `slotsOfrecidos` guarda `2026-10-30T16:30:00`, la lista muestra «16:30» o «9:00», y la validación usa a veces el día pedido en vez del ofrecido.

---

## B2. Anular un link sin pagar: ya no funciona (regresión)

Chat 51900000975 (`ba793442-bd4f-4af9-b4fc-15f402d47500`). A las 12:10:26 la IA envió el link para el 05/11 a las 09:30. Después:

| Hora | Paciente | IA |
|---|---|---|
| 12:10:58 | Mejor no, ya no quiero la cita | ❌ «Resumen: jueves 5/11 a las 09:30 en surco. ¿Confirma la reserva?» |
| 12:11:35 | Ya no quiero la cita, cancélela por favor | ❌ Lo mismo |

El link siguió **pendiente**; se anuló a mano desde Caja.

**Debería:** anular el link y decirlo, como a las 11:15 de hoy: «Listo: anulé el link de pago pendiente… El cupo quedó libre».

---

## B3. Paciente registrado: le pide nombre, DNI y edad (regresión)

Chat 51900000975 («QA Izipay Treinta Ocho», ya registrado con DNI 99771259):

| Hora | Paciente | IA |
|---|---|---|
| 12:07:25 | Quiero una consulta general en Surco el jueves 5 de noviembre a las 9:30 | ❌ Para reservar las 09:30 necesito su nombre completo. |
| 12:08:28 | Me llamo QA Izipay Treinta Ocho | ❌ …necesito su DNI (8 dígitos). |
| 12:09:17 | Mi DNI es 99771259 | ❌ …necesito su edad. |

**Debería:** reconocer el celular y preguntar solo «¿La cita es para usted, QA Izipay Treinta Ocho?». A las 11:13 de hoy (chat 972) sí lo hacía.

---

## B4. «2 pm»: la entiende, pero dice que no está libre

Chat 51900000943 (`a87bd5e3-c7ab-4f05-802d-fb306a312af9`):

| Hora | Paciente | IA |
|---|---|---|
| 11:57:30 | 2 pm | ❌ «Esa hora no está disponible el lunes 26/10.» 🕐 11:30, 12:00, 12:30 |
| 12:07:32 | Para mí | «Para reservar las **14:00** necesito su nombre completo.» |

Las 14:00 del lunes 26 en San Isidro **estaban libres**: la IA las ofreció en el chat 942 a las 12:02. Es probable que sea el mismo error que B1.

---

## B5. Dos mensajes sin sentido no pasan a recepción

Chats 51900000940 (`41df0630-512f-48ab-a3e8-b42e7cc14e0b`) y 51900000939 (`10b9a9d1-afbe-4087-a41d-f5169498499c`):
- el paciente escribe «asdfgh qwerty» y luego «zxcvb ñlkjh»;
- la IA responde dos veces «No entiendo…»;
- `intentosFallidos` queda en 0 y el chat sigue en la IA.

---

## B6. Detalles

| Qué pasa | Dónde | Debería |
|---|---|---|
| Un nombre escrito solo («QA Izipay Cuarenta Seis») no se reconoce y repite «necesito su nombre completo». | Chat 945, 12:02:57 | Tomar el texto como nombre cuando se está pidiendo el nombre. |
| Pide «sí, confirmo» dos veces: primero un resumen corto («… en surco»), luego otro con el doctor. | Chat 945, 12:03:55 y 12:04:31 | Un solo resumen completo (doctor, sede con mayúscula) y una sola confirmación. |
| El saludo dice «Odonto Sonrisa». | Todos los chats | El nombre de la clínica es «Clínica Dental Sonríe+» (`/clinica` y página de pago). |
| Días y especialidades en mayúscula a mitad de frase. | Chat 941 | «el martes 27 no hay odontología general…» |

---

## Corregido en la nueva versión ✅ (no debe romperse)

| Antes (11:30) | Ahora (12:00) |
|---|---|
| Ofrecía el viernes (hoy) y horas ya pasadas. | Pregunta el día: «¿Qué día prefiere?». |
| Volvía a pedir sede y día ya dichos. | Guarda sede, día y hora aunque lleguen antes de tiempo (chats 938 y 947). |
| No entendía un pedido completo en un mensaje. | Pasa directo a los datos (chats 945 y 944). |
| No reiniciaba un chat viejo. | «Hola» empieza de cero con el menú (chats 967, 969 y 975). |
| Pedía nombre, DNI y edad juntos. | Uno por mensaje, y pregunta «¿La cita es para usted o para otra persona?». |
| Saludo sin menú. | Menú 1) Agendar 2) Ver o cambiar 3) Otra consulta. |

**También sigue bien:**
- el pago en el sandbox, con cita, aviso y un solo cobro (chat 945);
- la derivación de una cita pagada (chat 995);
- el día sin doctor (chat 941);
- «Mañana» = sábado.
