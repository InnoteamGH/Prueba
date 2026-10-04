# QA en producción: Dento Check (04/10/2026)

**Qué se probó:** el frontend nuevo (rama `claude/laughing-edison-3rr5w6`, el mismo código del ZIP) conectado al **backend real de producción** (`https://o6xu3m6s78.execute-api.us-east-1.amazonaws.com/api`).
- Para comparar se usó la versión desplegada en `https://clidental.qowin.solutions`.
- Usuarios de `USUARIOS-ROLES-DEMO.md`: recepción, doctoras, administrador general, administrador de sede, gerencia y TI.
- Se recorrieron todas las pantallas y los botones de cada perfil con un navegador automatizado.

**Datos de prueba que se crearon:** todos llevan «QA» en el nombre y DNI que empieza con 99. Su lista está en la sección 5.

**Resumen para el programador:**
- **Sección 1, bloqueantes del backend:** corregir primero.
- **Sección 2, importantes del backend:** fugas entre sedes, permisos, rutas que faltan y campos que se pierden.
- **Sección 3, datos de la clínica:** completar o corregir en la base.
- **Sección 4, hallazgos del frontend:** los resolvemos nosotros en el ZIP; el programador solo despliega y vuelve a probar.
- **Sección 5, registros de prueba:** limpiar al final.

---

## 1. Bloqueantes del backend

| # | Problema | Cómo se reproduce | Qué hay que hacer |
|---|---|---|---|
| B1 | **En `app.odontosonrisa.biz` nadie puede iniciar sesión** | El *preflight* CORS desde `https://app.odontosonrisa.biz` no devuelve `Access-Control-Allow-Origin`. Desde `clidental.qowin.solutions` sí lo devuelve. | Agregar `https://app.odontosonrisa.biz` a los orígenes CORS (API Gateway o backend), con los mismos métodos y cabeceras: `authorization, content-type, idempotency-key, x-requested-with`. |
| B2 | **`GET /pacientes` no devuelve los pacientes creados después del 01/09** | `POST /pacientes` responde 200 y `GET /pacientes/{id}` funciona, pero el listado no los incluye (recepción ve 19, el administrador 30). Sí salen en `/pacientes/resumen` y en `/pacientes/resumen-financiero`. `GET /caja` → `porCobrar` también los omite. | Revisar el filtro del listado. Probablemente no se guarda el vínculo paciente–sede (`sedeRegistroId` / `sedeIds`) al crear, o el filtro por sede del usuario lo excluye. |
| B3 | **`PATCH /citas/{id}/estado` responde 500 con cualquier estado y rol** | Confirmar, cancelar, no asistió, pasar a sillón y finalizar fallan con «Ocurrió un error inesperado». Con un id inexistente responde 404, que es lo correcto. | Revisar el log del servidor. Afecta a toda la operación de la agenda. |
| B4 | **`PATCH /tratamientos/fases/{id}` responde 500 siempre** | Pasa con cualquier cuerpo y rol, incluso con un id inexistente (debería ser 404). | Revisar. Sin esto no se puede «Terminar» un procedimiento ni se genera el cobro automático en Caja. |
| B5 | **`POST /bloqueos` responde 500 siempre** | Pasa con `sede` o `sedeId`, sillón o médico, y también como administrador. | Revisar. Aceptar `{fecha, horaInicio, horaFin, sedeId, medicoId?, sillon?, diaSemana?, motivo}`. |
| B6 | **`POST /seguros` responde 500** | Pasa incluso con el cuerpo mínimo `{pacienteId, aseguradora, monto}`. | Revisar. |
| B7 | **La doctora no puede operar su agenda** | `PATCH /citas/{id}/estado`, `PATCH /citas/{id}/checkin` y `POST /bloqueos` responden 403 («No tienes permiso para editar en agenda»). | Permitir al rol médico cambiar el estado de **sus** citas y crear bloqueos de **su** horario (`medicoId` propio), o darle `agenda:editar`. |
| B8 | **`/clinica/impresion` devuelve datos de otra empresa** | Devuelve «ODONTOSONRISA MEDICAL», RUC 20612478636, la web odontosonrisa.pe, una sede «Los Olivos» y un descuento del 10 % activo. En cambio `/clinica` dice «Clínica Dental Sonríe+», RUC 20123456789. | Que `/clinica/impresion` devuelva los datos reales de `/clinica` y de cada sede. Con estos datos se imprimen boletas, recetas, presupuestos y arqueos. |
| B9 | **No se guarda el % de comisión de un doctor** | `PUT /medicos/{id}` responde 404 («Unable to find matching target resource method»). La meta sí se guarda con `PUT /medicos/{id}/meta`. | Implementar `PUT /medicos/{id}` (datos y `porcentajeComision`) o `PUT /medicos/{id}/metas/{sedeId}`. |

## 2. Importantes del backend

### 2.1 Fugas entre sedes
El frontend ya filtra en pantalla, pero la API entrega los datos igual.

- **Lectura por id sin control de sede:** con `ana@sonrie.pe` (Surco) se leen pacientes de San Isidro por id con `/pacientes/{id}`, `/ficha360`, `/historia`, `/recetas`, `/radiografias`, `/odontograma` y `/periodontograma`. Hay que validar que la sede del paciente esté entre las del token.
- **Listados que ignoran `sedeIds`:** `/gerencial/kpis`, `/gerencial/indicadores`, `/comisiones`, `/resenas`, `/pagos/historial`, `/egresos`, `/alertas/evoluciones-pendientes`, `/disponibilidad` y `/laboratorio` (este último, a la doctora de Surco).
- **`/conversaciones`:** devuelve los mismos chats a todas las sedes. Hay que filtrar por la sede del paciente o del número.
- **`GET /sillones` sin `sedeId`:** a recepción de Surco le devuelve los sillones de San Isidro. Hay que filtrar por las sedes del token. El frontend ya pide los sillones por sede.

### 2.2 Permisos de lectura que faltan
Con el error 403, el frontend ahora muestra «sin permiso» en lugar de vacío, pero la función queda incompleta.

- **Recepción:**
  - `/clinica/impresion`, para imprimir boletas y recetas;
  - `/tipo-cambio`, para cobrar en dólares;
  - `/egresos`, para la caja del día;
  - `/tratamientos`, para Plan y cuenta;
  - `/laboratorio`, `/consentimientos`, `/radiografias` y `/auditoria`.
- **Administrador de sede:** `/consentimientos`, `/tratamientos/resumen` y `/usuarios` de su sede.
- **Gerencia:** `/egresos`, `/tipo-cambio` y `/usuarios` (solo lectura).
- **TI:** `/whatsapp/salud` y `/sillones`.
- **Médico:** `/auditoria?pacienteId`, el registro de actividad de la historia que atiende.

### 2.3 Rutas que no existen (404/405)
- `GET /sillones/asignaciones`: turnos de doctor por sillón, para la vista «Por sillón» y la ocupación.
- `GET /facturacion-electronica/config` y `GET /facturacion-electronica/comprobantes`.
- `GET /disponibilidad/mi` responde 405.

### 2.4 Campos que el servidor descarta o no devuelve
- `POST /tratamientos/{id}/fases` descarta `cara`.
- `/radiografias` descarta `piezas`; en fotos descarta `vista` y `momento`.
- `POST /laboratorio` no guarda `sedeId`.
- `/medicos` no devuelve `sedes[]` ni el nombre de la especialidad. Sin las sedes, Metas por sede no puede filtrar.
- `/pacientes/resumen` incluye pacientes archivados (40 frente a 30).
- Las imágenes se guardan como data-URL base64 en la base. Conviene subirlas a almacenamiento y guardar la URL.
- El login de un usuario con clave temporal no obliga a cambiarla (falta `debeCambiarClave`). El campo «usuario» no se guarda.
- El estado `cerrada_sistema` aparece como `no_show` en `/ficha360`. Hay que unificarlo.
- `PATCH /citas/{id}/checkin` acepta citas futuras.
- `PUT /automatizaciones/{clave}` acepta una plantilla vacía. El frontend ya lo impide.

## 3. Datos de la clínica que hay que completar o corregir

1. **Cajas abiertas de pruebas anteriores:** San Isidro 03/09 («smoke») y Surco 03/09 y 04/09 («PRUEBA QA»). Mientras sigan abiertas, ninguna sede puede abrir la caja de hoy, cobrar ni registrar egresos. Hay que cerrarlas (las cierra quien las abrió o un administrador). Después hay que repetir el QA de Caja: apertura en soles y dólares, cobro y boleta, tipo de cambio, egresos, cierre por moneda y reapertura.
2. **Catálogo de servicios:**
   - solo tiene 5 servicios;
   - ninguno tiene `hallazgos` (para «pasar al presupuesto» desde el odontograma);
   - ninguno tiene `preciosSede`, así que San Isidro y Surco cobran el precio base;
   - no hay servicios periodontales (códigos IHO, PRO, RAR, REE, CIR, FUR, FER y MAN), por eso la proforma periodontal sale en S/ 0.
3. **Disponibilidad de la Dra. Carla:** tiene lunes a miércoles en Surco, aunque su usuario es solo de San Isidro. Por eso recepción ve «no atiende en esta sede los lunes».
4. **Sillones:** según la API sin filtro, Surco no tiene sillones; con `?sedeId` de Surco devuelve 4. Hay que confirmar los sillones de cada sede y corregir el filtro (2.1).
5. **Insumos sin sede:** aparecen iguales en las dos sedes.
6. **RUC 20123456789:** no existe en SUNAT. Hay que poner el RUC real con dígito verificador válido.
7. **Dirección para el asistente de WhatsApp:** da «Av. Javier Prado 1540», distinta de la registrada (Av. Conquistadores 145).
8. **Datos que no cuadran:**
   - Puesta en marcha dice «14 servicios», pero Servicios lista 5.
   - Plan dice «4 odontólogos», pero el catálogo tiene 6.
   - Hay un usuario ajeno «T» (t2@t.pe), inactivo.
   - El 01/09 a las 09:00 hay dos pacientes en el mismo sillón 3.

## 4. Hallazgos del frontend

El frontend está en el ZIP (`frontend.zip`, rama `claude/laughing-edison-3rr5w6`). En la columna Estado:
- **Corregido** = ya está en el ZIP.
- **En corrección** = lo estamos arreglando y entra en la próxima entrega del ZIP.

El programador **no** necesita tocar estos puntos. Solo debe desplegar el ZIP y volver a probarlos.

| # | Hallazgo | Estado |
|---|---|---|
| F1 | El horario del servidor (`lunes`…`domingo`, `activo`) no se reconocía. Configuración mostraba 09–19 inventado y al guardar lo sobrescribía; la agenda decía «sin horario» e iba de 06 a 22. | Corregido (se traduce al leer y al guardar) |
| F2 | El odontograma perdía al recargar las marcas de pieza completa (corona + extracción) y el color por hacer / realizado. | Corregido |
| F3 | Con una sede elegida, el Inicio mostraba deudores y evoluciones de toda la clínica. | Corregido (filtra por sede y recarga al cambiar de sede) |
| F4 | Integraciones marcaba OpenAI como pendiente estando activa (`iaReal`). | Corregido |
| F5 | Al crear un paciente que el listado no devuelve (ver B2), no se abría su ficha; el enlace directo volvía al directorio. | En corrección |
| F6 | Los feriados `{fecha, nombre}` se trataban como días abiertos 09–13; se podía agendar el 08/10. | En corrección |
| F7 | Arrastrar una cita en Semana o Por doctor siempre se rechazaba («no atiende en esta sede») porque comparaba un número con un UUID; además redondeaba la hora a :00. | En corrección |
| F8 | Sillones: se pedían sin `sedeId`, así que Surco recibía los de San Isidro o ninguno. | En corrección (pide por sede) |
| F9 | Al Iniciar o Finalizar la agenda navegaba aunque el servidor rechazara el cambio, y ocultaba el mensaje del servidor. | En corrección |
| F10 | Lista de espera › «Registrar paciente nuevo» no pedía fecha de nacimiento (el servidor la exige) ni mostraba el error. «Asignar cupo» no precargaba el servicio. | En corrección |
| F11 | «Por reactivar»: Pacientes decía 14 y Recordatorios «todos al día». | En corrección (una sola definición) |
| F12 | Estado `cerrada_sistema`: la Agenda decía «Cerrada por sistema» y el Consolidado lo contaba como «Cancelada». | En corrección |
| F13 | Menú ⋯ › Cobrar decía «sin saldo» cuando la ficha y Caja muestran saldo. | En corrección |
| F14 | Recepción veía la tarea de doctor «evoluciones sin completar». | En corrección |
| F15 | Recordatorios permitía guardar una plantilla vacía. | En corrección |
| F16 | Un error 403 en una llamada de fondo ponía un banner rojo global, y las pantallas con 403 mostraban «vacío» o «S/ 0» como si fuera un dato real. | En corrección (dirá «sin permiso») |
| F17 | El Consolidado no tenía rango hacia adelante (próximas citas). | En corrección |
| F18 | Agenda: la vista Semana listaba 6 doctores y la de Mes 4; en la vista Día se truncaban el nombre del paciente y la sede. | En corrección |
| F19 | «Evolución visual» de la ficha y PDF de historia clínica: contaban solo `estadoPieza` e imprimían claves internas («_pieza», «restaur»). | En corrección |
| F20 | El PDF del presupuesto mostraba Pagado S/ 0 y la pieza vacía. El plan de inversión daba un total de S/ 0 y numeraba «PI-PI-…». | En corrección |
| F21 | Periodontograma: mesial y distal invertidos en el informe; las partidas de la proforma se creaban sin sede. | En corrección |
| F22 | Receta y PDF: «COP COP12345»; la historia clínica salía sin COP en la firma. | En corrección |
| F23 | Evolución: se guardaba con «pieza ___, cara ___» y no quedaba ligada a la cita (la alerta no se cerraba). | En corrección |
| F24 | Radiografías y Fotos: dejaba llenar el formulario sin paciente; la cabecera mostraba «DNI» vacío. | En corrección |
| F25 | Odontograma: al abrir reenviaba todas las piezas aunque no hubiera cambios; textos de dentición y fase incorrectos. | En corrección |
| F26 | Mi producción: «−100 % vs mes anterior» el día 4; consejos que salen sin datos; calificación distinta a la de Reseñas. | En corrección |
| F27 | Gerencia veía botones de escritura que el servidor rechaza (Laboratorio › Avanzar, Seguros, Agendar). | En corrección (ocultos por permiso) |
| F28 | Metas por sede salía vacía cuando `/medicos` no trae sedes; «Sin especialidad». | En corrección |
| F29 | Caja en modo supervisión: aparecían «Abrir caja» y «Cerrarla»; la jornada antigua salía «Cerrada»; el administrador de sede no recibía aviso al intentar abrir con una jornada pendiente. | En corrección |
| F30 | Textos: «Nuevo sede», «Nuevo promoción»; Ocupación remitía a «Sedes» en vez de «Sillones»; Laboratorio y Seguros traían un paciente y una sede de ejemplo por defecto. | En corrección |

## 5. Registros de prueba creados (para limpiar)
- **Pacientes:** QA Prueba Recepción (99100201), QA Recepción Curl (99100202), QA Agenda Recepción (99100203), QA Cancelar Recepción (99100205) y QA Prueba Doctor (99260410).
- **Citas:**
  - lunes 05/10, San Isidro, con el Dr. Miguel Flores: 11:30, 14:00 y 15:00. No se pudieron cancelar por B3.
  - Conservan `celularContacto` 999111224 y 999111226: **cancelarlas antes de que salgan los recordatorios automáticos**.
  - viernes 09/10 a las 10:00 (confirmada, con llegada marcada) y sábado 10/10 a las 09:00, con la Dra. Carla.
- **Clínico de QA Prueba Doctor:**
  - un plan con 2 procedimientos («QA Endodoncia molar» e «Instrucción de higiene oral…»);
  - 1 evolución, 1 receta, 2 radiografías y 1 foto;
  - el odontograma (fases inicial y evolución) y el periodontograma.
- **WhatsApp:** un mensaje «QA prueba recepción (ignorar)» en el chat «QA Smoke WA2».
- **Usuario:** «QA Usuario Prueba» (qa.prueba+20261004@sonrie.pe), desactivado.
- **Sin rastro:** el envío de laboratorio QA se borró y la meta del Dr. Jorge Ramos quedó como estaba.
