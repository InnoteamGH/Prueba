# WhatsApp con IA: escenarios para reproducir (23/10/2026)

**¿Se pudo sacar una cita?** **Sí.** En el chat 51900000957 se agendó, se pagó en el sandbox y la cita quedó confirmada, con aviso por WhatsApp y un solo cobro en Caja (sección 1).

**El problema:**
- **Cuándo funciona:** el paciente responde exactamente lo que la IA pregunta, en el orden en que lo pregunta.
- **Cuándo falla:** el paciente escribe como lo haría una persona. Da la sede antes del día, pone todo en un mensaje o escribe «2 pm». Entonces la IA ofrece otro día o vuelve a pedir datos ya dichos. Es lo mismo que vio Andy: «le pedía lo de la sede, luego me volvía a consultar; le pedí un día y me indicó viernes».

**Para reproducirlo:**
- **Paso 1:** crear un chat de prueba con un número ficticio (`POST /conversaciones`).
- **Paso 2:** mandar las frases de la tabla una por una con `POST /conversaciones/{id}/simular`, esperando cada respuesta. También se puede escribir desde un WhatsApp real.
- **Horas:** de Lima, del 23/10/2026.
- **Logs:** el **id de conversación** sirve para buscarlos.

---

## 1. La cita que sí salió: chat 51900000957 (conversación `6b2f4162-f663-4a41-85f8-bcbcf7003345`)

| Hora | Paciente | IA |
|---|---|---|
| 11:12:16 | Hola | Hola, ¿en qué puedo ayudarle hoy? 🦷 |
| 11:12:32 | Quiero una cita de consulta general | ¿Para qué fecha desea agendar su consulta…? Puede elegir una sede, tenemos en San Isidro y Surco. |
| 11:12:46 | En Surco | Ha elegido la sede de Surco. Ahora, dígame para qué fecha… |
| 11:12:58 | El jueves 29 | ❌ 🕐 *Viernes 23 de octubre* — 09:00, 09:30, 10:00. ¿Cuál le reservo? |
| 11:13:37 | No, le pedí el jueves 29 de octubre | 🕐 *Jueves 29* — 09:00, 09:30, 10:00 |
| 11:14:06 | El de las 10:00 | ❌ Para reservar las 10:00 necesito su nombre completo, DNI (8 dígitos), edad… (los tres juntos) |
| 11:14:16 | Para mí | ❌ Repite lo mismo (no pregunta si la cita es para él u otra persona). |
| 11:14:42 | Me llamo QA Izipay Cuarenta Cinco | Necesito DNI y edad. |
| 11:14:52 | Mi DNI es 99771266 | Necesito su edad. |
| 11:15:02 | Tengo 35 años | Resumen: jueves 29/10 a las 10:00, Sede Surco, Dr. Miguel Flores. ¿Confirma? |
| 11:15:31 | Sí, confirmo | Link de pago de S/ 50.00, cupo guardado hasta las 11:45. |
| 11:16:40 | (pago en el sandbox) | ✅ Pago recibido. Su cita quedó registrada… |

**Resultado:** cita confirmada, aviso por WhatsApp y un cobro en Caja. Se llegó a la cita porque el paciente **corrigió el día** y dio los datos uno por uno.

---

## 2. Escenarios que fallan

Cada escenario se repitió en chats distintos para confirmar que no es un caso aislado.

### E1. Ofrece el viernes (hoy), y con horas que ya pasaron. **3 de 3 veces.** Esto es lo que vio Andy.

| Chat (conversación) | Hora | Paciente | IA |
|---|---|---|---|
| 51900000954 (`eb5b445e-60ee-437c-b1c6-0fdb25757830`) | 11:28:44 | Hola → Quiero una cita de consulta general → **En Surco** | 🕐 *Viernes 23* — **09:00, 09:30, 10:00**. ¿Cuál le reservo? |
| 51900000951 (`bdbb3131-9768-43e6-b1b3-c256f02735aa`) | 11:28:19 | **Quiero una cita de consulta general en San Isidro** | 🕐 *Viernes 23* — 09:00, 09:30, 10:00 |
| 51900000957 (`6b2f4162-f663-4a41-85f8-bcbcf7003345`) | 11:12:58 | (le preguntó la fecha) **El jueves 29** | 🕐 *Viernes 23 de octubre* — 09:00, 09:30, 10:00 |

**Debería:**
- si el paciente no dijo el día, preguntarlo;
- si lo dijo, usar ese día;
- nunca ofrecer horas que ya pasaron: a las 11:28 ofreció las 09:00 de ese mismo día.

### E2. Vuelve a pedir la sede y el día ya dichos. **2 de 2 veces.** También lo vio Andy.

| Chat (conversación) | Hora | Paciente | IA |
|---|---|---|---|
| 51900000963 (`00a344b7-5549-490c-b19e-48f2e5815d46`) | 11:09:01 | Quiero sacar una cita | ¿para qué tipo de servicio…? |
| | 11:09:12 | En San Isidro | ¿Qué tipo de servicio necesita? |
| | 11:09:26 | Mañana | Mañana sábado… ¿qué tipo de servicio necesita? |
| | 11:09:39 | A las 10 | ❌ No encontré ese cupo… **¿Para qué sede y fecha** desea…? |
| | 11:09:52 | Para mí | ❌ Para confirmar el cupo necesito **sede, día y hora**… |
| 51900000961 (`2461e2ec-00c3-48f7-a62a-6cd848de3861`) | 11:12:22 | (ya había dicho San Isidro y lunes 26) ¿Y a las 14:00 no hay? | ❌ No encontré ese cupo… **¿Para qué sede y fecha**…? |

**Debería:** guardar sede, día y hora apenas los dice el paciente y solo preguntar lo que falta (la especialidad).

### E3. Pedido completo en un mensaje. **3 de 3 veces.**

| Chat (conversación) | Hora | Paciente | IA |
|---|---|---|---|
| 51900000962 (`d5f779fe-1ffd-4560-9848-0e4b6bcb8c2e`) | 11:09:11 | Consulta general en Surco el jueves 29 a las 9:30 para mí | ❌ No encontré ese cupo en la oferta actual. ¿Para qué sede y fecha…? |
| 51900000955 (`f4e45071-d059-4692-aa0c-b3d9ba27ec3e`) | 11:18:05 | Hola, quiero una consulta general en Surco el jueves 29 a las 9:30 | ❌ Igual |
| 51900000952 (`f10f5d20-d7d9-4011-a578-4ad3a39fd2c3`) | 11:28:19 | Hola, quiero una consulta general en Surco el jueves 29 a las 9:30 | ❌ Igual |

**Debería:** ese cupo estaba libre (la IA lo ofreció en otros chats a la misma hora). Debe tomarlo y pasar a lo que falta.

### E4. «2 pm» no se entiende como 14:00. **2 de 2 veces.**

| Chat (conversación) | Hora | Paciente | IA |
|---|---|---|---|
| 51900000961 (`2461e2ec-00c3-48f7-a62a-6cd848de3861`) | 11:09:42 | 2 pm | 🕐 *Lunes 26* — 11:30, 12:00, 12:30 |
| 51900000951 (`bdbb3131-9768-43e6-b1b3-c256f02735aa`) | 11:28:48 | 2 pm | 🕐 *Lunes 26* — 11:30, 12:00, 12:30 |

**Debería:** ofrecer las 14:00 si están libres, o decir que no y dar las más cercanas.

### E5. Pide nombre, DNI y edad en un solo mensaje y no reconoce «Para mí». **3 de 3 veces.**

Chats 51900000957 (11:14:06), 51900000956 (`5c470b79-7a55-4889-8afe-151f7498ca3b`, 11:19:02) y 51900000953 (`24fe2878-d12a-412a-99c8-4ae55339959f`, 11:28:59). En los tres pasa lo mismo:
- la IA responde «Para reservar las 10:00 necesito su nombre completo, DNI (8 dígitos), edad (o fecha de nacimiento)»;
- el paciente dice «Para mí» y la IA repite el mismo mensaje.

**Debería:** preguntar primero «¿La cita es para usted o para otra persona?» y luego un dato por mensaje.

### E6. Las mismas frases dan resultados distintos

Se repitieron las mismas 5 frases de E2 («Quiero sacar una cita», «En San Isidro», «Mañana», «A las 10», «Para mí»):
- en el chat 51900000963, a las 11:09, **perdió la sede y el día**;
- en el chat 51900000953, a las 11:28, **asumió el servicio sin que el paciente lo dijera** («Le busqué cupos de consulta… *Sábado 24*») y aceptó las 10:00, que no estaba entre las horas ofrecidas.

Con las mismas frases, la conversación sale distinta cada vez. Por eso una prueba del programador puede pasar y la de Andy fallar.

### E7. Dos mensajes sin entender no pasan a recepción. **2 de 2 veces.**

Chats 51900000958 (`78d1edab-4604-46d9-942b-f5af7c590e3f`, 11:09) y 51900000950 (`eb8dc8a1-df46-40c8-8fea-8b0df31177cc`, 11:28):
- el paciente escribe «asdfgh qwerty» y luego «zxcvb ñlkjh»;
- la IA responde dos veces «No entiendo…»;
- `intentosFallidos` queda en 0 y el chat sigue en la IA.

### E8. Un chat viejo no se reinicia con «Hola». **2 de 2 veces.**

- **51900000966** (`f172cab6-7d70-432b-91a0-720acc994bd8`): el último mensaje anterior era del 20/10. A las 11:09 responde «¿Desea agendar una cita para una consulta general en la sede de San Isidro?». Retoma la reserva vieja.
- **51900000971** (`007fd370-22bf-4d76-8286-0e4a5df41cf5`): el último mensaje anterior era del 20/10. A las 11:28 el estado sigue en `S9_CONFIRMA`.

### E9. «Para mí» se toma como «sí, confirmo». **1 de 1.**

Chat 51900000972 (`7eba5d2d-8a74-4174-8fd2-341abdb7cea5`):
- **11:13:39:** la IA muestra el resumen y pide «Responda "sí, confirmo"».
- **11:13:49:** el paciente escribe «Para mí» y la IA **crea el link de pago**.

---

## 3. Lo que sí funciona (no debe romperse al corregir)

- **Agendar, pagar en el sandbox, cita, aviso y un solo cobro** (sección 1).
- **Link sin pagar:** «Mejor no, ya no quiero la cita» lo anula y lo dice (chat 51900000972, 11:15:29).
- **Cita pagada:** «Quiero cancelar mi cita» pasa el chat a recepción y la cita sigue confirmada (chat 51900000988).
- **Día sin doctor:** «El martes 27 no hay odontología general en Sede Surco; el siguiente día es el jueves 29» (chat 51900000960).
- **Fechas y sede:**
  - «Mañana», dicho el viernes, se entiende como sábado;
  - «Pero ya te había dicho la sede» sigue con los cupos ofrecidos.
- **Paciente registrado:** no se le piden nombre ni DNI.

**Para cerrar el flujo:** las 16 conversaciones de `FLUJO-WHATSAPP-GUIADO-2026-10-20.md` deben pasar **todas**, y repetidas, porque con las mismas frases hoy salen resultados distintos (E6).
