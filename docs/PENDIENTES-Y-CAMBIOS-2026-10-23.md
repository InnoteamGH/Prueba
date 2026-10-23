# Pendientes del servidor y cambios del frontend (23/10/2026)

**Archivos:**

| Archivo | Para qué |
|---|---|
| **Este documento** | Lo que ya quedó bien y lo que falta, en orden de prioridad. |
| **`cambio-frontend-diseno-2026-10-23.patch`** | El cambio del frontend: cifras, fechas, textos y botones en todas las pantallas. Ya incluye el ajuste de `cambio-frontend-QA33.patch`. |
| **`REVISION-DISENO-2026-10-23.md`** | Qué cambia el parche, pantalla por pantalla. |
| **`FLUJO-WHATSAPP-GUIADO-2026-10-20.md`** | Cómo debe funcionar el WhatsApp guiado y las 16 conversaciones de aceptación. |
| **`QA-REVISION-34-2026-10-23.md`** | Evidencia de las pruebas del 23/10: frases, respuestas y conteo de veces. |
| **`ESCENARIOS-WHATSAPP-2026-10-23.md`** | Los escenarios de WhatsApp que fallan, paso a paso, con hora e id de conversación para reproducirlos y buscarlos en el log. |

Todo se verificó en producción (`app.odontosonrisa.biz` y su API) el 23/10/2026, con datos de prueba «QA» y el sandbox de Izipay.

---

## 1. Ya quedó bien ✅

| Tema | Cómo responde ahora |
|---|---|
| **Cancelar un link sin pagar** | «Mejor no, ya no quiero la cita» anula el link y lo dice: «Listo: anulé el link de pago pendiente del jueves 29/10. El cupo quedó libre». |
| **Agendar y pagar** | Link → pago en el sandbox → cita confirmada → aviso por WhatsApp → **un solo cobro** en Caja. |
| **Derivar una cita pagada** | «Quiero cancelar mi cita» pasa el chat a recepción con 1 mensaje por responder, y la cita sigue confirmada. |
| **Día sin doctor de la especialidad** | «El martes 27 no hay odontología general en Sede Surco; el siguiente día es el jueves 29». |
| **Fechas relativas** | «Mañana», dicho un viernes, se entiende como sábado. |
| **Corrección de sede** | «Pero ya te había dicho la sede» sigue con los cupos ofrecidos, sin volver a empezar. |
| **Paciente registrado** | No se le piden nombre ni DNI. |

---

## 2. WhatsApp guiado: lo que falta (prioridad alta)

De las 16 conversaciones de aceptación pasaron **7**, 3 a medias y fallaron 6. Detalle en `QA-REVISION-34-2026-10-23.md`, sección 1.

| # | Qué falla | Cómo está hoy | Veces |
|---|---|---|---|
| W1 | **Pierde lo que el paciente ya dijo.** | Tras «En San Isidro» y «Mañana», con «A las 10» responde «No encontré ese cupo… **¿Para qué sede y fecha…?**». Con «Para mí», «necesito **sede, día y hora**». Lo mismo con «¿Y a las 14:00 no hay?». | 2 |
| W2 | **Ofrece otro día, y horas que ya pasaron.** | «El jueves 29» → «🕐 **Viernes 23 de octubre** — 09:00, 09:30, 10:00». Con «En Surco» o «En San Isidro», sin día dicho, también ofrece hoy en vez de preguntar el día, y a las 11:28 ofreció las 09:00 de ese mismo día. Pasó 3 de 3 veces. | 1 |
| W3 | **No entiende un pedido completo en un mensaje.** | «Consulta general en Surco el jueves 29 a las 9:30 para mí» → «No encontré ese cupo… ¿Para qué sede y fecha…?» (2 de 2 veces), con el cupo libre. | 2 |
| W4 | **No reinicia un chat viejo.** | «Hola» en un chat de hace 3 días → «¿Desea agendar una cita para una consulta general en la sede de San Isidro?». Retoma la reserva vieja. | 2 |
| W5 | **Pide varios datos juntos.** | «necesito su nombre completo, DNI (8 dígitos), edad (o fecha de nacimiento)». También junta fecha y sede, o servicio y sede, en un mensaje. No pregunta «¿para usted o para otra persona?». | 2 |
| W6 | **«2 pm» no se entiende como 14:00.** | Ofrece 11:30, 12:00 y 12:30, y no dice si las 14:00 están libres. | 2 |
| W7 | **No pasa a recepción tras dos mensajes que no entiende.** | Responde dos veces «No entiendo…»; `intentosFallidos` queda en 0 y el chat sigue en la IA. | 2 |
| W8 | **«Para mí» se toma como «sí, confirmo».** | Con el resumen en pantalla («Responda "sí, confirmo"»), «Para mí» creó el link de pago. | 1 |
| W9 | **Saludo sin menú.** | «Hola 🦷. ¿En qué puedo ayudarle hoy?». Falta «1) Agendar una cita 2) Ver o cambiar mi cita 3) Otra consulta» y el nombre de la clínica. | 2 |

**Cómo corregirlo:** las reglas de `FLUJO-WHATSAPP-GUIADO-2026-10-20.md`, sección 4. Lo central es que **cada dato se guarde en la conversación apenas se entiende** (sede, especialidad, día, hora, para quién) y que **el código decida la siguiente pregunta** con esos datos. Así se resuelven W1, W2, W3 y W5.

---

## 3. Falta en el servidor

«Veces» es en cuántas revisiones se reportó, de R1 a R34.

### Prioridad alta: pacientes, seguridad y operación

| # | Qué falta | Cómo está hoy | Veces |
|---|---|---|---|
| 1 | **La sesión con clave temporal solo debe servir para cambiar la clave.** | Con `debeCambiarClave: true`, `GET /pacientes` y `GET /citas` → 200. | 22 |
| 2 | **`/servicios` no debe mostrar costos ni precios de otra sede** a recepción y al administrador de sede. | Llegan `costeDirecto` y los precios de las dos sedes. | 29 |
| 3 | **Caídas con 503 bajo carga.** | De 30 lecturas simultáneas fallaron 19 y 13. | 29 |
| 4 | **Cargar los datos reales de la clínica** (entregados en R22). | RUC 20123456789, teléfono 900000000, sedes sin WhatsApp y los 22 servicios de la demo. | 13 |

### Prioridad media: datos que no se guardan o no cuadran

| # | Qué falta | Cómo está hoy | Veces |
|---|---|---|---|
| 5 | **La meta es por sede.** | `"persistencia":"medico"`. | 27 |
| 6 | **Radiografías y fotos:** guardar `piezas`, `vista` y `momento`. | Vuelven vacíos. | 33 |
| 7 | **Guardar la sede** en consentimientos, recetas e historias; **devolver `sedeId`** en seguros. | Sin sede. | 27–28 |
| 8 | **`ficha360`:** citas con `id`. | Sin `id`. | 29 |
| 9 | **«Nuevos y recurrentes»:** `primeraVisita`. | No viene. | 31 |
| 10 | **Mi producción:** `produccionMesAnteriorAlDia`. | Solo viene `produccionMesAnterior`. | 27 |
| 11 | **Servicios inactivos.** | `incluirInactivos=true` devuelve lo mismo. | 28 |
| 12 | **Citas pasadas** que siguen «confirmada». | 14/09 (Sofía Pérez) y 10/10 (QA Prueba Doctor). | 31 |
| 13 | **Los chats deben cuadrar.** | El resumen gerencial dice 19; `/conversaciones` tiene 79. | 26 |
| 14 | **Stock:** registrar movimientos, no solo el valor final. | No hay endpoint. | 30 |
| 15 | **Auditoría:** registrar inventario, órdenes, laboratorio, seguros, metas, clínica y odontograma, y paginar. | No los registra; tope de 2000 eventos y `page=2` devuelve lo mismo. | 30–31 |

### Prioridad baja: textos y limpieza (el frontend ya los oculta)

| # | Qué falta | Cómo está hoy | Veces |
|---|---|---|---|
| 16 | **Notificación de derivación legible.** | «WhatsApp → recepción: QA R27 Dieciocho (paciente 4f32a15c-…) · cita 561fdb50-… — Quiero cancelar mi cita». Debe nombrar al paciente y la fecha de la cita. | 2 |
| 17 | **Días y especialidades en minúscula** a mitad de frase. | «El Martes 27 no hay Odontología general…». | 2 |
| 18 | **Procedimiento anulado:** no pegar el motivo al nombre. | «QA fase anular R34 [Motivo: QA R34 prueba]». El motivo ya viene en `motivo`. | 18 |
| 19 | **Consentimiento anulado:** sin marcas en el título ni en el texto, y con `anuladoEn` y `anuladoPor`. | «[ANULADO] …» y «[Anulado: …]»; `anuladoEn` y `anuladoPor` vacíos. | 19 |
| 20 | **Estado del asistente** sin el modelo. | «Activo (gpt-4o)». | 3 |
| 21 | **Concepto de los cobros de Izipay** sin códigos. | «Izipay · Consulta general · Odontología general · 17927721680520 · e07056b2-…». Los códigos van en campos aparte. | 3 |
| 22 | **Estado de las integraciones** (Izipay conectado o no). | `/integraciones` → 404. | 3 |
| 23 | **Textos con «(s)»** en `/go-live`. | «2 sede(s)», «6 doctor(es)». | 27 |
| 24 | **Odontograma:** responder 400, no 500, con datos inválidos. | 500 con una dentición inválida. | 29 |
| 25 | **Imágenes fuera de la base de datos.** | Se guardan en base64. | 31 |
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
  - 33 archivos de `frontend/`, 4 de ellos nuevos;
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
