# Pendientes del servidor y cambios del frontend (23/10/2026)

**Archivos:**

| Archivo | Para qué |
|---|---|
| **Este documento** | Lo que ya quedó bien y lo que falta, en orden de prioridad. |
| **`cambio-frontend-diseno-2026-10-23.patch`** | El cambio del frontend: cifras, fechas, textos y botones en todas las pantallas. Ya incluye el ajuste de `cambio-frontend-QA33.patch`. |
| **`REVISION-DISENO-2026-10-23.md`** | Qué cambia el parche, pantalla por pantalla. |
| **`FLUJO-WHATSAPP-GUIADO-2026-10-20.md`** | Cómo debe funcionar el WhatsApp guiado y las 16 conversaciones de aceptación. |
| **`QA-REVISION-36-2026-10-23.md`** | Evidencia de la última prueba (23/10, 14:36 a 14:46, última versión del WhatsApp): frases, respuestas y conteo de veces. |
| **`QA-REVISION-35-2026-10-23.md`** | Evidencia de la prueba anterior (23/10, 11:57 a 12:15). |
| **`ESCENARIOS-WHATSAPP-2026-10-23.md`** | Los escenarios de WhatsApp que fallan en la versión actual (E1 a E5), paso a paso, con hora e id de conversación para reproducirlos y buscarlos en el log. |

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
| **Elegir una hora de la lista** | «A las 9:30», «9:30», «El de las 9:30», «La segunda» y una hora de otro día ofrecido reservan la hora elegida (6 de 7; falta «2», ver W17). |
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

Con la versión probada a las 14:36 pasan **14 de 16** conversaciones de aceptación: 13 completas y 1 a medias. Al mediodía pasaban 11 y a las 11:30, 7. Detalle en `QA-REVISION-36-2026-10-23.md` y, paso a paso, en `ESCENARIOS-WHATSAPP-2026-10-23.md`.

| # | Qué falla | Cómo está hoy | Veces |
|---|---|---|---|
| W6 | **La hora pedida que no está en la lista o no está libre** (escenario E1). | «2 pm» → «Esa hora no está en la lista que le ofrecí», sin ver si las 14:00 están libres. Con «… el jueves 5 de noviembre a las 11:00», que no estaba libre, ofrece 9:00, 9:30 y 10:00 sin avisar y sin dar las más cercanas (10:30 y 11:30). | 4 |
| W7 | **No pasa a recepción tras dos mensajes que no entiende** (E2). | Responde dos veces «No entiendo…»; `intentosFallidos` queda en 0 y el chat sigue en la IA. | 4 |
| W16 | **Pierde la hora dicha antes del servicio** (E4, caso 4 de aceptación). | «Mañana» → «A las 10» → «Para mí» → «Consulta general» ofrece 8:00, 8:30 y 9:00 del sábado 24, aunque las 10:00 estaban libres. Al mediodía sí la guardaba. | 1 |
| W17 | **Elegir con el número de la opción** (E3). | «2» vuelve a mostrar la lista. «La segunda» sí funciona. | 1 |

**Lo más urgente es W6**: cuando el paciente pide una hora concreta, la IA debe decir si está libre y, si no, ofrecer las más cercanas.

---

## 3. Falta en el servidor

«Veces» es en cuántas revisiones se reportó, de R1 a R36.

### Prioridad alta: pacientes, seguridad y operación

| # | Qué falta | Cómo está hoy | Veces |
|---|---|---|---|
| 1 | **La sesión con clave temporal solo debe servir para cambiar la clave.** | Con `debeCambiarClave: true`, `GET /pacientes` y `GET /citas` → 200. | 24 |
| 2 | **`/servicios` no debe mostrar costos ni precios de otra sede** a recepción y al administrador de sede. | Llegan `costeDirecto` y los precios de las dos sedes. | 31 |
| 3 | **Caídas con 503 bajo carga.** | **Mejoró en R36:** 30 de 30 lecturas en las dos tandas y ningún 503 al probar 17 chats a la vez. En R35 hubo 503 en 4 de 16 arranques y se perdió un mensaje. Queda en observación. | 30 |
| 4 | **Cargar los datos reales de la clínica** (entregados en R22). | RUC 20123456789, teléfono 900000000, sedes sin WhatsApp y los 22 servicios de la demo. | 15 |

### Prioridad media: datos que no se guardan o no cuadran

| # | Qué falta | Cómo está hoy | Veces |
|---|---|---|---|
| 5 | **La meta es por sede.** | `"persistencia":"medico"`. | 29 |
| 6 | **Radiografías y fotos:** guardar `piezas`, `vista` y `momento`. | Vuelven vacíos. | 35 |
| 7 | **Guardar la sede** en consentimientos, recetas e historias; **devolver `sedeId`** en seguros. | Sin sede. | 29–30 |
| 8 | **`ficha360`:** citas con `id`. | Sin `id`. | 31 |
| 9 | **«Nuevos y recurrentes»:** `primeraVisita`. | No viene. | 33 |
| 10 | **Mi producción:** `produccionMesAnteriorAlDia`. | Solo viene `produccionMesAnterior`. | 29 |
| 11 | **Servicios inactivos.** | `incluirInactivos=true` devuelve lo mismo. | 30 |
| 12 | **Citas pasadas** que siguen «confirmada». | 14/09 (Sofía Pérez) y 10/10 (QA Prueba Doctor). | 33 |
| 13 | **Los chats deben cuadrar.** | El resumen gerencial dice 21; `/conversaciones` tiene 113. | 28 |
| 14 | **Stock:** registrar movimientos, no solo el valor final. | No hay endpoint. | 32 |
| 15 | **Auditoría:** registrar inventario, órdenes, laboratorio, seguros, metas, clínica y odontograma, y paginar. | No los registra; tope de 2000 eventos y `page=2` devuelve lo mismo. | 32–33 |

### Prioridad baja: textos y limpieza (el frontend ya los oculta)

| # | Qué falta | Cómo está hoy | Veces |
|---|---|---|---|
| 16 | **Notificación de derivación legible.** | «WhatsApp → recepción: QA R35 Junto uno (paciente 727cdfbf-…) · cita 2f13ed2c-… — Quiero cancelar mi cita». Debe nombrar al paciente y la fecha de la cita. | 4 |
| 17 | **Días y especialidades en minúscula** a mitad de frase. | «El Martes 27 no hay Odontología general en Sede Surco; el siguiente día es el Jueves 29». | 4 |
| 18 | **Procedimiento anulado:** no pegar el motivo al nombre. | «QA fase anular R36 [Motivo: QA R36 prueba]». El motivo ya viene en `motivo`. | 20 |
| 19 | **Consentimiento anulado:** sin marcas en el título ni en el texto, y con `anuladoEn` y `anuladoPor`. | «[ANULADO] …» y «[Anulado: …]»; `anuladoEn` y `anuladoPor` vacíos (verificado en R34). | 19 |
| 20 | **Estado del asistente** sin el modelo. | «Activo (gpt-4o)». | 5 |
| 21 | **Concepto de los cobros de Izipay** sin códigos. | «Izipay · Consulta general · Odontología general · 17927846003160 · cf31eaf5-…». Los códigos van en campos aparte. | 5 |
| 22 | **Estado de las integraciones** (Izipay conectado o no). | `/integraciones` → 404. | 5 |
| 23 | **Textos con «(s)»** en `/go-live`. | «2 sede(s)», «6 doctor(es)». | 29 |
| 24 | **Odontograma:** responder 400, no 500, con datos inválidos. | 500 con una dentición inválida. | 31 |
| 25 | **Imágenes fuera de la base de datos.** | Se guardan en base64. | 33 |
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
