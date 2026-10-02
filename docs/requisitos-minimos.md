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
30. WhatsApp (WSP-02): al proponer un cupo, la IA crea un link de pago y la cita se registra solo cuando el link figura `pagado` (webhook de la pasarela).
31. Doctores (NAV-07, CFG-02): meta mensual y `porcentajeComision` en la ficha del doctor, que es un usuario con perfil clínico (un doctor = un usuario).
32. Reseñas (SAT-01/04): separar la encuesta interna (NPS 0–10) de las reseñas públicas (1–5) y devolver el `origen` de cada reseña (`google` o `portal`).
33. Precio por sede (pedido del cliente): cada servicio del catálogo guarda `preciosSede: { [sedeId]: monto }` además del precio base. Sin precio propio, la sede cobra el base. La cita guarda el `precio` de la sede donde se atiende y los ítems del presupuesto toman el precio de la sede del paciente (o de la sede elegida). `GET/PUT /especialidades` (alias `/servicios`) deben aceptar y devolver `preciosSede`.
34. Metas y comisiones (pedido del cliente): por doctor, `metaMensual`, `porcentajeComision`, producción del mes (`prodMes`) y citas atendidas (`citasMes`) en `GET /catalogo/medicos`. La comisión del mes es producción × %, y la pantalla muestra cuánto falta para la meta y cuánta comisión suma alcanzarla.
35. Odontograma (pedido del cliente): `GET /odontograma/:pacienteId?fase=` ya existe; la ficha abre la fase más reciente con marcas (alta › evolución › inicial). Conviene un `GET /odontograma/:pacienteId/ultima-fase` para evitar dos consultas.
36. IGV en el catálogo (pedido del cliente): el precio del servicio es el total con IGV (18 %), como en Caja. El frontend muestra el desglose (valor de venta = total / 1.18, IGV = total − valor de venta) y permite ingresar el precio con o sin IGV. Si alguna clínica tiene servicios exonerados o inafectos, el backend debería guardar `afectacionIgv` (`gravado`, `exonerado`, `inafecto`) por servicio; hoy todos se tratan como gravados.
37. Comisión editable (pedido del cliente): `PUT /medicos/:id` debe aceptar `porcentajeComision` (0–100). Se edita en Reportes › Metas y comisiones y en Configuración › Doctores.
38. Más reportes (Reportes › Más reportes): con sesión el servidor debería entregarlos ya calculados para un periodo `desde/hasta`: `GET /reportes/procedimientos` (servicio, cantidad, importe), `GET /reportes/pacientes-con-saldo` (hecho sin pagar, vencido, días sin pagar, saldo del plan), `GET /reportes/por-recuperar` (última visita, meses sin venir, teléfono), `GET /reportes/pacientes-mes` (atendidos, nuevos, recurrentes por mes) y `GET /reportes/caja` (cobros por medio de pago y egresos por categoría). Hoy el frontend los calcula con lo que tiene cargado.
39. Navegación con paciente: «Abrir en Periodontograma» desde la ficha lleva al módulo con el paciente elegido; no requiere backend.
