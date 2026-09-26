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

---

## 5. Lista de cambios de backend

1. `POST /caja/apertura`: aceptar y devolver `fondoUsd`.
2. `POST /caja/apertura/:id/cerrar`: aceptar `efectivoContadoUsd` y `efectivoEsperadoUsd`.
3. `POST /pagos`: aceptar `moneda`, `montoOriginal`, `tipoCambio` y `faseIds[]`. Con `faseIds`, pasar esas fases a `atendida`.
4. `GET /caja`: devolver `boletasHoy[].moneda/montoOriginal` y `terminados[]`.
5. `GET /pagos/cierre`: opcional, `usd.efectivo`.
6. `POST /egresos` y `GET /egresos`: campo `moneda`. Nuevo `PUT /egresos/:id`.
7. `PATCH /tratamientos/fases/:id`: aceptar el estado `"terminada"` y `terminadaEn`. Una fase terminada sigue contando como saldo hasta que se cobra.
