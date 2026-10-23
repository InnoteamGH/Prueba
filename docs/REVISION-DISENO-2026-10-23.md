# Revisión de diseño gráfico y UX/UI (23/10/2026)

**En una frase:** se recorrieron todas las pantallas de producción con capturas en escritorio (1440 px) y celular (390 px). Se corrigieron cuatro tipos de problemas: textos donde debía ir una cifra, fechas largas o en formatos distintos, textos largos que cortaban nombres y botones fuera del estándar. Todo va en un solo parche del frontend.

**Archivos:**
- **Este documento:** qué se encontró y qué cambió, pantalla por pantalla.
- **`cambio-frontend-diseno-2026-10-23.patch`:** el cambio completo del frontend sobre la versión publicada hoy (`index-DjK7jcE6.js`). **Incluye el ajuste de `cambio-frontend-QA33.patch`**: no hace falta aplicar ese parche por separado.

---

## 1. Reglas que ahora se cumplen en toda la app

| Regla | Antes | Ahora |
|---|---|---|
| **Una cifra va como cifra** | «Sin meta», «sin saldo», «aparte», «— Cobertura mínima», «0.4k», «1 compra» dentro de un chip | Número o monto. Si no hay dato, la tarjeta no se muestra o el texto va debajo, en pequeño. |
| **Montos siempre con 2 decimales y «S/»** | «S/ 699», «plan S/ 340», «0.4k» | «S/ 699.00», «plan de S/ 340.00», «S/ 400», «S/ 1.2 mil» |
| **Un solo formato de fecha** | «lun, 31 ago.», «10 Oct», «23 de octubre de 2026», «20/10/2026 20:19», «Vie 23/10/2026» | En listas: «vie 23 oct» (con año solo si no es este año). En documentos y registros: «23 oct 2026». |
| **Campos de fecha en dd/mm/aaaa** | El navegador mostraba mm/dd/yyyy | dd/mm/aaaa en todos los campos de fecha |
| **Días y plurales completos** | «38 d», «77 d», «2 Entregado», «unid» | «38 días», «77 días de atraso», «2 Entregados», «unidades» |
| **Nombres sin cortar** | «QA Doctor Carla F…», «Andersson Ast…», «QA Izip…» | Hasta dos líneas. Los nombres escritos todo en mayúsculas se muestran como nombre propio. |
| **Un solo estilo por botón** | 4 estilos de «Cobrar» (uno con «$»), ícono ⇄ para «Actualizar», «PDF» dentro del botón «Imprimir receta» | Un «Cobrar» con ícono de billete. «Actualizar» con flecha circular. «Imprimir receta» sin la etiqueta «PDF». |
| **Botones que dicen qué hacen** | «Avanzar», «Terminar», «Ver», «Restaurar rol» | «Marcar recibido», «Completar», «Ver respuesta», «Restablecer predeterminados» |
| **Colores con significado** | Rojo en ceros («S/ 0.00» en Egresos), recepcionista en rojo, chips verdes en «Faltantes S/ 0.00» | Los ceros van en gris. El rojo queda para alertas reales. |

---

## 2. Cambios por pantalla

### Atención y agenda
- **Pacientes:**
  - la próxima cita vacía es un «—» discreto (antes «Sin agendar» junto al botón «Agendar»);
  - «Última cita» en dos líneas cortas («lun 31 ago» y «Hace 2 meses»);
  - buscador y «Exportar» en una sola fila;
  - KPI «Nuevos en 30 días».
- **Agenda:**
  - las citas canceladas se ocultan del día, con «Ver canceladas (N)»;
  - «Cobrar S/ 309.25» con el monto;
  - sin columna «Doctor» para el médico ni columna «Sede» con una sola sede;
  - «Exportar» en lugar de «Descargar».
- **Consolidado de citas:**
  - filtros con el mismo selector de la app;
  - tabla que carga de 25 en 25;
  - estados con su punto;
  - «Odontólogo» en lugar de «Doctor»;
  - «Cerradas automáticamente» en lugar de «Cerradas por sistema».
- **Lista de espera:** teléfonos en grupos de 3 («948 277 030»).
- **WhatsApp:**
  - teléfonos «+51 948 277 030»;
  - avatares sin números;
  - fechas «Ayer», «mar» o «16 oct»;
  - chip solo en los chats de recepción;
  - filtros de 32 px (36 px en celular);
  - lista con esqueleto de carga y «Reintentar».
- **Recordatorios:**
  - nombres claros («Control periódico», «Recuperar inasistencias»);
  - chips «48 h antes»;
  - interruptores de un solo color.
- **Satisfacción:**
  - reseñas ordenadas por fecha;
  - «Ver respuesta» o «Ver reseña» en lugar de «Ver».

### Clínica
- **Recetas:**
  - fecha con año («31 ago 2026») y el médico en su propia línea, sin el «·» colgando;
  - posología legible («Dosis 1 · cada 8 h · por 3 días», antes «1 – c/8h – 3 días»);
  - medicamento con mayúscula inicial;
  - orden por fecha;
  - «Sin firma» en lugar de «Emitida».
- **Consentimientos:**
  - la cifra principal dice «4 de 4 vigentes firmados» (antes «100% de los 4 vigentes, firmados»);
  - los 24 anulados se ocultan, con «Ver anulados (24)»;
  - fechas con año.
- **Formularios:**
  - «0 de 4 completados» en lugar de «0%»;
  - fechas con año;
  - orden por fecha.
- **Tratamientos:**
  - el encabezado dice «Tratamientos» (antes «Plan y cuenta»);
  - el estado vacío ya no repite «Elige un paciente».
- **Ficha del paciente:** fechas «23 oct 2026» en lugar de «23 de octubre de 2026».
- **Laboratorio:**
  - el botón nombra el paso siguiente («Marcar en proceso», «Marcar recibido», «Marcar entregado»);
  - «77 días de atraso»;
  - «2 Entregados».

### Caja y facturación
- **Caja › Hoy:**
  - un solo botón «Cobrar»;
  - «plan de S/ 340.00»;
  - «Caja de» es una etiqueta, no otro botón;
  - el resumen ya no dice «elige una sede»;
  - «Datos del emisor» sin borde punteado.
- **Ingresos y egresos:** totales en cero en gris (antes «S/ 0.00» en rojo).
- **Historial:**
  - «Faltantes» y «Sobrantes» en cero en gris;
  - se oculta la fila de dólares cuando está en cero;
  - «De 22:01 a 09:59 del mar 14 oct»;
  - «10 oct» en minúscula.
- **Links de pago:**
  - nombre del paciente completo;
  - el estado va junto al importe;
  - sin el código «Pedido b5725904» en la tarjeta (sigue en la tabla y en el Excel);
  - sin pie vacío cuando no hay acciones.
- **Comprobantes SUNAT:**
  - un solo aviso con «Ir a Integraciones»;
  - «Por enviar» en todas partes;
  - filtros por tipo y por estado.
- **Seguros:**
  - «100%» cabe dentro del anillo;
  - las acciones del tablero tienen un solo color;
  - copagos y columnas en cero en gris;
  - «Nada por liquidar» en lugar de «Al día».
- **Inventario:**
  - la tabla cabe a 1440 px (categoría y lote van bajo el nombre; siguen en el Excel);
  - «38 días», «unidades», «para ~10 días»;
  - sin «— Cobertura mínima» ni «— Más usado» cuando no hay datos.
- **Proveedores:**
  - compras como número;
  - fecha con año.
- **Servicios:** las columnas por sede solo aparecen si esa sede tiene precios distintos del base. Antes repetían el mismo precio en las 22 filas y la tabla no cabía.

### Reportes
- **Panel gerencial:**
  - porcentajes en lugar de «sin saldo» o «aparte»;
  - «Sillones libres» como «N de M»;
  - gráficos vacíos con una línea de texto;
  - un solo estilo de botón secundario;
  - «Leyendo Caja…» ya no queda girando;
  - fila «Sin odontólogo asignado» para que el Top del equipo cuadre con la producción.
- **Resumen del mes:**
  - íconos claros para producción y salidas;
  - sin «–» en los puestos de quien no produjo;
  - subtítulos cortos;
  - rango «1 – 23 oct 2026».
- **Producción y comisiones:**
  - porcentajes sin decimales;
  - rangos cortos;
  - tabla ordenada por producción;
  - barras de un solo color;
  - «0 de 2 con meta».
- **Mi producción (doctor):**
  - barras con «S/ 400» en lugar de «0.4k»;
  - sin meta, la cifra grande es lo producido;
  - promedio por atención con 2 decimales.
- **Ocupación, Metas y Más reportes:**
  - «<1%» en lugar de «0%» cuando hay citas;
  - celdas libres atenuadas;
  - sin KPI repetidos;
  - el monto de la meta se formatea al salir del campo.

### Administración
- **Usuarios:**
  - correo con «…» y el completo al pasar el cursor;
  - «Odontóloga» para las doctoras;
  - recepcionista en azul (antes rojo);
  - último acceso «mar 20 oct, 20:19».
- **Permisos:** «Restablecer predeterminados» (antes «Restaurar rol»), con la aclaración de que no se guarda hasta «Guardar cambios».
- **Auditoría:**
  - las filas no repiten el nombre del usuario;
  - el chip «OK» se quitó de cada fila (solo se marcan las alertas);
  - días «Vie 23 oct».
- **Plan:**
  - «S/ 699.00 al mes»;
  - «Activo» se ve como estado y no como botón;
  - «Pacientes (sin límite)».
- **Integraciones:**
  - «Completar» en lugar de «Terminar»;
  - «Recomendado» como etiqueta en lugar de una estrella suelta.
- **Configuración › Puesta en marcha:**
  - todos los pasos pendientes con un botón «Configurar» que lleva a su pantalla;
  - sin números ni naranja relleno;
  - en celular, un desplegable de sección.

---

## 3. Lo que queda (no es del frontend)

1. **Datos de prueba visibles.** Pacientes, links, proveedores, recetas y consentimientos con «QA» se ven en casi todas las pantallas, y 24 de los 28 consentimientos están anulados. **Antes de mostrar el sistema al cliente conviene borrarlos o usar otra clínica.** Es un borrado masivo en producción: se hace solo con autorización expresa.
2. **Textos del servidor:**
   - la notificación de derivación con identificadores internos;
   - el estado «Activo (gpt-4o)»;
   - «2 sede(s)»;
   - conceptos de Izipay con códigos.

   El frontend ya los oculta o los corrige al mostrarlos. Detalle en `PENDIENTES-Y-CAMBIOS-2026-10-23.md`, puntos 16 a 23.
3. **Detalles menores que no se tocaron:**
   - en Puesta en marcha, la fecha del último fallo de WhatsApp sale «(20/10, 14:44)», con el formato del módulo de integraciones;
   - el Consolidado no agrupa la tabla por día (sí lo hace la vista «Por día»);
   - los tooltips no se ven en pantallas táctiles.

---

## 4. Cómo se comprobó

- **Capturas de producción:** 112 capturas el 23/10 (administrador general, recepción y doctora; 1440 px y 390 px), más recortes ampliados de cada zona. Con ellas se armó la lista de hallazgos.
- **Capturas del cambio:** el frontend nuevo se corrió en local contra la API de producción. Se revisaron otra vez Pacientes, Recetas, Consentimientos, Formularios, Usuarios, Caja (Hoy, Historial y Links), Inventario, Laboratorio, Seguros, Servicios, Plan, Integraciones, Auditoría, Reseñas, Espera, Tratamientos, Panel gerencial y Producción, en escritorio y celular. No hubo errores en consola.
- **Pruebas:** `npm test` da 458 de 461. Las 3 fallas son las mismas de antes del cambio (A30, SRV-01/02 y CONFORMANCE ronda 2). Se agregaron pruebas para los nombres en mayúsculas, la posología y los porcentajes.
- **Compilación:** `npm run build` termina sin errores.
- **Datos:** no se modificó ningún dato de producción. Solo se hicieron lecturas.

---

## 5. Cómo aplicarlo (desde la raíz del repositorio)

1. `git apply --check cambio-frontend-diseno-2026-10-23.patch` (no debe decir nada).
2. `git apply cambio-frontend-diseno-2026-10-23.patch`.
3. En `frontend/`:
   - `npm test` debe dar 461 pruebas con las 3 fallas de siempre;
   - `npm run build` debe terminar sin errores.
4. Publicar.

**Alcance:**
- 33 archivos de `frontend/`, 6 de ellos nuevos: `modulos/modulos2.css`, `modulos/reportes.css`, `util/nombres.js` y su prueba, más `util/textoCita.js` y su prueba, que vienen del ajuste de QA33;
- no toca la pantalla de cambio de clave;
- no cambia llamadas al servidor ni datos guardados: solo cómo se muestran.
