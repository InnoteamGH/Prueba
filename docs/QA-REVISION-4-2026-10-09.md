# QA de revisión 4: Dento Check (08 y 09/10/2026)

**Qué se probó:**
- La API de producción, directamente con cada rol.
- La versión del frontend de la rama `claude/laughing-edison-3rr5w6` conectada al backend de producción, módulo por módulo, botón por botón y rol por rol: recepción (San Isidro y Surco), doctoras (Carla, Ana, Luis, Sofía), administrador general, administrador de Surco, gerencia, TI y portal del paciente.

**Datos de prueba:** todos llevan «QA» en el nombre y DNI 99…

> **Importante:** `app.odontosonrisa.biz` sigue publicando el frontend del 05/10 (`index-DmtTR2H5.js`). Las correcciones de frontend de la revisión 3 y de esta revisión **no están desplegadas**. Hay que hacer `git pull` de la rama y volver a desplegar (ver sección 4).

---

## 1. Corregido desde la revisión 3 ✅
- **Ficha del paciente y plan de tratamiento:** abren en los 50 pacientes. Antes daban 500 en cuanto había un plan.
- **Procedimientos:** ya se pueden agregar a un plan (`POST /tratamientos/{id}/fases`).
- **Bloqueos de agenda:** se guardan a la hora pedida (antes, 5 horas más tarde).
- **Recepción de Surco:** ya no puede borrar bloqueos de San Isidro (403).
- **Administrador de sede:** ya no puede subir usuarios a administrador, moverlos de sede ni cambiar el precio base.
- **Seguros:** Enviar, Aprobar y Pagar funcionan.
- **DNI duplicado:** el aviso ya no revela el nombre de un paciente de otra sede.
- **Consentimientos firmados:** ya no se pueden borrar (409).
- **Cierre de caja:** el servidor calcula el esperado en dólares (fondo ± movimientos en dólares).
- **Estado de WhatsApp:** coherente en todas las pantallas; 0 fallos en 24 h.

---

## 2. Pendientes del backend

### 2.1 Errores (❌)
1. **Reabrir una caja cerrada responde 500.**
   - `POST /caja/apertura` sobre una jornada ya cerrada responde 500, en las dos sedes y con jornadas de varias fechas.
   - Antes reabría, aunque borraba el primer arqueo. Hay que crear una sesión nueva y conservar la anterior.
2. **La Caja cobra procedimientos anulados.**
   - `GET /caja` sigue sumando en `porCobrar` (total y saldo) y en `montoPorCobrar` las fases con estado `cancelada`.
   - `pend` cuenta como pendientes las canceladas y las terminadas: dice «7 procedimientos pendientes» cuando no hay ninguno.
   - Hay que excluir `cancelada` del total, del saldo y de `pend`, y excluir también `terminada` de `pend`.
3. **El odontograma guarda mal los colores.**
   - `PUT /odontograma` recibe `estadosCara` con `"_colores":{"O":"a"}`, y `GET` lo devuelve como el texto `"{O=a}"` (Java `Map.toString()`). Lo mismo pasa con `_coloresRaiz`, `_piezas` y `raices`.
   - Efecto: «Buen estado» volvía como «por hacer» y se pasaría al presupuesto.
   - El frontend ya lee ese formato (ver 4), pero hay que guardar el JSON tal cual.
4. **Los bloqueos ignoran el sillón.**
   - Se envía `sillon: 3` y se guarda `sillon: null`, así que el bloqueo afecta a toda la sede.
   - Además, `GET /bloqueos` entrega a Surco los bloqueos de San Isidro.
5. **Datos de una sede que la API entrega a la otra.** La pantalla los oculta, pero la API los devuelve.
   - **Recetas y consentimientos:** `GET /recetas` y `GET /consentimientos` sin filtro devuelven los de las dos sedes. Ana (Surco) recibe 6 recetas y 4 consentimientos de San Isidro.
   - **Pagos:** `GET /pagos` y `/pagos/historial`, con el token de Surco, devuelven pagos de San Isidro: 8 de 10 para el administrador de Surco.
   - **Administrador de Surco:** recibe consentimientos, envíos de formularios, seguros (con o sin `sedeIds`), órdenes de compra y usuarios de San Isidro.
   - **Resumen de citas:** el de toda la clínica llega a Surco.
   - **WhatsApp:** San Isidro ve los 18 chats (uno de una paciente de Surco y 10 sin paciente). Surco ve 0.
6. **El administrador de Surco escribe en San Isidro.**
   - `PATCH`/`PUT` sobre laboratorio, seguros, inventario, órdenes de compra y la meta de la Dra. Carla responden 200, igual que las altas con la sede de San Isidro.
   - Se probó solo sobre registros QA o repitiendo el mismo valor.
7. **Reportes que ignoran la sede:**
   - `/gerencial/kpis` y `/gerencial/indicadores`: al elegir Surco, el Panel sigue mostrando toda la clínica;
   - `/tratamientos/resumen` (Procedimientos, Top de tratamientos): 14 filas con cualquier sede;
   - `/comisiones`: S/ 1 800 con cualquier sede.
8. **Horarios por doctor.** `POST /disponibilidad` como administrador responde «Tu usuario no está vinculado a una ficha de médico». El administrador no puede cargar el horario de un doctor desde Configuración.
9. **Cifras que no cuadran:**
   - «Procedimientos realizados» cuenta fases pendientes y presupuestos.
   - La antigüedad de la deuda suma S/ 1 990, frente a S/ 2 299 en Caja.
10. **Auditoría.** No registra altas, bajas ni cambios de usuarios, roles, precios, inventario ni datos de la clínica. Solo registra LOGIN, HC_ACCESO, PAGO y CAJA. Además, ignora `desde`/`hasta` y tiene un tope de 500 eventos.
11. **Portal del paciente.** El DNI 44567890 con la clave `demo` responde 401.

### 2.2 Menores (⚠️)
- **Campos que no se guardan:**
  - la `cara` del procedimiento (vuelve `null`);
  - en radiografías y fotos, `piezas`, `vista` y `momento`;
  - la `sedeId` de los seguros.
- **Citas:**
  - se puede poner «en atención» una cita futura (`PATCH /citas/{id}/estado`);
  - las citas que crea recepción nacen «confirmada», así que «Confirmar» no aparece (el 08/10 nacían «pendiente»);
  - la cita del 14/09 de Sofía Pérez sigue «confirmada»: falta cerrar automáticamente las citas pasadas.
- **Caja:**
  - un cobro hecho en una jornada de fecha pasada queda con la fecha de hoy y no entra en el arqueo de esa jornada (esperado S/ 9 en vez de S/ 10);
  - se puede registrar un egreso en dólares mayor que la gaveta (esperado US$ -1.75).
- **Consentimientos:** el firmado no se puede borrar (correcto), pero el «flujo de anulación» que indica el mensaje no existe (404/405).
- **Borrados que no existen:** no hay forma de borrar un plan vacío ni un procedimiento (DELETE 404/403). Quedan planes duplicados y fases de prueba.
- **Servicios inactivos:** no se devuelven (`?incluirInactivos=true` se ignora) y no se pueden reactivar.
- **Médicos:** `/medicos` trae las `sedes` vacías, así que aparecen doctores de otra sede en la agenda y en la lista de espera.
- **Validaciones de la API:** acepta una fecha de nacimiento de 1890 y un celular que empieza en 8; la pantalla sí los rechaza.
- **Sillones:** `/sillones/asignaciones` dio 500 de forma intermitente.
- **Usuarios:**
  - no hay endpoint para restablecer la clave;
  - la clave temporal se genera en el navegador;
  - el campo «usuario» no existe en `POST /usuarios`.
- **«Nuevos y recurrentes»:** siempre «—», porque falta el dato de la primera visita.
- **Inventario:** el stock se envía como valor absoluto; falta un endpoint de movimiento.
- **Alcance de TI:** según su descripción no debería ver cobranza, pero recibe Caja con nombres de pacientes y todos los chats.
- **Automatizaciones:** recepción de una sede puede pausar o editar las de toda la clínica.

---

## 3. Datos de la clínica
1. **RUC 20123456789:** sigue siendo inválido en SUNAT.
2. **Teléfono «900000000»:** parece de relleno. Correo, web, cuentas y billeteras siguen vacíos.
3. **Insumos:** los 5 siguen sin sede.

---

## 4. Frontend (corregido en la rama, falta desplegar)
Para aplicarlo:
- con la rama, `git pull`;
- sin la rama, el parche adjunto `cambio-frontend-QA4.patch` con `git apply`.

Después hay que volver a desplegar. El parche incluye las correcciones de la revisión 3 y las de esta.

**Verificación:**
- Compila y pasa 145 de 148 tests; los 3 que fallan son anteriores.
- Se recorrieron los 6 perfiles contra la API de producción: 0 errores en pantalla y 0 llamadas con error.
- Se comprobaron en pantalla:
  - Caja con «Listos para cobrar (1)»;
  - Plan y cuenta con lo pagado (9 %, saldo S/ 309.25);
  - gerencia sin «Cobrar»;
  - Surco sin bloqueos de San Isidro.

**Cambios de esta revisión** (además de los de la revisión 3):
- **Procedimientos anulados:** el servidor los devuelve como `cancelada`. Ahora cuentan como anulados en todas las pantallas: no suman al total, al saldo ni al PDF y ya no ofrecen «Terminar».
- **Caja › «Listos para cobrar»:** muestra lo que el médico terminó (`caja.terminados`), con su monto y botón para cobrarlo. Antes decía 0.
- **Odontograma:** lee los colores que el servidor guarda como texto de Java (`{O=a}`), así que «Buen estado» ya no vuelve como «por hacer».
- **Agenda:**
  - los bloqueos de otra sede ya no bloquean la grilla ni el modal de agendar;
  - al crear un bloqueo se envía `sedeId`;
  - la hora elegida ya no cambia sola si la respuesta de «primera hora libre» llega tarde;
  - si `/medicos` no trae sedes, la sede de cada doctor se deduce de su disponibilidad.
- **Plan y cuenta:** «Pagado» coincide con la cabecera y con Caja, porque incluye los abonos sin procedimiento.
- **Ficha:** recepción ya no pide el odontograma (antes recibía 3 veces 403).
- **Inicio:**
  - las tarjetas son clicables;
  - el Excel de la semana se nombra por el rango;
  - «Pendientes de hoy» dice «saldo por cobrar» y calcula el vencido de verdad (trabajo terminado hace más de 30 días).
- **Solicitar reseñas:** abre una vista previa con el mensaje y permite elegir a quién se envía.
- **Egresos en dólares:** pide confirmación si el egreso supera lo que debería haber en la gaveta.
- **Médico:**
  - «Completar» abre la historia clínica con la cita;
  - plurales correctos («1 cita», «1 atención»);
  - el PDF del consentimiento lleva el texto del procedimiento, los beneficios, los riesgos y las alternativas;
  - una sola plantilla de receta PDF para la ficha y el módulo;
  - «Mi producción» no cuenta una atención hasta que tenga su evolución;
  - el motivo del bloqueo se recuerda.
- **Permisos (gerencia, TI y administrador de sede):** se ocultan las acciones que el servidor rechaza:
  - «Cobrar» en la Agenda;
  - «Editar datos» del paciente;
  - «+ Procedimiento»;
  - «Subir una foto»;
  - «Ofrecer a la lista de espera»;
  - «Eliminar» en Seguros.
- **Metas:**
  - el % de comisión es de solo lectura sin permiso;
  - cada cambio se guarda por separado y avisa si una parte falla;
  - Escape cancela la edición.
- **Usuarios:**
  - «Activar» funciona para el administrador de sede, con el mensaje correcto;
  - con sesión, el alta pide el correo, que es con lo que se entra (el campo «usuario» no existe en la API).
- **Panel gerencial y Producción con una sede elegida:** se recalcula por sede lo que la API permite (Top del equipo, producción del día, producción y comisiones por citas y pagos de la sede). Lo que el servidor no filtra lleva la etiqueta «toda la clínica» y un aviso.
- **Más reportes:**
  - «Hecho sin pagar» son los procedimientos terminados sin cobrar;
  - «Vencido» y «Días sin pagar» tienen datos reales;
  - «Procedimientos» avisa que las cifras son de toda la clínica.
- **Exportaciones:** se titulan «Ausentismo por odontólogo» y «Producción por odontólogo».
- **Seguros:** cuando el servidor no devuelve la sede, lo dice.
- **Servicios:** «Ver inactivos» explica que el servidor no los lista.

**Decisiones pendientes** (de producto o permisos, no de código):
- Las citas que crea recepción, ¿nacen «pendiente» o «confirmada»?
- ¿Recepción debe poder pausar o editar las automatizaciones de toda la clínica?
- ¿TI debe ver Caja?
- ¿Se unifica qué se considera «facturado»? Hoy hay tres definiciones distintas.

---

## 5. Registros de prueba que quedaron en producción
- **Pacientes:**
  - QA Prueba Recepción (99100201)
  - QA Recepción Curl (99100202)
  - QA Agenda Recepción (99100203)
  - QA Cancelar Recepción (99100205)
  - QA Prueba Doctor (99260410)
  - QA Reverificacion Octubre (99100510)
  - QA Doctor Carla Flujo (99260501)
  - QA Doctor Surco (99260502)
  - QA Nuevo Agenda Rtres (99300412)
  - QA Alta Recepcion Rtres (99300413)
  - QA Valida Recepcion (99300414)
  - QA Nuevo Agenda Rcuatro (99481001)
  - QA Alta Recepcion Rcuatro (99481002)
  - QA Nuevo Agenda Rcinco (99509001)
- **Datos clínicos:**
  - un plan vacío duplicado en QA Prueba Doctor;
  - un plan en QA Doctor Carla Flujo;
  - 7 fases QA canceladas con costo 0;
  - 3 evoluciones QA firmadas;
  - 2 consentimientos QA firmados (QA Prueba Doctor y QA Doctor Carla Flujo);
  - el caso de laboratorio «QA férula prueba médico (borrar)», entregado.
- **Citas:** las de prueba están canceladas, salvo la del 09/10 (atendida) y la del 10/10 (confirmada) con la Dra. Carla.
- **Caja:**
  - Jornadas QA cerradas:
    - San Isidro del 04/10;
    - San Isidro del 03/10;
    - Surco del 04/10;
    - Surco del 03/10.
  - Cobros QA a QA Prueba Doctor: S/ 10, US$ 5, S/ 1 y S/ 1.
  - Egresos QA:
    - S/ 3 y S/ 1 en San Isidro;
    - S/ 3 y US$ 3.75 en Surco.
- **Catálogo:** el servicio «QA Servicio prueba», inactivo.
- **Usuarios inactivos:** «QA Usuario Prueba», «QA Usuario Admin», «QA Usuario TI Editado» y «QA Usuario R4».
- **Órdenes de compra:** 3 «QA Proveedor…» (1 recibida y 2 anuladas).
- **WhatsApp:** mensajes «QA … (ignorar)» en el chat «QA Smoke WA2».
