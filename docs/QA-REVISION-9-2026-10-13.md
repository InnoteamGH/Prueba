# QA de revisión 9: Izipay y WhatsApp (13/10/2026, mediodía)

**Alcance:** solo **Izipay (sandbox)** y **WhatsApp con IA**, como se pidió. El resto del sistema queda como en la revisión 8.

**Qué se probó:**
- **Sistema:** producción real, que ya publica el frontend de la revisión 8 (`index-3TMxBbrA.js`), y su API.
- **Flujo completo:**
  1. el paciente escribe por WhatsApp;
  2. la IA propone cupos;
  3. se crea la reserva y el link de pago de Izipay;
  4. el paciente paga;
  5. llega el aviso de Izipay (webhook);
  6. se crea la cita.
- **Cómo:** el WhatsApp se simuló con «Simular mensaje» en el chat QA (+51 900 000 998, número ficticio), así que no se escribió a ningún paciente real. La reserva y el link se crearon con un paciente QA en Surco, el viernes 23/10, para no tocar la caja real de San Isidro.

**Resultado:** **el pago con Izipay todavía no funciona de punta a punta.**
- El backend responde `izipayConfigured: false`.
- El link que genera no abre ninguna página de pago.
- El aviso de pago no puede venir de Izipay, pero cualquier usuario del personal puede marcar un pago como pagado.
- Al pagar no se crea la cita.

---

## 1. Izipay ❌

| # | Hallazgo | Evidencia | Gravedad |
|---|---|---|---|
| I-1 | **Izipay no está configurado en el backend.** | `POST /pagos/link` responde `"izipayConfigured": false`. Hay que cargar las credenciales del sandbox: código de tienda, contraseña de la API, clave HMAC y clave pública. | ❌ |
| I-2 | **El link de pago no existe en Izipay.** | La URL `https://checkout.izipay.pe/pay/{pagoId}` se arma con el id interno y responde **404 «File or directory not found»**. Debe ser el link o formulario que devuelve la API de Izipay al crear el cobro. | ❌ |
| I-3 | **Cualquier usuario del personal puede marcar un pago como pagado, sin pagar.** | `POST /pagos/izipay/webhook` con `{"pagoId": "…"}` y el token de recepción responde **200 `"estado":"pagado"`**, sin firma y sin consultar a Izipay. | ❌ **crítico** (seguridad) |
| I-4 | **Los avisos reales de Izipay serían rechazados.** | El webhook exige el token de la app (sin él: **401 «No autenticado»**) y solo acepta JSON (con formulario: **415**). Izipay envía su aviso (IPN) **sin token**, como **formulario** (`kr-answer`, `kr-hash`, `kr-hash-algorithm`). La ruta debe ser pública, leer ese formato y **validar `kr-hash` con la clave HMAC**; sin firma válida, rechazar. | ❌ |
| I-5 | **Al pagar no se crea la cita.** | Con la reserva pagada, el webhook responde `"citaCreada": false`, también cuando la reserva lleva `pacienteId`. La agenda del 23/10 sigue vacía. Es el objetivo del flujo (requisito 30). | ❌ |
| I-6 | **El pago no aparece en ninguna parte.** | El pago «pagado» no figura en `/pagos`, `/pagos/historial`, `/pagos/cierre` ni `/caja`. No hay ninguna ruta para consultar una reserva ni un link (`GET /reservas/{id}` y `GET /pagos/link/...` dan 404). Recepción no puede ver qué links están pendientes o pagados, y lo cobrado por Izipay no entra a Caja. | ❌ |
| I-7 | **El mensaje de WhatsApp con el link sale incompleto.** | La `plantilla` dice «🕐   a las» y «📍 Sede», sin fecha, hora ni sede. | ⚠️ |
| I-8 | **Las reservas no se pueden cancelar.** | `DELETE /reservas/{id}` da 404. | ⚠️ |

**Lo que sí funciona:**
- `POST /reservas` retiene el cupo con estado `retenida`, un vencimiento de 30 minutos y el importe del servicio (S/ 50, «Consulta general»).
- Un segundo aviso de pago para el mismo pago no duplica nada.

---

## 2. WhatsApp con IA

### 2.1 La IA no llega a reservar ❌

| # | Hallazgo | Evidencia | Gravedad |
|---|---|---|---|
| W-1 | **La herramienta `agendar` falla siempre.** | Se eligieron 10:00, 09:30 y 11:30 del viernes 23/10 en Surco, con nombre, DNI, celular y fecha de nacimiento. Cada vez responde «El horario de las … ya no está disponible» y ofrece horas más tarde. No se creó ninguna reserva, cita ni paciente; los cupos estaban libres. La IA marca esas horas como descartadas (`franjasDescartadas`), así que el paciente nunca llega al link de pago. Posible relación con I-1: el error real no se muestra. | ❌ |
| W-2 | **Pide un apoderado por error.** | En el segundo intento la IA respondió «Parece que hay un error con la edad registrada… necesito un apoderado», aunque nunca preguntó la fecha de nacimiento y el paciente es adulto. | ❌ |
| W-3 | **Afirma que no hay cupo sin consultar la agenda.** | Dijo que Surco «no tiene disponibilidad el jueves 22», sin usar ninguna herramienta, cuando ese día atienden dos doctores de 9:00 a 18:00 y no hay ninguna cita. | ❌ |
| W-4 | **El estado de la conversación no sigue lo que dice el paciente.** | Tras «sede Surco», el estado seguía en «Sede: San Isidro · Pendiente: sede»; solo cambió dos mensajes después. | ⚠️ |
| W-5 | **Textos de la IA.** | El primer mensaje empieza con un resumen interno («Quiere una cita para limpieza dental en la sede Surco»). En otro: «Puede elegir entre está opciones», sin mostrar opciones. | ⚠️ |

### 2.2 WhatsApp por sede

| Pendiente | Estado hoy | Veces | Revisiones |
|---|---|---|---|
| Cargar el número y el ID de Meta de cada sede (dato de la clínica). | `/sedes` sigue con `whatsappNumero` y `whatsappPhoneNumberId` vacíos; las dos sedes usan el +51 948 277 030. | **4.ª** | R6–R9 |
| `/whatsapp/metricas` da a Surco los totales de toda la clínica. | Igual (18 conversaciones, 15 citas por IA). | **4.ª** | R6–R9 |
| `fallos24h` de toda la clínica (R8). | ✅ Corregido: cada sede ve sus propios fallos. | — | R8 |
| Cada sede ve solo sus chats. | ✅ Sigue bien. Al pasar el chat QA a Surco, recepción de San Isidro deja de verlo (403). | — | — |

### 2.3 Sin mensajes reales desde el 03/10 ⚠️
- **Qué se ve:** desde el 03/10 no entró ningún mensaje de un paciente real. Los únicos son las simulaciones QA. El estado de WhatsApp marca el **último envío correcto el 02/10** y el semáforo de conexión está en ámbar.
- **Qué falta saber:** desde aquí no se puede saber si los mensajes reales entran y salen bien. Hace falta probar con un celular real (sección 4).

---

## 3. Qué tiene que hacer el backend (por orden)

1. **Configurar Izipay sandbox:** credenciales cargadas y `izipayConfigured: true`.
2. **Crear el cobro en Izipay** al crear el link y devolver la URL real del sandbox, que debe abrir el formulario de pago.
3. **Webhook (IPN):**
   - público, sin token;
   - que lea el formulario de Izipay (`kr-answer`, `kr-hash`);
   - que **valide la firma HMAC-SHA256** y rechace todo aviso sin firma válida;
   - que tome el `orderId` como `pagoId`;
   - y que se pueda llamar dos veces sin duplicar nada.
4. **Al pagar:**
   - crear la cita de la reserva, registrar el pago en la Caja de la sede de la reserva con el método «izipay» y su comprobante;
   - avisar al paciente por WhatsApp desde el número de su sede.
5. **Rutas de consulta:**
   - `GET /pagos/links?sedeIds&estado` y `GET /reservas/{id}`, para la pestaña «Links de pago» de Caja;
   - cancelar o anular una reserva.
6. **Plantilla del link:** que incluya la fecha, la hora y la sede.
7. **IA:**
   - corregir `agendar` (W-1) y la validación de la edad (W-2);
   - no afirmar que no hay cupo sin consultar la disponibilidad (W-3).

**Frontend:** no hace falta cambiar nada todavía. Cuando existan las rutas del punto 5, la pestaña «Links de pago» de Caja pasará a listar los links reales y su estado. Hoy dice «Los links de pago aún no están disponibles en el servidor», que es correcto.

---

## 4. Prueba para cuando esté corregido (15 minutos)

1. Desde **un celular real**, escribir al WhatsApp de la clínica: «Hola, quiero una cita de limpieza en Surco el viernes en la mañana».
2. Elegir un horario, dar nombre, DNI y fecha de nacimiento de prueba, y confirmar.
3. Comprobar que llega el **link de Izipay**, que abre el **formulario del sandbox** y que muestra la fecha, la hora y la sede.
4. Pagar con una **tarjeta de prueba del sandbox de Izipay**.
5. Verificar que:
   - llega la confirmación por WhatsApp;
   - la **cita aparece en la Agenda de Surco**;
   - el **pago aparece en la Caja de Surco** con su comprobante;
   - el link figura «pagado» en Caja › Links de pago.
6. **Prueba negativa:** pagar con una tarjeta de prueba que el sandbox rechaza. No debe crearse la cita, y al vencer los 30 minutos el cupo debe liberarse.

---

## 5. Registros de prueba que quedan
- **2 reservas QA en Surco**, el viernes 23/10 a las 16:00 y a las 16:30 («QA Izipay sandbox (ignorar)»). Sus pagos internos quedaron marcados «pagado» por la prueba I-3. No crearon cita ni movimiento en Caja, y no se pueden borrar (no hay ruta).
- **Chat QA +51 900 000 998:** ahora está en la sede Surco, con la conversación de prueba. Recepción de San Isidro ya no lo ve.
- **Paciente «QA Izipay Prueba» (99771234):** creado y borrado.
