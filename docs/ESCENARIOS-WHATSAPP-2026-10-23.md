# WhatsApp con IA: escenarios para reproducir (24/10/2026, 16:00)

**Estado tras la última prueba:**
- **Probada:** el 24/10 de 15:35 a 15:55, hora de Lima.
- **Sin cambios respecto de R39 (13:09).**
- **Siguen bien:** E1 a E7, el formato de horas, anular un link sin pagar y el pago completo.
- **Prueba con recepción:** se repitió en la app (`PRUEBA-CLIENTE-Y-RECEPCION-2026-10-24.md`, sección 5).

**Lo que falla (E8 a E13, igual que en R39):**
- **E8:** doble confirmación con paciente nuevo. Con paciente registrado se confirma una sola vez, pero con el resumen corto.
- **E9:** el aviso de «día sin atención» contradice la hora pedida.
- **E10:** «La segunda» sin lista en pantalla cambia la hora.
- **E11:** pedir una persona o preguntar el precio se ignora.
- **E12:** la IA no ve la cita que agendó o cambió recepción.
  - Si el paciente pide cambiarla, arma una reserva nueva.
  - Además, en R40 «Ver o cambiar una cita» abre un submenú cuyo «1) Saber horario» responde «¿En qué sede…?».
- **E13:** los chats sin sede no los ve ninguna recepción.

**Para reproducir:**
- **Paso 1:** crear un chat de prueba con un número ficticio (`POST /conversaciones`).
- **Paso 2:** mandar las frases una por una con `POST /conversaciones/{id}/simular`, esperando cada respuesta. También se puede escribir desde un WhatsApp real.
- **Horas:** de Lima.
- **Logs:** el id de conversación sirve para buscarlos.

**Este documento queda como prueba de regresión:** cada versión nueva repite todos los escenarios, además de:
- las 16 conversaciones de `FLUJO-WHATSAPP-GUIADO-2026-10-20.md`;
- la prueba con recepción.

---

## Falla en esta versión ❌

### E8. Doble confirmación (regresión de R35)

Chat 51900000818 (`ef5185f6-2b24-4d40-848b-22b0f0f63bf8`), paciente registrado, 24/10:

| Hora | Paciente | IA |
|---|---|---|
| 13:11:01 | Quiero una consulta general en Surco el jueves 5 de noviembre a las 10:00 | ¿La cita es para usted, QA Izipay Cincuenta Tres? |
| 13:11:17 | Sí, para mí | ❌ «Resumen: jueves 5/11 a las 10:00 en surco. ¿Confirma la reserva? Responda «sí, confirmo».» |
| 13:11:31 | Sí, confirmo | ❌ «Resumen de su cita: 📅 jueves 5/11 a las 10:00 📍 Sede Surco con Dr. Miguel Flores. ¿Confirma la reserva?…» |

Igual en el chat 819, con un paciente nuevo.

**R40:** igual en el chat 832 (`3ff42210-…`, paciente nuevo, 15:37:44 y 15:37:59) y en el 848 (pago). En el 818 (paciente registrado), una sola confirmación, pero con el resumen corto.

**Debería:** un solo resumen, con el doctor y la sede con mayúscula, y una sola confirmación, como en R36 a R38.

### E9. «Mañana» cae en un día sin atención

Chat 51900000827 (`2512fb29-3742-4c44-9b78-0df16e592dd1`), sábado 24/10: «Quiero sacar una cita» → «En San Isidro» → «Mañana» → «A las 10» → «Para mí» → «Consulta general» (13:11:50):

> ❌ «Las 10:00 no están libres. ¿Qué otro horario prefiere? El domingo 25 no hay odontología general en Sede San Isidro; el siguiente día es el lunes 26: 🕐 Lunes 26 — 9:00, 9:30, **10:00**, 10:30, 11:00»

**Debería:** «El domingo 25 no atendemos. El lunes 26 a las 10:00 está libre: ¿se la reservo?»

**R40:** igual en el chat 833 (`1234f9e9-…`), a las 15:38:33.

### E10. «La segunda» sin lista en pantalla

Chat 51900000822 (`42ab2980-9d16-4225-85b3-766357b43075`):

| Hora | Paciente | IA |
|---|---|---|
| 13:10:27 | Consulta general en San Isidro el lunes 26 a las 11:00 para mí | Para reservar las 11:00 necesito su nombre completo. |
| 13:10:45 | La segunda | ❌ «Para reservar las **09:30** necesito su nombre completo.» |

**Debería:** mantener las 11:00 y repetir la pregunta del nombre. Solo vale elegir «la segunda» si la lista está en pantalla.

**R40:** igual en el chat 834 (`0a487c71-…`), a las 15:37:38.

### E11. Pedir una persona, o una pregunta, se ignora

Chat 51900000831 (`64508a64-cf3e-4255-a52a-478ffb93aba0`):

| Hora | Paciente | IA |
|---|---|---|
| 13:13:09 | Prefiero que me atienda una persona, por favor | ❌ «¿En qué sede le atendemos?» |
| 13:18:15 | ¿Cuánto cuesta y aceptan seguro Rímac? | ❌ «¿Cuál le reservo?» |

**R40:** igual en los chats 835 y 836, y en el 849 («¿Cuánto cuesta?» → «No entendí. ¿Puede indicarme sede, día u hora de la cita?»).

**Debería:**
- **Si pide una persona:** pasar el chat a recepción y decirlo.
- **Si pregunta precio o seguro:** responder con los datos de la clínica, o pasar el chat a recepción si no los tiene, y luego seguir con la reserva.

### E12. Con recepción de por medio, la IA no ve la cita

**Mismo chat 831.** Recepción tomó el control, registró al paciente, agendó la cita del jueves 29 a las 10:30, la confirmó y devolvió el chat a la IA:

| Hora | Paciente | IA |
|---|---|---|
| 13:38:41 | Gracias. ¿A qué hora era mi cita? | ❌ «¿Cuál le reservo?» (retoma la oferta de antes) |
| 13:38:57 | ¿Me la puede pasar al viernes 30 en la mañana? | ❌ Ofrece cupos para una cita nueva. |
| 13:39:51 | (A las 9:00 → Sí, para mí) | ❌ «Resumen: viernes 30/10 a las 09:00 en surco. ¿Confirma la reserva?»: quedarían dos citas. |
| 13:48:56 | Ver el estado de mi cita | ❌ «¿En qué sede le atendemos?» |

**Chat 51900000920** (`fa7ea56f-…`), cita pagada que recepción reprogramó:
- **13:47:05:** «¿A qué hora es mi cita?» → ❌ «¿En qué sede le atendemos?».
- **Con «Hola» → «2»:** ✅ «Su cita está agendada para el jueves 29 de octubre a las 11:00».

**R40:**
- **Chat 849:** al devolverle el chat, «¿A qué hora es mi cita?» → «¿Puede indicarme sede, día u hora de la cita?». «¿Me la puede pasar al viernes 30 a las 9:00?» → resumen de una cita nueva.
- **Chat 848**, pagada y reprogramada por recepción:
  - «Hola» → «2» → submenú «1) Saber horario 2) Cambiar fecha/hora 3) Cancelar»;
  - «1» → «¿En qué sede le atendemos?».
- **Chat 920:** «2» sí muestra la cita.

**Debería:**
- **Al recibir el chat de recepción:** la IA empieza de cero y consulta las citas del paciente.
- **Si pregunta por su cita, en texto libre:** se la muestra.
- **Si pide cambiarla:** la cambia o la pasa a recepción, sin crear otra.

### E13. Chats sin sede: ninguna recepción los ve

- **Chats afectados:** los derivados por «dos mensajes sin sentido» (825, 902, 959, 907 y 908) no tienen sede.
- **Quién no los ve:** la recepción de San Isidro, la de Surco y el administrador de Surco. Solo los ve el administrador general.
- **Chat 831:** no apareció en la bandeja de Surco hasta que la IA buscó cupos, aunque el paciente ya había dicho «En Surco».

**R40:** igual en el 837 (derivado, sin sede) y en el 838, que dijo «En Surco» y quedó sin sede.

**Debería:**
- **Sede dicha:** se guarda apenas el paciente la dice.
- **Sin sede:** el chat lo ven todas las recepciones.

---

## Corregido ✅ (no debe romperse)

### E6 y E7. «Hola» en un chat reciente (corregido en R39)

| Chat | Prueba | R39 |
|---|---|---|
| 819 (`1b16da64-…`) | Resumen → «Hola» | Saludo y menú; no crea link. |
| 820 (`527e2f37-…`) | Pidiendo el nombre → «Hola» | Saludo y menú. |
| 821 (`c817aced-…`) | Pidiendo el nombre → «Quiero una cita de consulta general en Surco» | «¿Qué día prefiere?» |
| 823 (`e4bf2a14-…`) | Lista en pantalla → «Hola» | Saludo y menú. |

En R38, «Hola» en el resumen enviaba el link de pago (chats 817 y 903), y mientras se pedía el nombre el texto se guardaba como nombre (chats 911, 913 y 914).

Evidencia de E1 a E5 de R37 (23/10, 19:57 a 20:06). En R38 se repitieron en los chats 801 a 815, y en R39 en los chats 824 a 829 y 830, con el mismo resultado.

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
