# Pendientes del servidor y cambios del frontend (23/10/2026)

**Archivos:**

| Archivo | Para qué |
|---|---|
| **Este documento** | Lo que ya quedó bien y lo que falta, en orden de prioridad. |
| **`cambio-frontend-diseno-2026-10-23.patch`** | El cambio del frontend: cifras, fechas, textos y botones en todas las pantallas. Ya incluye el ajuste de `cambio-frontend-QA33.patch`. |
| **`REVISION-DISENO-2026-10-23.md`** | Qué cambia el parche, pantalla por pantalla. |
| **`FLUJO-WHATSAPP-GUIADO-2026-10-20.md`** | Cómo debe funcionar el WhatsApp guiado y las 16 conversaciones de aceptación. |
| **`QA-REVISION-35-2026-10-23.md`** | Evidencia de la última prueba (23/10, 11:57 a 12:15, nueva versión del WhatsApp): frases, respuestas y conteo de veces. |
| **`QA-REVISION-34-2026-10-23.md`** | Evidencia de la prueba anterior (23/10, 11:00 a 11:30). |
| **`ESCENARIOS-WHATSAPP-2026-10-23.md`** | Los escenarios de WhatsApp que fallan en la versión actual, paso a paso, con hora e id de conversación para reproducirlos y buscarlos en el log. |

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
| **Agendar y pagar** | Link → pago en el sandbox → cita confirmada → aviso por WhatsApp → **un solo cobro** en Caja (con la hora dicha en el pedido; ver W10). |
| **Derivar una cita pagada** | «¿Puedo pasar mi cita a otro día?» pasa el chat a recepción y la cita sigue confirmada. |
| **Día sin doctor de la especialidad** | Avisa y ofrece el siguiente día. |
| **Fechas relativas** | «Mañana», dicho un viernes, se entiende como sábado. |

---

## 2. WhatsApp guiado: lo que falta (prioridad alta)

Con la versión probada a las 12:00 pasan **11 de 16** conversaciones de aceptación (a las 11:30 pasaban 7). Detalle en `QA-REVISION-35-2026-10-23.md` y, paso a paso, en `ESCENARIOS-WHATSAPP-2026-10-23.md`.

| # | Qué falla | Cómo está hoy | Veces |
|---|---|---|---|
| W10 | **Bloqueo: no se puede elegir una hora de la lista.** | 0 de 9 intentos: «A las 10», «A las 14:00», «El de las 16:30», «8:30», «A las 11:30», «1», «El de las 9:00», «12:30» y «La primera». Responde «Esa hora no está disponible» a la hora que acaba de ofrecer, a veces con el día pedido en vez del ofrecido («…el martes 27» al elegir del jueves 29). Después de ofrecer 9 horas del viernes 30, dice «El viernes 30 no hay odontología general». | 1 |
| W11 | **Ya no se anula un link sin pagar desde el chat** (regresión). | «Mejor no, ya no quiero la cita» y «Ya no quiero la cita, cancélela por favor» devuelven el resumen y «¿Confirma la reserva?». El link sigue pendiente. | 2 |
| W12 | **Al paciente registrado se le piden nombre, DNI y edad** (regresión). | Pasó con «QA Izipay Treinta Ocho», ya registrado. A las 11:13 no los pedía. | 1 |
| W6 | **«2 pm» se rechaza aunque esté libre.** | La entiende como 14:00, pero responde «Esa hora no está disponible el lunes 26/10». Las 14:00 estaban libres. Es probable que sea el mismo error que W10. | 3 |
| W7 | **No pasa a recepción tras dos mensajes que no entiende.** | Responde dos veces «No entiendo…»; `intentosFallidos` queda en 0 y el chat sigue en la IA. | 3 |
| W13 | **No reconoce un nombre escrito solo.** | «QA Izipay Cuarenta Seis» → repite «necesito su nombre completo». Con «Me llamo …» sí lo toma. | 1 |
| W14 | **Pide «sí, confirmo» dos veces.** | Primero un resumen corto («… en surco»), luego otro con el doctor y otra vez «Responda "sí, confirmo"». | 1 |
| W15 | **Nombre de la clínica en el saludo.** | «le saluda *Odonto Sonrisa*»; la clínica se llama «Clínica Dental Sonríe+» (`/clinica` y página de pago). | 1 |

**Lo más urgente es W10**: con la forma más común de agendar, que es elegir de la lista, hoy no se puede reservar.

---

## 3. Falta en el servidor

«Veces» es en cuántas revisiones se reportó, de R1 a R35.

### Prioridad alta: pacientes, seguridad y operación

| # | Qué falta | Cómo está hoy | Veces |
|---|---|---|---|
| 1 | **La sesión con clave temporal solo debe servir para cambiar la clave.** | Con `debeCambiarClave: true`, `GET /pacientes` y `GET /citas` → 200. | 23 |
| 2 | **`/servicios` no debe mostrar costos ni precios de otra sede** a recepción y al administrador de sede. | Llegan `costeDirecto` y los precios de las dos sedes. | 30 |
| 3 | **Caídas con 503 bajo carga.** | En la prueba aislada, 30 de 30 lecturas respondieron bien; pero al probar varios chats a la vez hubo 503 (4 de 16 arranques) y un mensaje del paciente se perdió sin respuesta. | 30 |
| 4 | **Cargar los datos reales de la clínica** (entregados en R22). | RUC 20123456789, teléfono 900000000, sedes sin WhatsApp y los 22 servicios de la demo. | 14 |

### Prioridad media: datos que no se guardan o no cuadran

| # | Qué falta | Cómo está hoy | Veces |
|---|---|---|---|
| 5 | **La meta es por sede.** | `"persistencia":"medico"`. | 28 |
| 6 | **Radiografías y fotos:** guardar `piezas`, `vista` y `momento`. | Vuelven vacíos. | 34 |
| 7 | **Guardar la sede** en consentimientos, recetas e historias; **devolver `sedeId`** en seguros. | Sin sede. | 28–29 |
| 8 | **`ficha360`:** citas con `id`. | Sin `id`. | 30 |
| 9 | **«Nuevos y recurrentes»:** `primeraVisita`. | No viene. | 32 |
| 10 | **Mi producción:** `produccionMesAnteriorAlDia`. | Solo viene `produccionMesAnterior`. | 28 |
| 11 | **Servicios inactivos.** | `incluirInactivos=true` devuelve lo mismo. | 29 |
| 12 | **Citas pasadas** que siguen «confirmada». | 14/09 (Sofía Pérez) y 10/10 (QA Prueba Doctor). | 32 |
| 13 | **Los chats deben cuadrar.** | El resumen gerencial dice 20; `/conversaciones` tiene 98. | 27 |
| 14 | **Stock:** registrar movimientos, no solo el valor final. | No hay endpoint. | 31 |
| 15 | **Auditoría:** registrar inventario, órdenes, laboratorio, seguros, metas, clínica y odontograma, y paginar. | No los registra; tope de 2000 eventos y `page=2` devuelve lo mismo. | 31–32 |

### Prioridad baja: textos y limpieza (el frontend ya los oculta)

| # | Qué falta | Cómo está hoy | Veces |
|---|---|---|---|
| 16 | **Notificación de derivación legible.** | «WhatsApp → recepción: QA R24 Trece (paciente d20435d3-…) · cita 9417a8e1-… — ¿Puedo pasar mi cita a otro día?». Debe nombrar al paciente y la fecha de la cita. | 3 |
| 17 | **Días y especialidades en minúscula** a mitad de frase. | «El Martes 27 no hay Odontología general…». | 3 |
| 18 | **Procedimiento anulado:** no pegar el motivo al nombre. | «QA fase anular R34 [Motivo: QA R34 prueba]». El motivo ya viene en `motivo`. | 19 |
| 19 | **Consentimiento anulado:** sin marcas en el título ni en el texto, y con `anuladoEn` y `anuladoPor`. | «[ANULADO] …» y «[Anulado: …]»; `anuladoEn` y `anuladoPor` vacíos (verificado en R34). | 19 |
| 20 | **Estado del asistente** sin el modelo. | «Activo (gpt-4o)». | 4 |
| 21 | **Concepto de los cobros de Izipay** sin códigos. | «Izipay · Consulta general · Odontología general · 17927751293600 · 43fd0753-…». Los códigos van en campos aparte. | 4 |
| 22 | **Estado de las integraciones** (Izipay conectado o no). | `/integraciones` → 404. | 4 |
| 23 | **Textos con «(s)»** en `/go-live`. | «2 sede(s)», «6 doctor(es)». | 28 |
| 24 | **Odontograma:** responder 400, no 500, con datos inválidos. | 500 con una dentición inválida. | 30 |
| 25 | **Imágenes fuera de la base de datos.** | Se guardan en base64. | 32 |
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
