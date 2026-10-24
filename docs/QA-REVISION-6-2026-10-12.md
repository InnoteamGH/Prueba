# QA de revisión 6: Dento Check (12/10/2026)

**Qué se probó:** producción real, `app.odontosonrisa.biz`, que ya publica la versión del frontend de la revisión 5, y su API.
- **Cómo:** módulo por módulo, botón por botón y rol por rol.
- **Roles:**
  - recepción de San Isidro y de Surco;
  - doctoras Carla, Ana, Luis y Sofía;
  - administrador general y administrador de Surco;
  - gerencia;
  - TI;
  - portal del paciente.
- **Datos de prueba:** llevan «QA» en el nombre y DNI 99…

> **Urgente: caja de San Isidro abierta.** La jornada que abrió Roberto Díaz (administrador) el **sábado 10/10 a las 22:01 sigue abierta**. Hoy, lunes, impide abrir la caja de San Isidro y por lo tanto cobrar. Debe cerrarla el administrador o quien la abrió. No es un registro de prueba y no se tocó.

---

## 1. Corregido desde la revisión 5 ✅

**Sedes**
- **WhatsApp por sede:** San Isidro ya no ve chats de pacientes de Surco, y Surco ve los suyos.
- **Reportes por sede:** `/gerencial/kpis`, `/tratamientos/resumen` y `/comisiones` filtran por la sede elegida. Por ejemplo, comisiones da S/ 940 en San Isidro y S/ 940 en Surco, sobre un total de S/ 1 880.
- **Meta de otra sede:** el administrador de Surco ya no puede cambiar la meta global de un doctor de San Isidro (403). Queda un caso por la ruta por sede: ver 2.2.

**Tratamientos y pacientes**
- **Procedimientos anulados:** ya no suman en `ficha360`, en `/pacientes/resumen-financiero` ni en Caja.
- **Borrar procedimientos:** se puede con el administrador; con el médico responde 403.
- **Borrar pacientes:** ya funciona (204).
- **Evolución desde «Completar»:** se guarda con `citaId` y la alerta baja.

**Caja**
- **Reabrir una jornada:** el servidor ya conserva los cierres anteriores, aunque falta mostrarlos (sección 4).

---

## 2. Pendientes del backend

### 2.1 Errores (❌)
1. **El servidor cae con errores 500 y 503.**
   - **Cuándo:** hoy, de 09:08 a 09:12, la mayoría de las llamadas dieron 500. Fallaron también el **login** y algunas respuestas sin cabecera CORS (`net::ERR_FAILED`).
   - **Con carga:** con 30 lecturas simultáneas fallan entre 10 y 14.
   - **Efecto:** el frontend reintenta las lecturas y muestra «No disponible · Reintentar», pero el problema es del servidor.
   - **Qué revisar:** el pool de conexiones a la base de datos, la concurrencia y los *timeouts* de la función, y los arranques en frío.
2. **Fuga de procedimientos de otra sede.** Con el token del administrador de Surco, `GET /tratamientos/resumen?sedeIds=<San Isidro>` devuelve los 14 procedimientos de toda la clínica (S/ 4 380). Sin filtro devuelve solo Surco. Hay que ignorar las sedes pedidas que no estén en el token.
3. **`/pacientes/resumen-citas` no filtra por sede.** A cada sede le llegan los ids y la última visita de los pacientes de la otra.
4. **«Procedimientos realizados» y deuda:**
   - el reporte suma una fase pendiente de S/ 120;
   - la antigüedad de la deuda da S/ 1 990, frente a S/ 2 299.25 en Caja.
5. **Auditoría:**
   - no registra altas, bajas ni cambios de usuarios, roles, precios, inventario ni datos de la clínica (no quedó el alta ni la baja de «QA Usuario R6»);
   - la consulta tiene un tope de 500 eventos;
   - ignora `desde` y `hasta`.
6. **Portal del paciente:** el DNI 44567890 con clave `demo` responde 401, aunque el contrato `{dni, password}` es correcto y la paciente existe.

### 2.2 Menores (⚠️)
**Datos de sede y aislamiento**
- **`/gerencial/indicadores`:** no filtra por sede la deuda, las alertas, la cartera ni la ocupación.
- **Médicos sin sede:** `/medicos` trae `sedes` vacías. Por eso el administrador de Surco puede guardar la meta de la Dra. Carla con `PUT /medicos/{id}/metas/{Surco}` (200).
- **`/egresos`:** ignora la sede (la pantalla lo corrige).
- **`/whatsapp/metricas`:** da a cada sede los totales de toda la clínica.
- **`/servicios`:** entrega a recepción los precios de las dos sedes y el costo interno.
- **Pacientes sin sede:** 2 pacientes se cuentan en las dos sedes.

**Permisos**
- **Usuarios:** el administrador de Surco no tiene permiso de baja, pero `PUT /usuarios/{id}` con `activo:false` funciona (200). Hay que unificar la regla.

**Citas**
- La API acepta `en_atencion` y `atendida` en una cita futura, y cancelar una cita ya atendida.
- La cita del 14/09 sigue «confirmada»: falta el cierre automático de citas pasadas.

**Caja**
- `/caja/apertura/historial` devuelve la jornada abierta del 10/10 en cualquier rango de fechas.

**Clínico**
- **Radiografías y fotos:** no guardan `piezas`, `vista` ni `momento`.
- **Consentimientos:**
  - uno firmado no se puede anular: el 409 remite a un flujo de anulación que no existe (404);
  - no guarda `sedeId`.
- **Evoluciones:** no se pueden borrar (405).
- **`ficha360`:** devuelve las citas sin `id`.
- **Imágenes:** se guardan en base64 dentro de la base de datos.

**Validaciones de la API**
- Acepta un nacimiento en 1890 y un celular que empieza en 8.
- El odontograma responde 500 con una dentición inválida, en vez de 400.

**Otros**
- **Usuarios:** no hay endpoint para restablecer la clave, y la clave temporal se genera en el navegador.
- **Inventario:** el stock se envía como valor absoluto.
- **«Nuevos y recurrentes»:** no tiene el dato de la primera visita.

### 2.3 WhatsApp por sede (nuevo requisito del cliente)
Cada sede tiene su propio número de WhatsApp. El detalle está en `docs/requisitos-minimos.md`, punto 91. Hoy existe un solo número para toda la clínica (+51 948 277 030). El backend necesita:
1. `whatsappNumero` y `whatsappPhoneNumberId` en la sede (GET, POST y PUT de `/sedes`, y en `/clinica/impresion`).
2. Que el webhook de Meta enrute cada mensaje entrante por `phone_number_id` a su sede, y que la conversación guarde `sedeId` y `numeroSede`.
3. Que `GET /conversaciones` devuelva esos campos y filtre por las sedes del token.
4. Que todo envío saliente use el número de su sede: recordatorios, confirmaciones, reseñas, respuestas manuales y respuestas de la IA.
5. Que `GET /whatsapp/salud` devuelva `porSede`.
6. Que el agente de IA responda con la dirección, el horario, los doctores, los precios y las promociones de la sede del número.

El frontend ya está preparado (sección 4) y funciona con la API actual, mostrando el número como «compartido por todas las sedes».

---

## 3. Datos de la clínica
1. **Caja de San Isidro:** cerrar la jornada abierta desde el 10/10.
2. **RUC 20123456789:** no pasa el dígito verificador, por eso «Ver comprobante» no muestra la boleta.
3. **Teléfono:** «900000000» parece de relleno. Correo, web, cuentas y billeteras siguen vacíos.
4. **Insumos:** los 5 siguen sin sede.
5. **WhatsApp:** cargar el número de cada sede cuando el backend lo soporte.

---

## 4. Frontend
Las correcciones están en la rama `claude/laughing-edison-3rr5w6`. Para aplicarlas:
- con la rama, `git pull` y volver a desplegar;
- sin la rama, aplicar el parche adjunto `cambio-frontend-QA6.patch`, que tiene solo lo nuevo respecto de lo publicado hoy.

**Verificación:**
- Compila y pasan 246 de 249 tests; los 3 que fallan son anteriores.
- Con los 6 perfiles contra la API de producción, solo navegando: 0 errores en pantalla y 0 llamadas con error.

**Lo que cambia:**
- **WhatsApp por sede (nuevo):**
  - en Configuración › Sedes, campo «WhatsApp de la sede» (+51 9XX XXX XXX) y, para admin y TI, el «ID del número en Meta»;
  - Integraciones muestra el estado por sede;
  - la bandeja indica la sede de cada chat, tiene filtro por sede y muestra desde qué número sale la respuesta;
  - Recordatorios avisa de las sedes sin número propio;
  - con la API actual, el número único aparece como «compartido por todas las sedes».
- **Login:** se reintenta ante 500/503. Si sigue fallando, muestra «El servidor no responde en este momento. Intenta de nuevo en unos segundos».
- **Reportes por sede:** como el servidor ya filtra, se quitaron los avisos «toda la clínica» y los recálculos locales.
  - Panel, Producción y comisiones y Más reportes usan los datos del servidor por sede.
  - «Resultado del mes» se calcula por sede.
  - La meta de la sede es la suma de las metas de sus doctores.
- **Antigüedad de la deuda (cambio de criterio, revisar):** ahora sale de Caja y mide el **trabajo terminado sin cobrar**, con el mismo criterio que «Listo para cobrar» y «Hecho sin pagar». Hoy da S/ 220.
  - Debajo se muestra aparte el saldo de los planes: S/ 2 299.25 (S/ 1 699.25 en San Isidro y S/ 600 en Surco).
  - Así ya no se contradice con Caja, y la alerta «saldo vencido +60 días» ya no aparece porque no hay trabajo terminado vencido.
- **Caja:**
  - el Historial muestra los cierres anteriores de una jornada reabierta;
  - el aviso de «Registrar cobro» es uno solo, según el estado real de la caja de la sede;
  - las fechas salen en dd/mm/aaaa;
  - el procedimiento terminado se ve en la tarjeta.
- **Agenda:**
  - la vista Día comparte la fecha con el calendario y muestra los bloqueos;
  - si fallan los sillones, el modal de agendar avisa con «Reintentar».
- **Médico:**
  - una ficha rechazada con 403 ya no se guarda como «último paciente»;
  - «Mi producción» compara con el mes anterior hasta el mismo día real, sin prorrateo;
  - fechas en dd/mm/aaaa en la «Historia clínica PDF» y en el PDF de la agenda.
- **Metas:**
  - el administrador de sede solo ve a los doctores con horario en su sede;
  - si falla la carga, muestra «No disponible · Reintentar».
- **Panel:**
  - las citas canceladas no cuentan como «en agenda»;
  - los chats de WhatsApp por sede cuadran (los que no tienen sede aparecen aparte);
  - la Cartera indica cuántos pacientes están sin sede.
- **Servicios:** el margen se calcula sin IGV.
- **Textos y plurales** corregidos en todo el sistema.

---

## 5. Decisiones pendientes
- **Citas:** ¿las que crea recepción nacen «pendiente» o «confirmada»?
- **Automatizaciones:** ¿recepción de una sede puede pausar o editar las de toda la clínica?
- **Caja:** ¿quién cierra la jornada que un administrador dejó abierta? ¿TI debe ver Caja?
- **«Facturado»:** hay tres definiciones. ¿Se unifican?
- **Antigüedad de la deuda:** ¿se mide sobre el trabajo terminado sin cobrar (nuevo criterio, coherente con Caja) o sobre todo el saldo de los planes (criterio anterior)?
- **Procedimientos:** ¿el médico puede borrar procedimientos (hoy 403) o solo anularlos?

---

## 6. Registros de prueba que quedan en producción

**Pacientes**
- Los de rondas anteriores.
- 2 de esta ronda: «QA Nuevo Agenda Rsiete» y «QA Alta Recepcion Rsiete».

**Registros clínicos**
- La evolución QA firmada `cf536c8a`.
- El consentimiento QA firmado `6ef7f064`.
- Fases QA canceladas, con costo 0.

**Usuarios inactivos**
- «QA Usuario R4».
- «QA Usuario R5».
- «QA Usuario R6».

**Caja de Surco**
- El egreso QA de S/ 1 de la jornada del 03/10, reabierta y cerrada por QA.
- Los cobros y egresos QA de rondas anteriores.

**Metas**
- Posible registro de la meta de Carla en Surco, con los mismos valores (null / 40 %).

**WhatsApp**
- Mensajes «QA … (ignorar)» en «QA Smoke WA2».
