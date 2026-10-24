# Pendientes del servidor y cambios del frontend (23/10/2026)

**Archivos:**

| Archivo | Para qué |
|---|---|
| **Este documento** | Lo que ya quedó bien y lo que falta, en orden de prioridad. |
| **`cambio-frontend-diseno-2026-10-23.patch`** | El cambio del frontend: cifras, fechas, textos y botones en todas las pantallas. Ya incluye el ajuste de `cambio-frontend-QA33.patch`. |
| **`REVISION-DISENO-2026-10-23.md`** | Qué cambia el parche, pantalla por pantalla. |
| **`FLUJO-WHATSAPP-GUIADO-2026-10-20.md`** | Cómo debe funcionar el WhatsApp guiado y las 16 conversaciones de aceptación. |
| **`QA-REVISION-37-2026-10-23.md`** | Evidencia de la última prueba (23/10, 19:57 a 20:10, última versión del WhatsApp): frases, respuestas y conteo de veces. |
| **`QA-REVISION-36-2026-10-23.md`** | Evidencia de la prueba anterior (23/10, 14:36 a 14:46). |
| **`ESCENARIOS-WHATSAPP-2026-10-23.md`** | Los escenarios de WhatsApp E1 a E5, ya corregidos, paso a paso con hora e id de conversación. Quedan como prueba de regresión para cada versión nueva. |

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
| **Agendar y pagar** | Elegir de la lista → datos → **una sola** confirmación → link → pago en el sandbox → cita confirmada → aviso por WhatsApp → **un solo cobro** en Caja. |
| **Anular un link sin pagar** | «Mejor no, ya no quiero la cita» → «Listo: anulé el link de pago pendiente… El cupo quedó libre». |
| **Paciente registrado** | «¿La cita es para usted, QA Izipay Cuarenta Uno?» y pasa al resumen, sin pedir datos. |
| **Nombre escrito solo** | «QA Izipay Cuarenta Siete» se toma como nombre. |
| **Nombre de la clínica** | El saludo dice «le saluda *Clínica Dental Sonríe+*». |
| **Derivar una cita pagada** | «¿Puedo pasar mi cita a otro día?» y «Quiero cancelar mi cita» pasan el chat a recepción y la cita sigue confirmada. |
| **Día sin doctor de la especialidad** | Avisa y ofrece el siguiente día. |
| **Fechas relativas** | «Mañana», dicho un viernes, se entiende como sábado. |

---

## 2. WhatsApp guiado

Con la versión probada a las 19:57 pasan **las 16 de 16** conversaciones de aceptación. A las 14:36 pasaban 13 más 1 a medias; al mediodía, 11; a las 11:30, 7.
- **Corregidos:** W6, W7, W16 y W17.
- **Evidencia:** en `QA-REVISION-37-2026-10-23.md`.
- **Regresión:** los escenarios para repetir en cada versión están en `ESCENARIOS-WHATSAPP-2026-10-23.md`.

| # | Qué falta | Cómo está hoy | Veces |
|---|---|---|---|
| W18 | **Formato de horas en el aviso de hora ocupada** (prioridad baja). | «Las 09:30 no están libres. Las más cercanas son 09:00, 10:30 y 11:00»: lleva un cero delante que la lista no usa («9:00, 9:30»), y a veces no ordena las horas («10:30, 11:30 y 10:00»). | 1 |

**Lo que todavía se nota en WhatsApp viene del servidor:**
- la notificación a recepción con identificadores (punto 16);
- el concepto del cobro con códigos (punto 21).

---

## 3. Falta en el servidor

«Veces» es en cuántas revisiones se reportó, de R1 a R37.

### Prioridad alta: pacientes, seguridad y operación

| # | Qué falta | Cómo está hoy | Veces |
|---|---|---|---|
| 1 | **La sesión con clave temporal solo debe servir para cambiar la clave.** | Con `debeCambiarClave: true`, `GET /pacientes` y `GET /citas` → 200. | 25 |
| 2 | **`/servicios` no debe mostrar costos ni precios de otra sede** a recepción y al administrador de sede. | Llegan `costeDirecto` y los precios de las dos sedes. | 32 |
| 3 | **Caídas con 503 bajo carga.** | **Volvió en R37** después de mejorar en R36. En 6 tandas de 30 lecturas simultáneas respondieron bien 19, 27, 16, 23, 30 y 22. El error es `{"message":"Service Unavailable"}`, en menos de un segundo. En R36 fueron 30 de 30 en las dos tandas. | 31 |
| 4 | **Cargar los datos reales de la clínica** (entregados en R22). | RUC 20123456789, teléfono 900000000, sedes sin WhatsApp y los 22 servicios de la demo. | 16 |

### Prioridad media: datos que no se guardan o no cuadran

| # | Qué falta | Cómo está hoy | Veces |
|---|---|---|---|
| 5 | **La meta es por sede.** | `"persistencia":"medico"`. | 30 |
| 6 | **Radiografías y fotos:** guardar `piezas`, `vista` y `momento`. | Vuelven vacíos. | 36 |
| 7 | **Guardar la sede** en consentimientos, recetas e historias; **devolver `sedeId`** en seguros. | Sin sede. | 30–31 |
| 8 | **`ficha360`:** citas con `id`. | Sin `id`. | 32 |
| 9 | **«Nuevos y recurrentes»:** `primeraVisita`. | No viene. | 34 |
| 10 | **Mi producción:** `produccionMesAnteriorAlDia`. | Solo viene `produccionMesAnterior`. | 30 |
| 11 | **Servicios inactivos.** | `incluirInactivos=true` devuelve lo mismo. | 31 |
| 12 | **Citas pasadas** que siguen «confirmada». | 14/09 (Sofía Pérez) y 10/10 (QA Prueba Doctor), y una «pendiente» del 15/10 (QA Agenda Recepción). | 34 |
| 13 | **Los chats deben cuadrar.** | El resumen gerencial dice 22; `/conversaciones` tiene 131. | 29 |
| 14 | **Stock:** registrar movimientos, no solo el valor final. | No hay endpoint. | 33 |
| 15 | **Auditoría:** registrar inventario, órdenes, laboratorio, seguros, metas, clínica y odontograma, y paginar. | No los registra; tope de 2000 eventos y `page=2` devuelve lo mismo. | 33–34 |

### Prioridad baja: textos y limpieza (el frontend ya los oculta)

El punto 17 (minúsculas a mitad de frase) quedó corregido en R37.

| # | Qué falta | Cómo está hoy | Veces |
|---|---|---|---|
| 16 | **Notificación de derivación legible.** | «WhatsApp → recepción: QA R36 Elige uno (paciente e6f56b51-…) · cita 7e7d85c3-… — ¿Puedo pasar mi cita a otro día?». Usa el nombre del contacto y no el del paciente («QA Izipay Cuarenta Ocho»). Debe nombrar al paciente y la fecha de la cita. Sin paciente ya se lee bien: «WhatsApp → recepción: QA R37 No entiende — zxcvb ñlkjh». | 5 |
| 18 | **Procedimiento anulado:** no pegar el motivo al nombre. | «QA fase anular R37 [Motivo: QA R37 prueba]». El motivo ya viene en `motivo`. | 21 |
| 19 | **Consentimiento anulado:** sin marcas en el título ni en el texto, y con `anuladoEn` y `anuladoPor`. | «[ANULADO] …» y «[Anulado: …]»; `anuladoEn` y `anuladoPor` vacíos (verificado en R34). | 19 |
| 20 | **Estado del asistente** sin el modelo. | «Activo (gpt-4o)». | 6 |
| 21 | **Concepto de los cobros de Izipay** sin códigos. | «Izipay · Consulta general · Odontología general · 17928037159280 · 90f78704-…». Los códigos van en campos aparte. | 6 |
| 22 | **Estado de las integraciones** (Izipay conectado o no). | `/integraciones` → 404. | 6 |
| 23 | **Textos con «(s)»** en `/go-live`. | «2 sede(s)», «6 doctor(es)». | 30 |
| 24 | **Odontograma:** responder 400, no 500, con datos inválidos. | 500 con una dentición inválida. | 32 |
| 25 | **Imágenes fuera de la base de datos.** | Se guardan en base64. | 34 |
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
