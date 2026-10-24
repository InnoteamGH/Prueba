# Flujo de WhatsApp guiado: qué falla hoy y cómo debe funcionar (20/10/2026)

**En una frase:** la IA conversa bien, pero el control de la conversación se pierde. El estado interno no coincide con lo que la IA pregunta, un chat viejo retoma una reserva de hace meses y un dato dicho en un mensaje aparte se pierde. La solución es que **el código lleve el flujo** y la IA solo interprete lo que escribe el paciente.

---

## 1. La prueba real del 20/10 (chat «Andy», San Isidro)

| El paciente escribió | El sistema respondió | Qué falla |
|---|---|---|
| «Hola» | «Le busqué cupos de Odontología general en Sede San Isidro… Martes 20 — 9:00, 9:30, 10:00» | Ofrece cupos sin que nadie los pida. **Causa:** el chat se creó el **06/08** y seguía en el estado de esa conversación (`S6_OFERTA`, odontología general, San Isidro). El estado nunca se reinicia. |
| «Todavía no he preguntado» | Otros 3 cupos | Sigue en la reserva vieja. |
| «Pero no te he preguntado nada» | «Disculpe, puede indicar qué consulta desea…» | — |
| «Necesito una cita para san Isidro» | Cupos 14:00, 14:30, 15:00 | No pregunta el tipo de consulta: usa el de agosto. |
| «2 pm» | «¿La cita es para usted o para otra persona?» | — |
| «Para mí» | «Para confirmar el cupo necesito sede, día y hora…» | **Pierde la sede y la hora** que ya dio. |
| «Pero ya te había dicho la sede» | Cupos 16:30, 17:00, 17:30 | Ofrece otros horarios; las 14:00 elegidas se perdieron. |

## 2. Reproducido en chats de prueba

**Chat nuevo** (51900000967) con las mismas frases:
- Con «Necesito una cita para san Isidro», el estado interno queda en «falta la sede» aunque la sede ya está. La IA pregunta el día.
- Con «2 pm» y luego «Para mí», la IA busca cupos y responde: «Para agendar la cita, necesito saber si la cita es para usted», justo después de que el paciente lo dijo.
- Con «Pero ya te había dicho la sede», la IA vuelve a pedir el día y el estado regresa a «falta la sede».

**Conversación natural, un dato por mensaje** (51900000966). Frases: «Hola», «Quiero sacar una cita», «En San Isidro», «Mañana», «A las 10», «Para mí», «Consulta general».
- Pregunta **3 veces** el tipo de consulta y, como el paciente no lo dice, **reserva igual con el Dr. Luis Paredes (ortodoncia)** sin avisar. Cuando el paciente dice «Consulta general», responde «La cita está programada para ortodoncia».
- «Mañana» dicho un martes: responde «**Mañana martes**…» y luego ofrece cupos del miércoles 21.
- El paciente dijo «a las 10» y recibe «09:00, 09:30, 10:00 ¿Cuál hora le reservo?».
- Llega al resumen («¿Confirma la reserva?») **sin haber pedido nombre ni DNI** a un número nuevo.

**No es el tamaño de la ventana de contexto.** Las conversaciones que fallan tienen de 5 a 7 mensajes. Falla porque el estado guardado y la respuesta de la IA van por caminos distintos: la IA contesta sin consultar el estado, y el estado no se actualiza con lo que la IA entendió.

## 3. Por qué las pruebas anteriores no lo detectaron

Las rondas de QA probaron siempre el mismo camino:
- un primer mensaje completo («Hola, quiero una cita de consulta general en Surco para el sábado 19 de diciembre, ¿qué horarios hay?»);
- después, respuestas exactas a cada pregunta («El de las 08:00», «Me llamo…, DNI…, tengo 35 años», «Sí, confirmo»).

Nunca se probó:
- empezar solo con «Hola»;
- dar un dato por mensaje;
- respuestas cortas como «2 pm» o «Para mí»;
- corregir a la IA;
- volver a escribir en un chat viejo.

Las conversaciones de la sección 5 cubren esos casos y desde ahora entran en todas las rondas.

---

## 4. Cómo debe funcionar

### Reglas

1. **El código lleva el flujo; la IA solo interpreta.** La IA convierte el texto del paciente en datos: sede, especialidad, día, hora, para quién, nombre, DNI y edad. El código decide la siguiente pregunta, y los textos salen de plantillas fijas.
2. **Una pregunta por mensaje.** No pedir nombre, DNI y edad juntos.
3. **Lo dicho no se vuelve a pedir.** Cada dato se guarda en la conversación, en la base de datos, apenas se entiende. Se acepta en cualquier orden y varios en un solo mensaje.
4. **El código resuelve fechas y horas**, con la hora de Lima:
   - «mañana», «el martes» y «pasado mañana» pasan a una fecha;
   - «2 pm», «a las 10» y «14 h» pasan a una hora.
5. **Máximo 3 opciones.** Si el paciente dio una hora y está libre, se ofrece esa sola. Si no, las 2 o 3 más cercanas.
6. **Nada se asume.** La especialidad se pregunta antes de buscar cupos y nunca toma la de otra conversación ni la del primer doctor libre.
7. **Reinicio:** si pasaron más de 12 horas desde el último mensaje, o el paciente solo saluda, la conversación empieza de cero. Se mantiene quién es el paciente si ya está registrado.
8. **Saludo:** «Hola, soy el asistente de [clínica]. ¿Qué necesita? 1) Agendar una cita 2) Ver o cambiar mi cita 3) Otra consulta».
9. **Si no entiende dos veces seguidas**, pasa el chat a recepción y lo dice.
10. **Paciente registrado** (celular conocido): no se le piden nombre ni DNI; se confirma «¿La cita es para usted, [nombre]?».

### Orden de las preguntas (una por mensaje; se salta la que ya tiene respuesta)

1. ¿Qué necesita? (agendar / mi cita / otra consulta)
2. Especialidad: las de la sede, numeradas.
3. Sede: solo si atiende en más de una.
4. Día: si no hay doctor de esa especialidad ese día, se dice y se ofrece el siguiente.
5. Hora: máximo 3 opciones.
6. ¿Para usted o para otra persona?
7. Nombre (solo si es nuevo).
8. DNI (solo si es nuevo).
9. Edad o fecha de nacimiento (solo si es nuevo).
10. Resumen: especialidad, doctor, sede, día y hora. «¿Confirma?»
11. Link de pago.

---

## 5. Conversaciones de aceptación

Estas son las pruebas de la próxima ronda. Cada una debe dar el resultado indicado.

| # | El paciente escribe | Debe pasar |
|---|---|---|
| 1 | «Hola» | Saludo y menú. Ningún cupo. |
| 2 | «Hola» en un chat con una reserva vieja (días o meses atrás) | Empieza de cero; no retoma la reserva vieja. |
| 3 | «Hola» → «Todavía no he preguntado» | No ofrece cupos; repite el menú. |
| 4 | «Quiero sacar una cita» → «En San Isidro» → «Mañana» → «A las 10» → «Para mí» | Pregunta la especialidad una sola vez y en su turno. No vuelve a pedir sede, día ni hora. Si las 10:00 están libres, ofrece solo esa hora. |
| 5 | Todo en un mensaje: «Consulta general en Surco el jueves 24 a las 9:30 para mí» | Pasa directo a lo que falta (nombre, DNI, edad) o al resumen. |
| 6 | «2 pm» | Entiende 14:00. |
| 7 | «Pero ya te había dicho la sede» | Reconoce el dato y sigue con lo pendiente, sin volver a empezar. |
| 8 | Llega a «Para mí» sin haber dicho la especialidad | La pregunta antes del resumen; nunca reserva ortodoncia ni otra por su cuenta. |
| 9 | «Mañana», dicho un martes | Miércoles, y el texto dice «mañana miércoles». |
| 10 | «El martes 22» en Surco para odontología general | «El martes 22 no hay odontología general en Surco; el siguiente día es el jueves 24». |
| 11 | Número nuevo hasta el resumen | Pide nombre, DNI y edad, uno por mensaje, antes del resumen. |
| 12 | Paciente registrado | No pide nombre ni DNI. |
| 13 | Link sin pagar + «Mejor no, ya no quiero la cita» | Anula el link y lo dice. No responde «su cita sigue confirmada». |
| 14 | Cita pagada + «Quiero cancelar» o «¿Puedo pasar mi cita…?» | Deriva a recepción (ya funciona; no debe romperse). |
| 15 | Dos mensajes seguidos que no entiende | Pasa el chat a recepción y lo dice. |
| 16 | Flujo completo con pago en el sandbox | Cita confirmada, aviso por WhatsApp y un solo cobro en Caja (ya funciona; no debe romperse). |

---

## 6. Chats de prueba creados hoy

- **51900000967** («QA R34 Real Uno») y **51900000966** («QA R34 Real Dos»), números ficticios.
- El 966 quedó en el resumen de una cita del miércoles 21/10 a las 10:00, **sin confirmar**: no se creó cita ni link.
- No se tocó el chat real de «Andy»; solo se miró su estado en la lista de conversaciones.
