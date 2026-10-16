# QA de revisión 5: Dento Check (11 y 12/10/2026)

**Qué se probó:** producción real en `app.odontosonrisa.biz`, que ya publica la última versión del frontend (la de la revisión 4), junto con su API.
- **Alcance:** módulo por módulo, botón por botón y rol por rol.
- **Roles:**
  - recepción de San Isidro y de Surco;
  - doctoras Carla, Ana, Luis y Sofía;
  - administrador general y administrador de Surco;
  - gerencia, TI y portal del paciente.
- **Datos de prueba:** todos llevan «QA» en el nombre y DNI 99…

> **Urgente: caja abierta en San Isidro.**
> - Hay una jornada de caja de San Isidro **abierta desde el sábado 10/10 a las 22:01**, a nombre de Roberto Díaz (administrador), sin nota de QA.
> - Mientras siga abierta, **nadie puede abrir la caja de hoy en San Isidro**: la API responde 409 «Ciérrala antes de abrir otra».
> - No es un registro de prueba, así que no se tocó. Debe cerrarla el administrador o quien la abrió.

---

## 1. Corregido desde la revisión 4 ✅

- **Datos entre sedes:** la API ya no entrega a la otra sede recetas, consentimientos, pagos, formularios, seguros, órdenes de compra ni usuarios. En pantalla, Surco no muestra nada de San Isidro.
- **Bloqueos de agenda:** guardan el sillón y solo bloquean ese sillón. Surco ya no recibe los de San Isidro.
- **Odontograma:** los colores («Buen estado») se guardan como JSON y se mantienen al recargar.
- **Procedimientos:** se guarda la cara del diente.
- **Caja:**
  - ya no cuenta como pendientes los procedimientos anulados ni los terminados;
  - el procedimiento terminado aparece en «Listos para cobrar»;
  - reabrir una jornada ya no da 500.
- **Administrador de sede:** el servidor rechaza 12 de sus 13 escrituras sobre San Isidro. Ya no puede tocar laboratorio, seguros, inventario ni órdenes de compra; la excepción está en 2.1.
- **Consentimientos:** se guarda el texto (`contenido`) del procedimiento y los riesgos.

---

## 2. Pendientes del backend

### 2.1 Errores (❌)
1. **Ráfagas de error 500/503 con carga.**
   - **Qué pasa:** entre las 19:10 y las 19:20 del 11/10, cerca del 70 % de las llamadas respondieron 500 «Ocurrió un error inesperado».
   - **Cómo se reprodujo:** con 30 lecturas simultáneas fallan entre 7 y 13; con 12, ninguna. Solo con abrir el Panel gerencial se generan 25 llamadas.
   - **Consecuencias:**
     - fallaron altas, confirmaciones y cancelaciones (al reintentar funcionaron);
     - Caja, Producción y Reportes salían vacías.
   - **Qué hay que hacer:** revisar el pool de conexiones a la base de datos, el límite de concurrencia de la función y los *timeouts*.
   - **En el frontend:** ahora reintenta las lecturas y limita la cantidad de llamadas simultáneas (sección 4), pero la causa está en el servidor.
2. **Reabrir una jornada de caja borra el primer arqueo.** Ya no da 500, pero reutiliza el mismo registro: el historial pierde el primer cierre (fondo, contado y diferencia), y el esperado en dólares mezcla las dos sesiones (US$ −3.75 en Surco 03/10). Cada reapertura debe ser una sesión nueva.
3. **Procedimientos anulados en los resúmenes.** Las fases con estado `cancelada` siguen sumando en `GET /pacientes/{id}/ficha360` (`resumen`) y en `/pacientes/resumen-financiero`. Se llegó a ver «S/ 481 saldo del plan» con el plan vacío, y Más reportes listaba 5 pacientes con saldo mientras Caja tenía 4.
4. **WhatsApp por sede.** Recepción de San Isidro ve los 18 chats, incluido uno de una paciente de Surco y 10 sin paciente; Surco no ve ninguno. Hay que asignar la sede por el número o por el paciente.
5. **Reportes que ignoran la sede elegida:** `/gerencial/kpis`, `/gerencial/indicadores`, `/tratamientos/resumen` y `/comisiones`, para el administrador general y para gerencia. El frontend muestra el aviso «toda la clínica» y recalcula lo que puede.
6. **El administrador de sede todavía cambia metas de otra sede.** `PUT /medicos/{id}/meta` sigue aceptando que el administrador de Surco cambie la meta de la Dra. Carla (San Isidro).
7. **Cifras:**
   - «Procedimientos realizados» suma fases pendientes, como «Higiene» por S/ 120.
   - La antigüedad de la deuda suma S/ 1 990 y Caja S/ 2 299.25.
8. **Auditoría:**
   - no registra altas, bajas ni cambios de usuarios, roles, precios, inventario ni datos de la clínica;
   - ignora `desde` y `hasta`;
   - tiene un tope de 500 eventos.
9. **Portal del paciente:** el DNI 44567890 con la clave `demo` responde 401.
10. **Borrar un paciente:** `DELETE /pacientes/{id}` responde 500 con un paciente QA recién creado y sin historia («QA Validacion API», DNI 99550011, que quedó en la base).

### 2.2 Menores (⚠️)
- **Evoluciones:** `ficha360` devuelve las citas sin `id`, así que no se puede ligar una evolución a su cita desde la ficha. El frontend lo resuelve desde la alerta (sección 4).
- **Citas:**
  - la API acepta pasar una cita futura a `en_atencion` y ahora también a `atendida`;
  - las citas que crea recepción nacen «confirmada» (decisión pendiente);
  - la cita del 14/09 de Sofía Pérez sigue «confirmada»; falta cerrar automáticamente las citas pasadas.
- **Campos que no se guardan:** `piezas` en radiografías, `vista` y `momento` en fotos, y `sedeId` en seguros.
- **Fechas:** las liquidaciones de seguro se guardan con la fecha UTC (12/10 en vez de 11/10).
- **Historial de caja:** incluye la jornada abierta del 10/10 en cualquier rango de fechas.
- **Consentimientos:** un consentimiento firmado no se puede anular. El 409 manda a un «flujo de anulación» que no existe (404/405).
- **Borrados que no existen:** no se pueden borrar planes vacíos ni procedimientos.
- **Servicios:** el servidor no devuelve los inactivos (`?incluirInactivos=true` se ignora).
- **Médicos:** `/medicos` trae `sedes` vacías.
- **Resumen de citas:** `/pacientes/resumen-citas` entrega a Surco los ids y las fechas de última visita de pacientes de San Isidro.
- **Precios:** `/servicios` entrega a recepción los precios de las dos sedes y el costo interno.
- **Validación:** la API acepta un nacimiento en 1890 y un celular que empieza en 8 (la pantalla los rechaza).
- **Odontograma:** con una dentición inválida responde 500 en vez de 400.
- **Horarios por doctor:** `POST /disponibilidad` ahora exige la lista `dias`. El frontend ya la envía (sección 4); hay que confirmar el contrato.
- **Bloqueos del médico:** se guardan sin sede, así que Ana ve el motivo del bloqueo de Carla.
- **Usuarios:**
  - no hay endpoint para restablecer la clave;
  - la clave temporal se genera en el navegador.
- **Datos sin cargar:**
  - «Nuevos y recurrentes» no tiene el dato de la primera visita;
  - las imágenes se guardan en base64 dentro de la base de datos.
- **Inventario:** el stock se envía como valor absoluto; falta un endpoint de movimientos.

---

## 3. Datos de la clínica
1. **Caja de San Isidro:** cerrar la jornada abierta desde el 10/10. Ver el aviso al inicio.
2. **RUC 20123456789:** no pasa el dígito verificador. Por eso «Ver comprobante» no abre la boleta.
3. **Teléfono «900000000»:** parece de relleno. Correo, web, cuentas y billeteras siguen vacíos.
4. **Insumos:** los 5 siguen sin sede, así que el médico ve el inventario vacío.
5. **WhatsApp:** el último envío correcto es del 02/10 y hubo un envío fallido. Hay que revisar los mensajes salientes.

---

## 4. Frontend
Las correcciones de esta revisión están en la rama `claude/laughing-edison-3rr5w6`. Para aplicarlas, `git pull` y volver a desplegar; si no se trabaja con la rama, se aplica el parche adjunto `cambio-frontend-QA5.patch`, que contiene solo lo nuevo respecto de lo publicado hoy.

**Verificación:**
- Compila y pasan 173 de 176 tests; los 3 que fallan son anteriores.
- Con los 6 perfiles contra la API de producción, solo navegando: 0 errores en pantalla y 0 llamadas con error.
- Comprobado en pantalla:
  - Caja muestra «Listos para cobrar (1)» con S/ 220;
  - la cabecera de la ficha dice «S/ 309.25 saldo del plan»;
  - el médico ya no pide `/pagos`;
  - gerencia no ve «Cerrarla» ni «Cobrar».

**Lo que cambia:**
- **Resistencia a los 500/503:** las lecturas (GET) se reintentan hasta 2 veces con espera, y van como máximo 6 a la vez; las escrituras nunca se repiten. Si aun así una carga falla, la pantalla dice «No disponible · Reintentar» en vez de S/ 0 o «Nada pendiente» (Panel, Resumen del mes, Caja, Producción, Reportes, Auditoría, Ocupación, Recetas, Odontograma y Agenda).
- **«Completar» evolución:** abre la historia con esa cita, aunque sea de días anteriores, y la evolución se guarda con su `citaId`, así que la alerta se cierra.
- **Ficha:**
  - el Resumen ya no lista ni cuenta los procedimientos anulados y se refresca;
  - mientras el backend siga sumándolos en `ficha360`, la cabecera los descuenta.
- **Presupuesto PDF:**
  - el del odontograma muestra lo pagado sin pedir `/pagos` al médico;
  - el de Plan y cuenta incluye Pagado y Saldo.
- **Nombres de procedimiento:** se conserva «pieza 11» si lo escribió la persona y ya no sale «(O) (O)».
- **Recetas:**
  - campo de dosis;
  - el KPI «Con firma» usa el dato real;
  - borrar pide confirmación;
  - aviso con «Reintentar» si falla la carga.
- **Consentimiento PDF:** «Firmado: dd/mm/aaaa hh:mm (hora de Lima)».
- **Menú «Más acciones»:** Escape lo cierra y se recorre con flechas.
- **Recepción:**
  - sin permiso, no aparece «Abrir odontograma» ni «Anular procedimiento»;
  - el buscador encuentra teléfonos escritos con espacios o guiones;
  - si fallan los sillones, se avisa con «Reintentar»;
  - las cifras del Inicio abren la agenda ya filtrada;
  - textos corregidos: «oct.», «1 reseña», «En proceso».
- **Caja:**
  - «Cerrarla» solo para quien opera caja;
  - el historial muestra solo el rango pedido y avisa aparte de la jornada abierta de otra fecha;
  - las fechas invertidas se avisan.
- **Reportes:**
  - el aviso «toda la clínica» solo aparece a quien ve varias sedes;
  - los egresos en dólares se incluyen, convertidos.
- **Panel:** la aceptación de planes usa la tasa del servidor y muestra los rechazados aparte.
- **Puesta en marcha:** usa el mismo estado de WhatsApp que Integraciones.
- **Sede elegida:** se recuerda al recargar.
- **Horarios por doctor:** se envía la lista `dias` que ahora pide el servidor.
- **Bloqueo del médico:** se envía con su sede.

---

## 5. Decisiones pendientes (de producto o de permisos)
- **Citas nuevas de recepción:** ¿deben nacer «pendiente» o «confirmada»?
- **Automatizaciones:** ¿recepción de una sede puede pausar o editar las de toda la clínica?
- **Caja:** ¿TI y gerencia deben ver Caja? ¿Quién cierra la jornada de un administrador que se olvidó de cerrarla?
- **«Facturado»:** hay tres definiciones distintas. ¿Se unifican?

---

## 6. Registros de prueba que quedaron en producción
- **Pacientes** (los de rondas anteriores, más estos de esta ronda):
  - QA Validacion API (99550011);
  - 2 pacientes QA de recepción (99611001 y 99611002).
- **Datos clínicos:**
  - evoluciones QA firmadas;
  - consentimientos QA firmados;
  - fases QA canceladas con costo 0;
  - 2 planes vacíos.
- **Usuarios inactivos:** «QA Usuario R4» y «QA Usuario R5».
- **Caja:**
  - la jornada QA de Surco del 03/10, cerrada y reabierta;
  - los cobros y egresos QA de rondas anteriores.
- **WhatsApp:** mensajes «QA … (ignorar)» en «QA Smoke WA2».
