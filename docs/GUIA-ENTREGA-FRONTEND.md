# Dento Check: entrega del frontend, cambios de backend y QA en producción

Fecha: 02/10/2026 · Rama: `claude/laughing-edison-3rr5w6` · PR: https://github.com/InnoteamGH/Prueba/pull/1

Este documento es para dos personas:

1. **El programador**, que actualiza el frontend y ajusta el backend (secciones 1 a 4).
2. **Quien hace QA** en la plataforma real (secciones 5 y 6).

El detalle completo de cada endpoint y campo está en `requisitos-minimos.md`, que se entrega junto con este documento. Aquí solo va lo necesario para la primera prueba en producción y el orden en que conviene hacerlo.

---

## 1. Qué se entrega

| Archivo | Qué es |
|---|---|
| `frontend.zip` | La carpeta `frontend/` completa (código fuente, `package.json`, `package-lock.json`, `public/`, `vercel.json`). No incluye `node_modules` ni compilados. |
| `GUIA-ENTREGA-FRONTEND.md` | Este documento. |
| `requisitos-minimos.md` | La lista de cambios de backend, punto por punto (del 1 al 46). |

El backend (Spring Boot) no se toca desde este repositorio. Todo lo que el backend tiene que cambiar está descrito en la sección 3 y en `requisitos-minimos.md`.

---

## 2. Cómo actualizar el frontend (programador)

### 2.1 Requisitos
- Node 18 o superior (se probó con Node 22).
- Variable `VITE_API_URL` con la URL del backend, incluyendo `/api`. Por ejemplo: `https://<backend>.up.railway.app/api`.

### 2.2 Pasos
```bash
# 1. Respaldar la versión que está hoy en producción (por si hay que volver atrás).
# 2. Reemplazar la carpeta frontend/ por la del ZIP.
cd frontend
npm ci                      # instala exactamente las versiones del package-lock.json
echo "VITE_API_URL=https://<backend>/api" > .env.production
npm run build               # genera dist/
npm test                    # 116 pasan; fallan 3 que ya fallaban antes (ver 2.4)
```
Publicar `dist/` como hoy. Si se usa Vercel, `vercel.json` ya trae la redirección de la SPA. La app navega por `#/ruta`, así que no hace falta configurar rutas en el servidor.

### 2.3 Importante para producción
- **No definir `VITE_DEMO`** en producción. Con `VITE_DEMO=1` aparecen los accesos de demostración (`npm run build:demo` es solo para mostrar la maqueta).
- **Caché:** `index.html` no debe quedar en caché. Los JS y CSS llevan hash en el nombre, así que sí pueden cachearse.
- **Datos de demostración:** se guardan en `localStorage` con el prefijo `dc_data_` y se borran al iniciar sesión con un usuario real. No mezclan datos con el servidor.
- **Navegador:** la app se probó en Chrome y Edge, en escritorio (1440 px) y en celular (390 px).

### 2.4 Pruebas automáticas
`npm test` da 116 pruebas que pasan y 3 que fallan. Las 3 fallaban antes de este trabajo y no dependen de él:
- una exige `w: "148px"` en Pacientes;
- otra busca una migración en `supabase/migrations`;
- otra busca la imagen `odontograma.png` en el pie del PDF.

---

## 3. Cambios de backend necesarios, en orden de prioridad

### 3.0 Lo que hay que saber antes: todo va por sede
La clínica tiene varias sedes, y casi todo pertenece a una: citas, cajas, cobros, egresos, insumos, precios, metas, etc.

**Reglas que el frontend ya aplica y que el backend debe aplicar igual:**

1. **El usuario trae sus sedes.**
   - El login y el JWT devuelven siempre `sedes` (lista de UUID) y `sedeId` (la principal).
   - Solo los roles de toda la clínica (administrador general, gerencia y TI) pueden ver todas las sedes.
   - Si a un usuario de sede no le llegan sedes, el frontend no le muestra nada y avisa «Tu usuario no tiene sede asignada».
2. **El filtro de sede.** El frontend manda `sedeIds=<uuid>,<uuid>` en los listados. El servidor debe cruzarlo siempre con las sedes del token y nunca devolver una sede ajena.
3. **Cada registro guarda `sedeId`:** cita, paciente (`sedeRegistroId`), pago, egreso, apertura y cierre de caja, ítem del plan de tratamiento, receta, evolución, radiografía y foto, bloqueo de agenda, etc.
4. **El precio depende de la sede.** Cada servicio tiene `precio` (base) y `preciosSede: { <sedeId>: monto }`. El cobro y la producción usan el precio de la sede donde se atiende.
5. **Cada sede tiene su caja.**
   - Con varias sedes, el **administrador general solo supervisa**: ve todas las cajas, pero no abre ni cobra ni emite.
   - Abren caja, cobran y emiten comprobantes el **administrador de sede** y **recepción** de esa sede.
   - Con una sola sede, el administrador general también opera la caja.
   - El backend debe rechazar pagos de un usuario en una sede que no es suya.

### 3.1 Imprescindible para la prueba de recepción y doctor

Cada bloque dice qué llama el frontend y qué espera. **Negrita = campo o parámetro nuevo o que el backend debe empezar a respetar.**

**Sesión**
- `POST /auth/login` → `{ token, rol, nombre, sedeId, `**`sedes: [uuid]`**`, permisos }`.
- El JWT incluye el claim **`sedes`**.

**Agenda y apertura de historia clínica (recepción)**
- **Pacientes:**
  - `GET /pacientes` debe filtrar por las sedes del token y devolver **`sedeRegistroId`**.
  - `POST /pacientes` → `{ nombre, dni, telefono, email, fechaNacimiento, genero, distrito, canal, aseguradora, marketing, comentario, tags, `**`sedeRegistroId`**` }`.
- **Citas:**
  - `GET /citas?fecha=` o `?desde=&hasta=`, más **`&sedeIds=`**.
  - `POST /citas` → `{ pacienteId, especialidadId, medicoId, `**`sedeId`**`, fecha, hora, duracionMin, sillon, motivo, canalOrigen, estado }`.
  - `PUT /citas/{id}` (reprogramar).
  - `PATCH /citas/{id}/estado?estado=&motivo=` (confirmar, cancelar, no asistió).
  - `PATCH /citas/{id}/checkin` (llegada).
- **Bloqueos:** `GET/POST/DELETE /bloqueos`. Los bloqueos de toda la agenda o de un doctor llevan **`sedeId`** y solo valen en esa sede.
- **Horario del doctor:** `PUT /disponibilidad/mi`, cada bloque con **`sedeId`** (un doctor puede atender en la mañana en una sede y en la tarde en otra).
- **Validar al crear o mover una cita:**
  - que el doctor atienda en esa sede y a esa hora;
  - que el sillón sea de esa sede;
  - que no haya cruces del doctor ni del paciente, también en la otra sede.

**Recordatorios** (dependen de tener WhatsApp conectado)
- `GET /automatizaciones`.
- `PUT /automatizaciones/{clave}` debe actualizar **solo esa** automatización (recibe `activo`, `plantilla`, `hsmNombre`, `hsmIdioma`). Si reemplazara toda la configuración, apagar una apagaría las demás.
- `GET /automatizaciones/historial?`**`sedeIds=`**.
- `GET /automatizaciones/recall-pendientes?`**`sedeIds=`**.
- `POST /automatizaciones/recall/{pacienteId}`.
- Para enviar fuera de la ventana de 24 h, las plantillas HSM deben estar aprobadas en Meta.

**WhatsApp** (depende de la integración con el proveedor)
- `GET /conversaciones`.
- `GET/POST /conversaciones/{id}/mensajes`.
- `PATCH /conversaciones/{id}/modo?modo=ia|humano`.
- Agendar desde el chat usa el mismo `POST /citas`, con la sede activa del usuario.
- La tarjeta del paciente no muestra datos de pacientes de otra sede. Para eso el backend debe devolver `pacienteId` y la sede en cada conversación.

**Caja (recepción o administrador de sede)**
- **Apertura:**
  - `GET /caja/apertura?sedeId=&fecha=`.
  - `POST /caja/apertura` → `{ sedeId, fondo, `**`fondoUsd`**`, nota, fecha, destinosActivos }`.
  - Una apertura por sede y por día.
- **Caja del día:** `GET /caja?`**`sedeIds=`** → `porCobrar[]`, terminados, cobros de hoy, `montoHoy` y `montoPorCobrar`, solo de esas sedes y con `sedeId` en cada fila.
- **Cobro:**
  - `POST /pagos` → `{ pacienteId, sedeId, concepto, monto, metodo, descuento, faseIds?, `**`moneda: "PEN"|"USD"`**`, `**`montoOriginal`**`, `**`tipoCambio`**` }`, con el encabezado `Idempotency-Key`.
  - El servidor exige que la caja de esa sede esté abierta.
- **Egresos:**
  - `POST /egresos` → `{ fecha, `**`sedeId`**`, concepto, categoria, monto, metodo, `**`moneda`**` }`.
  - `GET /egresos?`**`sedeIds=`**.
  - `PUT /egresos/{id}` para reclasificar la categoría.
  - Categorías que usa el frontend: Insumos, Laboratorio, Alquiler, Servicios (luz/agua), Planilla, Marketing, Equipos, Otros.
- **Cierre:**
  - `GET /pagos/cierre?fecha=&`**`sedeIds=`** devuelve los totales por método y moneda.
  - `POST /caja/apertura/{id}/cerrar` → `{ efectivoContado, efectivoEsperado, `**`efectivoContadoUsd`**`, `**`efectivoEsperadoUsd`**`, justificacion }`.
- **Historial:** `GET /caja/apertura/historial` con la sede.
- **Tipo de cambio:** `GET/PUT /tipo-cambio`.

**Consolidado de citas** (recepción y doctor)
- `GET /citas?desde=&hasta=&`**`sedeIds=`**.
- El doctor solo debe recibir sus citas (el servidor lo filtra por rol).

**Historia clínica, odontograma evolutivo y presupuesto (doctor)**
- `GET /pacientes/{id}/ficha360`. Debe responder **403** si el paciente no es de las sedes del usuario.
- **Odontograma por fase:**
  - `GET /odontograma?pacienteId=&fase=inicial|evolucion|alta`.
  - `PUT /odontograma` (pieza con su fase).
  - `GET /odontograma/toma-hash`.
  - La ficha muestra la foto de cada fase.
- **Presupuesto:**
  - `POST /tratamientos/desde-odontograma?pacienteId=`, **con la sede de atención**.
  - O bien `POST /tratamientos` y `POST /tratamientos/{plan}/fases` → `{ servicioId, pieza, cara, `**`precio`**` (el de la sede), `**`sedeId`**` }`.
  - `POST /planes` (plan de inversión imprimible) con **`sedeId`**.
- **Evolución:** `POST /historia` → `{ pacienteId, `**`sedeId`**`, titulo, diagnostico/CIE-10, detalle, signosVitales, medicoId }`.
- **Radiografía y foto:**
  - `POST /radiografias` (y `/fotos`) → `{ pacienteId, `**`sedeId`**`, tipo, fecha, url, nota, piezas, vista, momento }`.
  - `GET /radiografias?pacienteId=` devuelve **`sedeId`**.
  - El archivo debe quedar guardado (URL permanente).
- **Receta:** `POST /recetas` → `{ pacienteId, `**`sedeId`**`, fecha, indicaciones, items }`.
- **Tratamiento terminado → pago automático:**
  1. `PATCH /tratamientos/fases/{id}` → `{ estado: "terminada", terminadaEn }`.
  2. Desde ese momento, la fase debe aparecer en `GET /caja` (`porCobrar`) **de la sede del ítem**, con el precio de esa sede.
  3. Cuando recepción cobra, la fase pasa a `atendida` (pagada).

### 3.2 Necesario poco después (no bloquea la primera prueba)
- **Metas y comisiones por sede** (punto 42): `metasSede` por doctor y `PUT /medicos/{id}/metas/{sedeId}`.
- **Reportes con `sedeIds`:**
  - `/comisiones`, `/gerencial/*` y `/mi-produccion` (el frontend ya lo envía);
  - `/pacientes/resumen`, `/tratamientos/resumen`, `/inventario`, `/ordenes-compra`, `/espera`, `/resenas`, `/laboratorio` y `/seguros`.
- **Inventario por sede:** cada sede tiene su almacén, y el consumo descuenta de la sede del procedimiento.
- **Permisos del administrador de sede** (punto 46). El servidor debe rechazar que:
  - cambie el plan o el precio base;
  - cree o borre servicios;
  - edite datos globales de la clínica;
  - opere en una sede ajena.
- **Facturación electrónica:**
  - serie por sede;
  - `GET /facturacion-electronica/comprobantes?sedeIds=`, que devuelva `sedeId`.

### 3.3 Limitación conocida del frontend (a resolver con el backend)
Con sesión iniciada, el frontend traduce el UUID de sede a 1 o 2, que es la regla que ya usaba el login. Con **más de dos sedes reales**, la tercera se confunde con la primera en los filtros de pantalla. Mientras tanto, el servidor debe filtrar por sede: con eso, el dato de otra sede no llega aunque el filtro de pantalla falle. La solución definitiva es que el login devuelva los UUID y el frontend los use tal cual (cambio pequeño, a coordinar).

---

## 4. Roles y quién hace qué

| Rol | Ve | Opera |
|---|---|---|
| Administrador general | Todas las sedes, con el filtro del menú | Configuración, usuarios, precios base, metas y plan. **No abre caja ni cobra si hay varias sedes**: supervisa. |
| Administrador de sede | Solo su sede | Caja (abrir, cobrar, egresos, cierre), agenda, pacientes, precios y horario de su sede, metas de su sede |
| Recepción | Solo su sede | Agenda, pacientes (apertura de historia), recordatorios, WhatsApp, caja (abrir, cobrar, cierre), consolidado |
| Doctor | Sus sedes y sus citas | Historia clínica, odontograma, presupuesto, evolución, radiografía y foto, receta, terminar tratamientos, consolidado de sus citas |
| Gerencia | Su sede o todas | Reportes y panel (solo lectura; puede fijar metas) |

---

## 5. Checklist de QA en la plataforma real

Preparación:
- Dos sedes con horario.
- Un usuario por rol: recepción en la sede A, doctor en A y B, administrador de sede en B y administrador general.
- Catálogo con al menos un servicio con precio distinto en cada sede.
- Tipo de cambio cargado.

Marcar ✅ o ❌ y anotar el detalle.

### 5.1 Recepcionista (sede A)
| # | Prueba | Resultado esperado |
|---|---|---|
| R1 | Entrar con el usuario de recepción | El menú muestra la sede A fija (sin selector); Inicio muestra solo datos de A |
| R2 | Pacientes › Nuevo paciente (DNI, nombre, teléfono, nacimiento) | Se crea en la sede A y se abre su historia clínica; aparece en el directorio |
| R3 | Agenda › Agendar cita a ese paciente (servicio, doctor, fecha, hora) | Solo ofrece la sede A y sus doctores. Muestra el precio de la sede A. La cita aparece en Día y en Semana |
| R4 | Agendar a un paciente nuevo desde el mismo modal | Se registra el paciente en la sede A y la cita queda creada |
| R5 | Intentar agendar al doctor fuera de su horario o en un sillón ocupado | Bloquea con un mensaje claro |
| R6 | Confirmar, marcar llegada, reprogramar (arrastrando en el calendario) y cancelar con motivo | Cada cambio de estado se refleja; al cancelar ofrece el cupo a la lista de espera de la sede A |
| R7 | Vistas Semana / Mes / Por doctor / Por sillón | Solo sillones, doctores y citas de A |
| R8 | Recordatorios: apagar uno y volver a entrar | Solo ese queda apagado; los demás siguen igual |
| R9 | Recordatorios: pendientes por reactivar e historial | Solo pacientes de A |
| R10 | WhatsApp: abrir un chat, responder y agendar desde el chat | El mensaje sale; la cita se crea en la sede A |
| R11 | Caja › Abrir caja con fondo en soles y en dólares | Caja abierta de la sede A, con la hora |
| R12 | Cobrar en soles a un paciente con un tratamiento terminado | Baja «Por cobrar», sube «Cobrado hoy» y se emite el comprobante (serie de la sede A) |
| R13 | Cobrar en dólares (si aplica) | Se registra en USD con el tipo de cambio; en soles cuenta como el equivalente |
| R14 | Registrar un egreso en cada categoría, uno en dólares | Aparecen en Ingresos y egresos de A con su categoría y moneda; se puede reclasificar |
| R15 | Cerrar caja: contar el efectivo en soles y en dólares | Muestra esperado vs contado y la diferencia; pide justificación si hay diferencia; queda en Historial |
| R16 | Consolidado de citas: día, semana y mes, filtro por doctor o estado, y exportar | Totales correctos, solo de A; el Excel coincide con la pantalla |
| R17 | Escribir en la URL la ficha de un paciente que es solo de la sede B | No se abre («no se atiende en la sede elegida») |

### 5.2 Doctor (sedes A y B)
| # | Prueba | Resultado esperado |
|---|---|---|
| D1 | Entrar con el usuario del doctor; Agenda | Solo sus citas; puede elegir la sede A, la B o ambas en el menú |
| D2 | Iniciar la atención de una cita de hoy | Abre la historia clínica del paciente |
| D3 | Historia clínica: datos, alergias, antecedentes y pestañas | Carga todo, sin errores |
| D4 | Odontograma › fase inicial: marcar hallazgos y guardar | Al volver a entrar se ve exactamente lo guardado (sin dibujos de ejemplo) |
| D5 | Pasar a las fases evolución y alta, y guardar | En la ficha, «Evolución visual» muestra las 3 fotos por fase y la tabla de hallazgos |
| D6 | Generar presupuesto desde el odontograma | Aparece en Plan y cuenta con el precio de la sede de atención; el plan de inversión imprime los mismos importes |
| D7 | Escribir una evolución con CIE-10 y firmar | Queda en la historia con fecha, doctor y sede |
| D8 | Subir una radiografía y una foto (antes/después) | Se ven en la ficha › Archivos; al recargar siguen ahí |
| D9 | Emitir una receta y descargarla en PDF | El PDF tiene el membrete de la sede, los datos del doctor y del paciente |
| D10 | Marcar un procedimiento como terminado | Aviso «el cobro ya está en Caja» |
| D11 | Entrar como recepción de esa sede › Caja | El paciente aparece en «Por cobrar» con el monto de la sede; se cobra y el plan queda pagado |
| D12 | Consolidado de citas del doctor | Solo sus citas, con totales por estado |

### 5.3 Controles de sede (para todos)
| # | Prueba | Resultado esperado |
|---|---|---|
| S1 | Administrador de sede B: recorrer Inicio, Agenda, Pacientes, Caja, Inventario y Reportes | Nunca aparece nada de la sede A |
| S2 | Administrador general con «Todas» y luego con la sede A elegida | Con A elegida, todo se limita a A; con «Todas», suma ambas |
| S3 | Administrador general en Caja (clínica con 2 sedes) | Ve los saldos de todas, pero no puede abrir caja, cobrar ni anular comprobantes |
| S4 | Servicio con precio distinto por sede: cobrarlo en A y en B | Cada sede cobra su precio |
| S5 | Llamar a la API con el token de recepción A pidiendo `sedeIds=<B>` | El servidor no devuelve datos de B |

---

## 6. Resultado del QA en la demostración (antes de producción)

Se probó en la demostración (sin backend) con Playwright, con los perfiles de recepción y de doctor. Los resultados están en la sección 6.1.
