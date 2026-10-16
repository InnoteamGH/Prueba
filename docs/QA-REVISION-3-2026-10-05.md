# QA de revisión 3: Dento Check (05/10/2026)

**Qué se probó:** producción (`app.odontosonrisa.biz` y su API), módulo por módulo, botón por botón y rol por rol.
- **Usuarios:** recepción de San Isidro y de Surco, las doctoras Carla y Ana (más Luis y Sofía), el administrador general, el administrador de Surco, gerencia, TI y el portal del paciente.
- **Datos de prueba:** todos llevan «QA» en el nombre y DNI 99…

**Resumen**
- **Corregido desde la revisión 2:** el cierre del día por sede, la validación del médico en metas por sede, el resumen de pacientes sin archivados y la llegada en citas futuras. `/medicos` ya trae `sedes[]` y el nombre de la especialidad. En datos: 22 servicios con precios por sede, códigos y hallazgos, dirección de la clínica cargada, el usuario «T» eliminado y el horario de la Dra. Carla en su sede.
- **Regresión grave nueva:** la ficha del paciente y su plan de tratamiento dan error 500 en cualquier paciente que tenga un plan (punto 1.1).
- **Frontend:** los hallazgos de pantalla están corregidos en la rama; ver la sección 4 y el parche adjunto.

---

## 1. Bloqueantes

### 1.1 Ficha y plan de tratamiento en 500 (regresión)
- **Qué falla:** `GET /pacientes/{id}/ficha360` y `GET /tratamientos?pacienteId={id}` responden **500 con todos los roles** en cuanto el paciente tiene un plan, aunque el plan esté vacío.
- **Cómo se reprodujo:** un paciente QA nuevo abría su ficha bien y dejó de abrirla al crearle un plan vacío.
- **Afectados hoy:** Rosa Linares, Lucía Vega, Elena Ríos, Pedro Gómez, QA Prueba Doctor y QA Doctor Carla Flujo.
- **Qué queda bloqueado:**
  - toda la ficha del paciente (historia, evoluciones, presupuesto y su PDF);
  - terminar o anular procedimientos;
  - «Completar evolución» desde el inicio y «Evolución»/«Finalizar» desde la agenda.

### 1.2 No se puede agregar ningún procedimiento
- `POST /tratamientos/{id}/fases` responde **500 siempre**, con cualquier cuerpo y con cualquier rol.

### 1.3 Los bloqueos de agenda se guardan 5 horas más tarde y sin sillón
- **Qué pasa:** `POST /bloqueos` con `horaInicio "10:00"` se guarda como `15:00:00`, y con `17:00–18:00` se guarda como `22:00–23:00`. Además ignora `sillon`.
- **Consecuencia:** el bloqueo no protege la franja pedida, se mueve 5 horas y pasa a bloquear toda la sede.
- **Causa probable:** conversión a UTC de un `LocalTime`. Hay que guardar la hora tal cual llega (hora de Lima).

### 1.4 El administrador de sede puede modificar otra sede y escalar privilegios
Se probó con `admin.surco@sonrie.pe`, solo sobre registros QA o repitiendo el mismo valor, y se restauró todo.
- **Precios:** `PUT /especialidades/{id}` cambia el precio base y el precio de San Isidro. Un segundo PUT sin la clave de San Isidro **borró** ese precio.
- **Usuarios:** `PUT /usuarios/{id}` edita usuarios de San Isidro, los cambia de sede y **los sube a Administrador general**.
- **Escrituras por id sin comprobar la sede:** en laboratorio, órdenes de compra, stock de insumos, la meta de la Dra. Carla (San Isidro) y formularios, todas responden 200.
- **Qué hay que hacer:** en cada escritura, validar que el registro pertenezca a una sede del token. Además, que admin_sede no pueda tocar precios globales ni asignar un rol mayor que el suyo.

### 1.5 Caja: reabrir y cerrar
- **Reabrir:** reutiliza el mismo registro y **borra el primer arqueo** (fondo, contado, diferencia y justificación). Hay que guardar cada sesión por separado o conservar el historial de cierres.
- **Esperado al cerrar:** `POST /caja/apertura/{id}/cerrar` guarda el `efectivoEsperado` que manda la pantalla sin recalcularlo.
  - Si no lo manda, el servidor calcula bien los soles (fondo + cobros − egresos), pero en dólares devuelve `efectivoEsperadoUsd: 0` aunque haya fondo en dólares.
  - En la prueba: fondo US$ 10 y esperado 0, cuando correspondía 10.
  - Debe calcularse siempre en el servidor, por moneda y por sesión.

---

## 2. Importantes

### 2.1 Datos de una sede que la API entrega a otra
La pantalla los oculta, pero la API los devuelve.
- **Recepción de Surco:**
  - ve y **borra** bloqueos de San Isidro: `DELETE /bloqueos/{id}` respondió 204;
  - recibe pagos y consentimientos de pacientes de San Isidro, por ejemplo de Rosa Linares.
- **Médicos:** `GET /recetas` sin filtro devuelve las 8 recetas de toda la clínica, con sus indicaciones. `GET /consentimientos` sin filtro también mezcla sedes.
- **Administrador de Surco:** recibe por API consentimientos, envíos de formularios, seguros, órdenes de compra y usuarios de San Isidro.
- **Reportes:**
  - «Procedimientos» y «Top de tratamientos» ignoran la sede: dan 14 filas y S/ 4 380 con San Isidro, con Surco y sin filtro;
  - `GET /comisiones?sedeIds=<Surco>` devuelve lo mismo que sin filtro: S/ 1 800 en vez de S/ 940.
- **WhatsApp:** recepción de San Isidro ve los 18 chats, incluido uno de una paciente de Surco y 10 sin paciente asociado. Recepción de Surco no ve ninguno. Hay que asignar la sede por el número de WhatsApp o por el paciente.
- **DNI duplicado:** el 409 por DNI duplicado revela a San Isidro el nombre de un paciente de Surco («María Chávez»).

### 2.2 Funciones que responden con error
- **Seguros:** `PATCH /seguros/{id}` responde 500 para «Enviar», «Marcar aprobada» y «Marcar pagada». Ninguna liquidación puede avanzar.
- **Horarios por doctor:** `POST /disponibilidad` responde **405**, así que no se puede agregar un horario desde Configuración.
- **Servicios:** `DELETE /especialidades/{id}` responde 405, así que no se pueden borrar.
- **Datos de la clínica:** `PUT /clinica` acepta un cuerpo vacío `{}` con 200 y deja en blanco teléfono, correo, web, cuentas y billeteras. Hay que validar el cuerpo y hacer actualización parcial.

> **Aviso:** durante el QA se envió por error un `PUT /clinica {}`. A las 02:00 UTC de hoy esos campos ya estaban vacíos, pero si se cargaron después hay que volver a llenarlos.

### 2.3 Cifras que no cuadran
- **«Procedimientos realizados»** (Más reportes) cuenta todos los ítems de los planes, aunque no estén aceptados ni hechos. El año suma S/ 4 380, exactamente lo presupuestado.
- **Antigüedad de la deuda** (Panel): suma S/ 1 990, mientras Caja y Más reportes dicen S/ 2 301.25. Faltan los S/ 311.25 de un saldo de octubre en el tramo de 0 a 30 días.
- **«Facturado del mes»** viene en S/ 0 mientras la producción por tratamiento del mismo mes es S/ 340. Hay que revisar la fuente de `facturadoMes` y de la producción por especialidad.
- **Comprobantes SUNAT:** `GET /facturacion-electronica/comprobantes` no devuelve las 2 boletas QA del 04/10 que sí aparecen en Caja.
- **«Nuevos y atendidos»:** Nuevos y Recurrentes siempre salen «—» porque falta el dato de la primera visita.

### 2.4 Auditoría
- No registra:
  - altas, ediciones y bajas de usuarios;
  - cambios de rol;
  - cambios de precios;
  - cambios de inventario;
  - órdenes de compra;
  - cambios de `/clinica`.
- Solo registra login, acceso a la historia clínica, pagos y apertura y cierre de caja.
- Devuelve como máximo 500 eventos, sin filtro de fechas ni paginación.

### 2.5 Otros
- **Fechas en UTC:** las evoluciones y recetas creadas después de las 19:00 de Lima sin `fecha` quedan con el día siguiente. El servidor debe usar America/Lima.
- **Radiografías y fotos:** las radiografías no guardan `piezas`, y las fotos no guardan `vista` ni `momento`.
- **Laboratorio:** los casos se devuelven sin `sedeId` en el listado y en el detalle; la columna «Sede» sale «—».
- **Consentimientos firmados:** se pueden borrar (`DELETE` responde 204). Un documento firmado no debería poder borrarse.
- **Estado de citas:** permite poner «en atención» una cita futura.
- **Usuarios:**
  - no existe endpoint para resetear la clave;
  - la clave temporal la genera el navegador; conviene que la genere el servidor.
- **Planes de tratamiento:** no existe endpoint para borrar un plan vacío o duplicado.
- **Metas de doctores:** son globales y no por sede. Admin_sede ve y edita metas de doctores de San Isidro.
- **Portal del paciente:** DNI 44567890 con clave `demo` responde 401. Hay que configurar la clave o actualizar la documentación.
- **Cita sin cerrar:** la cita del 14/09 de Sofía Pérez sigue «confirmada»; falta el cierre automático de citas pasadas.
- **Alcance de TI:** según la descripción de su rol no ve facturación, pero la API le da Caja con nombres de pacientes y todos los chats.

---

## 3. Datos de la clínica
1. **RUC 20123456789:** no es válido en SUNAT. Hay que poner el RUC real.
2. **Insumos:** los 5 siguen sin sede y aparecen iguales en las dos sedes.
3. **Teléfono, correo, web, cuentas y billeteras:** están vacíos. Revisar el aviso de 2.2.
4. **Integración de WhatsApp:** hubo 2 fallos en 24 h y el último envío correcto fue el 02/10. Hay que revisar si los mensajes salientes se están entregando.

---

## 4. Frontend
Los hallazgos de pantalla de esta revisión están corregidos en la rama `claude/laughing-edison-3rr5w6`. Para aplicarlos:
- con la rama, `git pull`;
- sin la rama, el parche adjunto `cambio-frontend-QA3.patch` con `git apply`.

Después hay que volver a desplegar.

**Verificación:** compila y pasa los tests (138 de 141; los 3 que fallan son anteriores). Se recorrieron los 6 perfiles contra la API de producción, solo navegando: 0 errores en pantalla y 0 llamadas con error.

**Lo que cambia:**
- **Ficha cuando el servidor falla:**
  - si `ficha360` da 500, la ficha se abre en modo parcial: nombre, DNI, alergias, historia, odontograma, periodontograma, recetas y datos, con un aviso y «Reintentar»;
  - ya no queda la cabecera del paciente anterior;
  - la «Historia clínica PDF» no se emite sin el paciente identificado.
- **Plan y cuenta cuando el servidor falla:** muestra «No se pudo leer el plan… no es un presupuesto vacío» con «Reintentar». No crea otro plan ni deja agregar procedimientos.
- **Recetas:** un solo formato de medicamentos entre la ficha y el módulo, así que ya no se imprimen recetas sin medicamento.
- **Periodontograma:** la proforma pasa al presupuesto con la sede del médico.
- **Consentimientos:** el texto de apoderado/menor solo aparece si el paciente es menor.
- **Fechas:** se envían y muestran con el día de Lima (evoluciones, recetas, historia y nombres de archivo).
- **Caja:** el arqueo tras reabrir usa solo la sesión vigente, por moneda, y se corrigió el signo del texto. Comprobantes SUNAT muestra las boletas «por enviar».
- **Agenda:**
  - la hora elegida ya no cambia sola;
  - se pueden ver y quitar los bloqueos de la sede;
  - el motivo del bloqueo admite texto libre;
  - el médico puede marcar «No asistió» y no puede iniciar citas futuras.
- **Pacientes:**
  - el alta rechaza edades de más de 120 años y celulares que no empiezan con 9;
  - el directorio tiene buscador;
  - se puede quitar a alguien de la lista de espera.
- **Consentimientos y formularios:** ya no viene un paciente preseleccionado. Antes se podía enviar a un paciente real sin elegirlo.
- **Permisos:** la pantalla sigue los permisos del servidor.
  - Gerencia ve Usuarios en solo lectura.
  - TI ve WhatsApp sin «Tomar control», «Eliminar» ni «Configurar IA».
  - Gerencia no ve los interruptores de Recordatorios ni «Pasar al presupuesto».
  - El médico no ve «Cobrar», «Encuestas» ni el formulario editable de Inventario.
  - Admin_sede no ve «Desactivar» ni «Eliminar» que el servidor le rechaza.
- **Panel gerencial:**
  - «Facturado del mes», la meta y la producción por especialidad salen de la misma fuente que el Top de tratamientos;
  - los chips «Ver» navegan;
  - el total de pacientes coincide con el directorio.
- **Producción y comisiones:** tiene selector de periodo y la meta se ajusta al periodo.
- **Metas:** el aviso pide solo lo que falta.
- **Integraciones:** el estado de WhatsApp es el mismo en todas las pantallas, y «Probar conexión» avisa los fallos de 24 h.
- **Usuarios:** sin el botón «Eliminar», que hacía lo mismo que Desactivar.
- **Servicios:**
  - se pueden ver los inactivos y reactivarlos;
  - el filtro va por especialidad.
- **Laboratorio:** «Avanzar» ya no abre el detalle.
- **Inventario:** con avisos en cada acción.
- **Configuración › Sillones:** se pide por sede, así que Surco muestra sus 4 sillones.
- **Pendientes de hoy:** no cuenta las citas canceladas.
- **Mi plan:** cuenta los doctores de `/medicos`.
- **Exportaciones:** montos numéricos, columnas vacías ocultas, y exportación en Ocupación de sillones.
- **Auditoría:** filtro de fechas, con aviso del tope de 500 eventos del servidor.

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
- **Planes de tratamiento:**
  - un plan vacío duplicado en QA Prueba Doctor (`c2c1de39-66fe-4684-bcb2-16b9802a6ab6`);
  - un plan en QA Doctor Carla Flujo (`517ab384-af5d-4afa-adc6-dc73062ffb35`).
- **Evoluciones:** 2 evoluciones QA (Carla Flujo y Surco).
- **Laboratorio:** el caso «QA férula prueba médico (borrar)», en estado Entregado.
- **Citas:**
  - 09/10 a las 10:00, atendida;
  - 10/10 a las 09:00, confirmada;
  - las de las revisiones anteriores, canceladas.
- **Caja de San Isidro del 04/10:**
  - cobros QA de S/ 10, US$ 5 y S/ 1 a QA Prueba Doctor;
  - egresos QA de S/ 3 y S/ 1.
- **Caja de Surco del 04/10:** un egreso QA de S/ 3.
- **Catálogo:** el servicio «QA Servicio prueba», inactivo.
- **Usuarios inactivos:** «QA Usuario Prueba», «QA Usuario Admin» y «QA Usuario TI Editado».
- **Órdenes de compra:** 3 «QA Proveedor…» (1 recibida y 2 anuladas).
- **WhatsApp:** 2 mensajes «QA … (ignorar)» en el chat «QA Smoke WA2».
