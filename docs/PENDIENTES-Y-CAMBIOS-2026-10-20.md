# Pendientes del servidor y cambios del frontend (20/10/2026)

**Archivos:**
- **Este documento:** lo que ya quedó bien y lo que falta en el servidor, en orden de prioridad.
- **`cambio-frontend-completo-2026-10-20.patch`:** todos los cambios del frontend desde la versión publicada.
- **Evidencia:**
  - `QA-REVISION-32-2026-10-20.md`: pruebas en producción del 20/10, con frases, respuestas y conteo de veces;
  - `UX-REVISION-2026-10-20.md`: detalle de los cambios de diseño del parche.

Todo se verificó en producción (`app.odontosonrisa.biz` y su API) el 20/10/2026, con datos de prueba «QA» y el sandbox de Izipay.

---

## 1. Ya quedó bien ✅

Lo corregido después de la revisión 31 funciona:

| Tema | Cómo responde ahora |
|---|---|
| **Derivar a recepción** | El chat pasa a modo recepción y queda una nota con el pedido del paciente. La IA deja de responder y se crea una notificación. En la bandeja aparece en «Recepción». |
| **Instrucciones internas** | Ya no llegan al paciente. Con una reserva sin pagar, la IA anula su propio link: «Listo: anulé el link de pago pendiente del jueves 24/12. El cupo quedó libre.» |
| **«Pasar mi cita»** | Reconoce la cita pagada y deriva; no crea otra reserva ni otro cobro. |
| **Fecha equivocada** | «No tiene cita el lunes 21/12; su cita es el jueves 17/12 a las 09:00. ¿Es esa la que desea cancelar?» |
| **Agendar y pagar** | 3 de 3 pacientes nuevos llegaron al link. El pago confirmó la cita, llegó el aviso por WhatsApp y el cobro aparece una sola vez en Caja. |
| **Las 6 cuentas** | 0 errores en pantalla y 0 llamadas con error. |

---

## 2. Falta en el servidor

«Veces» es en cuántas revisiones se reportó, de R1 a R32.

### Prioridad alta: pacientes, seguridad y operación

| # | Qué falta | Cómo está hoy | Veces |
|---|---|---|---|
| 1 | **La derivación debe contar como pendiente.** | Tras derivar, el chat queda con `porResponder: 0`: no suma al contador de WhatsApp ni aparece en «Pendientes» hasta que el paciente vuelve a escribir. La notificación `derivacion_recepcion` llega sin `pacienteId` ni `citaId`. | 2 |
| 2 | **Mensajes de la IA sin saltos a mitad de frase.** | «Si el pago no entra a esa / hora…», «si no puede venir, se / aplica…». El paciente los ve cortados en WhatsApp. | 1 |
| 3 | **Avisar cuando el día pedido no tiene doctor de esa especialidad.** | Se pidió el martes 22/12 en Surco y la IA ofreció el jueves 24 sin explicar que el martes no atiende odontología general. | 1 |
| 4 | **La sesión con clave temporal solo debe servir para cambiar la clave.** | Con `debeCambiarClave: true`, `GET /pacientes` responde 200. | 20 |
| 5 | **`/servicios` no debe mostrar costos ni precios de otra sede** a recepción y al administrador de sede. | Llegan `costeDirecto` y los precios de las dos sedes. | 27 |
| 6 | **Caídas con 503 bajo carga.** | De 30 lecturas simultáneas fallaron 19 y 14. | 27 |
| 7 | **Cargar los datos reales de la clínica** (entregados en R22). | RUC 20123456789, teléfono 900000000, sedes sin WhatsApp y los 22 servicios de la demo. | 11 |

### Prioridad media: datos que no se guardan o no cuadran

| # | Qué falta | Cómo está hoy | Veces |
|---|---|---|---|
| 8 | **La meta es por sede.** | `"persistencia":"medico"`. | 25 |
| 9 | **Radiografías y fotos:** guardar `piezas`, `vista` y `momento`. | Vuelven vacíos. | 31 |
| 10 | **Guardar la sede** en consentimientos, recetas e historias; **devolver `sedeId`** en seguros. | Sin sede. | 25–26 |
| 11 | **`ficha360`:** citas con `id`. | Sin `id`. | 27 |
| 12 | **«Nuevos y recurrentes»:** `primeraVisita`. | No viene. | 29 |
| 13 | **Mi producción:** `produccionMesAnteriorAlDia`. | Solo viene `produccionMesAnterior`. | 25 |
| 14 | **Servicios inactivos.** | `incluirInactivos=true` devuelve lo mismo. | 26 |
| 15 | **Citas pasadas** que siguen «confirmada». | 14/09 (Sofía Pérez) y 10/10 (QA Prueba Doctor). | 29 |
| 16 | **Los chats deben cuadrar.** | El resumen gerencial dice 16; `/conversaciones` tiene 56. | 24 |
| 17 | **Stock:** registrar movimientos, no solo el valor final. | Valor absoluto. | 28 |
| 18 | **Auditoría:** registrar inventario, órdenes, laboratorio, seguros, metas, clínica y odontograma, y paginar. | No los registra; tope de 2000 eventos y `page=2` devuelve lo mismo. | 28–29 |

### Prioridad baja: textos y limpieza (el frontend ya los oculta)

| # | Qué falta | Cómo está hoy | Veces |
|---|---|---|---|
| 19 | **Procedimiento anulado:** no pegar el motivo al nombre. | «QA fase nombre R32 [Motivo: …]». El motivo ya viene en `motivo`. | 16 |
| 20 | **Consentimiento anulado:** sin marcas en el título ni en el texto firmado, y con `anuladoEn` y `anuladoPor`. | «[ANULADO] …» y «[Anulado: …]»; `anuladoEn` y `anuladoPor` vacíos. | 17 |
| 21 | **Estado del asistente** sin el modelo. | «Activo (gpt-4o)». | 1 |
| 22 | **Concepto de los cobros de Izipay** sin códigos. | «… · 17924749195080 · 9adefaed-…»: van en campos aparte. | 1 |
| 23 | **Estado de las integraciones** (Izipay conectado o no). | No hay endpoint (`/integraciones` → 404); Integraciones muestra Izipay para «Conectar». | 1 |
| 24 | **Textos con «(s)»** en `/go-live`. | «2 sede(s)», «6 doctor(es)». | 25 |
| 25 | **Odontograma:** responder 400, no 500, con datos inválidos. | 500 con una dentición inválida. | 27 |
| 26 | **Imágenes fuera de la base de datos.** | Se guardan en base64. | 29 |
| 27 | **IPN de Izipay:** confirmar en el log si llegan los POST a `/public/izipay/ipn`. | Sin confirmar. No se cuenta como defecto. | — |

---

## 3. Frontend

**Archivo:** `cambio-frontend-completo-2026-10-20.patch`.
- **Base:** la versión publicada hoy (`index-D3Ylj-i5.js`, commit `f5370c6` de la rama). Se comprobó que aplica limpio sobre ella.
- **Alcance:** solo toca `frontend/`. **No toca la pantalla de cambio de clave.**

**Cómo aplicarlo** (desde la raíz del repositorio):
1. `git apply --check cambio-frontend-completo-2026-10-20.patch` (no debe decir nada).
2. `git apply cambio-frontend-completo-2026-10-20.patch`.
3. En `frontend/`: `npm test` debe dar 450 pruebas con las mismas 3 fallas de siempre (A30, SRV-01/02 y CONFORMANCE ronda 2), y `npm run build` debe terminar sin errores.
4. Publicar.

**Qué cambia** (detalle en `UX-REVISION-2026-10-20.md`):
- **Pantallas reportadas por el cliente:**
  - **Ausentismo:** la escala crece con la tasa.
  - **Ocupación de sillones:** cuenta las citas sin sillón.
  - **Recetas:** la alerta de alergia se lee clara.
  - **Modales:** sin texto partido.
  - **Selects:** blancos en toda la app.
  - **Otras pantallas:** WhatsApp, Laboratorio, Caja, Puesta en marcha e Integraciones.
- **Formatos:**
  - moneda siempre como «S/ 1,880.00» y hora en 24 h;
  - fechas con año cuando hace falta;
  - sin códigos internos en pantalla.
- **Tablet:**
  - la tabla que no cabe pasa a tarjetas, y la columna de acciones ya no tapa otra;
  - la Agenda Semana agrupa las canceladas.
- **Celular:**
  - cifras en 2 columnas y pestañas a la vista;
  - Configuración, Permisos, Integraciones, Ocupación y Consolidado sin cortes;
  - título en la barra superior y botones de al menos 36 px.
- **WhatsApp:** la bandeja muestra en negrita lo que la IA marca con `*…*`, como lo ve el paciente.

**No depende del servidor.** Cuando el servidor corrija los puntos 1, 19, 20, 21 y 22, el frontend no necesita cambios:
- con `porResponder ≥ 1`, el contador y «Pendientes» funcionan solos;
- los textos limpios se muestran tal cual llegan.
