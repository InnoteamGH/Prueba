# Pendientes del servidor y cambios del frontend (20/10/2026)

**Archivos:**
- **Este documento:** lo que ya quedó bien y lo que falta en el servidor, en orden de prioridad.
- **`cambio-frontend-diseno-2026-10-23.patch`:** el cambio del frontend de la revisión de diseño del 23/10 (cifras, fechas, textos y botones en todas las pantallas). Reemplaza a `cambio-frontend-QA33.patch`, que ya va incluido. Detalle en `REVISION-DISENO-2026-10-23.md`.
- **Evidencia:** `QA-REVISION-33-2026-10-20.md`, con las pruebas en producción del 20/10 (frases, respuestas y conteo de veces).

Todo se verificó en producción (`app.odontosonrisa.biz` y su API) el 20/10/2026, con datos de prueba «QA» y el sandbox de Izipay.

---

## 1. Ya quedó bien ✅

| Tema | Cómo responde ahora |
|---|---|
| **Frontend publicado** | Coincide con la rama, salvo la pantalla de cambio de clave. En tablet y celular, las tablas, franjas, pestañas y la Agenda se ven sin cortes. |
| **Derivar a recepción** | El chat pasa a recepción con una nota del pedido y queda **1 mensaje por responder**: aparece en «Pendientes» y suma al contador. La notificación trae paciente y cita. |
| **Día sin doctor de la especialidad** | «El martes 22 no hay odontología general en Sede Surco; el siguiente día es el jueves 24…». |
| **Mensajes de la IA** | Llegan sin saltos a mitad de frase. |
| **«Pasar mi cita» y fecha equivocada** | Reconoce la cita pagada y deriva; con una fecha equivocada, nombra la cita real. |
| **Agendar y pagar** | 3 de 3 pacientes nuevos llegaron al link. El pago confirmó la cita, llegó el aviso por WhatsApp y el cobro aparece una sola vez en Caja. |
| **Las 6 cuentas** | 0 errores en pantalla y 0 llamadas con error. |

---

## 2. Falta en el servidor

«Veces» es en cuántas revisiones se reportó, de R1 a R33.

### Prioridad alta: pacientes, seguridad y operación

| # | Qué falta | Cómo está hoy | Veces |
|---|---|---|---|
| 1 | **Cancelar un link sin pagar con cualquier frase.** | Con un link pendiente y sin cita, «Mejor no, ya no quiero la cita» recibe la respuesta de una cita pagada: «Su cita sigue confirmada hasta que recepción la gestione». La IA no usa ninguna herramienta, el link sigue vivo y el chat pasa a recepción. Con «Ya no quiero la cita, cancélela por favor» sí lo anula. | 1 |
| 2 | **La sesión con clave temporal solo debe servir para cambiar la clave.** | Con `debeCambiarClave: true`, `GET /pacientes` responde 200. | 21 |
| 3 | **`/servicios` no debe mostrar costos ni precios de otra sede** a recepción y al administrador de sede. | Llegan `costeDirecto` y los precios de las dos sedes. | 28 |
| 4 | **Caídas con 503 bajo carga.** | De 30 lecturas simultáneas fallaron 18 y 16. Un inicio de sesión de recepción falló al primer intento. | 28 |
| 5 | **Cargar los datos reales de la clínica** (entregados en R22). | RUC 20123456789, teléfono 900000000, sedes sin WhatsApp y los 22 servicios de la demo. | 12 |

### Prioridad media: datos que no se guardan o no cuadran

| # | Qué falta | Cómo está hoy | Veces |
|---|---|---|---|
| 6 | **La meta es por sede.** | `"persistencia":"medico"`. | 26 |
| 7 | **Radiografías y fotos:** guardar `piezas`, `vista` y `momento`. | Vuelven vacíos. | 32 |
| 8 | **Guardar la sede** en consentimientos, recetas e historias; **devolver `sedeId`** en seguros. | Sin sede. | 26–27 |
| 9 | **`ficha360`:** citas con `id`. | Sin `id`. | 28 |
| 10 | **«Nuevos y recurrentes»:** `primeraVisita`. | No viene. | 30 |
| 11 | **Mi producción:** `produccionMesAnteriorAlDia`. | Solo viene `produccionMesAnterior`. | 26 |
| 12 | **Servicios inactivos.** | `incluirInactivos=true` devuelve lo mismo. | 27 |
| 13 | **Citas pasadas** que siguen «confirmada». | 14/09 (Sofía Pérez) y 10/10 (QA Prueba Doctor). | 30 |
| 14 | **Los chats deben cuadrar.** | El resumen gerencial dice 17; `/conversaciones` tiene 60. | 25 |
| 15 | **Stock:** registrar movimientos, no solo el valor final. | Valor absoluto. | 29 |
| 16 | **Auditoría:** registrar inventario, órdenes, laboratorio, seguros, metas, clínica y odontograma, y paginar. | No los registra; tope de 2000 eventos y `page=2` devuelve lo mismo. | 29–30 |

### Prioridad baja: textos y limpieza (el frontend ya los oculta)

| # | Qué falta | Cómo está hoy | Veces |
|---|---|---|---|
| 17 | **Notificación de derivación legible.** | «… (paciente e66674ba-…) · cita 0ff41159-… — …». Debe nombrar al paciente y la fecha de la cita. | 1 |
| 18 | **Días y especialidades en minúscula** a mitad de frase. | «El Martes 22 no hay Odontología general…; el siguiente día es el Jueves 24». | 1 |
| 19 | **Procedimiento anulado:** no pegar el motivo al nombre. | «QA fase nombre R33 [Motivo: …]». El motivo ya viene en `motivo`. | 17 |
| 20 | **Consentimiento anulado:** sin marcas en el título ni en el texto firmado, y con `anuladoEn` y `anuladoPor`. | «[ANULADO] …» y «[Anulado: …]»; `anuladoEn` y `anuladoPor` vacíos. | 18 |
| 21 | **Estado del asistente** sin el modelo. | «Activo (gpt-4o)». | 2 |
| 22 | **Concepto de los cobros de Izipay** sin códigos. | «… · 17925106002240 · d20e24fc-…»: van en campos aparte. | 2 |
| 23 | **Estado de las integraciones** (Izipay conectado o no). | No hay endpoint (`/integraciones` → 404); Integraciones muestra Izipay para «Conectar». | 2 |
| 24 | **Textos con «(s)»** en `/go-live`. | «2 sede(s)», «6 doctor(es)». | 26 |
| 25 | **Odontograma:** responder 400, no 500, con datos inválidos. | 500 con una dentición inválida. | 28 |
| 26 | **Imágenes fuera de la base de datos.** | Se guardan en base64. | 30 |
| 27 | **IPN de Izipay:** confirmar en el log si llegan los POST a `/public/izipay/ipn`. | Sin confirmar. No se cuenta como defecto. | — |

---

## 3. Frontend

**El parche completo anterior ya está publicado.** Se compiló la rama y se comparó con lo publicado: todo coincide, salvo la pantalla de cambio de clave. El ajuste `cambio-frontend-QA33.patch` todavía no está publicado (producción sigue con `index-DjK7jcE6.js` el 23/10).

**Cambio nuevo:** `cambio-frontend-diseno-2026-10-23.patch`, la revisión de diseño del 23/10.
- **Qué cambia:** solo cómo se ven los datos. Cifras como cifras, montos con 2 decimales, un solo formato de fecha, nombres sin cortar y un estilo por botón, en todas las pantallas. La lista completa está en `REVISION-DISENO-2026-10-23.md`.
- **Base:** la versión publicada hoy (`index-DjK7jcE6.js`). **Ya incluye el ajuste de `cambio-frontend-QA33.patch`**: no hay que aplicar ese parche aparte.
- **Alcance:** 33 archivos de `frontend/` (4 nuevos). No toca la pantalla de cambio de clave, ni llamadas al servidor, ni datos guardados.

**Cómo aplicarlo** (desde la raíz del repositorio):
1. `git apply --check cambio-frontend-diseno-2026-10-23.patch` (no debe decir nada).
2. `git apply cambio-frontend-diseno-2026-10-23.patch`.
3. En `frontend/`: `npm test` debe dar 461 pruebas con las mismas 3 fallas de siempre (A30, SRV-01/02 y CONFORMANCE ronda 2), y `npm run build` debe terminar sin errores.
4. Publicar.
