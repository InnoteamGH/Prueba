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
- **Sección 4, hallazgos del frontend:** los 30 ya están corregidos en el ZIP; el programador solo despliega y vuelve a probar.
- **Sección 5, registros de prueba:** limpiar al final.

---

## 0. Reverificación del 05/10/2026 (después de las correcciones del programador)

Se volvió a probar todo contra producción:
- La web publicada en `app.odontosonrisa.biz` es idéntica a la rama, con los mismos archivos compilados.
- Se probó la API directamente con los 10 usuarios del documento.
- Se hizo el recorrido por pantallas con 6 perfiles (recepción, doctora, administrador general, administrador de sede, gerencia y TI), cada uno con una sesión nueva y limpia.

**Resultado del recorrido:** 0 errores de JavaScript y ningún aviso de «sin acceso» en los 6 perfiles.

### 0.1 Bloqueantes
| # | Estado | Detalle de la prueba |
|---|---|---|
| B1 | ✅ Corregido | El *preflight* CORS desde `app.odontosonrisa.biz` devuelve el origen, los métodos y las cabeceras. Se puede iniciar sesión. |
| B2 | ❌ **Sigue** | Se creó el paciente «QA Reverificacion Octubre» (DNI 99100510) y `POST /pacientes` respondió 200. `GET /pacientes` no lo incluye: recepción ve 19 y el administrador 30, igual que antes. `/pacientes/resumen` da 42. `GET /caja` → `porCobrar` tampoco incluye a los pacientes QA: se terminó un procedimiento de S/ 220 de «QA Prueba Doctor» y no aparece por cobrar. **Es el pendiente más grave: recepción no encuentra a los pacientes nuevos.** |
| B3 | ✅ Corregido | `PATCH /citas/{id}/estado` funciona. Se cancelaron las 3 citas QA del lunes 05/10. |
| B4 | ✅ Corregido | `PATCH /tratamientos/fases/{id}` funciona (`terminada`, notas). Con un id inexistente responde 404. |
| B5 | ✅ Corregido | `POST /bloqueos` por sillón funciona y se puede borrar. |
| B6 | ✅ Corregido | `POST /seguros` funciona y se puede borrar. |
| B7 | ⚠️ Casi | La doctora ya cambia el estado de sus citas, marca la llegada y crea bloqueos con su `medicoId`. **Falta:** `DELETE /bloqueos/{id}` de su propio bloqueo responde 403. |
| B8 | ✅ Corregido | `/clinica/impresion` devuelve «Clínica Dental Sonríe+», Sonríe Mas S.A.C. y las sedes reales. El RUC sigue siendo el inválido (ver 0.3). |
| B9 | ⚠️ Casi | `PUT /medicos/{id}` funciona: guarda `porcentajeComision`. **Falta:** `PUT /medicos/{id}/metas/{sedeId}` (meta y % por sede) sigue en 404. |

### 0.2 Importantes del backend (sección 2), estado actual
- **Fugas entre sedes (2.1), siguen:**
  - Con `ana@sonrie.pe` (Surco) se siguen leyendo la historia, las recetas, las radiografías, el odontograma, el periodontograma y la `ficha360` de un paciente de San Isidro.
  - `/resenas` devuelve las mismas 3 reseñas a todos, las de las dos sedes.
  - `/laboratorio` a la doctora y al administrador de Surco les muestra envíos de San Isidro.
  - `/disponibilidad` devuelve las dos sedes a usuarios de Surco.
  - `/conversaciones` devuelve los mismos 18 chats a todas las sedes.
  - `GET /sillones` sin `sedeId` devuelve a recepción de Surco los sillones de San Isidro.
  - `/egresos` guarda y devuelve egresos con `sedeId: null`, que aparecen en las dos sedes.
- **Lo que sí mejoró:**
  - el médico ya no ve `/gerencial`, `/comisiones`, `/pagos/historial`, `/egresos` ni `/conversaciones`;
  - recepción ya lee `/clinica/impresion`, `/tipo-cambio`, `/egresos` y `/tratamientos`;
  - gerencia ya lee `/egresos` y `/tipo-cambio`.
- **Permisos de lectura que siguen faltando (2.2):**
  - recepción: `/laboratorio`, `/consentimientos`, `/radiografias` y `/auditoria`;
  - administrador de sede: `/consentimientos`, `/tratamientos/resumen` y `/usuarios`;
  - gerencia: `/usuarios`;
  - TI: `/whatsapp/salud`, `/sillones` y `/clinica/impresion`;
  - médico: `/auditoria?pacienteId`.
  - **Nuevo:** el médico recibe 403 en `/clinica/impresion`, así que la receta y el presupuesto que imprime la doctora salen sin los datos de la clínica.
- **Rutas que siguen sin existir (2.3):**
  - `GET /sillones/asignaciones`: 404;
  - `GET /facturacion-electronica/config` y `/comprobantes`: 404;
  - `GET /disponibilidad/mi`: 405.
- **Nuevos:**
  - **`GET /sillones` respondió 500** una vez durante el recorrido de gerencia. Al repetirlo respondió 200, así que es intermitente: hay que revisar el log.
  - **Cierre de caja sin `efectivoEsperado`:**
    - si el cuerpo no lo trae, el servidor calcula solo el fondo e ignora los cobros y los egresos;
    - tampoco calcula el esperado en dólares;
    - en la prueba dio esperado S/ 50 cuando correspondía S/ 57, con un fondo de S/ 50, un cobro de S/ 10 y un egreso de S/ 3;
    - el cierre normal del frontend envía su propio cálculo, pero el cierre «fuera de fecha» del administrador no lo envía y queda con una diferencia falsa.
  - **`/pagos/cierre` → `porMetodo.efectivo`** no suma el efectivo cobrado en dólares: da 10 cuando el total es 28.75.
  - **Validaciones nuevas en `POST /pacientes`:** la fecha de nacimiento es obligatoria y el nombre solo admite letras, espacios, apóstrofes y guiones. Son correctas y el formulario ya pide la fecha.

### 0.3 Datos de la clínica (sección 3), estado actual
- **Cajas antiguas abiertas: resuelto en esta reverificación.**
  - Se cerraron las 3 jornadas de prueba (San Isidro 03/09 «smoke», Surco 03/09 y 04/09 «PRUEBA QA»), con la justificación «QA 05/10».
  - Se probó el ciclo completo en San Isidro con fecha domingo 04/10: apertura S/ 50 + US$ 10, cobro S/ 10, cobro US$ 5 (TC 3.75), egreso S/ 3, cierre del día y cierre de caja. Todo respondió 200, salvo el cálculo del esperado (ver 0.2).
- **Catálogo:**
  - `GET /servicios` tiene 14 servicios, pero el frontend leía `GET /especialidades`, que solo trae 5. **Corregido en el frontend:** el catálogo ahora sale de `/servicios`.
  - Los 14 siguen sin `codigo`, sin `hallazgos` y sin `preciosSede`, y no hay servicios periodontales.
- **Sigue igual:**
  - la Dra. Carla tiene lunes a miércoles en Surco;
  - los insumos no tienen sede;
  - el RUC es 20123456789, que es inválido;
  - la dirección de `/clinica` está vacía;
  - sigue el usuario «T» (t2@t.pe);
  - `/medicos` no trae `sedes[]` ni el nombre de la especialidad.

### 0.4 Frontend
- **Corregido hoy:** Servicios, el plan de tratamiento, el odontograma, el periodontograma y las respuestas rápidas de WhatsApp leían el catálogo de `/especialidades` (5) en vez de `/servicios` (14).
  - Ahora usan `/servicios`, con respaldo a `/especialidades` si la ruta no existiera.
  - Verificado contra el backend real: la pantalla Servicios muestra los 14.
  - **Hay que volver a desplegar.**

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

El frontend está en el ZIP (`frontend.zip`, rama `claude/laughing-edison-3rr5w6`). **Los 30 hallazgos ya están corregidos en el ZIP.** El programador no necesita tocar el código: solo desplegar el ZIP y volver a probar.

Verificación final con la versión nueva conectada al backend real, con 6 perfiles (recepción, doctora, administrador general, administrador de sede, gerencia y TI):
- 0 errores de JavaScript;
- sin el banner rojo de «sin acceso»;
- las únicas llamadas que fallan son las del backend de las secciones 1 y 2 (`/clinica/impresion` 403, `/sillones/asignaciones` 404, `/facturacion-electronica/config` 404, `/egresos`, `/tipo-cambio`, `/consentimientos` y `/whatsapp/salud` 403 según el rol).

Dos puntos para el backend que salen de estos arreglos:
- Al limpiar todas las marcas de una pieza, el odontograma ahora envía esa pieza con marcas vacías (`PUT /odontograma`). El servidor debe aceptarlo como «sin hallazgos».
- La evolución se envía con `citaId` cuando viene de una cita. El servidor debe guardarlo y cerrar con eso la alerta de evolución pendiente.

| # | Hallazgo | Estado |
|---|---|---|
| F1 | El horario del servidor (`lunes`…`domingo`, `activo`) no se reconocía. Configuración mostraba 09–19 inventado y al guardar lo sobrescribía; la agenda decía «sin horario» e iba de 06 a 22. | Corregido (se traduce al leer y al guardar) |
| F2 | El odontograma perdía al recargar las marcas de pieza completa (corona + extracción) y el color por hacer / realizado. | Corregido |
| F3 | Con una sede elegida, el Inicio mostraba deudores y evoluciones de toda la clínica. | Corregido (filtra por sede y recarga al cambiar de sede) |
| F4 | Integraciones marcaba OpenAI como pendiente estando activa (`iaReal`). | Corregido |
| F5 | Al crear un paciente que el listado no devuelve (ver B2), no se abría su ficha; el enlace directo volvía al directorio. | Corregido |
| F6 | Los feriados `{fecha, nombre}` se trataban como días abiertos 09–13; se podía agendar el 08/10. | Corregido |
| F7 | Arrastrar una cita en Semana o Por doctor siempre se rechazaba («no atiende en esta sede») porque comparaba un número con un UUID; además redondeaba la hora a :00. | Corregido |
| F8 | Sillones: se pedían sin `sedeId`, así que Surco recibía los de San Isidro o ninguno. | Corregido |
| F9 | Al Iniciar o Finalizar la agenda navegaba aunque el servidor rechazara el cambio, y ocultaba el mensaje del servidor. | Corregido |
| F10 | Lista de espera › «Registrar paciente nuevo» no pedía fecha de nacimiento (el servidor la exige) ni mostraba el error. «Asignar cupo» no precargaba el servicio. | Corregido |
| F11 | «Por reactivar»: Pacientes decía 14 y Recordatorios «todos al día». | Corregido |
| F12 | Estado `cerrada_sistema`: la Agenda decía «Cerrada por sistema» y el Consolidado lo contaba como «Cancelada». | Corregido |
| F13 | Menú ⋯ › Cobrar decía «sin saldo» cuando la ficha y Caja muestran saldo. | Corregido |
| F14 | Recepción veía la tarea de doctor «evoluciones sin completar». | Corregido |
| F15 | Recordatorios permitía guardar una plantilla vacía. | Corregido |
| F16 | Un error 403 en una llamada de fondo ponía un banner rojo global, y las pantallas con 403 mostraban «vacío» o «S/ 0» como si fuera un dato real. | Corregido |
| F17 | El Consolidado no tenía rango hacia adelante (próximas citas). | Corregido |
| F18 | Agenda: la vista Semana listaba 6 doctores y la de Mes 4; en la vista Día se truncaban el nombre del paciente y la sede. | Corregido |
| F19 | «Evolución visual» de la ficha y PDF de historia clínica: contaban solo `estadoPieza` e imprimían claves internas («_pieza», «restaur»). | Corregido |
| F20 | El PDF del presupuesto mostraba Pagado S/ 0 y la pieza vacía. El plan de inversión daba un total de S/ 0 y numeraba «PI-PI-…». | Corregido |
| F21 | Periodontograma: mesial y distal invertidos en el informe; las partidas de la proforma se creaban sin sede. | Corregido |
| F22 | Receta y PDF: «COP COP12345»; la historia clínica salía sin COP en la firma. | Corregido |
| F23 | Evolución: se guardaba con «pieza ___, cara ___» y no quedaba ligada a la cita (la alerta no se cerraba). | Corregido |
| F24 | Radiografías y Fotos: dejaba llenar el formulario sin paciente; la cabecera mostraba «DNI» vacío. | Corregido |
| F25 | Odontograma: al abrir reenviaba todas las piezas aunque no hubiera cambios; textos de dentición y fase incorrectos. | Corregido |
| F26 | Mi producción: «−100 % vs mes anterior» el día 4; consejos que salen sin datos; calificación distinta a la de Reseñas. | Corregido |
| F27 | Gerencia veía botones de escritura que el servidor rechaza (Laboratorio › Avanzar, Seguros, Agendar). | Corregido |
| F28 | Metas por sede salía vacía cuando `/medicos` no trae sedes; «Sin especialidad». | Corregido |
| F29 | Caja en modo supervisión: aparecían «Abrir caja» y «Cerrarla»; la jornada antigua salía «Cerrada»; el administrador de sede no recibía aviso al intentar abrir con una jornada pendiente. | Corregido |
| F30 | Textos: «Nuevo sede», «Nuevo promoción»; Ocupación remitía a «Sedes» en vez de «Sillones»; Laboratorio y Seguros traían un paciente y una sede de ejemplo por defecto. | Corregido |

## 5. Registros de prueba creados (para limpiar)
- **Pacientes:** QA Prueba Recepción (99100201), QA Recepción Curl (99100202), QA Agenda Recepción (99100203), QA Cancelar Recepción (99100205), QA Prueba Doctor (99260410) y QA Reverificacion Octubre (99100510, creado el 05/10).
- **Citas:**
  - lunes 05/10, San Isidro, con el Dr. Miguel Flores: 11:30, 14:00 y 15:00. **Ya canceladas el 05/10.**
  - viernes 09/10 a las 10:00 (confirmada, con llegada marcada) y sábado 10/10 a las 09:00 (confirmada el 05/10), con la Dra. Carla.
- **Caja (05/10):**
  - jornada QA de San Isidro con fecha 04/10, abierta y cerrada;
  - 2 cobros de «QA Prueba Doctor» (S/ 10 y US$ 5) y un egreso «QA egreso prueba» de S/ 3;
  - el procedimiento «QA Endodoncia molar» quedó «terminada».
- **Cajas antiguas:** las 3 jornadas de prueba de septiembre quedaron cerradas con la justificación «QA 05/10».
- **Sin rastro:** el seguro y los bloqueos de prueba del 05/10 se crearon y se borraron.
- **Clínico de QA Prueba Doctor:**
  - un plan con 2 procedimientos («QA Endodoncia molar» e «Instrucción de higiene oral…»);
  - 1 evolución, 1 receta, 2 radiografías y 1 foto;
  - el odontograma (fases inicial y evolución) y el periodontograma.
- **WhatsApp:** un mensaje «QA prueba recepción (ignorar)» en el chat «QA Smoke WA2».
- **Usuario:** «QA Usuario Prueba» (qa.prueba+20261004@sonrie.pe), desactivado.
- **Sin rastro:** el envío de laboratorio QA se borró y la meta del Dr. Jorge Ramos quedó como estaba.
