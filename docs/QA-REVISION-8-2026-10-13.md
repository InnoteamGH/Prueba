# QA de revisión 8: Dento Check (13/10/2026)

**Qué se probó:**
- **Sistema:** producción real en `app.odontosonrisa.biz`, que ya publica el frontend de la revisión 7 (`index-C1XNs51K.js`), y su API.
- **Cómo:** módulo por módulo, botón por botón y rol por rol, entre la 01:30 y las 02:40 (hora de Lima).
- **Roles:**
  - recepción de San Isidro y de Surco;
  - las doctoras Carla y Ana, más Luis y Sofía;
  - el administrador general y el administrador de Surco;
  - gerencia, TI y portal del paciente.
- **Datos de prueba:** llevan «QA» en el nombre y DNI 99…

> **Crítico (frontend, ya corregido en la rama; conviene publicarlo hoy):** al abrir el módulo **Odontograma**, la pantalla entraba en un bucle de lecturas y, **sin que el médico tocara nada, guardaba cambios**: borró la fase inicial de un paciente QA (ya restaurada) y en otra apertura intentó vaciar dos piezas y cambiar el color de otra. Pasa en 1 de cada 3 a 8 aperturas, así que **puede estar alterando odontogramas de pacientes reales**. Ver sección 4.1.
>
> **Urgente (datos):** la caja de **San Isidro** sigue abierta desde el **sábado 10/10, 22:01** (Roberto Díaz). Es la **4.ª revisión** que lo reporta.

---

## Cómo leer el conteo

Cada pendiente indica **cuántas veces se ha reportado** (contando esta) y **en qué revisiones**:

| Revisión | Documento | Fecha |
|---|---|---|
| R1 | `QA-PRODUCCION-2026-10-04` (incluye la reverificación del 05/10) | 04 y 05/10 |
| R2 | `QA-REVISION-2026-10-05` | 05/10 |
| R3 | `QA-REVISION-3-2026-10-05` | 05/10 |
| R4 | `QA-REVISION-4-2026-10-09` | 08 y 09/10 |
| R5 | `QA-REVISION-5-2026-10-12` | 11 y 12/10 |
| R6 | `QA-REVISION-6-2026-10-12` | 12/10 |
| R7 | `QA-REVISION-7-2026-10-12` | 12/10 |
| **R8** | **este documento** | **13/10** |

Por ejemplo, «**8.ª** · R1–R8» significa que se reportó en las 8 revisiones.

---

## 1. Corregido desde la revisión 7 ✅

**Backend**

| Corregido | Veces que se reportó |
|---|---|
| **Portal del paciente:** con DNI 44567890 y clave `demo` ya entra (antes 401). | 5 (R3–R7) |
| **`/gerencial/indicadores`** ya filtra por sede la deuda, la cartera, la ocupación y las alertas. | 5 (R1, R4–R7) |
| **`/egresos`** ya respeta `sedeIds` para el administrador general y gerencia. | 3 (R1, R6, R7) |
| **`/whatsapp/salud`:** `porSede` ya trae solo la sede del usuario. | 1 (R7) |
| **Gerencia** ya no puede guardar el % de comisión por la ruta de la sede (403). | 1 (R7) |
| **El administrador de Surco** ya no puede guardar la meta de un médico de San Isidro (403), pero ver 2.1-3. | 2 (R6, R7) |
| **Alta de pacientes:** la API ya rechaza un nombre con números. | nuevo |

**Frontend publicado (revisión 7), verificado en producción**
- **Integraciones:** cada sede muestra su número y el estado «Con fallos». El inicio de TI ya avisa la incidencia.
- **Gerencia:** ve el % de comisión en solo lectura y Recordatorios ya no pide `/whatsapp/salud`.
- **Agenda:**
  - los bloqueos se ven en las vistas Semana y Mes, y al pulsar un día del Mes se abre ese día;
  - descargar una semana sin citas lo avisa, y si fallan los sillones, el modal ofrece «Reintentar».
- **Menús:** «Exportar», «Descargar» y «Más acciones» se cierran con Escape.
- **Plan de inversión:** separa lo ya realizado y descuenta lo pagado.
- **Auditoría:** el aviso es correcto, se busca por nombre y la hora sale bien.
- **Caja:**
  - un solo aviso con el rango invertido;
  - el arqueo de una jornada reabierta explica qué movimientos no entran;
  - si Caja no carga, la deuda dice «No disponible · Reintentar».
- **Textos:** los plurales salen bien («2 sedes», «6 doctores»).
- **Por sede:** recepción de Surco y Ana (Surco) no ven nada de San Isidro en 47 + 22 lecturas, y el administrador de Surco tampoco, en 63 pantallas.

---

## 2. Pendientes del backend

### 2.1 Errores (❌)

| # | Pendiente | Qué se vio hoy | Veces | Revisiones |
|---|---|---|---|---|
| 1 | **Caídas con 503 y respuestas sin CORS** | Con 30 lecturas simultáneas fallaron 17 (503) en una tanda y 2 en otra; con 20, una tardó 13,4 s. En el navegador hubo 503 sueltos en `/bloqueos`, `/espera`, `/citas`, `/consentimientos`, `/egresos`, `/formularios/envios`, `/pacientes/resumen-citas` y `/pagos/cierre`, más 7 respuestas sin cabecera CORS y un *timeout* en `/caja`. El frontend lo amortigua, pero la causa está en el servidor: pool de conexiones, concurrencia, *timeouts* y arranque en frío. | **4.ª** | R5–R8 |
| 2 | **Portal: el resumen no trae el plan ni el saldo** | `GET /portal/{id}/resumen` devuelve solo citas, paciente, total invertido, ahorro y pagos. Rosa Linares tiene un plan de S/ 1 000 con 2 fases pendientes y S/ 800 de saldo, y el portal no puede mostrarlo. Faltan el plan con sus fases, el saldo y el odontograma. | 1.ª | R8 |
| 3 | **Metas: el administrador de sede no puede guardar ninguna** | `PUT /medicos/{id}/metas/{sedeId}` responde 403 «No puedes modificar la meta de un médico sin sede asignada» incluso para Luis Paredes, que tiene horario en Surco, porque `/medicos` trae `sedes` vacías en los 6 médicos (ver 2.2). Validar contra el horario de la sede (`/disponibilidad`) o cargar las sedes de cada médico. | 1.ª | R8 |
| 4 | **La meta «por sede» se guarda en la ficha global del médico** | `PUT /medicos/{id}/metas/{sedeId}` del administrador responde `"persistencia":"medico"`. | 2.ª | R7, R8 |

### 2.2 Menores (⚠️)

**Datos de una sede visibles desde otra**

| Pendiente | Veces | Revisiones |
|---|---|---|
| `/servicios` entrega a recepción y al administrador de sede los precios de las dos sedes y el costo interno (`costeDirecto`, `preciosSede`). | **4.ª** | R5–R8 |
| `/whatsapp/metricas` da a cada sede los totales de toda la clínica (los mismos números con cualquier token y con `sedeIds`). | 3.ª | R6–R8 |
| `/whatsapp/salud`: `fallos24h` es de toda la clínica; Surco ve «3 fallos» que son del chat de San Isidro. | 1.ª | R8 |
| Chats del Panel: el resumen gerencial da 8 chats (5 + 6 por sede) y `/conversaciones` da 3 para el mismo periodo. | 1.ª | R8 |

**Datos que no se guardan o no se devuelven**

| Pendiente | Veces | Revisiones |
|---|---|---|
| Radiografías y fotos no guardan `piezas`, `vista` ni `momento` (probado hoy: vuelven en `null`). | **8.ª** | R1–R8 |
| `/medicos` trae `sedes` vacías en los 6 médicos. Ahora además bloquea las metas del administrador de sede (2.1-3) y descuadra los listados por sede. | **7.ª** | R1, R2, R4–R8 |
| Las imágenes se guardan en base64 dentro de la base de datos. | **6.ª** | R1, R2, R5–R8 |
| `ficha360` devuelve las citas sin `id`. | **4.ª** | R5–R8 |
| El consentimiento no guarda la sede. | 3.ª | R6–R8 |
| Las recetas y las historias no guardan la sede. | 2.ª | R7, R8 |
| Seguros no devuelve `sedeId` (la pantalla ya lo envía). | 2.ª | R5, R8 |
| Los servicios inactivos no se devuelven (`?incluirInactivos=true` se ignora). | 3.ª | R4, R5, R8 |
| «Nuevos y recurrentes»: `/pacientes/resumen-citas` no trae `primeraVisita`. | **6.ª** | R3–R8 |
| Mi producción: falta `produccionMesAnteriorAlDia`. | 2.ª | R7, R8 |

**Caja y citas**

| Pendiente | Veces | Revisiones |
|---|---|---|
| `/caja/apertura/historial` devuelve la jornada abierta del 10/10 en cualquier rango (septiembre incluido). | **4.ª** | R5–R8 |
| La API acepta `en_atencion` y `atendida` en citas futuras, sin llegada. | **6.ª** | R3–R8 |
| La API acepta cancelar una cita ya atendida y con evolución ligada. Como efecto, `resumen-citas` da como «última visita» una fecha futura. | 2.ª | R6, R8 |
| Siguen «confirmada» dos citas pasadas de San Isidro: 14/09 (Sofía Pérez) y 10/10 (QA Prueba Doctor). Las de Surco sí se cerraron. | **6.ª** | R3–R8 |

**Validaciones**

| Pendiente | Veces | Revisiones |
|---|---|---|
| La API acepta nacimiento en 1890 y celular que empieza en 8 (probado hoy: 200). | **5.ª** | R4–R8 |
| El odontograma responde 500 (en vez de 400) con una dentición inválida. | **4.ª** | R5–R8 |

**Permisos**

| Pendiente | Veces | Revisiones |
|---|---|---|
| El administrador de sede no puede dar de baja con DELETE, pero sí con `PUT /usuarios/{id}` `activo:false`. | 3.ª | R6–R8 |
| El consentimiento firmado no se puede anular: el 409 manda a un flujo que no existe (`/anular` y `/revocar` dan 404). | **4.ª** | R5–R8 |
| El médico recibe 403 al borrar procedimientos (ver decisiones). | 3.ª | R6–R8 |
| Recordatorios: `PUT /automatizaciones` debería exigir `recall: configurar`, como ya hace la pantalla (sección 4). | **5.ª** | R4–R8 |
| Por confirmar: `PUT /medicos/{id}/meta` (ruta global) responde 200 a gerencia aunque el cuerpo traiga `porcentajeComision`. No se probó con otro valor para no cambiar un registro real; confirmar que lo ignora. | 1.ª | R8 |

**Auditoría y usuarios**

| Pendiente | Veces | Revisiones |
|---|---|---|
| La auditoría no registra inventario, órdenes de compra, laboratorio, seguros, metas, cambios de la clínica ni del odontograma (los usuarios ya sí). | **6.ª** | R3–R8 |
| Tope de 2000 eventos y sin paginación (`?page=2` devuelve lo mismo). | **5.ª** | R3, R5–R8 |
| No hay endpoint para restablecer la clave. | **6.ª** | R3–R8 |
| La clave temporal la genera el navegador y viaja en `POST /usuarios`. | **6.ª** | R3–R8 |
| El stock se envía como valor absoluto (falta un endpoint de movimientos). | **5.ª** | R4–R8 |
| Textos del servidor con «(s)» en `/go-live` («2 sede(s)»); el frontend ya los corrige. | 2.ª | R7, R8 |

---

## 3. Datos de la clínica

| # | Pendiente | Veces | Revisiones |
|---|---|---|---|
| 1 | **Caja de San Isidro:** cerrar la jornada abierta desde el 10/10. | **4.ª** | R5–R8 |
| 2 | **RUC 20123456789:** no es válido, así que la boleta no se puede ver. | **8.ª** | R1–R8 |
| 3 | **Insumos:** los 5 siguen sin sede. El médico ve el inventario vacío y el Panel de una sede valorizaba toda la clínica (ya rotulado, sección 4). | **8.ª** | R1–R8 |
| 4 | **Teléfono 900000000:** parece de relleno. Correo, web, cuentas y billeteras siguen vacíos. | **5.ª** | R4–R8 |
| 5 | **WhatsApp por sede:** cargar en Configuración › Sedes el número y el ID de Meta de cada sede. Hoy `/sedes` los trae vacíos y las dos usan el número compartido. Corrección a la revisión 7: los envíos fallidos que muestra el estado («Con fallos») son de los mensajes QA al chat «QA Smoke WA2», cuyo número no es real; no indican un problema del número de la clínica. | 3.ª | R6–R8 |
| 6 | **Médicos:** asignar las sedes de cada médico (resuelve 2.1-3). | **7.ª** | R1, R2, R4–R8 |
| 7 | **2 pacientes sin sede:** «QA Menor Odontopediatría» y «QA Adolescente 15». | 2.ª | R6, R8 |
| 8 | **Periodontograma:** «Salud periodontal» con una bolsa de 6 mm en la pieza 17 (revisar el dato clínico). | 1.ª | R8 |

---

## 4. Frontend

Las correcciones están en la rama `claude/laughing-edison-3rr5w6`. Para aplicarlas, `git pull` y volver a desplegar. Sin la rama, se aplica el parche adjunto `cambio-frontend-QA8.patch`, que contiene solo lo nuevo respecto de lo publicado hoy.

**Verificación:**
- Compila y pasan 361 de 364 tests; los 3 que fallan son anteriores.
- Se recorrió con los 6 perfiles contra la API de producción, solo navegando: 0 errores en pantalla y 0 llamadas con error.

### 4.1 Odontograma (crítico)
- Cada carga del dibujo va numerada y el dibujo devuelve ese número. Se ignoran los avisos y las respuestas de cargas anteriores, que eran los que borraban piezas o hacían saltar la fase.
- No se acepta ningún cambio hasta que el dibujo confirma que muestra lo cargado.
- Nunca se guarda sin que el médico haya tocado el dibujo.
- Prueba contra la API de producción, con las escrituras interceptadas en el navegador:
  - **versión publicada:** hasta 123 lecturas por apertura; en 1 de 8 aperturas intentó guardar sola 3 piezas;
  - **versión corregida:** 4 o 5 lecturas por apertura y 0 escrituras; al marcar una caries a mano guarda solo esa pieza.

### 4.2 Portal del paciente
- **Sin datos inventados:**
  - ya no afirma «Tu boca está sana», «Sin plan aún» ni «Saldo S/ 0 · Estás al día» cuando el servidor no trae el plan o el saldo; dice «No disponible · Consulta tu plan y saldo en la clínica»;
  - si el servidor manda esos datos (2.1-2), se muestran.
- **«Reservar cita»:**
  - ya no propone doctor, horario ni precio de ejemplo; indica cómo reservar, con el teléfono o el WhatsApp de la sede;
  - es un diálogo accesible que se cierra con Escape.

### 4.3 Médico
- **Evolución ligada a su cita:** «Evolución» y «Finalizar» de la agenda, «Iniciar», «Completar» y «Ver atención › Registrar evolución» envían el `citaId`. Además:
  - el selector «Cita» ofrece la cita de origen aunque no sea de hoy;
  - en el Inicio, cada paciente de la alerta abre su propia cita.
- **«Ver atención»** decide por `citaId` si la atención tiene evolución, y por fecha solo como respaldo.
- **Módulo Tratamientos:** Pagado y Saldo salen de la misma fuente que la ficha (S/ 30.75 y S/ 309.25, antes S/ 0), y el Presupuesto PDF los incluye.
- **«Editar datos»** ya no arrastra los errores de «Nuevo paciente».
- **Guía del sistema («?»):**
  - es un diálogo que se cierra con Escape y devuelve el foco;
  - los consejos de módulos que el rol no tiene ya no aparecen.
- **Mi horario:**
  - el aviso dice que falta guardar y avisa de los cambios sin guardar al salir;
  - las fechas de la semana van en minúscula.
- **Agendar:** el médico de la sesión viene elegido como doctor.
- **Toasts:** se corrigió un temporizador que borraba antes de tiempo el siguiente aviso. Por eso no se veían los de «Emitir receta» y «Guardar en el expediente».
- **Directorio:** una fecha futura dice «Próxima», nunca «Hace…».
- **Odontograma sin paciente:** sin iniciales de avatar.

### 4.4 Recepción
- **Consentimientos:** sin permiso de crear, no aparecen «Nuevo consentimiento» ni la clase «Consentimiento» en Documentos («Solo lectura»).
- **Pacientes › «…» › WhatsApp** abre el chat de ese paciente (por paciente o teléfono). Si no tiene chat, lo avisa y nunca abre el de otra persona. Lo mismo vale para «Abrir chat» en Satisfacción.
- **Recordatorios:** Pausar, Activar, Guardar y «Enviar prueba» requieren `recall: configurar` (ver decisiones).
- **Textos:**
  - los avisos de error ya no terminan en «(409 POST /pacientes)»;
  - un rol sin permiso de crear ve «Aún no hay radiografías…» en vez de «Sube la primera…»;
  - las fechas de WhatsApp salen «08 de setiembre de 2026».

### 4.5 Administración, gerencia y TI
- **Metas (administrador de sede):**
  - muestra el motivo real del servidor en vez de «tu rol no tiene permiso»;
  - los médicos sin sede quedan en solo lectura, con la explicación.
- **Un solo criterio de «médico de la sede»** en Metas, Panel, Producción y comisiones y Configuración › Doctores: la sede del servidor o, si no la trae, el horario. Surco ya no cuenta la meta de un médico sin horario allí.
- **Panel con sede:** el inventario valorizado es solo el de la sede, y los insumos sin sede aparecen aparte.
- **Órdenes de compra:** «Total comprado» ya no suma las anuladas.
- **Contadores:** singular correcto en todas las tablas («1 proveedor», «1 sillón»).
- **TI:** el inicio y la pantalla Integraciones cuentan igual. «Mi plan» dice «No disponible para tu rol» en vez de «Pacientes —».

---

## 5. Decisiones pendientes

| Decisión | Veces | Revisiones |
|---|---|---|
| **«Facturado»:** ¿se unifican sus tres definiciones? Hoy: facturado S/ 220 (terminados), producción S/ 80 (citas), cobrado S/ 30.75. | **6.ª** | R3–R8 |
| **Citas:** ¿las que crea recepción nacen «pendiente» o «confirmada»? Hoy nacen «confirmada». | **5.ª** | R4–R8 |
| **Recordatorios:** ¿quién puede pausar, activar o editar las automatizaciones de toda la clínica? Desde esta versión la pantalla lo deja a quien tenga `recall: configurar`, que hoy es solo el administrador general. Si recepción o el administrador de sede deben poder, se les da ese permiso en Permisos. | **5.ª** | R4–R8 |
| **Caja:** ¿quién cierra la jornada que un administrador dejó abierta? ¿TI debe ver Caja? Hoy TI lee `/caja` y `/pagos`. | **5.ª** | R4–R8 |
| **Antigüedad de la deuda:** ¿se mide sobre el trabajo terminado sin cobrar (criterio actual) o sobre el saldo total de los planes? | 3.ª | R6–R8 |
| **Procedimientos:** ¿el médico puede borrarlos o solo anularlos? ¿Se puede anular uno ya terminado? | 3.ª | R6–R8 |
| **Metas:** ¿la meta y el % de comisión son por sede o globales? | 2.ª | R7, R8 |

---

## 6. Registros de prueba que quedan en producción
- **Pacientes:**
  - los de rondas anteriores;
  - «QA Nuevo Agenda Rnueve» (99913001), que no se puede borrar porque ya tiene historia clínica.
- **Clínica:**
  - 2 evoluciones QA firmadas (no se pueden borrar: 405);
  - 2 fases QA canceladas, que el médico no puede borrar (403);
  - la cita QA del 22/10, cancelada.
- **Odontograma de «QA Prueba Doctor»:** la fase inicial que borró el fallo de la sección 4.1 se restauró con sus valores; solo la nota original quedó vacía.
- **Usuarios inactivos:** «QA Usuario R4» a «QA Usuario R8».
- **Inventario:** la orden de compra «QA Proveedor R8» quedó «Recibida» (una orden recibida no se puede anular).
- **Caja de Surco:** egresos QA en las jornadas del 03/10 y 04/10. La del 03/10 se reabrió y se cerró cuadrando exacto (S/ 9 y US$ 5).
- **WhatsApp:** mensajes «QA … (ignorar)» en «QA Smoke WA2», que figuran como fallidos porque el número no es real.
