# Dento Check: requisitos mínimos por rol

Este documento recoge lo mínimo que el sistema debe cubrir para **recepción**, **doctor** y el **resumen gerencial**. Para cada requisito indica dónde está en el portal, su estado en el frontend y qué necesita el backend.

> El frontend ya funciona completo en modo demostración. Cuando se conecte al backend usa los endpoints de la columna «Backend». Todo lo que dice **nuevo** es un campo o endpoint que el backend todavía debe aceptar o devolver.

Estados:

- ✅ **Listo:** funciona en demo y con los endpoints actuales.
- 🟡 **Listo en frontend:** funciona en demo, pero conectado necesita el campo o endpoint marcado como **nuevo**.

---

## 1. Recepcionista

| Requisito | Dónde está en el sistema | Estado | Backend |
|---|---|---|---|
| **Agenda** | Atención › Agenda › Hoy / Calendario | ✅ | `GET /citas?fecha=` o `?desde=&hasta=`, `POST /citas`, `PUT /citas/:id` |
| **Apertura de historia clínica** | Clínico › Pacientes › Nuevo paciente, y luego la ficha (filiación, antecedentes, consentimientos) | ✅ | `POST /pacientes`, `PUT /pacientes/:id`, ficha clínica existente |
| **Recordatorios** | Atención › Recordatorios (Automatizaciones, Historial de envíos, Satisfacción) | ✅ | Endpoints de recall existentes |
| **WhatsApp** | Atención › WhatsApp + IA | ✅ | Inbox existente |
| **Caja: apertura de caja** | Finanzas › Caja › Apertura. Fondo inicial en **soles y en dólares**, medios de pago del día | 🟡 | `POST /caja/apertura` con **nuevo** `fondoUsd` |
| **Caja: caja del día** | Finanzas › Caja › Cobros. Tratamientos terminados por cobrar, saldos por cobrar y boletas del día; lo recibido en dólares se muestra aparte | 🟡 | `GET /caja` con **nuevo** `terminados[]` y `boletasHoy[].moneda/montoOriginal` |
| **Caja: cierre de caja** | Finanzas › Caja › Cierre. Arqueo en soles (billetes y monedas) y **gaveta en dólares** aparte (billetes de US$ 100, 50, 20, 10, 5 y 1) | 🟡 | `POST /caja/apertura/:id/cerrar` con **nuevos** `efectivoContadoUsd` y `efectivoEsperadoUsd` |
| **Caja: revisar categoría de egresos** | Finanzas › Caja › Ingresos y egresos › «Egresos por categoría» (hoy o este mes), con reclasificación en línea y aviso de gastos en «Otros» | 🟡 | **Nuevo** `PUT /egresos/:id` con `{ categoria }` |
| **Caja: moneda (soles y dólares)** | Cobro (selector Soles/Dólares con tipo de cambio), egresos (selector de moneda), apertura y cierre | 🟡 | Ver sección 4 |
| **Consolidado de ver citas** | Atención › Agenda › **Consolidado de citas**. Rango (hoy, semana, mes, 30 días o fechas), indicadores por estado, citas por doctor y vistas Tabla / Por día / Por doctor, con exportación a Excel | ✅ | `GET /citas?desde=&hasta=` (ya existe) |
| **Sillones y horario del doctor** | Configuración › **Sillones** (flexible, fijo de un doctor o de una especialidad; exclusivo o preferente) y › Horarios por doctor. Agendar, reprogramar y asignar desde la lista de espera validan doctor, sillón y bloqueos | 🟡 | Ver «Sillones y disponibilidad» en la sección 4 |

## 2. Doctor

| Requisito | Dónde está en el sistema | Estado | Backend |
|---|---|---|---|
| **Agenda** | Atención › Agenda › Hoy / Calendario. Solo sus citas; puede iniciar y finalizar atención | ✅ | El backend restringe `GET /citas` por rol |
| **Historia clínica** | Clínico › Pacientes › ficha. Evoluciones firmadas y bloqueadas (las correcciones van como adenda) y pestaña «Registro» con la actividad | ✅ | Ficha clínica existente y `GET /auditoria?pacienteId=` |
| **Odontograma (evolutivo)** | Clínico › Odontograma. Capas inicial y evolutivo; los hallazgos pasan al plan de tratamiento | ✅ | Odontograma existente |
| **Presupuesto** | Clínico › Tratamientos (plan con costos, cuotas y saldo) y el **Plan de inversión** imprimible desde el odontograma o la ficha | ✅ | `POST /tratamientos`, fases y catálogo de servicios |
| **Evolución** | Ficha del paciente › Evoluciones (se firman al guardar; los cambios quedan como adenda) | ✅ | Evoluciones existentes |
| **Radiografía** | Clínico › Radiografías | ✅ | Endpoints de imágenes existentes |
| **Fotografía** | Clínico › **Fotografías** (galería intra y extraoral del expediente) | ✅ | Mismos endpoints de imágenes, tipo foto |
| **Receta** | Clínico › Recetas | ✅ | Recetas existentes |
| **Tratamiento terminado (pago automático)** | Clínico › Tratamientos › botón **Terminar** en cada fase. La fase queda «Terminado · por cobrar» y su cobro aparece solo en Caja › Cobros › «Tratamientos terminados por cobrar». Recepción solo confirma el medio de pago | 🟡 | `PATCH /tratamientos/fases/:id` con **nuevo** estado `"terminada"` y `terminadaEn`. `GET /caja` devuelve **nuevo** `terminados[]`. `POST /pagos` acepta **nuevo** `faseIds[]` y pasa esas fases a `atendida` |
| **Consolidado de ver citas** | Atención › Agenda › Consolidado de citas (el doctor ve solo las suyas) | ✅ | `GET /citas?desde=&hasta=` |

Periodontograma: también está disponible en Clínico › Periodontograma, con clasificación AAP/EFP 2017. El contrato está documentado en `frontend/src/util/periodontal.js`.

## 3. Resumen (Dashboard gerencial)

Está en General › Dashboard gerencial, bloque **«Resumen de [mes]»**.

| Indicador | Qué muestra | Estado | Backend |
|---|---|---|---|
| **Facturado del mes** | Total facturado del 1 a hoy y variación contra el mes anterior | ✅ | `GET /gerencial/kpis` → `ingresosMes`, `ingresosMesAnterior` |
| **Salidas del mes** | Egresos del mes en soles; los de dólares aparecen aparte, junto con el mayor gasto | ✅ | `GET /egresos` (se filtra el mes en el frontend) |
| **Resultado del mes** | Facturado menos salidas, con el margen | ✅ | Se calcula en el frontend |
| **Meta mensual** | Meta de la clínica, avance, línea de ritmo esperado a hoy y proyección de cierre | ✅ | `GET /gerencial/kpis` → `metaMensualClinica` |
| **Producción del equipo vs. meta** | Barra por doctor con producción, meta, porcentaje y ritmo. Verde si va al ritmo, ámbar si está cerca y coral si está bajo | ✅ | `GET /gerencial/kpis` → `ranking[{ nombre, produccion, meta }]` |
| **Top de tratamientos** | Los 6 tratamientos con más importe facturado en el mes, con número de ventas | ✅ | `GET /tratamientos/resumen?desde=&hasta=` → `[{ nombre, numeroDeVentas, importeTotal }]` |

---

## 4. Pagos en dólares: campos para el backend

Algunos pacientes pagan en dólares. El sistema registra la moneda original sin romper los totales, que siguen en soles.

### Cobro: `POST /pagos`

```json
{
  "pacienteId": "…",
  "sedeId": "…",
  "concepto": "Tratamiento terminado",
  "monto": 350.00,
  "metodo": "efectivo",
  "descuento": 0,
  "moneda": "USD",
  "montoOriginal": 93.33,
  "tipoCambio": 3.75,
  "faseIds": ["…"]
}
```

- `monto` **siempre en soles**. Es lo que suma a facturación, saldos y reportes.
- `moneda`: `"PEN"` o `"USD"`. Si no llega, se asume `"PEN"`.
- `montoOriginal` y `tipoCambio`: solo cuando `moneda = "USD"`.
- Si en dólares se paga el saldo completo, el frontend envía el saldo exacto en soles, para que el redondeo del tipo de cambio no deje un abono de S/ 0,01.
- En pago mixto cada parte se registra con su propia moneda.

### Caja del día: `GET /caja`

- `boletasHoy[]` agrega `moneda` y `montoOriginal`.
- **Nuevo** `terminados[]`: `{ pacienteId, paciente, faseId, nombre, costo, medico, terminadaEn }`.

### Cierre: `GET /pagos/cierre`

- Opcional, recomendado: `usd: { efectivo }` con el efectivo en dólares del día, en US$. Si llega, `porMetodo.efectivo` debe traer **solo soles**. Si no llega, el frontend descuenta de `porMetodo.efectivo` los cobros en dólares en efectivo de `boletasHoy`.

### Apertura y cierre: `/caja/apertura`

- Apertura: **nuevo** `fondoUsd` (US$), que también se devuelve al leer la apertura.
- Cierre: **nuevos** `efectivoContadoUsd` y `efectivoEsperadoUsd`. Esperado en dólares = fondo US$ + cobros en efectivo US$ − egresos en efectivo US$.

### Egresos: `/egresos`

- `POST /egresos` y la lista agregan `moneda` (`"PEN"` / `"USD"`). En dólares, `monto` va en US$.
- **Nuevo** `PUT /egresos/:id` con cuerpo parcial `{ categoria?, concepto?, monto?, moneda? }` para reclasificar.
- Categorías: Insumos, Laboratorio, Alquiler, Servicios (luz/agua), Planilla, Marketing, Equipos, Otros.

### Membrete de documentos: `/clinica` y `/clinica/impresion`

Todo lo que se imprime o se descarga en PDF lleva el mismo membrete: proforma (plan de inversión), resumen del odontograma, receta, historia clínica, consentimientos, boleta, arqueo de caja, y los PDF de Agenda y listados.

- **De la empresa, iguales en todas las sedes:** nombre comercial, razón social, RUC, web y logo. Se editan en Configuración → Datos de la clínica.
- **De la sede que emite, que es la sede activa de la sesión:** nombre de la sede, dirección, teléfonos, horario, correo y serie de documentos. Se editan en Configuración → Sedes.

Campos que tiene que manejar el backend:

- `GET /clinica` y `PUT /clinica`: **nuevo** `logo`. El frontend envía una imagen PNG en data URL (alto máx. 240 px); el backend puede guardarla tal cual o subirla a almacenamiento y devolver la URL.
- `POST /sedes` y `PUT /sedes/:id`: **nuevos** `horarioDocumento` (texto, p. ej. «Lun a vie 9:00–19:00 – sáb 9:00–14:00»), `correo` y `serieDocumento` (máx. 4 caracteres, p. ej. `SI`). `direccion` y `telefono` ya existían.
- `GET /clinica/impresion?sedeId=`: ya lo usa el plan de inversión. Debe devolver:
  - `empresa`: `{ nombreComercial, razonSocial, ruc, web, logo }`.
  - `sedes[0]`: la sede pedida, con `{ nombre, direccion, telefonos, horario, correo, serieDocumento }`.

Si el endpoint falla, el frontend arma el membrete con `GET /clinica` y la lista de sedes.

### Periodontograma: proforma e informe

- La proforma sugiere el tratamiento según el sondaje: higiene, raspado por cuadrante, reevaluación, cirugía condicional, furcas, ferulización y mantenimiento. El doctor la ajusta antes de emitirla.
- Por ahora los precios que edita el doctor se recuerdan en el navegador (`dc_perio_precios`). **Pendiente de backend:** que salgan del catálogo de servicios de la clínica con estos códigos: `IHO`, `PRO`, `RAR`, `REE`, `CIR`, `FUR`, `FER` y `MAN`.

### Profesional e historia clínica en los documentos del odontograma

La proforma y el resumen del odontograma ya no usan datos de ejemplo:

- **Profesional:** el odontólogo con la sesión abierta. Si imprime otra persona, por ejemplo recepción, se usa el médico tratante del paciente.
- **COP:** sale del registro del médico (Configuración › Médicos).
- **Historia clínica:** se usa `numeroHistoria` del paciente y, si no existe, el DNI. Es la misma regla que la historia clínica.

### Facturación electrónica SUNAT

**Estado actual.** El frontend ya arma el comprobante completo:
- emisor con razón social, RUC validado con su dígito verificador y dirección de la sede;
- serie por sede y numeración correlativa;
- cliente con DNI;
- detalle, operación gravada, IGV 18 % y total;
- impresión en A4 con membrete.

Lo que todavía no existe es el **envío a SUNAT**. Por eso el sistema dice «todavía no se envía a SUNAT» o, en la demo, «Demo · sin SUNAT», y nunca «emitida».

**Cómo se integra.** Recomendamos un proveedor autorizado (OSE o PSE), por ejemplo Nubefact, Efact o Bizlinks, en lugar de firmar y enviar directamente a SUNAT:
1. Al confirmar un cobro, el backend crea el pago y el comprobante en estado `pendiente`.
2. El backend envía el comprobante al proveedor por su API REST (JSON). El proveedor firma con el certificado digital de la clínica y lo envía a SUNAT.
3. La respuesta trae el CDR (constancia de recepción). El backend guarda el estado y los archivos: `aceptado`, `observado` o `rechazado`, con el XML, el CDR, el PDF, el hash y el código QR.
4. Las boletas se informan en el **resumen diario**; las facturas se envían una por una.
5. **Anular** un cobro ya aceptado no lo borra. Se emite una **nota de crédito** (o una comunicación de baja), y el motivo ya lo pide el modal de anulación.
6. Si SUNAT o el proveedor no responden, el comprobante queda `pendiente` y se reintenta solo. El frontend lo muestra con su estado.

**Qué ya está listo en el frontend.**
- Cada boleta de «Boletas de hoy» muestra su estado SUNAT (Aceptado, Observado, Rechazado o Pendiente de envío) a partir del campo `sunatEstado`, con el detalle en `sunatMensaje`.
- La boleta impresa muestra el número oficial que devuelva el backend.

**Qué falta del backend.**
- Contrato con el proveedor y el certificado digital (o el que provee el propio proveedor).
- Credenciales por empresa (RUC) y una serie por sede.
- Campos en el pago o comprobante: `tipoComprobante` (`03` boleta, `01` factura), `sunatEstado`, `sunatMensaje`, `hash`, `qr`, `xmlUrl`, `cdrUrl`, `pdfUrl`.
- Factura para empresas: RUC del cliente obligatorio y su razón social. El cobro debe permitir elegir entre boleta y factura.
- Tareas programadas para el resumen diario de boletas y para reintentar los pendientes.

**Pantalla ya lista en el frontend** (Caja › Facturación electrónica): estado de la conexión, flujo del comprobante, indicadores (emitidos, aceptados, por enviar, por atender), tabla de comprobantes con XML, CDR, reenvío y nota de crédito, resumen diario de boletas, series por sede y modal de conexión con el proveedor. Sin sesión muestra una vista previa con comprobantes simulados. Endpoints que usa (**nuevos**):
- `GET` y `PUT /facturacion-electronica/config`: `{ proveedor, ambiente, url, token, afectacion, envioAuto, horaResumen, series: { [sedeId]: { boleta, factura, ncBoleta, ncFactura } } }`. El token se guarda cifrado y nunca se devuelve.
- `POST /facturacion-electronica/probar`: prueba las credenciales con el proveedor.
- `GET /facturacion-electronica/comprobantes?desde=&hasta=`: `[{ id, tipo (Boleta | Factura | Nota de crédito), serie, numero, fecha, cliente, docTipo (DNI | RUC | CE), docNum, paciente, concepto, moneda (PEN | USD), base, igv, total, estado, mensaje, ref, sede }]`. Las facturas van a nombre de una empresa con RUC; el cobro debe permitir elegir boleta o factura y la moneda.
- **Quién ve qué**: en Caja › Facturación, quien cobra ve solo los comprobantes y su estado. La conexión con el proveedor (credenciales, ambiente, IGV, series y resumen diario) está en Administración › Integraciones, para TI.
- `POST /facturacion-electronica/comprobantes/:id/reenviar` y `POST /facturacion-electronica/comprobantes/:id/nota-credito` con `{ motivo, tipoMotivo }`.

**Qué debe definir la clínica.** Qué proveedor usará; si los servicios llevan IGV o están exonerados (algunos servicios de salud tienen tratamiento especial); y las series por sede (por ejemplo `B001` para San Isidro y `B002` para Surco).

### Sillones y disponibilidad del doctor

**Cómo funciona.** Cada sillón tiene un uso:

| Uso | Qué significa | Ejemplo |
|---|---|---|
| Flexible | Lo usa el doctor que esté libre; cambia de doctor según el día | Sillón 1 y 2 de San Isidro |
| Fijo de un doctor | Es el sillón habitual de ese doctor; se le propone siempre a él | Sillón 2 de Surco, Dra. Quispe |
| De una especialidad | Está equipado para una especialidad | Sillón Kids, odontopediatría |

Además, un sillón fijo o de especialidad puede ser **exclusivo** (nadie más lo usa) o **preferente** (otros pueden usarlo si está libre, con aviso). Un sillón también puede estar **fuera de servicio** con su motivo.

**Reglas al agendar, al arrastrar en el calendario y al asignar desde la lista de espera.**
1. El doctor atiende ese día, a esa hora y en esa sede (Configuración › Horarios por doctor). Si no tiene horario configurado, no se le limita.
2. El doctor no tiene otra cita que se cruce (se usa la duración de cada cita).
3. El sillón está en servicio, acepta a ese doctor o especialidad y está libre.
4. No hay un bloqueo de agenda (almuerzo, ausencia, mantenimiento) en ese rango.

El modal de agendado propone solo el sillón (el propio del doctor, luego el de su especialidad, luego uno flexible) y cambia de sede si el doctor a esa hora atiende en otra. Al arrastrar una cita a otra hora, si su sillón queda ocupado se busca otro libre.

**Qué falta del backend.** El frontend ya aplica estas reglas, pero el servidor debe validarlas también, porque WhatsApp y otras integraciones crean citas sin pasar por la pantalla.
- `GET /sillones?sedeId=`: devolver por sillón `id`, `sedeId`, `numero`, `nombre`, `uso` (`flexible`, `doctor` o `especialidad`), `medicoId`, `especialidadId`, `exclusivo`, `activo` y `nota`.
- **Nuevos** `POST /sillones` y `PUT /sillones/:id` con esos mismos campos.
- `GET /disponibilidad` sin `medicoId`: devolver el horario de todos los doctores, con `sedeId` por bloque (un doctor puede atender en una sede en la mañana y en otra en la tarde).
- `POST /citas` y `PUT /citas/:id`: rechazar con un mensaje claro si el doctor no atiende, si tiene otra cita encima, si el sillón no lo acepta o está ocupado, o si hay un bloqueo.
- `POST /bloqueos`: aceptar `medicoId` (ausencia de un doctor) o `sedeId` + `sillon` (mantenimiento de un sillón). El calendario ya los pinta solo en su columna.
- **Turnos del día por sillón**: `GET /sillones/asignaciones?desde=&hasta=`, `POST /sillones/asignaciones` con `{ sedeId, sillon, fecha, desde, hasta, medicoId }` y `DELETE /sillones/asignaciones/:id`. Durante el turno el sillón es solo de ese doctor.
- **Duración por servicio**: `GET /catalogo/especialidades` con `duracionMin`; el modal la usa como duración propuesta.
- **Primer hueco libre**: hoy lo calcula el frontend con `GET /citas?desde=&hasta=` de 14 días. Si el volumen crece, conviene un `GET /agenda/huecos?especialidadId=&medicoId=&desde=` en el servidor.

---

## 5. Lista de cambios de backend

1. `POST /caja/apertura`: aceptar y devolver `fondoUsd`.
2. `POST /caja/apertura/:id/cerrar`: aceptar `efectivoContadoUsd` y `efectivoEsperadoUsd`.
3. `POST /pagos`: aceptar `moneda`, `montoOriginal`, `tipoCambio` y `faseIds[]`. Con `faseIds`, pasar esas fases a `atendida`.
4. `GET /caja`: devolver `boletasHoy[].moneda/montoOriginal` y `terminados[]`.
5. `GET /pagos/cierre`: opcional, `usd.efectivo`.
6. `POST /egresos` y `GET /egresos`: campo `moneda`. Nuevo `PUT /egresos/:id`.
7. `PATCH /tratamientos/fases/:id`: aceptar el estado `"terminada"` y `terminadaEn`. Una fase terminada sigue contando como saldo hasta que se cobra.
8. `GET /clinica` y `PUT /clinica`: campo `logo`.
9. `POST /sedes` y `PUT /sedes/:id`: campos `horarioDocumento`, `correo` y `serieDocumento`.
10. `GET /clinica/impresion?sedeId=`: devolver la empresa con `logo` y la sede pedida con dirección, teléfonos, horario, correo y serie, para el membrete de todos los documentos.
11. Catálogo de servicios: precios de los tratamientos periodontales (`IHO`, `PRO`, `RAR`, `REE`, `CIR`, `FUR`, `FER`, `MAN`) para la proforma del periodontograma.
12. Sesión (`/auth/login` o `/auth/me`): devolver `medicoId` y `cop` cuando el usuario es odontólogo. `GET /catalogo/medicos` debe incluir `cop`.
13. Pacientes: devolver `numeroHistoria` y el médico tratante (`medicoId`), para numerar los documentos y saber quién firma cuando imprime recepción.
14. Facturación electrónica: integración con un proveedor OSE o PSE. En el pago o comprobante, devolver `tipoComprobante`, `sunatEstado` (`pendiente`, `aceptado`, `observado` o `rechazado`), `sunatMensaje`, `hash`, `qr`, `xmlUrl`, `cdrUrl` y `pdfUrl`. Se necesitan el resumen diario de boletas y la nota de crédito al anular.
15. Imágenes clínicas: en `radiografias`, aceptar y devolver `piezas` (radiografía), `vista` y `momento` (foto clínica: antes, durante, después o control).
16. Sillones: `GET /sillones` con `uso`, `medicoId`, `especialidadId`, `exclusivo`, `activo` y `nota`. Nuevos `POST /sillones` y `PUT /sillones/:id`.
17. `GET /disponibilidad` sin filtro: el horario de todos los doctores, con `sedeId` en cada bloque.
18. `POST /citas` y `PUT /citas/:id`: validar el horario del doctor, los cruces del doctor, el sillón (uso, servicio y ocupación) y los bloqueos, igual que el frontend.
19. Facturación electrónica: endpoints `/facturacion-electronica/*` (configuración, prueba de conexión, comprobantes, reenvío y nota de crédito).
20. Sillones: turnos del día (`/sillones/asignaciones`) y bloqueos por doctor o por sillón.
21. Catálogo de servicios: `duracionMin` por especialidad.
22. Recordatorios: `PUT /automatizaciones/:clave` debe actualizar solo esa automatización (recibe la regla completa: `activo`, `plantilla`, `hsmNombre`, `hsmIdioma`). Si reemplazara toda la configuración, apagar una apagaría las demás; el frontend ahora lo detecta y las restaura.
23. Métricas únicas (spec UX/UI, GLO-02): el backend debe calcular cada métrica con la misma definición que usa el frontend en `compartido/metricas.js`, con los mismos filtros (fecha, sede, doctor):
    - **Por cobrar** = procedimientos terminados aún no pagados. **Saldo vencido** = lo por cobrar con más de 30 días desde que se terminó. **Saldo del plan** = total del presupuesto − pagado.
    - **Cobrado hoy** = pagos con fecha de hoy (la misma cifra en Caja, Pendientes y Panel).
    - **Última visita** = última cita Atendida. **Próxima cita** = la de hoy o futura no atendida más cercana.
    - **Por reactivar** = última visita hace más de 6 meses y sin cita futura. **Nuevos (30 días)** = primera cita atendida en los últimos 30 días.
    - **Cupos libres** = horas abiertas de los sillones − horas agendadas no canceladas.
    - **Salidas del mes** = egresos de Caja del mes (soles y dólares por separado).
    - **Comisión** = producción del doctor × su % (definido en su ficha).
24. Estados únicos (GLO-07): cita (`pendiente`, `confirmada`, `en_sala` derivado de la llegada, `en_atencion`, `atendida`, `no_show`, `cancelada`, `reprogramada`), procedimiento (agregar `anulado`; no se borra), comprobante (agregar `sin_enviar` cuando no hay proveedor), liquidación de seguro (`borrador`, `enviado`, `observado` con `motivo`, `aprobado`, `pagado`), laboratorio (`por_enviar`, `enviado`, `en_proceso`, `recibido`, `entregado`; «atrasado» es una bandera calculada) y documento (`enviado`, `visto`, `firmado`, `completado`, `vencido`).
25. Catálogo único de servicios (SRV-01): una sola tabla con `codigo`, `nombre`, `especialidadId`, `duracionMin`, `precio`, `activo` y los hallazgos del odontograma que proponen ese servicio (`hallazgos[]`). Lo leen Agenda, Odontograma, Presupuesto, Caja, Reportes y la IA.
26. Presupuesto único (ODO-02, PER-01): cada ítem del plan con `servicioId`, `pieza`, `cara`, `precio`, `estado` y `origen` (`odontograma`, `periodontograma` o manual). El odontograma y el periodontograma agregan ítems a este presupuesto; no hay proformas propias.
27. Laboratorio (LAB-03): el caso guarda `pacienteId`, `pieza`, `procedimientoId` y el egreso asociado (`egresoId`); `GET /laboratorio?pacienteId=` para la ficha.
28. Documentos del paciente (DOC-01): una sola entidad para consentimientos y formularios (`clase`, `tipo`, `estado`, `fecha`), con `POST /documentos/:id/reenviar` y firma en consultorio.
29. Integraciones (FAC-01, LNK-01): `GET /integraciones` con el estado real de la pasarela (proveedor activo, p. ej. Izipay) y del proveedor de facturación; Links de pago, Comprobantes y el inicio de TI leen de ahí.
30. WhatsApp (WSP-02): al proponer un cupo, la IA crea un link de pago y **se lo envía al paciente en la misma conversación de WhatsApp**; el paciente paga con ese link y la cita se registra (confirmada) solo cuando el link figura `pagado` (webhook firmado de la pasarela). Ver punto 95.
31. Doctores (NAV-07, CFG-02): meta mensual y `porcentajeComision` en la ficha del doctor, que es un usuario con perfil clínico (un doctor = un usuario).
32. Reseñas (SAT-01/04): separar la encuesta interna (NPS 0–10) de las reseñas públicas (1–5) y devolver el `origen` de cada reseña (`google` o `portal`).
33. Precio por sede (pedido del cliente): cada servicio del catálogo guarda `preciosSede: { [sedeId]: monto }` además del precio base. Sin precio propio, la sede cobra el base. La cita guarda el `precio` de la sede donde se atiende y los ítems del presupuesto toman el precio de la sede del paciente (o de la sede elegida). `GET/PUT /especialidades` (alias `/servicios`) deben aceptar y devolver `preciosSede`.
34. Metas y comisiones (pedido del cliente): por doctor, `metaMensual`, `porcentajeComision`, producción del mes (`prodMes`) y citas atendidas (`citasMes`) en `GET /catalogo/medicos`. La comisión del mes es producción × %, y la pantalla muestra cuánto falta para la meta y cuánta comisión suma alcanzarla.
35. Odontograma (pedido del cliente): `GET /odontograma/:pacienteId?fase=` ya existe; la ficha abre la fase más reciente con marcas (alta › evolución › inicial). Conviene un `GET /odontograma/:pacienteId/ultima-fase` para evitar dos consultas.
36. IGV en el catálogo (pedido del cliente): el precio del servicio es el total con IGV (18 %), como en Caja. El frontend muestra el desglose (valor de venta = total / 1.18, IGV = total − valor de venta) y permite ingresar el precio con o sin IGV. Si alguna clínica tiene servicios exonerados o inafectos, el backend debería guardar `afectacionIgv` (`gravado`, `exonerado`, `inafecto`) por servicio; hoy todos se tratan como gravados.
37. Comisión editable (pedido del cliente): `PUT /medicos/:id` debe aceptar `porcentajeComision` (0–100). Se edita en Reportes › Metas y comisiones y en Configuración › Doctores.
38. Más reportes (Reportes › Más reportes): con sesión el servidor debería entregarlos ya calculados para un periodo `desde/hasta`: `GET /reportes/procedimientos` (servicio, cantidad, importe), `GET /reportes/pacientes-con-saldo` (hecho sin pagar, vencido, días sin pagar, saldo del plan), `GET /reportes/por-recuperar` (última visita, meses sin venir, teléfono), `GET /reportes/pacientes-mes` (atendidos, nuevos, recurrentes por mes) y `GET /reportes/caja` (cobros por medio de pago y egresos por categoría). Hoy el frontend los calcula con lo que tiene cargado.
39. Navegación con paciente: «Abrir en Periodontograma» desde la ficha lleva al módulo con el paciente elegido; no requiere backend.
40. Administrador de sede (seguridad): el frontend ya filtra por sus sedes (pacientes, citas, caja, reportes, metas, ocupación, laboratorio, seguros, avisos de Inicio y Configuración), pero el backend debe aplicar el mismo filtro en cada endpoint según `usuario.sedes`, para que no se pueda leer otra sede pidiendo la API directamente. También: `GET /catalogo/medicos` debería devolver `sedes[]` de cada doctor.
41. Historia clínica del odontograma: la ficha muestra una foto de cada fase (inicial, evolución, alta) con `GET /odontograma/:pacienteId?fase=`. Para guardar varias tomas por fase con fecha (historial completo) haría falta `GET /odontograma/:pacienteId/tomas`.

42. Metas y comisiones por sede (pedido del cliente): un doctor que atiende en varias sedes tiene una meta y un % de comisión en cada una. `GET /catalogo/medicos` debe devolver `sedes[]` y `metasSede: [{ sedeId, metaMensual, porcentajeComision }]`, y se guarda con `PUT /medicos/:id/metas/:sedeId` (`{ metaMensual, porcentajeComision }`). La meta de una sede es la suma de las de sus doctores. La producción y la comisión de cada sede se calculan con las citas atendidas en esa sede y al precio del servicio en esa sede (`preciosSede`), no con el precio base. El % de la ficha del doctor queda como valor por defecto para las sedes sin % propio.
43. Filtro de sede en la API (seguridad y filtro del administrador general): los endpoints que listan datos de una sede aceptan `sedeIds=<uuid>,<uuid>` y el servidor lo cruza con `usuario.sedes` (nunca devuelve una sede ajena aunque se pida). El frontend ya manda el parámetro en `/comisiones`, `/gerencial/kpis`, `/gerencial/indicadores`, `/gerencial/reportes`, `/mi-produccion`, `/citas/enviar-confirmaciones` y `/alertas/evoluciones-pendientes`, y filtra en pantalla mientras tanto. Falta que lo acepten también `/citas`, `/pacientes`, `/pacientes/resumen`, `/pagos`, `/caja`, `/pagos/cierre`, `/egresos`, `/inventario`, `/ordenes-compra`, `/espera`, `/resenas`, `/laboratorio`, `/seguros`, `/recetas`, `/consentimientos`, `/formularios/envios`, `/radiografias`, `/tratamientos/resumen`, `/automatizaciones/historial` y `/bloqueos`.
44. Todo registro de una sede guarda `sedeId`: pagos, egresos, aperturas y cierres de caja, links de pago, insumos (cada sede tiene su almacén y su stock), órdenes de compra, consumos de insumos, lista de espera, reseñas, casos de laboratorio, liquidaciones de seguros, bloqueos de agenda de toda la agenda o de un doctor, radiografías, promociones y el horario de cada doctor por sede (`PUT /disponibilidad/mi` con `sedeId` por bloque). Al crear un paciente se guarda la sede donde se registró.
45. Sesión y sedes del usuario: el login y el JWT deben traer siempre `sedes` (lista de UUID) del usuario. Si no llegan, el frontend ya no abre todas las sedes: solo los roles de toda la clínica (administrador general, gerencia, TI) quedan con todas; el resto queda sin sede y ve el aviso «Tu usuario no tiene sede asignada». `POST/PUT /usuarios` deben aceptar y devolver `sedeIds`.
46. Permisos del administrador de sede: el servidor debe rechazar que un `admin_sede` cambie el plan, el precio base del catálogo, cree o borre servicios, toque `preciosSede` de otra sede, edite datos globales de la clínica (nombre, logo, cuentas, tipo de cambio, feriados, horario general) o registre cobros, egresos o citas en una sede que no es suya.
47. Pacientes, DNI único y borrado (QA de recepción): `POST /pacientes` y `PUT /pacientes/:id` responden 409 si el DNI ya existe en la clínica (aunque sea de otra sede), con el nombre del paciente que lo tiene. `DELETE /pacientes/:id` solo con el permiso `pacientes:eliminar` (por defecto, el administrador general) y 400 si tiene citas o registros clínicos. Recepción da de alta y edita, pero no borra.
48. Saldo por sede: `GET /pacientes/resumen-financiero?sedeIds=` y `ficha360.resumen` devuelven el saldo de las sedes pedidas; `ficha360.resumen.saldoOtras` trae lo pendiente en otras sedes. Directorio, ficha, WhatsApp, Plan y cuenta y Caja muestran la misma cifra.
49. Citas en el pasado y sillón ocupado: `POST /citas` y `PUT /citas/:id` rechazan fecha u hora anteriores a ahora (hora de Lima) con 422; al pasar una cita a `en_atencion` se rechaza si el mismo sillón de la sede ya tiene otra en atención. Al cancelar, el cupo se ofrece a la lista de espera solo si la cita es futura (`cupoOfrecidoA` en la respuesta).
50. Caja por sesión: cada apertura es una sesión (`aperturaId`). `POST /pagos` y `POST /egresos` la asocian; `GET /pagos/cierre?aperturaId=` devuelve solo esa sesión. Así, cerrar y volver a abrir el mismo día no cuenta dos veces los cobros.
51. Caja en dólares: `POST /pagos` guarda `moneda`, `montoOriginal` y `tipoCambio` (`monto` siempre en soles); `POST /egresos` guarda `moneda` y `tipoCambio`. El cierre guarda `efectivoContadoUsd`, `efectivoEsperadoUsd`, `diferenciaUsd`, `justificacion` y `observaciones`, y el historial los devuelve. La boleta en dólares sale en US$ con el TC y el equivalente en soles: `boletasHoy[]` y `/pagos/historial` deben traer `moneda`, `montoOriginal`, `tipoCambio`, `dni`, `direccion` y `usuarioNombre`.
52. Egresos: métodos `plin` y categorías «Movilidad» y «Caja chica». Registrar = `facturacion:crear` con la caja de la sede abierta (no el administrador general con varias sedes); anular o reclasificar = `facturacion:aprobar`.
53. WhatsApp: `GET /conversaciones` con `pacienteId` y sede de cada chat; `PATCH /conversaciones/:id` para ligar un chat a una ficha; `creadoEn` de los mensajes en ISO con zona horaria. Agendar desde el chat usa `POST /citas` con canal `whatsapp`.
54. Recordatorios: `POST /automatizaciones/recall/:pacienteId` solo envía el mensaje; la cita se crea cuando el paciente responde.

### Sin datos fijos con sesión (QA de producción, 04/10/2026)
Con sesión el frontend ya no muestra datos de ejemplo ni finge acciones: lo que no tiene endpoint queda oculto o avisa. Para completar esas funciones:
55. GET /tratamientos/resumen?desde&hasta&sedeIds → filtrar por sede; [{nombre, numeroDeVentas, importeTotal}].
56. GET /pacientes/resumen-citas → añadir primeraVisita.
57. GET /pacientes/resumen-financiero?sedeIds → añadir porCobrar, vencido (>30 días), diasSinPagar (y opcional nombre).
58. Sustituciones: GET /sustituciones?medicoId, POST /sustituciones {citaId,destinatarioId,motivo}, PATCH /sustituciones/{id} {estado} (al aceptar cambia medicoId de la cita).
59. GET /integraciones/estado → [{clave: pasarela|respaldo|correo, estado, detalle, ultimaActividad}].
60. GET /mi-produccion?sedeIds → siempre esMedico.
61. Bloqueos: GET devuelve medicoId, diaSemana, fecha; POST acepta medicoId + diaSemana (semanal) o fecha (puntual).
62. GET /disponibilidad?medicoId → filtrar por médico.
63. GET /pagos (o /pagos/historial) con fecha/desde/hasta + sedeIds y creadoEn con hora.
64. GET /pacientes → siempre alergias: string[]; POST/PUT /pacientes aceptan sedeIds: uuid[].
65. POST /recetas acepta medicoId, alertaAlergia (JSON), overrideAlergia; GET /recetas devuelve medicoId, medico, cop, firmada/firmadaEn.
66. Lista de espera: POST /espera acepta especialidadId y medicoId; POST /espera/{id}/ofrecer {citaId|fecha,hora,medicoId}.
67. Consentimientos: POST /consentimientos/{id}/enviar y /reenviar (enlace de firma); firmar guarda firmaUrl (PNG base64 o archivo).
68. Reseñas: PATCH /resenas/{id} {respondida, respuesta}; GET /encuestas?sedeIds; PATCH /resenas/{id}/alerta-atendida.
69. Campañas por email: POST /pacientes/campana con canal email|ambos.
70. /auth/me (o login) devuelve medicoId y cop del usuario médico.
71. Cada clínica debe cargar su horario (GET /clinica.horario) y sus sillones (/sillones): sin ellos la agenda avisa y no restringe horas.
72. GET /especialidades: codigo, hallazgos[] (ids del dibujo: caries, fractura, endodoncia, corona, extraer/extraccion, ausente, coronaT, rr, fractR, absceso, periapic, dde…) y preciosSede{uuid:monto}. Sin hallazgos, «Al plan» solo avisa.
73. Catálogo periodontal con codigo IHO, PRO, RAR, REE, CIR, FUR, FER, MAN.
74. POST /tratamientos/{plan}/fases acepta servicioId, piezaNumero, cara, sedeId, origen; GET /tratamientos devuelve [{plan, fases:[…origen, servicioId, piezaNumero]}].
75. POST /pagos con faseIds[] pasa esas fases a atendida y devuelve comprobanteSerie/comprobanteNumero.
76. GET /medicos con cop; sesión (login o /auth/me) con medicoId y cop.
77. Tomas del odontograma: GET/POST /odontograma/{pacienteId}/tomas → {id, fecha, etiqueta, fase, denticion, piezas[]}.
78. Opcional /clinica/impresion: documento (descuento, vigencia), textos.condiciones, tarifa por sede.
79. POST /usuarios: aceptar clave temporal y forzar cambio al primer ingreso (debeCambiarClave); ideal invitación por correo; endpoint de restablecer clave.
80. POST /auth/registro {nombreClinica, ruc, nombre, email, password} (confirmar contrato).
81. POST /pagos/niubiz/sesion devuelve checkoutUrl (o definir VITE_NIUBIZ_JS); nunca simulado:true en producción.
82. Portal: pago en línea del paciente, descarga de comprobante, GET /portal/{id}/resumen con clinica.nombre.
83. GET /facturacion-electronica/comprobantes con xmlUrl y cdrUrl.
84. Pasarela y links de pago: GET/PUT /pasarela, POST/GET /links-pago.
85. Plan: endpoint para cambiar plan, planVence en GET /clinica, historial de cobros de membresía.
86. GET /whatsapp/salud con ia:boolean.
87. Inventario: consumoDiario por insumo.
88. Laboratorio: endpoint para contactar/avisar al laboratorio; confirmar campos de POST /laboratorio (pacienteId, paciente, sedeId, tipoTrabajo, laboratorio, fechaEnvio, fechaEstimada, estado).
89. BackOffice de plataforma: tenants, suscripciones, usuarios globales, soporte.
90. El RUC de la clínica debe tener dígito verificador SUNAT válido (si no, la boleta no se abre).
91. WhatsApp por sede (pedido del cliente): cada sede tiene su propio número de WhatsApp. Los pacientes escriben al número de su sede, cada chat pertenece a la sede del número que lo recibió, y todo lo que sale (recordatorios, confirmaciones, reseñas, respuestas de recepción y de la IA) sale desde el número de la sede de la cita o del paciente. El frontend ya lo muestra y lo edita, y tolera que falten los campos; el backend necesita:
   - **Sede:** `whatsappNumero` (celular peruano en E.164, `+519XXXXXXXX`, o `null`) y `whatsappPhoneNumberId` (el «phone number ID» de Meta, solo dígitos, o `null`) en `GET /sedes`, `POST /sedes` y `PUT /sedes/:id`, y `whatsappNumero` en la sede de `GET /clinica/impresion?sedeId=` (`sedes[0]` o `sede`). El frontend los envía siempre en el POST y el PUT (Configuración › Sedes); si el servidor no los devuelve después de guardar, avisa «El servidor aún no guarda el número de WhatsApp por sede». `whatsappPhoneNumberId` debe ser único en la clínica; el número, también.
   - **Webhook de Meta:** cada mensaje entrante trae `metadata.phone_number_id`; con él se busca la sede (`whatsappPhoneNumberId`) y la conversación guarda `sedeId` y `numeroSede` (el número de la clínica que recibió el chat). Un mismo paciente que escribe a dos sedes tiene dos conversaciones. Un `phone_number_id` sin sede se registra en el log y la conversación queda sin sede (el frontend la muestra «Sin sede»).
   - **`GET /conversaciones`:** devolver `sedeId` y `numeroSede` en cada chat y filtrar por las sedes del token (`usuario.sedes`), con `sedeIds=` opcional como el resto de listados. Mientras no los mande, el frontend deduce la sede cruzando `numeroSede`/`numeroClinica`/`telefonoClinica` con el `whatsappNumero` de las sedes o, si no, por la sede de la ficha del paciente (`GET /pacientes`).
   - **Envíos salientes:** recordatorios, confirmaciones, encuestas y reseñas (`/automatizaciones`, `/citas/enviar-confirmaciones`, recall), respuestas manuales (`POST /conversaciones/:id/mensajes`) y respuestas de la IA salen con el `phone_number_id` de la sede: el de la conversación cuando hay chat; si no, el de la sede de la cita o, sin cita, el de la sede del paciente. Una sede sin número usa el número general hasta que tenga el suyo. Las plantillas HSM aprobadas deben existir en cada número (o en la WABA compartida).
   - **`GET /whatsapp/salud`:** además del estado general, `porSede: [{ sedeId, numero, estado, ok, semaforo, fallos24h, ultimoFallo, ultimoEnvioOk, mensaje }]`; opcionalmente `GET /whatsapp/salud?sedeId=` con la misma forma y el `sedeId` en la respuesta. Integraciones y el inicio de TI ya leen cualquiera de los dos; sin ellos muestran el número general como «compartido por todas las sedes» y marcan «Sin número propio» en las sedes sin `whatsappNumero`.
   - **Agente de IA:** responde con los datos de la sede del número que recibió el chat: dirección, horario (`horario.sedes[sedeId]`, o el general), doctores y horarios de esa sede (`/disponibilidad` con `sedeId`), precios de esa sede (`preciosSede`) y solo las promociones de esa sede o de toda la clínica. Al agendar desde el chat, la cita se crea en esa sede.
92. Portal del paciente (`GET /portal/{pacienteId}/resumen`): además de citas, pagos, total invertido y ahorro, devolver el plan vigente con sus fases (`plan: { nombre, total, fases: [{ nombre, piezaNumero, estado, costo }] }`), el saldo pendiente (`saldo`) y las piezas por atender del último odontograma. Sin esos campos el portal muestra «No disponible»; no debe deducir que el paciente está al día.
93. Metas por sede (`PUT /medicos/{id}/metas/{sedeId}`): validar que el médico atiende en la sede con su horario (`/disponibilidad` de esa sede) o con `medico.sedes`, y cargar las sedes de cada médico en `/medicos`. Hoy responde 403 «médico sin sede asignada» a todos, así que el administrador de sede no puede fijar ninguna meta. Guardar la meta y el % por sede (no en la ficha global del médico) si la clínica decide que son por sede.
94. Decisiones del cliente (revisión 11) que necesitan backend:
   - **Citas:** `POST /citas` sin `estado` crea «pendiente»; el frontend envía «pendiente» salvo el canal presencial. `PUT /citas/{id}` debe aceptar `estado` (hoy lo ignora; el frontend lo corrige con `PATCH /citas/{id}/estado`). La confirmación del paciente por WhatsApp pasa la cita a «confirmada».
   - **Producción:** `/comisiones`, `/mi-produccion` y `/gerencial/*` calculan la producción sobre procedimientos terminados (fases `terminado`/`atendida`), no sobre citas atendidas. «Facturado» queda solo para comprobantes electrónicos.
   - **TI:** sin acceso a Caja ni cobranza (`/caja`, `/pagos`, `/pagos/*` → 403 para el rol `ti`).
   - **Metas:** meta mensual por médico y sede (no en la ficha global); el % de comisión es del médico y solo lo cambia el administrador general (`PUT /medicos/{id}`).
   - **Procedimientos:** el médico anula (no borra) los no terminados con `PATCH /tratamientos/fases/{id}` `{ estado: "anulado", motivo }`, guardando el motivo (hoy se pierde); un terminado solo lo anula el administrador; `DELETE` solo el administrador.
   - **Usuarios:** al entrar con clave temporal, el login devuelve `debeCambiarClave: true` y obliga a cambiarla; el administrador de sede puede desactivar con `DELETE` a los usuarios de su sede (no administradores).
   - **Consentimiento firmado:** `POST /consentimientos/{id}/anular` con motivo (médico o administrador); queda en la historia como anulado.
   - **Sede de registros existentes:** `PUT /inventario/{id}` debe aceptar `sedeId` y `PUT /pacientes/{id}` `sedeRegistroId` (solo administrador general); hoy los ignoran.
   - **Recordatorios:** `PUT /automatizaciones` exige `recall: configurar`.
95. Izipay + WhatsApp con IA (revisión 11):
   - `GET /public/izipay/checkout/{pagoId}` hoy responde 400 «Izipay rechazó Token/Generate: Estructura del request inválida»: corregir el cuerpo del pedido de token según la documentación del sandbox.
   - La página de pago va en el dominio de la clínica, con su nombre y logo, y envía a Izipay los datos reales del paciente (nombre, DNI, celular, correo).
   - Al pagar: crear la cita de la reserva, registrar el pago en la Caja de la sede (método `izipay`) con comprobante y confirmar por WhatsApp.
   - **Validación del pago antes de agendar:** la IA solo crea la reserva retenida (no una cita). El backend valida el aviso de Izipay en `/public/izipay/ipn` (Web Core: POST JSON con `code`, `response`, `payloadHttp` y `signature`, y la cabecera `transactionId`): la `signature` se recalcula sobre `payloadHttp` con la **clave Hash** del comercio; el `transactionId` es el mismo del token de sesión; el `orderNumber`, el importe (`"50.00"`) y la moneda (`PEN`) corresponden al link; y el pago está autorizado (`code` «00»). Solo entonces crea la cita «confirmada», registra el pago en la Caja de la sede y dispara la confirmación por el chat. Hace falta una herramienta de la IA para consultar el estado del pago de la reserva (si el paciente dice «ya pagué», no se le cree ni se acepta una captura). Si el aviso no llega, antes de liberar el cupo se consulta a Izipay el estado de la transacción.
   - **Flujo central:** el paciente paga con el link que la IA le envía en la misma conversación de WhatsApp. La IA crea la reserva (`POST /reservas`) y el link (`POST /pagos/link`) y manda en el chat el mensaje con el link. La cita se confirma solo cuando llega el aviso firmado de Izipay (IPN), y la IA lo confirma por el mismo chat. Sin pago no hay cita confirmada: la reserva queda retenida 30 minutos y luego se libera, y la IA lo avisa. No hay alternativa de «recepción llama para confirmar».
   - Mensaje del link: «viernes 23/10 a las 17:00» y «Sede Surco» (hoy «2026-10-23» y «Sede Sede Surco»).
96. Cambio de clave propia (revisión 12): `POST /auth/cambiar-clave` `{ claveActual, claveNueva }` con el token del usuario → 200 y `debeCambiarClave: false` en adelante (400 si la actual no coincide o la nueva no cumple: 8+ caracteres, letras y números, distinta de la anterior). Mientras `debeCambiarClave` sea true, el token solo debe servir para `/auth/*` (hoy la sesión temporal lee todo). El frontend ya pide la clave nueva tras el login y llama a esta ruta. Además, el link de pago debe armarse con el dominio de la clínica (`https://app.odontosonrisa.biz/pagar.html?pagoId=…`), donde la página ya está publicada; `frontend/public/pagar.html` queda versionada en el repositorio.
97. Izipay y estados (revisión 13):
   - **Ambiente:** mientras se prueba, token, comercio y SDK deben ser todos del sandbox (`sandbox-checkout.izipay.pe`, credenciales del panel de pruebas). Hoy el comercio 4081888 es de producción: el sandbox lo rechaza con P54 y una tarjeta real se cobraría. `keyRSA` debe ser «RSA» o la clave pública (hoy trae «IZIPAY_API_URL=…»); `sdkUrl`, el del mismo ambiente que el token.
   - **Mensaje de la IA:** la URL del pago va sola (WhatsApp no interpreta `[texto](url)`) y con el `pagoId` con guiones; el servicio sin «30 años».
   - **`PATCH /citas/{id}/estado`:** hoy responde 500 para cancelada/confirmada/en_atencion/atendida (regresión). Las transiciones no permitidas (atendida o en_atencion en el futuro) deben dar 400 con el motivo. `POST /auth/cambiar-clave` y `POST /consentimientos/{id}/anular` también dan 500: revisar la migración de base de datos del último despliegue.
98. Pago por WhatsApp, reservas y anulaciones (revisión 14):
   - **Sesión de pago:** `GET /public/izipay/checkout/{pagoId}` vuelve a responder 400 «Izipay rechazó Token/Generate: Estructura del request inválida» (ya pasó en las revisiones 11 y 12). Registrar en el log el cuerpo exacto que se envía a `Token/Generate` (sin secretos) y compararlo con la referencia oficial del token de sesión. Revisar también que las variables de Izipay del sandbox estén cada una en su línea: en la revisión 13 `keyRSA` traía pegado «IZIPAY_API_URL=…». Las cuatro credenciales salen del mismo panel (pruebas: `sandbox-panel.izipay.pe`; producción: `panel.izipay.pe`, en Desarrolladores › Claves) y cada una tiene un solo uso:
     - **código de comercio**;
     - **clave de API**: solo para generar el token de sesión;
     - **clave Hash**: para calcular y validar la firma;
     - **clave pública**: la RSA del formulario.
     No se mezclan claves de un ambiente con el otro.
   - **«Ya pagué»:** cuando el paciente dice que pagó, la IA consulta el estado del pago de su reserva (herramienta propia). No vuelve a llamar a `agendar` ni a `disponibilidad`, y no le dice que su hora «no está disponible»: ese cupo lo retiene su propia reserva. Si el pago está pendiente, responde que aún no llega la confirmación y que el cupo sigue guardado hasta la hora de vencimiento.
   - **Vencimiento:** a los 30 minutos sin pago, la reserva pasa a «vencida» y el link a «vencido»; hoy siguen «retenida» y «pendiente» con horas de atraso. Un link vencido no pide token a Izipay: `GET /public/izipay/checkout/{pagoId}` responde 410 «El link venció» y la página de pago lo muestra.
   - **Mensaje del link:** las líneas no se pasan a mayúscula inicial. Hoy llega «Https://app…», «Tiempo, se libera…» y «Aplica a otro tratamiento…».
   - **Anular consentimiento** (`POST /consentimientos/{id}/anular`):
     - el motivo es obligatorio (400 sin motivo);
     - el documento anulado conserva la firma, la fecha de firma y el texto que se firmó;
     - el título y el contenido no se modifican;
     - `anulado`, `motivoAnulacion`, `anuladoEn` y `anuladoPor` se guardan y se devuelven también en `GET /consentimientos`;
     - un consentimiento ya anulado no se puede anular otra vez (409).
   - **«No asistió» en el futuro:** `PATCH /citas/{id}/estado?estado=no_show` en una cita futura debe dar 400, igual que «atendida» y «en_atencion».
99. Reservas, IA y ambiente de pago (revisión 15):
   - **`POST /reservas` valida como una cita:**
     - horario del doctor en esa sede y día;
     - fecha y hora futuras;
     - sin choque con citas ni con otras reservas activas del mismo doctor (o sillón);
     - 409 o 400 con el motivo.

     Hoy acepta dos reservas a la misma hora, una reserva sobre una cita, domingos, las 21:30 y fechas pasadas.
   - **La IA nunca confirma una cita que no existe.** «Ya pagué» → consulta el estado del pago de la reserva:
     - si está pendiente, lo dice y da la hora de vencimiento;
     - solo cuando el backend recibió el IPN válido y creó la cita, la IA la confirma.

     `confirmar_asistencia` solo aplica a citas existentes.
   - **Después de mandar el link, la IA no vuelve a llamar a `agendar`** para la misma reserva. Un «Sí» o «Confirmo» del paciente se responde recordando que falta el pago.
   - **Ambiente de pruebas:** mientras se prueba, comercio, claves y SDK del sandbox (hoy, comercio 4081888 de producción). Para salir a producción, cambiar las cuatro credenciales juntas.
   - **Correo de facturación:** el del paciente o uno real de la clínica (hoy `pagos@clnicadentalsonre.local`).
100. Confirmación del pago (revisión 16):
   - **Firma:** con un pago aprobado en el sandbox (código «00»), Izipay devuelve `payloadHttp` y `signature`. La página los reenvía tal cual a `/public/izipay/resultado`, pero el servidor responde «firma inválida». Además, el aviso directo (IPN) tampoco registró el pago. Revisar:
     - que la clave Hash sea la del comercio de pruebas 4004353 (no la de producción);
     - el cálculo de la firma: Base64 de HMAC-SHA256 sobre `payloadHttp` exactamente como llega, sin volver a serializar el JSON;
     - que `urlIPN` llegue a Izipay y el endpoint responda 200.
   - **Pago aprobado y cupo liberado:** si el pago se aprobó pero el aviso no se validó, el link no puede pasar a «caducado» ni liberar el cupo sin antes consultar a Izipay el estado de la transacción (`izipayRef`). Con dinero real, el paciente pagaría y se quedaría sin cita.
   - **Hora del cupo en el chat:** la IA dice «su cupo sigue guardado hasta las 16:10». Esa hora está en UTC (en Lima es 11:10) y es de otra reserva del mismo paciente. Debe dar la hora de Lima de la reserva del link enviado.
   - **Motivo de anulación del procedimiento:** la respuesta del `PATCH` ya lo trae; `GET /tratamientos` también debe devolverlo (`motivo` o `motivoCancelacion`).
   - **Consentimiento anulado:** no modificar el título ni el texto firmado (hoy agrega «[ANULADO]» y «[Anulado: motivo]»); guardar `anuladoEn` y `anuladoPor`.
   - **Link con reserva liberada:** el link debe quedar «anulado», no «pendiente». El cobro ya se bloquea con «pago caducado».
101. Cobro por WhatsApp (revisión 17):
   - **Firma (sigue fallando):** `docs/izipay-firma-sandbox-R17.json` trae un `payloadHttp` y su `signature` reales de un pago aprobado en el sandbox. Con la clave Hash del comercio 4004353, `Base64(HMAC-SHA256(payloadHttp, claveHash))` debe dar exactamente esa `signature`. No es un SHA-256 sin clave: se comprobó que no coincide. Probar el cálculo del backend con ese archivo antes de desplegar.
   - **Pagos aprobados sin cita:** los pagos de prueba aprobados de R16 y R17 quedaron «caducado» sin cita. Al corregir la firma, conciliar con Izipay por `izipayRef` y crear las citas, o marcarlos para devolución si el cupo ya no existe.
   - **Estado de la IA:** al vencer la reserva, la conversación debe enterarse. Hoy, dos horas después de vencida, la IA sigue diciendo «Ya tiene un cupo reservado… a la espera de la confirmación del pago». Al vencer, la IA avisa al paciente que el cupo se liberó y ofrece un link nuevo.
   - **Hora del cupo:** la IA dijo «hasta las 14:50» para una reserva que vencía a las 13:39 (hora de Lima). Debe leer el `caducaEn` de la reserva del link enviado y convertirlo a hora de Lima.
   - **Procedimiento anulado:** el servidor agrega «[Motivo: …]» al nombre. El motivo ya viaja en `motivo`; el nombre no se modifica (el frontend lo quita al mostrar).
102. Cobro por WhatsApp: lo que falta después de validar la firma (revisión 18):
   - **Pago en Caja:** al confirmar el pago (`/public/izipay/resultado` o IPN «OK PAID»), registrar el cobro en la sede de la cita con método `izipay`, importe, `izipayRef` y la cita. Debe salir en `/pagos`, en el historial del paciente y en el cierre del día (`porMetodo.izipay`). Hoy se crea la cita, pero el cierre de Surco marca Izipay S/ 0.
   - **Aviso al paciente:** al crear la cita, la IA envía por el mismo chat la confirmación: «✅ Pago recibido. Su cita quedó confirmada para el jueves 29/10 a las 17:00 en Sede Surco…». Hoy solo confirma si el paciente pregunta.
   - **Conciliar los pagos aprobados que quedaron sin cita:**
     - link de la IA de R17 (`18d74c9c…`, 29/10 15:00): sigue «pendiente», con la reserva «retenida» y el cupo bloqueado;
     - los tres de R16: «caducado».

     Consultar a Izipay por `izipayRef` y crear la cita o marcar el pago para devolución.
   - **`/pagos/historial?pacienteId=`** ignora el filtro y devuelve pagos de otros pacientes.
   - **Canal de la cita:** una cita creada desde un link de recepción queda con `canalOrigen: whatsapp_ia`; debe reflejar el origen real del link.
   - **Hora del cupo en el chat:** sigue mal (dijo «16:47» para un cupo que vence a las 14:38 hora de Lima).
103. Cobro por WhatsApp: conciliación y aviso (revisión 19):
   - **No contar pagos que no existieron.** La recuperación de pagos registró en Caja S/ 50 por Izipay y creó una cita confirmada («QA Izipay Prueba», 23/10 a las 16:30) a partir del link `0cf3f401…`. Ese link se marcó «pagado» en R9 con la ruta insegura de entonces: no tiene `izipayRef` ni hubo cobro en Izipay. Revertir ese cobro y esa cita. Conciliar solo pagos confirmados por Izipay: consultar la transacción con `izipayRef` y no confiar en el estado guardado.
   - **`POST /pagos/{id}/reconciliar`:**
     - con el pago real de R17 (`18d74c9c…`, `izipayRef` 1792087822, `conciliacionPendiente: true`) responde **500**: debe consultar a Izipay y crear la cita;
     - con el link de R9 sin `izipayRef` (`8bd43be7…`) responde 200 «listoParaCrearCita»: debe rechazarlo (400 «sin pago de Izipay que conciliar»);
     - los tres pagos aprobados de R16 (estado «caducado») también deben poder conciliarse.
   - **Aviso al paciente (sigue faltando):** al confirmarse el pago, la IA escribe por el mismo chat que la cita quedó confirmada, con fecha, hora y sede.
   - **`caducaEn` en `/pagos/links` y `/reservas/{id}`:** pasó a llegar como hora sola («13:39»), sin fecha, así que no se puede saber si un link venció. Mantener el instante completo (ISO con zona); si hace falta la hora de Lima, agregarla en otro campo (`caducaEnLima`). El frontend ya acepta los dos formatos.
   - **IA:** no afirmar que un día no tiene atención sin consultar `disponibilidad` (dijo que el viernes 30 no había atención sin usar la herramienta). Si el paciente ya está registrado, no volver a pedirle edad y celular.
104. Conciliación segura y mensaje de confirmación (revisión 20):
   - **`POST /pagos/{id}/reconciliar` debe consultar a Izipay antes de crear nada.** Hoy basta con que el link tenga `izipayRef`, y esa referencia se asigna apenas se abre el formulario, aunque no se pague. Al conciliar el link `5aa82a2b…` (R13, el pago se rechazó y nunca se cobró), el servidor:
     - creó una cita confirmada;
     - registró S/ 50 por Izipay en la Caja de Surco;
     - envió al chat «✅ Pago recibido».

     El QA lo revirtió (cobro anulado y cita cancelada), pero el link sigue apuntando a esa cita: dejarlo «caducado» sin cita. Regla: crear la cita y el cobro solo si Izipay confirma la transacción como pagada (consulta por `transactionId`/`orderNumber`, o el IPN firmado guardado). Si no, 409 «Izipay no registra el pago».
   - **Estado del link conciliado:** tras conciliar, el link debe pasar a «pagado»; hoy queda «caducado» con `citaId`.
   - **Mensaje de confirmación:** «📍 Sede Sede Surco · » y «👤  · Consulta…»: falta el nombre del doctor, sobra «Sede» y queda un «·» suelto. Formato sugerido: «📍 Sede Surco · Dr. Miguel Flores».
   - **IA:** no ofrecer horarios ni reenviar links sin consultar las herramientas. Ofreció las 09:00 del 31/10, ya ocupadas, y reenvió el link ya pagado de otra cita con la hora límite del día anterior.
   - **Link de R9 `8bd43be7…`:** sigue «pagado» sin pago real; anularlo como se hizo con `0cf3f401…`.
105. Conciliación de pagos antiguos y respuestas de la IA (revisión 21):
   - **Falso negativo al conciliar:** los dos pagos aprobados en el sandbox en R16 (`fc6c14a2…`, ref 1792079217, «00 Operación exitosa»; y `c9456a43…`, ref 1792079822) responden 409 «Izipay no registra el pago». Probable causa: en esos links `izipayRef` guarda el **número de pedido** (10 dígitos); en los pagos nuevos guarda el **transactionId** (14 dígitos, p. ej. 17921526794040), y la consulta a Izipay usa este último. Para los links antiguos, consultar por número de pedido, o guardar ambos (`orderNumber` y `transactionId`) desde el token de sesión.
   - **IA sin herramientas:** «No hay atención en la sede Surco el viernes 6 de noviembre» sin consultar `disponibilidad`, cuando ese día sí hay cupo (una reserva de prueba del 06/11 a las 10:00 con el doctor de Surco se aceptó). Toda respuesta sobre días u horarios debe salir de la herramienta.
   - **Link de R9 `8bd43be7…`:** sigue «pagado» sin pago real; anularlo.
106. Datos reales de la clínica (16/10/2026): detalle en `DATOS-REALES-CLINICA-2026-10-16.md` y tabla en `datos-reales/servicios-precios-por-sede.csv` / `.json`.
   - **Empresa (`/clinica`):**
     - PEZZUTTI FAMILY DENTISTRY S.A.C., RUC **20612478636**, nombre comercial OdontoSonrisa Clínica Dental;
     - domicilio fiscal: Av. Santiago Antúnez de Mayolo 1094, Int. 201, Urb. Covida Et. Uno, Los Olivos;
     - emisor electrónico de factura y boleta; Renta MYPE Tributario.
   - **Sedes (`/sedes`):** dos, que reemplazan a San Isidro y Surco.
     - **Miraflores:** Av. Alfredo Benavides 2150, Of. 503. Es **dueña del número de WhatsApp actual**.
     - **Los Olivos:** Av. Antúnez de Mayolo 1094-A, Of. 201. Sin WhatsApp propio por ahora: el número de Miraflores atiende las dos y la IA pregunta la sede.
     - Nombre y dirección de la sede en los mensajes de la IA y en los documentos: siempre desde `/sedes`.
   - **Servicios (`/servicios`):** 242 ítems con precio y pago al doctor por sede. Para cargarlos hace falta:
     - **`pagoMedicoSede: { [sedeId]: monto }`:** monto fijo en soles por servicio y sede. Las comisiones de `/comisiones` se calculan sumando ese monto por cada procedimiento atendido, en lugar del % por doctor. Si falta el monto: «sin pago definido», no 0.
     - **Servicio no disponible en una sede:** si no tiene precio en una sede, no se ofrece ahí (agenda, IA ni Caja). Hoy cae en `precioBase`.
     - **`moneda` por servicio:** 4 ítems en USD.
     - **Productos de venta (44):** no agendables, sin pago al doctor.
     - **`codigo`:** el número de ítem de la planilla.
     - Desactivar (no borrar) los 22 servicios de la demo.
   - **Link de pago por WhatsApp:** el importe sale del precio del servicio en la sede de la cita. Consulta general: **S/ 100 en Miraflores** (precio de marcha blanca; el regular será 150) y **S/ 50 en Los Olivos**.
   - **Faltan de la clínica:**
     - doctores reales por sede con su horario;
     - horario de cada sede;
     - sillones por sede;
     - teléfonos y correo a publicar;
     - series de comprobantes;
     - duración de los servicios;
     - si los precios incluyen IGV;
     - las observaciones de la planilla (pagos al doctor vacíos o en 0, ítems sin descripción, posibles errores de tipeo).
107. Agendamiento con pago, idempotencia de cobros y confirmaciones de la IA (revisión 22):
   - **`POST /reservas` → 500 siempre** (todo paciente, sede y doctor). Sin esto no hay cupo retenido ni link de pago, ni por la IA ni por recepción. Cuando `agendar` falla por un error del servidor, la IA no debe decir «no quedan cupos». Debe decir que no pudo reservar y derivar a recepción.
   - **`GET /pagos/links` → 500** para todos los perfiles: Caja › Links de pago no carga.
   - **Un pago, un cobro.** El registro del cobro en Caja debe ser idempotente por link de pago (o por referencia de Izipay):
     - `POST /pagos/{id}/reconciliar` sobre un pago ya conciliado responde «idempotente», pero hoy inserta otro cobro;
     - reenviar el aviso firmado de un pago ya registrado (`/public/izipay/resultado`, y por lo mismo un reintento del IPN) hoy responde «OK PAID» e inserta otro cobro.

     Si el link ya tiene su cobro, responder OK sin insertar nada. Conviene además una restricción única en la base de datos. El QA anuló 7 duplicados del 16/10.
   - **Confirmación de la IA tras «ya pagué»:** la fecha, la hora y la sede de la cita deben salir del pago y de la cita que devuelve `estado_pago`, nunca del último horario ofrecido en el chat. La IA confirmó «viernes 6 de noviembre a las 17:30» sin que existiera esa cita ni un link para esa hora.
   - **Dos pagos para la misma cita:** cuando un pago conciliado corresponde a una cita que ya está pagada por el mismo paciente (23/10 17:00: pedido 1792079217 y transacción 17920879194230), no basta con asociarlo a esa cita. Marcarlo como saldo a favor o devolución, o crear la cita en una hora alternativa.
108. Agendamiento por WhatsApp, IPN y un link por paciente (revisión 23):
   - **La IA no logra agendar:** la herramienta `agendar` falla en todos los casos probados:
     - chat existente y chat nuevo;
     - paciente registrado y paciente nuevo;
     - sedes Surco y San Isidro.

     Los cupos estaban libres (reserva por API: 200). Al paciente le responde «ese horario ya no está disponible». Si la causa es el `slotToken`, la IA debe pedir el cupo otra vez con un token nuevo. Un error interno nunca debe presentarse como falta de cupo.
   - **IPN:** un pago aprobado en Izipay debe registrarse aunque el navegador del paciente no avise (`/public/izipay/resultado`). Prueba: link `08194686…`, pedido 1792172702, aprobado a las 12:45:50 del 16/10. Siguió «pendiente» y «Conciliar» respondió 409. Verificar que el IPN llegue (URL de notificación configurada en Izipay) y que se procese igual que el aviso del navegador: firma, link «pagado», cita, un cobro y aviso. Mientras no llegue, la reserva «retenida» debe bloquear de verdad el cupo: hoy otro paciente puede reservar el mismo horario. Además, la página de pago no debe decirle «pago caducado» a quien ya pagó.
   - **Un link vigente por paciente también desde recepción:** `POST /pagos/link` no debe crear otro link si el paciente ya tiene uno pendiente y sin vencer, como ya hace la IA según el MD del programador.
   - **Horas descartadas con fecha:** `franjasDescartadas` guarda horas sin fecha que se acumulan entre pedidos y ocultan cupos libres de cualquier día. Guardarlas con fecha y limpiarlas al empezar un pedido nuevo.
   - **Búsqueda del paciente por celular:** excluir pacientes eliminados.
   - **Confirmación por WhatsApp** también al pagar un link creado por recepción. La página de pago la promete.
   - **«Ya pagué» sin pago registrado:** responder que no se encuentra un pago a su nombre y ofrecer ayuda, sin desviar a agendar.
109. Agendamiento por WhatsApp y pagos sin registrar (revisión 24):
   - **La IA no llega a `agendar`.** Después de ofrecer horarios, al elegir uno o al dar los datos responde frases genéricas («Puedo agendarte una cita, darte precios, horarios…», «¡Con gusto te agendo! ¿Qué necesitas?…») y la conversación queda en `S7_DATOS` o `S9_CONFIRMA`. Las 3 conversaciones del 17/10 (15:21–15:26) terminaron sin reserva, link ni paciente. La IA debe continuar con lo que ya sabe (especialidad, sede, día, hora y datos) y llamar a `agendar`.
   - **IPN** (2.ª vez): pedido 1792268793, pagado a las 15:27:15 del 17/10 sin aviso del navegador, siguió «pendiente».
   - **Salida manual para pagos sin registrar:** sin IPN no hay forma de destrabar a un paciente cuyo link quedó pagado en Izipay y «pendiente» aquí. Hoy «QA Izipay Once» no puede reservar («Ya hay un link de pago pendiente»), su link dice «pago caducado» y «Conciliar» da 409. Agregar, para el administrador y con auditoría:
     - «registrar pago verificado en Izipay» con el código de autorización;
     - «anular link» con motivo.
   - **Siguen de R23:**
     - la búsqueda por celular vincula pacientes eliminados;
     - no llega el WhatsApp de confirmación al pagar un link de recepción;
     - «ya pagué» sin pago da una respuesta genérica.
110. Registro manual de pagos de Izipay y cierre del IPN (revisión 25):
   - **`POST /pagos/{id}/registrar-verificado` debe ser solo del administrador.** Hoy recepción lo usa (200, `"verificadoAdmin": true`) sobre un link que el paciente nunca abrió, con un código inventado («S00000»), y se crean una cita confirmada y un cobro de S/ 50 sin ninguna prueba. El QA lo revirtió; el link `283a9eba…` sigue «pagado» con `izipayRef: "admin|S00000"` y hay que corregirlo desde el servidor. Reglas:
     - 403 para recepción y los demás perfiles sin permiso de aprobar en Caja;
     - 409 si el link no tiene pedido de Izipay (`izipayRef` del formulario);
     - código de autorización de 6 letras o números;
     - guardar en el pago y en la auditoría quién lo registró, no «admin».
   - **IPN:** del lado de la aplicación está completo: `urlIPN` en `pagar.html`, `/public/izipay/ipn` procesa el aviso firmado y no duplica. Falta confirmar en el log si Izipay sandbox envió algo para los pedidos 1792282736 (17/10 19:19), 1792268793 (17/10 15:27) y 1792172702 (16/10 12:45), incluidos los POST rechazados con 400. Si no envió nada, queda cubierto con «Registrar verificado».
   - **Saldo a favor:** marcar solo el pago adicional (el segundo), no los dos pagos de la cita.
   - **Siguen:**
     - la IA no llega a `agendar`: responde frases genéricas al elegir hora;
     - «ya pagué» sin pago da una respuesta genérica;
     - datos reales de la clínica sin cargar.
111. Respuestas de la IA fuera del camino principal (revisión 26):
   - **«Ya pagué» con el link pendiente o sin pago:** responder con el estado real del pago, por ejemplo: «Todavía no figura su pago; el link vence a las 22:09 (hora de Lima)». Sin desviar a agendar ni confirmar nada.
   - **Pedir otro horario con un link pendiente:** decir que ya tiene un cupo retenido (fecha y hora) y ofrecer cambiarlo; no responder con información general.
   - **No inventar horarios de atención:** dijo «Atendemos de lunes a sábado de 8:00 a 18:00», cuando `/clinica` dice de lunes a viernes de 08:00 a 20:00 y el sábado de 08:00 a 13:00. Todo dato de horario o sede debe salir de `/clinica` y `/sedes`.
   - **Paciente creado por la IA:** guardar la fecha de nacimiento (o, al menos, el año estimado por la edad que dio) y el celular en 9 dígitos. Hoy la ficha no se puede guardar hasta completar la fecha.
   - **Link `283a9eba…`:** sigue «pagado» con `admin|S00000` desde la prueba de R25; dejarlo «anulado».
112. Detalles de la IA de WhatsApp (revisión 27):
   - **No trabarse al recibir los datos:** en 1 de 2 conversaciones nuevas, después de pedir nombre y DNI, la IA respondió «Puedo ayudarle a agendar una cita o consultarle precios. ¿Qué necesita?» a cada mensaje (con los datos, con «Sí, confirmo» y con nombre y DNI solos). La conversación quedó en `S7_DATOS` sin crear paciente ni reserva (chat 51900000989, 18/10 19:16–19:18). Con `datoPendiente: dni_celular`, un mensaje con nombre y DNI debe ir siempre a `agendar`.
   - **Hora de vencimiento:** con `estado_pago` dijo «el link vence a las 05:00 (hora de Lima)» para un link que vence a las 19:48. Usar el `caducaEn` del link convertido a hora de Lima, igual que el mensaje del link.
   - **Fechas para el paciente:** «jueves 10/12», no «2026-12-10».
   - **Horario de atención:** a «¿Cuál es su horario de atención?» responder con el horario de `/clinica` (lunes a viernes de 08:00 a 20:00, sábado de 08:00 a 13:00), no con cupos.
113. Retroceso del agendamiento por WhatsApp (revisión 28):
   - **«¿Qué horarios hay?» con día y especialidad pide cupos, no el horario de atención.** Hoy la palabra «horarios» activa la respuesta de horario de atención (`catalogo`) en 3 de 3 chats nuevos. El horario de atención va solo cuando la pregunta es por la atención en general («¿cuál es su horario de atención?», «¿a qué hora abren?»).
   - **Paciente nuevo:** al recibir nombre y DNI, `agendar` responde «No pude reservar ese horario ahora» (2 de 2, 18/10 22:57–23:00, cupos libres). Debe crear el paciente, la reserva y el link.
   - **Paciente registrado:** ofrecer cupos del día que pidió (pidió el 17/12 y la IA ofreció el 10/12, la fecha de su cita anterior). Antes de crear el link, mostrar el resumen y pedir confirmación, como con un paciente nuevo. Hoy al elegir la hora creó el link del 10/12 sin preguntar.
   - **«Ya pagué» con una cita pagada y un link pendiente:** mencionar los dos.
114. Cierre del agendamiento por WhatsApp (revisión 29):
   - **Funciona de punta a punta** con pacientes nuevos (3 de 3). Con pacientes registrados ofrece el día pedido, y «ya pagué» informa cita y link pendiente con la hora correcta.
   - **Pendiente menor:** con un paciente registrado, mostrar el resumen y pedir «sí, confirmo» antes de enviar el link, igual que con un paciente nuevo.
   - **Para salir en vivo falta cargar los datos reales** (requisito 106):
     - empresa y RUC;
     - sedes Miraflores y Los Olivos, con el WhatsApp actual en Miraflores;
     - los 242 servicios con precio y pago al doctor por sede.
115. Cancelar y cambiar citas por WhatsApp (revisión 30):
   - **No confirmar lo que no pasó.** Ante «Quiero cancelar mi cita del jueves 17 de diciembre», la IA (`cancelar_cita`) respondió «ha sido cancelada exitosamente», pero la cita pagada `13aef5ec…` siguió confirmada, con su cobro y sin registro en la auditoría.
   - **Decisión pendiente** sobre citas pagadas: la propuesta del QA es que la IA no cancele ni mueva citas pagadas y derive a recepción con un mensaje claro. Si se decide que la IA cancela, debe:
     - cambiar el estado de la cita;
     - dejar el importe a favor, como promete el mensaje del link;
     - registrarlo en la auditoría;
     - avisar a recepción.
   - **Cambiar una cita:** «Quiero cambiar mi cita del 17 al 18 a las 11:30» se trató como una reserva nueva con otro pago. Debe reconocer la cita existente, mencionar el link pendiente si lo hay y, al no poder, explicar por qué; no responder «No pude completar la reserva ahora».
116. Derivar a recepción por WhatsApp (revisión 31):
   - **Decisión adoptada:** la IA no cancela ni mueve citas pagadas; deriva a recepción y la cita queda intacta.
   - **La derivación tiene que llegar a recepción.** Hoy la IA dice «recepción le escribirá por aquí en breve», pero el chat sigue en modo IA, con 0 mensajes por responder, sin notificación ni nota del pedido. Al derivar:
     - el chat pasa a modo recepción, como con «Tomar control»: aparece en el filtro «Recepción» de la bandeja y la IA deja de responder;
     - el pedido queda escrito donde recepción lo vea: qué cita, y qué fecha nueva si es un cambio.
   - **Ningún texto interno llega al paciente.** Hoy salió «No diga que se canceló una cita.» al final de una respuesta.
   - **Reserva sin pagar:** no hace falta recepción. La IA anula su propio link o dice que el cupo se libera solo a la hora de vencimiento.
   - **Cambio de cita con cualquier frase** («cambiar», «reprogramar», «pasar», «mover»): reconocer la cita pagada y no ofrecer cupos de una cita nueva.
   - **Fecha equivocada:** si el paciente nombra un día en que no tiene cita, decirle qué cita sí tiene; no responder «No encontramos una cita activa».
