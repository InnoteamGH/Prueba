# WhatsApp con IA: escenarios para reproducir (23/10/2026, 14:46)

**Estado tras la última versión:**
- **Probada:** de 14:36 a 14:46, hora de Lima.
- **Aceptación:** pasan **14 de 16** conversaciones (13 completas y 1 a medias). Al mediodía pasaban 11 y a las 11:30, 7.
- **Ya se puede:**
  - elegir una hora de la lista (6 de 7 intentos);
  - anular un link sin pagar desde el chat.
- **Paciente registrado:** ya no se le piden datos.
- **Flujo completo:** se agendó eligiendo de la lista y se pagó sin problemas.

**Lo que queda, por orden de prioridad:**
1. **E1.** La hora pedida que no está en la lista o no está libre:
   - no avisa que no está libre;
   - no ofrece las horas más cercanas.
2. **E2.** Dos mensajes sin sentido no pasan a recepción.
3. **E3.** Elegir con el número de la opción («2») no funciona.
4. **E4.** La hora dicha antes del servicio se pierde (caso 4). En la versión anterior se guardaba.
5. **E5.** Mayúsculas a mitad de frase.

**Para reproducir:**
- **Paso 1:** crear un chat de prueba con un número ficticio (`POST /conversaciones`).
- **Paso 2:** mandar las frases una por una con `POST /conversaciones/{id}/simular`, esperando cada respuesta. También se puede escribir desde un WhatsApp real.
- **Horas:** de Lima, del 23/10/2026.
- **Logs:** el id de conversación sirve para buscarlos.

---

## E1. La hora pedida no está en la lista o no está libre

**Caso A: «2 pm» después de ver la lista** (chat 51900000925, conversación `a076fa74-ea67-458a-8fe6-91263b1e77c6`):

| Hora | Paciente | IA |
|---|---|---|
| 14:37:43 | Quiero una cita de consulta general en San Isidro | ¿Qué día prefiere? |
| 14:37:57 | El lunes 26 | 🕐 *Lunes 26* — 9:00, 9:30, 10:00. ¿Cuál le reservo? |
| 14:38:10 | **2 pm** | ❌ «Esa hora no está en la lista que le ofrecí. ¿Cuál le reservo?» |

**Caso B: la hora va en el pedido y no está libre** (chat 51900000921, conversación `42f6c982-493b-4a4e-9bb8-3cfd7680e783`; igual en el chat 971, `007fd370-22bf-4d76-8286-0e4a5df41cf5`, a las 14:38:31):

| Hora | Paciente | IA |
|---|---|---|
| 14:45:19 | Consulta general en Surco el jueves 5 de noviembre **a las 11:00** para mí | ❌ 🕐 *Jueves 5* — 9:00, 9:30, 10:00. ¿Cuál le reservo? (no dice nada de las 11:00) |

**Debería:**
- **Si la hora pedida está libre ese día** (aunque no esté en las 3 que mostró), reservarla.
- **Si no está libre:**
  - decirlo: «A las 11:00 ya no hay cupo el jueves 5»;
  - ofrecer las más cercanas antes y después (por ejemplo 10:30 y 11:30), no las primeras del día.

---

## E2. Dos mensajes sin sentido no pasan a recepción

Chats 51900000924 (`b6d7d747-815c-4886-9206-435ad3e043d5`) y 51900000923 (`bda27c46-1218-49a5-bb39-25193ce7a2f8`):

| Hora | Paciente | IA |
|---|---|---|
| 14:37:48 | asdfgh qwerty | No entiendo su mensaje. ¿Podría indicarme en qué puedo ayudarle hoy? |
| 14:38:02 | zxcvb ñlkjh | ❌ No entiendo su mensaje… ¿En qué puedo ayudarle hoy? |

`intentosFallidos` queda en 0, el chat sigue en `S1_INTENCION` y en la IA.

**Debería:**
- al segundo mensaje que no entiende, pasar el chat a recepción (`modo` humano, `porResponder` 1);
- avisar al paciente que recepción le escribirá.

---

## E3. Elegir con el número de la opción

Chat 51900000931 (`9c1c9108-bc71-4701-bd8a-edefbd26cba3`):

| Hora | Paciente | IA |
|---|---|---|
| 14:37:06 | El martes 27 | 🕐 *Martes 27* — 9:00, 9:30, 10:00. ¿Cuál le reservo? |
| 14:37:17 | **2** | ❌ Vuelve a mostrar 9:00, 9:30 y 10:00. |

«La segunda» sí funciona (chat 932).

**Debería:** tomar «2» como la segunda opción (9:30) cuando se está eligiendo de la lista.

---

## E4. La hora dicha antes del servicio se pierde

Chat 51900000927 (`847fc901-c5c1-46e1-9c37-80665a0e9b73`):

| Hora | Paciente | IA |
|---|---|---|
| 14:37:41 | Quiero sacar una cita | ¿En qué sede le atendemos? |
| 14:37:55 | En San Isidro | ¿Qué servicio necesita? |
| 14:38:09 | Mañana | ¿Qué servicio necesita? |
| 14:38:21 | **A las 10** | ¿Qué servicio necesita? |
| 14:38:36 | Para mí | ¿Qué servicio necesita? |
| 14:38:49 | Consulta general | ❌ 🕐 *Sábado 24* — 8:00, 8:30, 9:00. ¿Cuál le reservo? |

**Qué pasó:**
- guardó la sede y el día;
- perdió la hora, aunque las 10:00 estaban libres (figuran en `slotsOfrecidos`: `2026-10-24T10:00:00`);
- tampoco usó «Para mí».

**En la versión del mediodía sí funcionaba:** respondía «Para reservar las 10:00 necesito su nombre completo».

**Debería:** reservar las 10:00 y pasar a los datos.

---

## E5. Mayúsculas a mitad de frase

Chat 51900000930, a las 14:37:06: «El **M**artes 27 no hay **O**dontología general en Sede Surco; el siguiente día es el **J**ueves 29».

**Debería:** «el martes 27 no hay odontología general en Sede Surco; el siguiente día es el jueves 29».

---

## Corregido ✅ (no debe romperse)

| Antes | Ahora (14:36 a 14:46) |
|---|---|
| **Elegir de la lista:** fallaba siempre («Esa hora no está disponible»). | Funcionan «A las 9:30», «9:30», «El de las 9:30», «La segunda» y una hora de otro día ofrecido (chats 930 a 935 y 971). |
| **Link sin pagar:** «Mejor no, ya no quiero la cita» devolvía el resumen. | «Listo: anulé el link de pago pendiente del jueves 5/11. El cupo quedó libre» (chat 971, 14:40:33). El link quedó anulado. |
| **Paciente registrado:** le pedía nombre, DNI y edad. | «¿La cita es para usted, QA Izipay Cuarenta Uno?» y pasa al resumen (chat 971). |
| **Nombre:** uno escrito solo no se reconocía. | «QA Izipay Cuarenta Siete» se toma como nombre (chat 922). |
| **Confirmación:** pedía «sí, confirmo» dos veces. | Un solo resumen, con el doctor, y una sola confirmación (chat 935). |
| **Saludo:** decía «Odonto Sonrisa». | «le saluda *Clínica Dental Sonríe+*». |

**Corregido antes (también sigue bien):**
- saludo con menú;
- un dato por mensaje;
- pregunta el día en vez de ofrecer hoy;
- pedido completo en un mensaje (chats 926 y 922);
- «Hola» reinicia un chat viejo (chat 976);
- «Mañana» = sábado;
- día sin doctor (chat 930).

**El flujo completo funciona (chat 935, `ac796200-a79b-4a8e-bead-75bf07d4549c`):**
1. El paciente elige «A las 9:30» de la lista.
2. Da sus datos y confirma una sola vez.
3. Recibe el link y paga en el sandbox.
4. Queda la cita confirmada el 30/10, con aviso por WhatsApp y **un solo cobro**.

**Derivación de una cita pagada:** «Quiero cancelar mi cita» pasa el chat a recepción y la cita sigue confirmada (chat 945, 14:41:33).
