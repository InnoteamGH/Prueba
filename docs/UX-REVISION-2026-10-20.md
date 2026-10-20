# Revisión UX/UI y diseño adaptable: Dento Check (20/10/2026)

**Qué se revisó:**
- **Sistema:** el frontend publicado en `app.odontosonrisa.biz`, con los datos de producción.
- **Perfiles:** administrador general (45 pantallas), doctora (6) y recepción (5).
- **Anchos:**
  - 1600 px: el escritorio de las capturas que mandaste;
  - 1280 px: laptop;
  - 1024 px: tablet;
  - 768 px: tablet vertical, solo en el primer pase;
  - 390 px: celular.
- **Método:**
  1. Rastreo automático que detecta texto partido, superpuesto, cortado o fuera de pantalla, selects de estilos distintos y textos internos («undefined», «Invalid Date», «a decidir»).
  2. Revisión visual de todas las capturas por revisores independientes, antes y después de corregir.
  3. Segundo pase sobre la versión corregida.

**Resultado:**
- **Corregido:** unas 100 incidencias, todas en el frontend: unas 70 de diseño y textos, y unas 30 de diseño adaptable para tablet y celular (sección 4).
- **Archivo de cambio:** `cambio-frontend-completo-2026-10-20.patch`. Incluye también el cambio de la bandeja de WhatsApp del mismo día (negrita de WhatsApp).
- **Pruebas:** 446 pruebas automáticas; fallan las mismas 3 que ya fallaban antes de los cambios. Se agregaron pruebas para la alerta de alergia y la escala de ausentismo.
- **Pendiente:** al final, lo que depende del servidor o es menor.

---

## 1. Las pantallas que reportaste

| Pantalla | Problema | Corrección |
|---|---|---|
| **Ausentismo** («Citas que se pierden») | Con 89.3 % la barra de escala 0–20 % quedaba llena y «89.3%» se montaba sobre «20%». Decía «a decidir» (texto interno) y «no cuenta» junto a «son el denominador». | La escala crece si la tasa pasa del 20 % (aquí, 0–100 %). La etiqueta de la clínica va encima de la barra. «Reprogramada» dice «fuera» y «se cuenta en su nueva fecha». La lista de estados dice «base». «Coste» pasa a «Costo». |
| **Ocupación de sillones** | No tenía sentido: todo «Libre 12 h», «Día más lleno · 0%», «Más libre · 0%». **Las citas sin sillón** (las de la IA y muchas de recepción) **no se contaban**: Surco salía en 0 % con citas el viernes. | Las citas sin sillón cuentan para la sede y aparecen en una fila «Sin sillón · asígnalo en la Agenda». Una sede sin citas muestra un mensaje en vez de 24 casillas «Libre». «Más libre» y «Día más lleno» solo aparecen cuando hay diferencias. |
| **Recetas** | «lun, 31 ago. · Dra. Carla / Mendoza» partido. La alerta salía en crudo: `[ALERTA ALERGIA — emitida con override] ["Ibuprofeno ↔ …"]`. Tarjetas de distinta altura y botones desalineados. | La fecha y el doctor van en una línea legible. La alerta sale en un recuadro: «Emitida pese a alerta de alergia: Ibuprofeno ↔ alergia a Aspirina (familia AINE)», también en el PDF y en la ficha. Tarjetas de igual altura con el pie abajo. «Sin medicamentos registrados» cuando no hay medicamentos. |
| **Enviar formulario** (y Nuevo consentimiento) | «Llega un enlace por WhatsApp a / **QA Agenda Recepción** / antes de su cita» partido en tres columnas. | Una sola frase. Mismo arreglo en 4 líneas de esos modales. |
| **Selects** | El select blanco con borde del modal no era igual en todos lados: gris (deshabilitado) en Radiografías y Fotos, translúcido sobre fondo oscuro en Odontograma y Consolidado. | Todos son campos blancos con borde y esquinas redondeadas, también los deshabilitados (texto atenuado y borde punteado) y los que van sobre las franjas oscuras. |
| **WhatsApp** | **Panel derecho cortado.** La ficha del contacto y «Agendar cita» quedaban fuera del panel. | Los bloques del panel ya no se salen de su ancho. |
| | **Próxima cita.** Salía «Próxima cita: Invalid Date». | Ahora dice «sáb, 19 dic. · 08:00». |
| | **Nota del pie.** «Tomar control» y «para responder tú» salían en columnas sueltas. | Es un solo párrafo. |
| | **Nota fuera de la pantalla.** La nota del pie quedaba debajo del borde inferior. | La bandeja descuenta el aviso «Con fallos» de arriba. |
| | **Nombre del paciente.** Decía «Ver ficha de QA». | Ahora usa nombre y apellido. |
| | **Nombres de funciones.** Los mensajes mostraban «agendar()» y «estado_pago()». | Ahora dicen «Reserva y pago», «Revisó el pago», «Buscó cupos», «Pedido de cancelación»… |
| **Laboratorio** | «Entregado» repetido en Entrega, Estado y Acción. | Entrega muestra la fecha (o el atraso), Estado muestra el estado y Acción muestra «Avanzar» o «—». |
| **Caja** | Formatos mezclados: «S/ 2,299.25» y «S/ 1580,75». | Un solo formato en toda la app, detallado en la sección 2. |
| **Puesta en marcha** | «Todo listo para operar» con 67 % y «8 de 12 pasos». Etiquetas Obligatorio/Opcional desalineadas según hubiera botón o no. Botón «Configurar en 4 pasos». | El título según el estado real: «Lista para operar, con avisos», «Lista para operar · quedan N opcionales» o «Todo listo». Columna fija para el botón. «Asistente de configuración». |
| **Integraciones** | «BOLETA —», «FACTURA —», «NC —/—». Número naranja suelto en la franja. | «Series: Sin configurar» (o «Sin serie» por tipo, y «Nota de crédito»). Cifras de la franja en un solo color. |

---

## 2. En toda la app

| Tema | Antes | Ahora |
|---|---|---|
| **Moneda** | «S/ 1 880», «S/ 1580,75», «S/ 2,299.25», «S/ 220», «+S/149». | Siempre «S/ 1,880.00»: coma de miles y dos decimales. El navegador ya no decide el formato, que antes dependía de su idioma. |
| **Hora** | «10:02 p. m.», «2/10, 10:39 a. m.». | 24 h: «22:02», «02/10, 10:39». |
| **Fechas** | «jue, 15 abr.» sin año aunque fuera del año siguiente. | El año aparece cuando no es el año en curso. Una fecha inválida muestra «—», no «Invalid Date». |
| **Títulos** | Con la letra Manrope las palabras se veían pegadas («Dóndeestálaclínica»). | Más espacio entre palabras en títulos y textos. |
| **Cabeceras de tabla** | «ÚLTIMA CI…», «PRÓXIMA …», «CATEGO…», «DURAC…». | Pasan a dos líneas en vez de cortarse. Las numéricas se alinean a la derecha, como sus valores. |
| **Nombres en tablas** | Se cortaban a mitad de letra sin «…» («QA Doctor Carla Fluj»). | Terminan en «…» y muestran el nombre completo al pasar el mouse. |
| **Botones de icono** | La clase de los botones chicos (quitar, imprimir, borrar, anular) no tenía estilo: salía el botón gris del navegador («×» de Lista de espera). | Botón blanco redondeado; los de borrar o anular, en rojo. |
| **Franjas superiores** | El subtítulo se montaba sobre las cifras («19/10 – 24/10» encima de «Libres en sillón»). | El subtítulo pasa a dos líneas. |
| **Sedes** | «San Isidro – Surco», «Surco – San Isidro» y «Sede San Isidro» en filas vecinas. | Siempre «San Isidro · Surco», en orden alfabético y con el mismo nombre corto. |

---

## 3. Otras pantallas

- **Servicios:** los nombres («Blanqueamiento denta», «Cirugía periodontal a (») y las etiquetas de especialidad («Odontología gener») se cortaban, y la columna Margen quedaba fuera de la tarjeta. Ahora los nombres pasan a dos líneas, las etiquetas también, y los anchos están ajustados para que la tabla quepa.
- **Inventario:**
  - la tabla se salía de la tarjeta («AJU…» cortado) y partía «LID-2026- / A1», «42 / d» y «+22 / cartuchos»;
  - el resumen decía «reposición sugerida de 49 unidades», sumando cartuchos con jeringas; ahora dice «3 insumos por reponer».
- **Proveedores:** la columna Categoría mostraba «última compra mar, 13 oc». Ahora la última compra va en su propia columna.
- **Compras:** los contadores no sumaban el total porque faltaban las anuladas. Ahora sí cuadran: 0 + 2 + 2 = 4.
- **Consumo:**
  - mostraba «0 Más usado»; ahora dice «Más usado: sin consumos»;
  - el texto de lista vacía explicaba cómo funciona el servidor; ahora explica qué se verá ahí.
- **Links de pago:**
  - los contadores no sumaban el total y faltaban los anulados; ahora suman;
  - se aclara «Se ven los 30 más recientes de 57».
- **Caja, ingresos y egresos:**
  - el concepto traía el código interno de Izipay («… · 17924388549950 · 9edcb490-…»); ahora no;
  - «− S/ 0.00» llevaba signo con total cero; ya no;
  - se corrigieron las tildes de «Revísalos y asígnales».
- **Caja, comprobantes de hoy:**
  - el check verde iba junto a «Pendiente de envío»; ahora lleva el ícono de comprobante;
  - los nombres pasan a dos líneas en vez de cortarse;
  - el estado se llama «Por enviar», igual que en Comprobantes SUNAT.
- **Comprobantes SUNAT:** las columnas Documento y Moneda solo aparecen si hay datos. Antes eran columnas llenas de «—» y «S/».
- **Consentimientos:** decía «100% firmados» con 22 anulados. Ahora dice «100% de los 4 vigentes, firmados».
- **Lista de espera:**
  - el «×» salía como botón nativo; ahora tiene estilo;
  - «1 Urgentes» pasa a «1 Urgente»;
  - «Cualquiera» pasa a «Cualquier doctor».
- **Radiografías y Fotos:**
  - la etiqueta «Registrar en» era invisible (blanca sobre blanco); ahora se ve;
  - el select gris pasa a blanco;
  - sin paciente elegido, dice «Elige un paciente».
- **Permisos:**
  - «Fuente de verdad: el servidor… persistir» pasa a lenguaje claro;
  - «Guardar en el servidor» pasa a «Guardar cambios»;
  - se quitó la cifra «9 acciones por módulo», que no cuadraba con «8 de 8».
- **Producción y comisiones:**
  - «Pendiente de liquidar» mostraba a la vez «sin dato», «—» y «Sin pagos registrados»; ahora es un solo mensaje;
  - «Al ritmo de su meta» ahora explica que cuenta odontólogos.
- **Resumen y panel gerencial:**
  - sin producción ya no hay puesto ni medalla; antes aparecían 2.º y 3.º con S/ 0.00;
  - «1 ventas» pasa a «1 venta»;
  - se ocultaron las etiquetas técnicas «72 NODOS» y «ROT 53°»;
  - el eje «20:0(» del gráfico ya no se corta.
- **Auditoría:** «PAGO_ANULACION» pasa a «Cobro anulado», y cualquier código nuevo se muestra legible.
- **Metas:**
  - el campo decía «S/ Sin meta»; ahora el ejemplo es «S/ 0»;
  - la nota del pie estaba partida en columnas y traía un comentario técnico; ahora es una sola frase sin él.
- **Recordatorios:** el indicador «— Entrega» pasa a «Sin envíos».
- **Usuarios:**
  - el último acceso aparece como «19/10/2026» con «22:02» debajo;
  - la columna se llama «Último acceso».
- **Pendientes de hoy:** el detalle de cada aviso usa hasta dos líneas («…S/ 220 de trabajo ya terminado, listo par…» se cortaba en el dato).

---

## 4. Diseño adaptable (tablet y celular)

Tres revisores independientes miraron las capturas a 1024 px (tablet) y a 390 px (celular) después del primer arreglo. Esto es lo que encontraron y cómo quedó.

### Tablet (1024 px)

| Problema | Corrección |
|---|---|
| **Tablas cortadas** en Servicios, Inventario y Laboratorio: se perdían Estado y los precios por sede. | Toda tabla que no cabe en su tarjeta pasa sola a **filas-tarjeta**: la persona o el producto arriba, los datos en 4–5 columnas con su etiqueta encima y las acciones a la derecha. Ya no hay columnas escondidas detrás de un scroll lateral. Si la tabla cabe, se queda como tabla. |
| **Columna de acciones encima de otra**: en Agenda Día y Usuarios tapaba «Estado»; en Pacientes, «Saldo». | La columna fija ya no puede quedar encima de otra: la tabla toma el ancho que piden sus columnas. Esto también vale en escritorio. |
| **Agenda Semana de unos 3.600 px de alto**: en un mismo día se apilaban unas 50 citas canceladas. | Con dos o más citas canceladas, no asistidas o movidas en una hora, se agrupan en «+N canceladas». Al tocarlas se despliegan. |
| **Consolidado**: «Desde» quedaba junto a los atajos y «Hasta» caía a la fila siguiente. | Los atajos de rango van en su propia fila; Desde, Hasta, Doctor y Estado quedan juntos debajo. |
| **Textos internos**: «Activo (gpt-4o)» en Puesta en marcha; código de Izipay en los comprobantes. | Dice «Activo»; el concepto se muestra sin códigos. |
| **Instrucciones de mouse en tablet**: «Pasa el ratón para leer…», «Al pasar el ratón se detiene», «Ancla las explicaciones…». | «Señala o toca la línea…», «Se detiene al señalarlo o tocarlo» y una explicación en lenguaje claro. |

### Celular (390 px)

| Problema | Corrección |
|---|---|
| **Cifras de las franjas cortadas** en 9 pantallas: «S/ 100.» en Inicio; «Recomendadas», «Comisión si cumplen» o «Pacientes, ilimitados» al borde; «Usuarios con actividad» encima de «Alertas». Iban en una fila que se deslizaba sin aviso. | En celular, las cifras van en una rejilla de 2 columnas. Todas se ven, y los montos no se parten. |
| **Laboratorio**: la cuarta etapa («Entregado») cortada. | Las 4 etapas en una fila de 4 columnas que cabe. |
| **Ausentismo**: el encabezado ilegible («Citas que 89.…», «S/ 1…»). | Las cifras van en una columna y se leen completas. |
| **Pestañas cortadas** sin aviso en Caja, Inventario, Permisos, Auditoría y Más reportes; en Caja › Historial no se veía la pestaña activa. | En celular, todas las pestañas a la vista, en dos filas si hace falta. En tablet, la activa se centra y un degradado avisa que hay más. |
| **Ocupación de sillones**: la columna «Sillón» ocupaba media pantalla y los días se cortaban. | La columna del sillón es angosta y queda fija; los días se deslizan a su lado. |
| **Configuración**: el menú en 2 columnas cortaba «Datos de la clíni…», «Horario de aten…». «WhatsApp conectado» quedaba aplastado por el botón «Revisar». | El menú va en una columna con los nombres completos. El botón del paso baja bajo el texto. |
| **Permisos**: la descripción del rol ocupaba 8 líneas en una columna de unos 120 px. | La descripción va a todo el ancho y las cifras debajo. |
| **Integraciones**: «Facturación electrónica» se salía de su chip; «Usa el número compartido…» quedaba en una columna de unos 140 px. | Los chips no parten su texto; el estado de cada sede baja a su propia línea. |
| **Consolidado**: «Cerradas por sistema» desalineaba su cifra. | Las cifras van en 3 columnas parejas. |
| **Barra superior sin título** en Caja, Permisos, Auditoría y otras subpantallas. | Muestra el nombre del módulo («Caja», «Permisos por rol», «Auditoría y accesos»…). |
| **Franja gris en el borde izquierdo**: era la sombra del menú cerrado. | El menú cerrado no tiene sombra. |
| **Toques chicos**: chips de WhatsApp y del catálogo de unos 24–28 px; selector de sede de Caja. | Al menos 34–36 px de alto. |
| **Filas de chips deslizables** (Laboratorio, Auditoría) cortadas sin aviso. | Un degradado en el borde derecho avisa que hay más. |
| **Recetas**: la papelera pegada a «Imprimir receta». | La papelera va al otro extremo de la tarjeta. |
| **Tratamientos** sin paciente: «+ Procedimiento» gris, sin explicación. | Dice «Elige un paciente» y el botón aparece al elegirlo. |
| **Radiografías**: «Registrar en … · Subir radiografía» se salía de la pantalla. | Ocupa el ancho disponible. |

**Del primer pase (siguen corregidos):**
- **WhatsApp:** a 1500–1700 px, sobre todo con el zoom automático de la app, el panel derecho se cortaba. Ahora sus bloques se ajustan al ancho. En tablet el panel se abre encima con el botón de información.
- **Producción y Ausentismo por odontólogo:** a 768–960 px, «Comisión» y «Costo» quedaban fuera de la pantalla. Ahora usan la tabla compacta de 3 columnas.
- **Títulos de tarjeta en celular:** «Dónde está la clínica» se encogía a 7 px de ancho. Ahora la nota y el botón (i) bajan de línea.

---

## 5. Pendiente

**Depende del servidor o de los datos:**
- **Saltos de línea a mitad de frase** en los mensajes de la IA («si el pago no entra a esa / hora»). Vienen así del servidor.
- **«Top del equipo» suma S/ 80 y «Producción del mes» dice S/ 220.** Hay producción sin médico asignado: hay que confirmar cómo la reparte el servidor.
- **Ausentismo de 89.3 %.** Es real con los datos actuales: casi todas las citas de octubre son citas de prueba canceladas por el QA. Con datos reales bajará.
- **Mi plan:** muestra «—» si no llega el conteo de sedes y doctores (el servidor responde 503 con carga).
- **Integraciones:** Izipay y Niubiz aparecen para «Conectar», aunque Caja ya recibe pagos de Izipay. El estado debería venir del servidor.

**Menores (siguiente ronda):**
- los campos de fecha son los del navegador: en uno en inglés muestran mes/día («10/19/2026»); en uno en español, día/mes. La página ya declara «es-PE»;
- en celular, las listas largas (Pacientes, Usuarios, Auditoría) siguen siendo largas: conviene paginar o plegar datos secundarios;
- en celular, la vista Semana de la Agenda muestra unos 2 días y medio; para el día a día conviene la vista Día;
- la etiqueta «Hoy» del chat flota sobre los mensajes;
- en Mi agenda, las etiquetas «S1»/«S2» del calendario;
- las estrellas parciales en Satisfacción;
- en Comprobantes SUNAT, los avisos amarillos repetidos.

**Registros:** esta revisión no creó ni modificó datos; solo navegó.
