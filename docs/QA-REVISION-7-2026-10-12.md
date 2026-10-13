# QA de revisión 7: Dento Check (12/10/2026, tarde)

**Qué se probó:**
- **Sistema:** producción real en `app.odontosonrisa.biz`, que ya publica el frontend de la revisión 6 (`index-Bo9N9391.js`), y su API.
- **Cómo:** módulo por módulo, botón por botón y rol por rol.
- **Roles:**
  - recepción de San Isidro y de Surco;
  - las doctoras Carla y Ana, más Luis y Sofía;
  - el administrador general y el administrador de Surco;
  - gerencia, TI y portal del paciente.
- **Datos de prueba:** llevan «QA» en el nombre y DNI 99…

> **Urgente:** la caja de **San Isidro** sigue abierta desde el **sábado 10/10, 22:01** (Roberto Díaz, administrador). Mientras esté abierta, no se puede abrir la caja del día ni cobrar en esa sede. Hay que cerrarla.

---

## 1. Corregido desde la revisión 6 ✅

**Datos por sede**
- No llegan datos de otra sede:
  - `/tratamientos/resumen` ya no devuelve San Isidro al administrador de Surco aunque lo pida;
  - `/pacientes/resumen-citas` y `/egresos` (para el administrador de sede) filtran por sede.
- «Procedimientos realizados» ya no suma fases pendientes.

**WhatsApp por sede (backend)**
- `/sedes` trae `whatsappNumero` y `whatsappPhoneNumberId`.
- `/whatsapp/salud` trae `porSede`.
- `/conversaciones` trae `sedeId` y `numeroSede`.
- En pantalla, cada chat muestra su sede y San Isidro y Surco ya no ven chats ajenos. Solo falta **cargar el número de cada sede** (sección 3).

**Auditoría**
- Ya registra el alta, la baja y el cambio de usuarios.
- Ya acepta fechas.

**Otros**
- Las citas pasadas ya se cierran solas, aunque quedan 2 «confirmadas».

**Frontend publicado (revisión 6), verificado en producción**
- Cifras por sede sin el aviso «toda la clínica» donde el servidor ya filtra.
- La «Antigüedad de la deuda» cuadra con Caja.
- Caja:
  - el historial muestra los cierres anteriores de una jornada reabierta;
  - el mensaje de cobro es el mismo en todas partes.
- El login se reintenta solo.
- Plurales y fechas dd/mm/aaaa.

---

## 2. Pendientes del backend

### 2.1 Errores (❌)
1. **Caídas con error 500.**
   - De 17:39 a 17:43 la mayoría de las llamadas dieron 500; algunas llegaron sin cabecera CORS y hubo un timeout a las 18:03.
   - Con 30 lecturas simultáneas fallan 14.
   - El frontend lo amortigua con reintentos y el aviso «No disponible · Reintentar», pero la causa está en el servidor: pool de conexiones, concurrencia, *timeouts* y arranque en frío.
2. **Gerencia puede cambiar el % de comisión.** Con una sede elegida, el servidor acepta que gerencia guarde el % de comisión de un médico, y lo aplica a la ficha global del médico. Las metas «por sede» se guardan en la ficha global, y el administrador de Surco aún puede guardar la meta de Carla por la ruta de Surco, porque los médicos no tienen sede. El frontend lo deja en solo lectura (sección 4).
3. **Portal del paciente:** con DNI 44567890 y clave `demo` responde 401.

### 2.2 Menores (⚠️)
**Datos de una sede visibles desde otra**
- `/whatsapp/salud` entrega a Surco el nombre, el id y el número de la sede San Isidro.
- `/whatsapp/metricas` da a cada sede los totales de toda la clínica.
- `/gerencial/indicadores` no filtra por sede la deuda, las alertas, la cartera ni la ocupación.
- `/egresos` ignora `sedeIds` para el administrador general y gerencia (solo filtra por el token del administrador de sede).
- `/servicios` entrega a recepción los precios de las dos sedes y el costo interno.
- Un chat asignado a San Isidro confirma una cita en Surco (datos de prueba).

**Datos que no se guardan**
- `/medicos` trae `sedes` vacías.
- Radiografías y fotos no guardan `piezas`, `vista` ni `momento`.
- Las recetas, las historias y los consentimientos no guardan la sede.
- `ficha360` devuelve las citas sin `id`.

**Caja y citas**
- Reabrir: el historial devuelve la jornada abierta del 10/10 en cualquier rango de fechas.
- La API acepta `en_atencion` y `atendida` en citas futuras.

**Validaciones**
- La API acepta nacimiento en 1890 y celular que empieza en 8.
- El odontograma responde 500 con una dentición inválida.

**Permisos**
- El administrador de sede no puede dar de baja con DELETE, pero sí con `PUT activo:false`.
- El médico recibe 403 al borrar procedimientos.
- El consentimiento firmado no se puede anular: el 409 manda a un flujo que no existe.

**Mi producción**
- Falta `produccionMesAnteriorAlDia` para comparar con el mes anterior sin depender de `/citas`.

**Auditoría**
- No registra inventario, laboratorio, seguros, metas ni cambios de la clínica.
- Tiene un tope de 2000 eventos y no pagina.

**Otros**
- Textos del servidor con «(s)», por ejemplo «2 sede(s)» en `/go-live`.
- No hay endpoint para restablecer la clave.
- La clave temporal la genera el navegador.
- El stock se envía como valor absoluto.
- Las imágenes se guardan en base64 dentro de la base de datos.
- «Nuevos y recurrentes» no tiene el dato de la primera visita.

---

## 3. Datos de la clínica
1. **Caja de San Isidro:** cerrar la jornada abierta desde el 10/10.
2. **WhatsApp por sede:** cargar en Configuración › Sedes el número y el ID de Meta de cada sede. Hoy las dos usan el número compartido +51 948 277 030, que tiene **3 envíos fallidos** en las últimas 24 h y cuyo último envío correcto fue el 02/10. Hay que revisar los envíos salientes.
3. **RUC 20123456789:** no es válido, así que la boleta no se puede ver.
4. **Teléfono 900000000:** parece de relleno. Correo, web, cuentas y billeteras siguen vacíos.
5. **Insumos:** los 5 siguen sin sede, y el médico ve el inventario vacío.

---

## 4. Frontend
Las correcciones están en la rama `claude/laughing-edison-3rr5w6`. Para aplicarlas, `git pull` y volver a desplegar. Sin la rama, se aplica el parche adjunto `cambio-frontend-QA7.patch`, que contiene solo lo nuevo respecto de lo publicado hoy.

**Verificación:**
- Compila y pasan 285 de 288 tests; los 3 que fallan son anteriores.
- Se recorrió con los 6 perfiles contra la API de producción, solo navegando: 0 errores en pantalla y 0 llamadas con error.

**Qué cambia:**
- **WhatsApp por sede:** las sedes que usan el número compartido muestran el estado real («Con fallos» por los 3 envíos fallidos). El inicio de TI lo cuenta como incidencia y ya no dice «Todo operativo».
- **Agenda:**
  - las vistas Semana y Mes muestran los bloqueos;
  - al pulsar un día del Mes se abre la vista Día;
  - descargar una semana sin citas lo avisa;
  - mientras cargan los sillones, el modal de agendar lo indica.
- **Menús Exportar, Descargar, «Más acciones» y Crear:** Escape los cierra, y el clic fuera los cierra y además llega a su destino.
- **Plan de inversión del odontograma:**
  - lo terminado aparece aparte, como «Ya realizado»;
  - cierra con Total propuesto, Ya realizado, Total del plan, Pagado y Saldo, igual que el Presupuesto PDF.
- **Permisos:**
  - gerencia ve el % de comisión en solo lectura también con una sede elegida;
  - recepción ya no ve «Ir a Integraciones»;
  - Recordatorios y Puesta en marcha no consultan WhatsApp sin permiso.
- **Auditoría:**
  - el aviso sobre las fechas ya no dice que no se pueden filtrar;
  - los eventos de usuarios muestran el nombre, cruzado con Usuarios, y se pueden buscar;
  - se corrigió la columna de hora.
- **Panel:**
  - si Caja no carga, la antigüedad de la deuda muestra «No disponible · Reintentar» en vez de volver al criterio antiguo;
  - el texto de los chats de gerencia ya es correcto.
- **Textos del servidor con «(s)»:** se muestran con su plural («1 sede», «6 doctores»).
- **Caja:**
  - un solo aviso con el rango de fechas invertido;
  - el arqueo de una jornada reabierta indica cuántos movimientos anteriores no cuentan.
- **Ficha:** Radiografías y Fotos sin paciente lo indican, y «Atendido por» se resuelve aunque `/medicos` falle.

---

## 5. Decisiones pendientes
- **Citas:** ¿las que crea recepción nacen «pendiente» o «confirmada»?
- **Automatizaciones:** ¿recepción de una sede puede pausar o editar las de toda la clínica?
- **Caja:** ¿quién cierra la jornada que un administrador dejó abierta? ¿TI debe ver Caja?
- **«Facturado»:** ¿se unifican sus tres definiciones?
- **Antigüedad de la deuda:** ¿se mide sobre el trabajo terminado sin cobrar (criterio nuevo) o sobre el saldo total de los planes?
- **Procedimientos:** ¿el médico puede borrarlos o solo anularlos? ¿Se puede anular uno ya terminado?
- **Metas:** ¿la meta y el % de comisión son por sede o globales?

---

## 6. Registros de prueba que quedan en producción
- **Pacientes:** los de rondas anteriores, más 2 de esta ronda («Rocho»), que recepción no puede borrar.
- **Clínica:**
  - evoluciones QA firmadas;
  - consentimientos QA firmados;
  - fases QA anuladas con costo 0.
- **Usuarios inactivos:** «QA Usuario R4» a «QA Usuario R7».
- **Caja de Surco:** egresos QA en las jornadas del 03/10 y 04/10, que no se borran para no descuadrar esos cierres.
- **WhatsApp:** mensajes «QA … (ignorar)» en «QA Smoke WA2».
- **Para la próxima ronda:** dejar preparada una cita QA atendida sin evolución, para probar «Completar» de punta a punta.
