# Pendientes del servidor y cambios del frontend (23/10/2026)

**Archivos:**

| Archivo | Para qué |
|---|---|
| **Este documento** | Lo que ya quedó bien y lo que falta, en orden de prioridad. |
| **`cambio-frontend-diseno-2026-10-23.patch`** | El cambio del frontend: cifras, fechas, textos y botones en todas las pantallas. Ya incluye el ajuste de `cambio-frontend-QA33.patch`. |
| **`REVISION-DISENO-2026-10-23.md`** | Qué cambia el parche, pantalla por pantalla. |
| **`FLUJO-WHATSAPP-GUIADO-2026-10-20.md`** | Cómo debe funcionar el WhatsApp guiado y las 16 conversaciones de aceptación. |
| **`QA-REVISION-38-2026-10-23.md`** | Evidencia de la última prueba (23/10, 20:34 a 20:50, última versión del WhatsApp): frases, respuestas y conteo de veces. |
| **`QA-REVISION-37-2026-10-23.md`** | Evidencia de la prueba anterior (23/10, 19:57 a 20:10). |
| **`ESCENARIOS-WHATSAPP-2026-10-23.md`** | Los escenarios de WhatsApp paso a paso, con hora e id de conversación: E6 y E7, que fallan, y E1 a E5, ya corregidos, como prueba de regresión. |

Todo se verificó en producción (`app.odontosonrisa.biz` y su API) el 23/10/2026, con datos de prueba «QA» y el sandbox de Izipay.

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
| **Agendar y pagar** | Elegir de la lista → datos → **una sola** confirmación → link → pago en el sandbox → cita confirmada → aviso por WhatsApp → **un solo cobro** en Caja. |
| **Anular un link sin pagar** | «Mejor no, ya no quiero la cita» → «Listo: anulé el link de pago pendiente… El cupo quedó libre». |
| **Paciente registrado** | «¿La cita es para usted, QA Izipay Cuarenta Uno?» y pasa al resumen, sin pedir datos. |
| **Nombre escrito solo** | «QA Izipay Cuarenta Siete» se toma como nombre. |
| **Nombre de la clínica** | El saludo dice «le saluda *Clínica Dental Sonríe+*». |
| **Derivar una cita pagada** | «¿Puedo pasar mi cita a otro día?» y «Quiero cancelar mi cita» pasan el chat a recepción y la cita sigue confirmada. |
| **Día sin doctor de la especialidad** | Avisa y ofrece el siguiente día. |
| **Fechas relativas** | «Mañana», dicho un viernes, se entiende como sábado. |

---

## 2. WhatsApp guiado: lo que falta (prioridad alta)

**Qué pasa en chats nuevos** con la versión probada a las 20:34:
- pasan las **16 de 16** conversaciones de aceptación;
- también pasan los escenarios E1 a E5 y las 9 formas de elegir de la lista;
- W18 quedó corregido.

**Qué falla:** volver a escribir en un chat reciente.
- **Evidencia:** en `QA-REVISION-38-2026-10-23.md`.
- **Paso a paso:** en `ESCENARIOS-WHATSAPP-2026-10-23.md`, escenarios E6 y E7.

| # | Qué falla | Cómo está hoy | Veces |
|---|---|---|---|
| W19 | **Bloqueo: «Hola» en el resumen confirma la reserva** (escenario E7). | Con el resumen en pantalla («¿Confirma la reserva? Responda «sí, confirmo»»), «Hola» envía el link de pago, toma el cupo y crea el paciente. Pasó en un chat nuevo (817) y en el 903. En el 971 mostró el resumen de una reserva ya cancelada; en el 916, con la cita pagada, intentó reservar otra vez. | 1 |
| W20 | **«Hola» o un pedido nuevo mientras se pide el nombre no reinicia** (E6). | Repite «necesito su nombre completo», o guarda el texto como nombre: «Quiero una cita de consulta general en Surco» y «La segunda» pasaron a pedir el DNI. Tras dos «No entendí» el chat pasa a recepción. En chats de hace 6 horas «Hola» sí reinicia; falla en los de hace 15 segundos a 35 minutos. | 1 |

**Lo más urgente es W19:** un saludo no puede confirmar una reserva ni generar un cobro.

**La regla 7 del flujo** dice: «si pasaron más de 12 horas desde el último mensaje, **o el paciente solo saluda**, la conversación empieza de cero». El saludo debe reiniciar siempre. Si el paciente ya está registrado, se mantiene quién es.

**Lo que todavía se nota en WhatsApp y viene del servidor:**
- la notificación a recepción con identificadores (punto 16);
- el concepto del cobro con códigos (punto 21).

---

## 3. Falta en el servidor

«Veces» es en cuántas revisiones se reportó, de R1 a R38.

### Prioridad alta: pacientes, seguridad y operación

| # | Qué falta | Cómo está hoy | Veces |
|---|---|---|---|
| 1 | **La sesión con clave temporal solo debe servir para cambiar la clave.** | Con `debeCambiarClave: true`, `GET /pacientes` y `GET /citas` → 200. | 26 |
| 2 | **`/servicios` no debe mostrar costos ni precios de otra sede** a recepción y al administrador de sede. | Llegan `costeDirecto` y los precios de las dos sedes. | 33 |
| 3 | **Caídas con 503 bajo carga.** | Sigue en R38: en 4 tandas de 30 lecturas simultáneas respondieron bien 14, 24, 27 y 25. En R37 fueron 19, 27, 16, 23, 30 y 22, y en R36, 30 de 30. El error es `{"message":"Service Unavailable"}`, en menos de un segundo. | 32 |
| 4 | **Cargar los datos reales de la clínica** (entregados en R22). | RUC 20123456789, teléfono 900000000, sedes sin WhatsApp y los 22 servicios de la demo. | 17 |

### Prioridad media: datos que no se guardan o no cuadran

| # | Qué falta | Cómo está hoy | Veces |
|---|---|---|---|
| 5 | **La meta es por sede.** | `"persistencia":"medico"`. | 31 |
| 6 | **Radiografías y fotos:** guardar `piezas`, `vista` y `momento`. | Vuelven vacíos. | 37 |
| 7 | **Guardar la sede** en consentimientos, recetas e historias; **devolver `sedeId`** en seguros. | Sin sede. | 31–32 |
| 8 | **`ficha360`:** citas con `id`. | Sin `id`. | 33 |
| 9 | **«Nuevos y recurrentes»:** `primeraVisita`. | No viene. | 35 |
| 10 | **Mi producción:** `produccionMesAnteriorAlDia`. | Solo viene `produccionMesAnterior`. | 31 |
| 11 | **Servicios inactivos.** | `incluirInactivos=true` devuelve lo mismo. | 32 |
| 12 | **Citas pasadas** que siguen «confirmada». | 14/09 (Sofía Pérez) y 10/10 (QA Prueba Doctor), y una «pendiente» del 15/10 (QA Agenda Recepción). | 35 |
| 13 | **Los chats deben cuadrar.** | El resumen gerencial dice 23; `/conversaciones` tiene 152. | 30 |
| 14 | **Stock:** registrar movimientos, no solo el valor final. | No hay endpoint. | 34 |
| 15 | **Auditoría:** registrar inventario, órdenes, laboratorio, seguros, metas, clínica y odontograma, y paginar. | No los registra; tope de 2000 eventos y `page=2` devuelve lo mismo. | 34–35 |

### Prioridad baja: textos y limpieza (el frontend ya los oculta)

El punto 17 (minúsculas a mitad de frase) quedó corregido en R37.

| # | Qué falta | Cómo está hoy | Veces |
|---|---|---|---|
| 16 | **Notificación de derivación legible.** | «WhatsApp → recepción: QA R37 Pago (paciente afc5d848-…) · cita 94dcf2e8-… — Quiero cancelar mi cita». Usa el nombre del contacto («QA R37 Pago») y no el del paciente («QA Izipay Cuarenta Nueve»). Debe nombrar al paciente y la fecha de la cita. Sin paciente ya se lee bien: «WhatsApp → recepción: QA R37 No entiende — zxcvb ñlkjh». | 6 |
| 18 | **Procedimiento anulado:** no pegar el motivo al nombre. | «QA fase anular R38 [Motivo: QA R38 prueba]». El motivo ya viene en `motivo`. | 22 |
| 19 | **Consentimiento anulado:** sin marcas en el título ni en el texto, y con `anuladoEn` y `anuladoPor`. | «[ANULADO] …» y «[Anulado: …]»; `anuladoEn` y `anuladoPor` vacíos (verificado en R34). | 19 |
| 20 | **Estado del asistente** sin el modelo. | «Activo (gpt-4o)». | 7 |
| 21 | **Concepto de los cobros de Izipay** sin códigos. | «Izipay · Consulta general · Odontología general · 17928058864360 · e2c783b0-…». Los códigos van en campos aparte. | 7 |
| 22 | **Estado de las integraciones** (Izipay conectado o no). | `/integraciones` → 404. | 7 |
| 23 | **Textos con «(s)»** en `/go-live`. | «2 sede(s)», «6 doctor(es)». | 31 |
| 24 | **Odontograma:** responder 400, no 500, con datos inválidos. | 500 con una dentición inválida. | 33 |
| 25 | **Imágenes fuera de la base de datos.** | Se guardan en base64. | 35 |
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
