# WhatsApp con IA: escenarios para reproducir (23/10/2026, 20:50)

**Estado tras la última versión:**
- **Probada:** de 20:34 a 20:50, hora de Lima.
- **En chats nuevos** pasan:
  - las **16 de 16** conversaciones de aceptación;
  - los escenarios E1 a E5;
  - las 9 formas de elegir de la lista.
- **Formato de horas:** el aviso de hora ocupada ya lo usa bien (D1 corregido).

**Lo que falla: volver a escribir en un chat reciente.**
- **E7, bloqueo:** «Hola» en el resumen confirma la reserva y envía el link de pago.
- **E6:** «Hola» o un pedido nuevo mientras se pide el nombre no reinicia:
  - se ignora, o
  - se guarda como nombre del paciente.

  Al final el chat pasa a recepción.

En chats de hace 6 horas «Hola» sí reinicia. Falla en chats de hace 15 segundos a 35 minutos. La regla 7 de `FLUJO-WHATSAPP-GUIADO-2026-10-20.md` dice que la conversación empieza de cero «si el paciente solo saluda», sin importar el tiempo.

**Para reproducir:**
- **Paso 1:** crear un chat de prueba con un número ficticio (`POST /conversaciones`).
- **Paso 2:** mandar las frases una por una con `POST /conversaciones/{id}/simular`, esperando cada respuesta. También se puede escribir desde un WhatsApp real.
- **Horas:** de Lima, del 23/10/2026.
- **Logs:** el id de conversación sirve para buscarlos.

**Este documento queda como prueba de regresión:** cada versión nueva debe repetir todos los escenarios, además de las 16 conversaciones de `FLUJO-WHATSAPP-GUIADO-2026-10-20.md`.

---

## Falla en esta versión ❌

### E7. «Hola» en el resumen confirma la reserva (bloqueo)

Chat 51900000817 (`9dd1b21c-9f7d-4c10-af4a-43c1ed63ecad`), chat nuevo:

| Hora | Paciente | IA |
|---|---|---|
| 20:39:40 | Consulta general en San Isidro el martes 27 a las 10:00 para mí | Para reservar las 10:00 necesito su nombre completo. |
| 20:39:55 | QA Izipay Cincuenta Dos | …necesito su DNI. |
| 20:40:10 | 99771273 | …necesito su edad. |
| 20:40:24 | 30 | Resumen: martes 27/10 a las 10:00, Sede San Isidro con Dr. Miguel Flores. ¿Confirma la reserva? Responda «sí, confirmo». |
| 20:40:39 | **Hola** | ❌ «Para reservar su cita necesito confirmar el pago…» + link `35d6759d…`. Toma el cupo y crea el paciente. |

**También en el chat 903** (`1e1be7b3-8f92-4e21-8d83-97f209663d0d`):
- **20:34:50:** «Hola» envió el link del sábado 24/10 a las 10:00.
- **Después,** «Quiero sacar una cita» → «No pude completar la reserva ahora».
- **Al final,** el chat pasó a recepción.

**Con un paciente registrado** (chat 971, `007fd370-22bf-4d76-8286-0e4a5df41cf5`):
- **20:36:05:** «Hola» volvió a mostrar el resumen de una reserva ya cancelada.
- **Después,** el pedido siguiente generó otro link.

**Con una cita ya pagada** (chat 916, `d1f32dd6-5de5-488c-b051-fa8b65c1d070`): «Hola» respondió «No pude completar la reserva ahora. ¿Le busco otros cupos?».

**Debería:**
- «Hola» muestra el saludo y el menú, sin confirmar nada;
- solo «sí, confirmo» (o equivalente) confirma.

### E6. «Hola» o un pedido nuevo mientras se pide el nombre

**Chat nuevo 51900000816** (`783bd542-d13e-4c12-8374-09c964f43608`): «Para mí» (20:40:27) → «Hola» (20:40:43) → ❌ «Para reservar las 10:00 necesito su nombre completo».

**Chat 51900000905** (`f4510f5b-6b01-4168-9a21-3aeb6b6deb9f`), con el nombre pendiente desde las 20:03:

| Hora | Paciente | IA |
|---|---|---|
| 20:35:06 | Hola | ❌ Para reservar las 14:00 necesito su nombre completo. |
| 20:35:28 | Quiero una cita de consulta general en San Isidro | ❌ Igual. |
| 20:35:42 | El lunes 26 | ❌ No entendí. Para reservar las 14:00… |
| 20:35:57 | 2 pm | Derivado a recepción. |

**El texto se guarda como nombre:**
- **Chat 914** (`bc909428-0b6f-4be5-b4a6-0c479befc5c6`), 20:35:56: «Quiero una cita de consulta general en Surco» → «…necesito su **DNI**». Igual en el chat 911 (`3a047109-…`).
- **Chat 913** (`528a94cd-892b-4581-93e9-2c4a9c29a084`), 20:36:14: «La segunda» → «…necesito su DNI».

**Debería:**
- «Hola» empieza de cero;
- un pedido nuevo se atiende como pedido nuevo;
- un texto que no parece un nombre (un pedido, «La segunda», un día) no se guarda como nombre.

**Funciona con más tiempo:**
- **Chats:** 930, 931 y 921, de las 14:37–14:45.
- **Resultado:** «Hola» a las 20:39–20:40 → saludo y menú.

---

## Corregido ✅ (no debe romperse)

Evidencia de R37 (19:57 a 20:06). En R38 se repitieron en chats nuevos (801 a 815) con el mismo resultado.

### E1. La hora pedida que no está en la lista o no está libre

| Caso | Chat (conversación) | Paciente | IA |
|---|---|---|---|
| **«2 pm» después de la lista** | 51900000905 (`f4510f5b-6b01-4168-9a21-3aeb6b6deb9f`) | Lista del lunes 26: 9:00, 9:30, 10:00 → **«2 pm»** (19:59:42) | «¿La cita es para usted…?» → «Para reservar las **14:00**…» |
| **Hora pedida ocupada** | 51900000906 (`08d66435-9caa-42d1-9c59-c217b11fb2bd`) | «Consulta general en Surco el jueves 5 de noviembre **a las 11:00** para mí» (19:59:33) | «**Las 11:00 no están libres.** Las más cercanas son 10:30, 11:30 y 10:00. ¿Cuál le reservo?» |
| **Hora ocupada elegida después de la lista** | 51900000918 (`fa48479e-d44c-4070-9611-2afeec053f5c`) | Lista del viernes 30: 9:00, 10:30, 11:00 → **«A las 9:30»** (20:04:13) | «Las 09:30 no están libres. Las más cercanas son 09:00, 10:30 y 11:00.» |
| **Hora de la tarde en el pedido** | 51900000919 (`3771d043-91db-4831-a74f-43a7cf8f403e`) | «Consulta general en San Isidro el lunes 26 **a las 4 pm** para mí» (20:03:51) | «Para reservar las **16:00**…» |

### E2. Dos mensajes sin sentido pasan a recepción

Chats 51900000907 (`2726d8f5-920b-45f3-84dd-3dafa4f13ec7`) y 51900000908 (`d1b7350c-71a5-4a3a-8b3f-014dff867d80`):

| Hora | Paciente | IA |
|---|---|---|
| 19:59:30 | asdfgh qwerty | No entendí su mensaje. ¿En qué podemos ayudarle? (`intentosFallidos` 1) |
| 19:59:46 | zxcvb ñlkjh | «No logré entender el pedido. Una persona de recepción le escribirá por aquí en breve.» + «— Derivado a recepción —» |

**Estado final:** `modo` humano, `porResponder` 1, `intentosFallidos` 2.

### E3. Elegir con el número de la opción

| Chat (conversación) | Lista | Paciente | Reserva |
|---|---|---|---|
| 51900000909 (`99d9f907-3971-4153-8109-7c1a4407458d`) | Martes 27: 9:00, 9:30, 10:00 | **«2»** (20:00:08) | 09:30 |
| 51900000917 (`586b7c24-8b8f-437b-a571-ab61ead9caed`) | Lunes 26: 9:00, 9:30, 10:00 | **«1»** | 09:00 |

### E4. La hora dicha antes del servicio se guarda

Chat 51900000903 (`1e1be7b3-8f92-4e21-8d83-97f209663d0d`):

| Hora | Paciente | IA |
|---|---|---|
| 19:59:16 | Quiero sacar una cita | ¿En qué sede le atendemos? |
| 19:59:38 | En San Isidro | ¿Qué servicio necesita? |
| 19:59:51 | Mañana | ¿Qué servicio necesita? |
| 20:00:07 | **A las 10** | ¿Qué servicio necesita? |
| 20:00:23 | Para mí | ¿Qué servicio necesita? |
| 20:00:37 | Consulta general | ✅ «Para reservar las **10:00** necesito su nombre completo.» |

El resumen dice «sábado 24/10 a las 10:00, Sede San Isidro con Dra. Carla Mendoza». Guardó también «Para mí».

### E5. Minúsculas a mitad de frase

Chat 51900000910, 19:59:36: «El martes 27 no hay odontología general en Sede Surco; el siguiente día es el jueves 29».

---

## D1. Formato de horas en el aviso de hora ocupada ✅ (corregido en R38)

- **Antes (R37):** «Las 09:30 no están libres. Las más cercanas son 09:00, 10:30 y 11:00» y «10:30, 11:30 y 10:00».
- **Ahora:**
  - «Las 11:00 no están libres. Las más cercanas son 10:00, 10:30 y 11:30» (chat 805);
  - «Las 9:30 no están libres. Las más cercanas son 9:00, 11:00 y 11:30» (chat 814).

---

## También sigue bien

| Qué | Dónde |
|---|---|
| **Elegir de la lista:** «A las 10:00», «10:00», «El de las 9:30», «La segunda», «La primera», «2», «1», una hora de otro día ofrecido y una hora del aviso de ocupada. | Chats 909 a 917 y 906 |
| **Link sin pagar:** «Mejor no, ya no quiero la cita» → «Listo: anulé el link de pago pendiente del jueves 5/11. El cupo quedó libre». | Chat 971, 20:00:57 |
| **Paciente registrado:** «¿La cita es para usted, QA Izipay Cuarenta Uno?» y pasa al resumen. | Chat 971 |
| **Cita pagada:** «¿Puedo pasar mi cita a otro día?» deriva a recepción y la cita sigue confirmada. | Chat 935, 20:00:24 |
| **Saludo** con el nombre de la clínica y el menú, también en un chat viejo. | Chats 901 y 976 |
| **Sin servicio:** «Para mí» sin servicio → pregunta el servicio. | Chat 915 |

**Flujo completo** (chat 51900000916, `d1f32dd6-5de5-488c-b051-fa8b65c1d070`):
1. El paciente elige «A las 10:00» de la lista.
2. Da su nombre, DNI y edad, uno por mensaje.
3. Confirma una sola vez y recibe el link.
4. Paga en el sandbox.
5. Queda la cita confirmada el 30/10, con el aviso «✅ Pago recibido» y **un solo cobro**.
