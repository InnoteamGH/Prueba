# Pendientes del servidor y cambios del frontend (actualizado el 24/10/2026)

**Archivos:**

| Archivo | Para qué |
|---|---|
| **Este documento** | Lo que ya quedó bien y lo que falta, en orden de prioridad. |
| **`cambio-frontend-diseno-2026-10-23.patch`** | El cambio del frontend: cifras, fechas, textos y botones en todas las pantallas. Ya incluye el ajuste de `cambio-frontend-QA33.patch`. |
| **`REVISION-DISENO-2026-10-23.md`** | Qué cambia el parche, pantalla por pantalla. |
| **`FLUJO-WHATSAPP-GUIADO-2026-10-20.md`** | Cómo debe funcionar el WhatsApp guiado y las 16 conversaciones de aceptación. |
| **`QA-REVISION-39-2026-10-24.md`** | Evidencia de la última prueba (24/10, 13:09 a 13:55): E6 y E7 corregidos, regresión y la prueba paciente más recepción. |
| **`PRUEBA-CLIENTE-Y-RECEPCION-2026-10-24.md`** y **`capturas-r39/`** | La prueba de punta a punta: el paciente empieza por WhatsApp y la recepción sigue en la app (tomar control, registrar, agendar, confirmar, reprogramar, devolver a la IA). Paso a paso, con capturas. |
| **`QA-REVISION-38-2026-10-23.md`** | Evidencia de la prueba anterior (23/10, 20:34 a 20:50). |
| **`ESCENARIOS-WHATSAPP-2026-10-23.md`** | Los escenarios de WhatsApp paso a paso, con hora e id de conversación: E8 a E13, que fallan, y E1 a E7, ya corregidos, como prueba de regresión. |

Todo se verificó en producción (`app.odontosonrisa.biz` y su API) el 23 y el 24/10/2026, con datos de prueba «QA» y el sandbox de Izipay.

---

## 1. Ya quedó bien ✅

| Tema | Cómo responde ahora |
|---|---|
| **Saludo** | «¿En qué podemos ayudarle? 1) Agendar una cita 2) Ver o cambiar una cita 3) Otra consulta». |
| **Un dato por mensaje** | Sede, servicio, día, hora, «¿para usted o para otra persona?», nombre, DNI y edad, en ese orden y de a uno. |
| **Guarda lo que el paciente ya dijo** | El día, la hora o el DNI dichos antes de tiempo se usan después, sin volver a pedirlos. |
| **Pedido completo en un mensaje** | «Consulta general en Surco el jueves 29 a las 9:30 para mí» pasa directo al nombre. |
| **Pregunta el día** | Ya no ofrece hoy, ni horas que ya pasaron, cuando el paciente no dijo el día. |
| **Chat viejo** | «Hola» empieza de cero con el menú. |
| **Elegir una hora de la lista** | 9 de 9: «A las 10:00», «10:00», «El de las 9:30», «La segunda», «La primera», «2», «1», una hora de otro día ofrecido y una hora del aviso de ocupada. Cada una reserva la hora elegida. |
| **Hora pedida** | «2 pm» → 14:00 y «a las 4 pm» → 16:00. Si está ocupada: «Las 11:00 no están libres. Las más cercanas son 10:30, 11:30 y 10:00». |
| **Hora dicha antes del servicio** | «Mañana» → «A las 10» → «Para mí» → «Consulta general» → «Para reservar las 10:00 necesito su nombre completo». |
| **Dos mensajes sin sentido** | Al segundo: «Una persona de recepción le escribirá por aquí en breve». El chat pasa a recepción. |
| **Minúsculas** | «El martes 27 no hay odontología general en Sede Surco; el siguiente día es el jueves 29». |
| **Formato de horas** | «Las 11:00 no están libres. Las más cercanas son 10:00, 10:30 y 11:30»: sin cero delante y en orden (W18). |
| **«Hola» reinicia siempre** | En el resumen, mientras pide un dato o con la lista en pantalla: saludo y menú, sin confirmar nada (W19 y W20). Un pedido nuevo se atiende como pedido nuevo. |
| **Recepción en la app** | Tomar control, responder, registrar al paciente desde el chat, agendar con sillón, confirmar en la agenda, reprogramar y devolver a la IA. La IA no contesta mientras recepción tiene el control, y al reprogramar se mantiene un solo cobro. |
| **Agendar y pagar** | Elegir de la lista → datos → **una sola** confirmación → link → pago en el sandbox → cita confirmada → aviso por WhatsApp → **un solo cobro** en Caja. |
| **Anular un link sin pagar** | «Mejor no, ya no quiero la cita» → «Listo: anulé el link de pago pendiente… El cupo quedó libre». |
| **Paciente registrado** | «¿La cita es para usted, QA Izipay Cuarenta Uno?» y pasa al resumen, sin pedir datos. |
| **Nombre escrito solo** | «QA Izipay Cuarenta Siete» se toma como nombre. |
| **Nombre de la clínica** | El saludo dice «le saluda *Clínica Dental Sonríe+*». |
| **Derivar una cita pagada** | «¿Puedo pasar mi cita a otro día?» y «Quiero cancelar mi cita» pasan el chat a recepción y la cita sigue confirmada. |
| **Día sin doctor de la especialidad** | Avisa y ofrece el siguiente día. |
| **Fechas relativas** | «Mañana», dicho un viernes, se entiende como sábado. |

---

## 2. WhatsApp y recepción: lo que falta (prioridad alta)

**Versión probada el 24/10 a las 13:09:**
- **Corregido:** W19 y W20 («Hola» en un chat reciente).
- **Regresión:** volvió la doble confirmación.
- **Prueba nueva:** por primera vez se hizo la prueba paciente más recepción en la app.
- **Detalle:**
  - `QA-REVISION-39-2026-10-24.md`;
  - `PRUEBA-CLIENTE-Y-RECEPCION-2026-10-24.md`;
  - los escenarios E8 a E13 de `ESCENARIOS-WHATSAPP-2026-10-23.md`.

| # | Qué falla | Cómo está hoy | Veces |
|---|---|---|---|
| W21 | **Recepción no ve los chats sin sede** (E13). | Los chats derivados por «no entendí» (825, 902, 959, 907 y 908) no tienen sede, y no los ve ninguna recepción ni el administrador de sede: solo el administrador general. Al paciente se le dijo «recepción le escribirá en breve». Un chat nuevo no aparece en la bandeja de su sede hasta que la IA busca cupos, aunque el paciente ya dijo la sede. `POST /conversaciones` ignora `sedeId`, y «Hola» borra la sede. | 1 |
| W22 | **La IA no ve la cita al recibir el chat de recepción** (E12). | Retoma la oferta de antes de que entrara recepción. «¿A qué hora era mi cita?» → «¿Cuál le reservo?»; «Ver el estado de mi cita» → «¿En qué sede…?». Si el paciente pide cambiarla, arma **una reserva nueva** sin mencionar la que tiene: quedarían dos citas. | 1 |
| W14 | **Doble confirmación** (E8, regresión). | «Sí, para mí» → «Resumen: jueves 5/11 a las 10:00 en surco. ¿Confirma?» → «Sí, confirmo» → otro resumen con el doctor que vuelve a pedir la confirmación. En R36 a R38 era una sola. | 2 |
| W23 | **Pedir una persona, o preguntar precio o seguro, se ignora** (E11). | «Prefiero que me atienda una persona» → «¿En qué sede…?». «¿Cuánto cuesta y aceptan seguro Rímac?» → «¿Cuál le reservo?». | 1 |
| W24 | **«Mañana» en un día sin atención: mensaje contradictorio** (E9). | «Las 10:00 no están libres… El domingo 25 no hay odontología general…; el siguiente día es el lunes 26: 9:00, 9:30, **10:00**…». | 1 |
| W25 | **«La segunda» sin lista en pantalla cambia la hora** (E10). | Pidió las 11:00; al pedirle el nombre escribió «La segunda» → «Para reservar las 09:30…». | 1 |

**Lo más urgente:**
- **W21:** hay pacientes a los que se les promete que recepción les escribirá y nadie ve su chat.
- **W22:** puede crear citas duplicadas.

**Sigue pendiente probar el día de la cita (jueves 29/10)** con las dos citas QA del recorrido:
- llegada;
- sillón;
- atención;
- cobro sin duplicar lo pagado por link;
- recordatorio del miércoles 28.

Los pasos están en `PRUEBA-CLIENTE-Y-RECEPCION-2026-10-24.md`, sección 3.

**Lo que todavía se nota en WhatsApp viene del servidor:**
- la notificación a recepción con identificadores (punto 16);
- el concepto del cobro con códigos (punto 21).

---

## 3. Falta en el servidor

«Veces» es en cuántas revisiones se reportó, de R1 a R39.

### Prioridad alta: pacientes, seguridad y operación

| # | Qué falta | Cómo está hoy | Veces |
|---|---|---|---|
| 1 | **La sesión con clave temporal solo debe servir para cambiar la clave.** | Con `debeCambiarClave: true`, `GET /pacientes` y `GET /citas` → 200. | 27 |
| 2 | **`/servicios` no debe mostrar costos ni precios de otra sede** a recepción y al administrador de sede. | Llegan `costeDirecto` y los precios de las dos sedes. | 34 |
| 3 | **Caídas con 503 bajo carga.** | Sigue en R39: en 4 tandas de 30 lecturas simultáneas respondieron bien 15, 27, 29 y 27. En R38 fueron 14, 24, 27 y 25; en R36, 30 de 30. El error es `{"message":"Service Unavailable"}`, en menos de un segundo. | 33 |
| 4 | **Cargar los datos reales de la clínica** (entregados en R22). | RUC 20123456789, teléfono 900000000, sedes sin WhatsApp y los 22 servicios de la demo. Sin el WhatsApp de cada sede, los chats llegan sin sede (W21). | 18 |

### Recepción: lo que encontró la prueba de punta a punta (R39)

| # | Qué falta | Cómo está hoy | Veces |
|---|---|---|---|
| 27 | **«Pendientes de hoy» debe contar los chats derivados** a recepción. | Con chats esperando respuesta de recepción («Recepción 14» en la bandeja), el inicio dice «Por hacer 0 · Todo al día». Captura `07`. | 1 |
| 28 | **Un solo precio para la consulta.** | La IA cobra S/ 50.00 («Consulta / evaluación»). En «Agendar cita», recepción solo puede elegir «Odontología general», que muestra S/ 80.00 en Surco. Capturas `04a` y `02`. | 1 |
| 29 | **Reprogramar una cita pagada no debe dejarla «pendiente».** | Al reprogramar una cita confirmada y pagada desde la agenda (29/10 11:00), pasó a «pendiente». | 1 |
| 30 | **El origen de la cita debe ser real.** | Una cita que agendó recepción desde el chat aparece como «Agendada por IA». Captura `05`. | 1 |
| 31 | **Las citas que agenda la IA no tienen sillón.** | En la agenda figuran con sillón «—». Así no se controla el choque de sillones. | 1 |
| 32 | **Cobro por adelantado de una cita agendada por recepción.** | No hay forma de mandar un link de pago: «Nuevo link» solo avisa «Los links se crean desde el chat de WhatsApp al reservar un cupo». Es una decisión de negocio: hoy esas citas se cobran en la clínica. | — |

**Detalles de uso al registrar y agendar desde el chat:**
- **«Registrar como paciente»:** trae como nombre el del contacto («QA R39 Cliente Uno»), y hay que corregirlo.
- **«Agendar cita»:**
  - la fecha por defecto es el domingo 25, un día sin atención;
  - no trae el día y la hora que se acordaron en el chat.

### Prioridad media: datos que no se guardan o no cuadran

| # | Qué falta | Cómo está hoy | Veces |
|---|---|---|---|
| 5 | **La meta es por sede.** | `"persistencia":"medico"`. | 32 |
| 6 | **Radiografías y fotos:** guardar `piezas`, `vista` y `momento`. | Vuelven vacíos. | 38 |
| 7 | **Guardar la sede** en consentimientos, recetas e historias; **devolver `sedeId`** en seguros. | Sin sede. | 32–33 |
| 8 | **`ficha360`:** citas con `id`. | Sin `id`. | 34 |
| 9 | **«Nuevos y recurrentes»:** `primeraVisita`. | No viene. | 36 |
| 10 | **Mi producción:** `produccionMesAnteriorAlDia`. | Solo viene `produccionMesAnterior`. | 32 |
| 11 | **Servicios inactivos.** | `incluirInactivos=true` devuelve lo mismo. | 33 |
| 12 | **Citas pasadas** que siguen «confirmada». | 14/09 (Sofía Pérez) y 10/10 (QA Prueba Doctor), y una «pendiente» del 15/10 (QA Agenda Recepción). | 36 |
| 13 | **Los chats deben cuadrar.** | El resumen gerencial dice 24; `/conversaciones` tiene 165. | 31 |
| 14 | **Stock:** registrar movimientos, no solo el valor final. | No hay endpoint. | 35 |
| 15 | **Auditoría:** registrar inventario, órdenes, laboratorio, seguros, metas, clínica y odontograma, y paginar. | No los registra; tope de 2000 eventos y `page=2` devuelve lo mismo. | 35–36 |

### Prioridad baja: textos y limpieza (el frontend ya los oculta)

El punto 17 (minúsculas a mitad de frase) quedó corregido en R37.

| # | Qué falta | Cómo está hoy | Veces |
|---|---|---|---|
| 16 | **Notificación de derivación legible.** | «WhatsApp → recepción: QA R38 Pago (paciente 949c8ea3-…) · cita 3085f5f8-… — ¿Puedo pasar mi cita al jueves 29 a las 11:00?». Usa el nombre del contacto («QA R38 Pago») y no el del paciente («QA Izipay Cincuenta Uno»). Debe nombrar al paciente y la fecha de la cita. Sin paciente ya se lee bien: «WhatsApp → recepción: QA R37 No entiende — zxcvb ñlkjh». | 7 |
| 18 | **Procedimiento anulado:** no pegar el motivo al nombre. | «QA fase anular R39 [Motivo: QA R39 prueba]». El motivo ya viene en `motivo`. | 23 |
| 19 | **Consentimiento anulado:** sin marcas en el título ni en el texto, y con `anuladoEn` y `anuladoPor`. | «[ANULADO] …» y «[Anulado: …]»; `anuladoEn` y `anuladoPor` vacíos (verificado en R34). | 19 |
| 20 | **Estado del asistente** sin el modelo. | «Activo (gpt-4o)». | 8 |
| 21 | **Concepto de los cobros de Izipay** sin códigos. | «Izipay · Consulta general · Odontología general · 17928058864360 · e2c783b0-…». Los códigos van en campos aparte. | 8 |
| 22 | **Estado de las integraciones** (Izipay conectado o no). | `/integraciones` → 404. | 8 |
| 23 | **Textos con «(s)»** en `/go-live`. | «2 sede(s)», «6 doctor(es)». | 32 |
| 24 | **Odontograma:** responder 400, no 500, con datos inválidos. | 500 con una dentición inválida. | 34 |
| 25 | **Imágenes fuera de la base de datos.** | Se guardan en base64. | 36 |
| 26 | **IPN de Izipay:** confirmar en el log si llegan los POST a `/public/izipay/ipn`. | Sin confirmar. No se cuenta como defecto. | — |

---

## 4. Frontend

**Producción** sigue con `index-DjK7jcE6.js`: el ajuste de QA33 no está publicado.

**Cambio:** `cambio-frontend-diseno-2026-10-23.patch`, la revisión de diseño del 23/10.
- **Qué cambia:** solo cómo se ven los datos, en todas las pantallas:
  - cifras como cifras;
  - montos con 2 decimales;
  - un solo formato de fecha;
  - nombres sin cortar;
  - un estilo por botón.

  La lista completa está en `REVISION-DISENO-2026-10-23.md`.
- **Base:** la versión publicada (`index-DjK7jcE6.js`).
- **Ya incluye el ajuste de `cambio-frontend-QA33.patch`:** no hay que aplicarlo aparte.
- **Alcance:**
  - 33 archivos de `frontend/`, 6 de ellos nuevos (2 vienen del ajuste de QA33);
  - no toca la pantalla de cambio de clave;
  - no cambia llamadas al servidor ni datos guardados.

**Cómo aplicarlo** (desde la raíz del repositorio):
1. `git apply --check cambio-frontend-diseno-2026-10-23.patch` (no debe decir nada).
2. `git apply cambio-frontend-diseno-2026-10-23.patch`.
3. En `frontend/`:
   - `npm test` debe dar 461 pruebas con las 3 fallas de siempre (A30, SRV-01/02 y CONFORMANCE ronda 2);
   - `npm run build` debe terminar sin errores.
4. Publicar.

**Antes de mostrar el sistema al cliente:** limpiar los datos de prueba «QA», que se ven en casi todas las pantallas, o usar otra clínica.
