# Datos reales de la clínica: OdontoSonrisa (16/10/2026)

Hoy producción tiene datos de demostración: «Clínica Dental Sonríe+», RUC 20123456789, sedes San Isidro y Surco. Este documento trae los datos reales para reemplazarlos.

**Fuentes:**
- Ficha RUC de SUNAT (consulta del 07/04/2026).
- Lista de precios por sede (planilla «copia de precios de sedes»).
- Direcciones de las sedes confirmadas por la clínica (12/10/2026).

**Archivos que acompañan este documento** (carpeta `datos-reales/`):
- `servicios-precios-por-sede.csv`: se abre en Excel.
- `servicios-precios-por-sede.json`: para cargar por script.

Los dos traen las mismas 242 filas, con estas columnas:

| Columna | Qué es |
|---|---|
| `codigo` | Número de ítem en la planilla de la clínica. |
| `servicio` | Nombre tal como viene en la planilla. |
| `tipo` | `servicio`, `pack` o `producto` (venta de cepillos, pastas, etc.). |
| `categoria_sugerida` | Propuesta del QA por palabras clave; revisarla. |
| `moneda` | `PEN` o `USD`. |
| `precio_los_olivos`, `pago_dr_los_olivos` | Precio al paciente y pago al doctor en Los Olivos (S/). |
| `precio_miraflores`, `pago_dr_miraflores` | Lo mismo en Miraflores. Vacío = no se ofrece en esa sede. |
| `disponible_los_olivos`, `disponible_miraflores` | `sí` / `no`. |
| `nota_planilla` | Nota escrita por la clínica en la planilla (interna, no es para el paciente). |
| `observaciones` | Lo que el QA marcó para confirmar. |

> **El QA no cambió nada de esto en producción**, porque no toca `/clinica` ni `/sedes`. La carga la hace el programador; la próxima revisión de QA verifica lo cargado (sección 7).

---

## 1. Empresa (`/clinica`)

| Campo | Hoy (demo) | Real |
|---|---|---|
| Nombre comercial | Clínica Dental Sonríe+ | **OdontoSonrisa Clínica Dental** (en SUNAT: «ODONTOSONRISA CLINICA DENTAL») |
| Razón social | Sonríe Mas S.A.C. | **PEZZUTTI FAMILY DENTISTRY S.A.C.** |
| RUC | 20123456789 | **20612478636** |
| Domicilio fiscal | Av. Javier Prado Este 4200, San Isidro | **Av. Santiago Antúnez de Mayolo 1094, Int. 201, Urb. Covida Et. Uno, Los Olivos, Lima** (referencia: altura del Mercado de Covida) |
| Teléfono | 900000000 | Fijo **(01) 233-4998**; móviles **925 853 583** y **945 459 599**. Falta que la clínica diga cuál se publica. |
| Correo | (vacío) | **gvasquezp123@gmail.com** (correo 1 de SUNAT) |
| Web | (vacío) | No informada. |

**Otros datos de SUNAT:**
- **Estado:** ACTIVO / HABIDO.
- **Tipo:** Sociedad Anónima Cerrada.
- **Fechas:** inscripción 16/04/2024; inicio de actividades 01/05/2024.
- **Actividad:** CIIU 8620, actividades de médicos y odontólogos.
- **Comprobantes:** emisor electrónico desde 03/05/2024, de **factura y boleta**.
- **Tributos:** IGV (operación interna, cuenta propia), **Renta MYPE Tributario**, Renta de 5.ª categoría, EsSalud y SNP.
- **Partida registral:** 15616206.
- **Representante legal:** Gerente General, Fanny del Rocío Pezzutti Laynes. Este documento no copia sus datos personales.
- **Correo 2 de SUNAT** (`jvsestudiocontable@hotmail.com`): parece ser del estudio contable. No usarlo como contacto público.

**Comprobantes:** hoy la serie configurada es `B001`. Confirmar con la clínica las series autorizadas de boleta y factura antes de emitir.

---

## 2. Sedes (`/sedes`)

Son **dos sedes reales** y reemplazan a las dos de la demo.

| Sede | Dirección (para el paciente) | WhatsApp |
|---|---|---|
| **Sede Miraflores** | **Av. Alfredo Benavides 2150, Oficina 503, Miraflores, Lima** | **El número que hoy está conectado es de esta sede.** Cargar `whatsappNumero` y `whatsappPhoneNumberId` (el programador los tiene en la configuración de Meta). |
| **Sede Los Olivos** | **Av. Antúnez de Mayolo 1094-A, Oficina 201, Los Olivos, Lima** | Sin número propio por ahora. |

**Notas:**
- **Dirección de Los Olivos:** la clínica la escribe «1094-A, Oficina 201»; SUNAT dice «1094, Interior 201». Al paciente se le muestra la de la clínica, y en los comprobantes va el domicilio fiscal de SUNAT.
- **Un solo número para las dos sedes:** mientras Los Olivos no tenga número, el de Miraflores atiende ambas. La IA debe preguntar la sede cuando el paciente no la diga, y no asumir Miraflores. Si después Los Olivos tiene su número, se agrega en su sede.
- **Cómo actualizar** (sugerencia): editar las dos sedes existentes en lugar de borrarlas, para que no se rompan las relaciones:
  - `…a1` (San Isidro) → **Sede Miraflores**;
  - `…a2` (Surco) → **Sede Los Olivos**.

  Las citas y los pagos de prueba de la demo quedan con la sede renombrada. Antes de salir en vivo, limpiar los datos de demostración.
- **Textos de la IA:** el nombre y la dirección de la sede deben salir de `/sedes`, no del texto del prompt. Hoy la confirmación dice «📍 Sede Surco»; con los datos reales diría, por ejemplo, «📍 Sede Miraflores · Av. Alfredo Benavides 2150, Of. 503».

---

## 3. Servicios y precios (`/servicios`)

### 3.1 Qué trae la planilla

| | Cantidad |
|---|---|
| Ítems con descripción | **242** |
| Servicios clínicos | 188 |
| Packs (consulta + procedimientos) | 10 |
| Productos de venta (cepillos, pastas, enjuagues, etc.) | 44 |
| Con precio en las dos sedes | 176 |
| Solo en Los Olivos | 66 (42 productos y 24 servicios) |
| Solo en Miraflores | 0 |
| En dólares | 4 (Clincheck e Invisalign Lite, Moderate y Comprehensive) |

**Ejemplos**, en soles (precio al paciente y pago al doctor):

| Ítem | Servicio | Los Olivos: precio | Los Olivos: pago al doctor | Miraflores: precio | Miraflores: pago al doctor |
|---|---|---|---|---|---|
| 28 | Consulta general | 50 | 16 | 100 | 30 |
| 138 | Consulta ortodoncia | 50 | 16 | 100 | 30 |
| 199 | Consulta odontopediatría | 50 | 16 | 120 | 38 |
| 229 | Consulta endodoncista | 200 | 32 | 200 | 32 |
| 278 | Pack diagnóstico (consulta + 4 Rx) | 120 | 32.5 | 220 | 32.5 |
| 1 | Flúor barniz | 80 | 25.6 | 120 | 31.48 |
| 7 | Endodoncia unirradicular (anteriores) | 700 | 230 | 950 | 250 |

**Consulta general en Miraflores:** la nota de la planilla dice «marcha blanca 100 soles, precio regular 150». Cargar 100 y cambiarlo a 150 cuando la clínica lo indique.

### 3.2 Cambios en el modelo de servicio que hacen falta

1. **Pago al doctor por servicio y por sede.**
   - **Qué pide la clínica:** un **monto fijo en soles** por cada servicio y cada sede; por ejemplo, la consulta general paga S/ 16 en Los Olivos y S/ 30 en Miraflores.
   - **Qué tiene hoy el sistema:** un **% por doctor** (`porcentajeComision`, 40 % en la demo), que no sirve para esto.
   - **Qué agregar:** `pagoMedicoSede: { [sedeId]: monto }` en cada servicio.
   - **Cálculo en `/comisiones` y «Producción y comisiones»:** la comisión de un doctor es la suma de `pagoMedicoSede[sede]` de cada procedimiento atendido en esa sede.
   - **Si un servicio no tiene pago definido:** mostrarlo como «sin pago definido», nunca como 0 ni con el %.
2. **Servicio que no se ofrece en una sede.**
   - **Problema:** hoy, si un servicio no tiene precio en una sede, se usa `precioBase`. Así, los 66 ítems que solo existen en Los Olivos aparecerían en Miraflores con un precio inventado.
   - **Qué hacer:** si no hay precio en una sede, el servicio **no se ofrece ahí**. Ni la agenda, ni la IA, ni Caja deben ofrecerlo.
   - **Cómo marcarlo:** que falte la clave en `preciosSede`, o un campo `sedesDisponibles`.
3. **Moneda por servicio:** 4 ítems están en dólares (`moneda: "USD"`). La Caja ya maneja USD y tipo de cambio.
4. **Productos de venta:**
   - Los 44 productos (cepillos, pastas, enjuagues, kits) no son procedimientos clínicos y su pago al doctor es 0.
   - No deben poder agendarse ni salir en el odontograma ni en los planes de tratamiento; solo se cobran en Caja.
   - **Propuesta:** categoría «Productos» con `agendable: false`, o cargarlos en Inventario con precio de venta.
5. **Código:** usar el número de ítem de la planilla (`codigo`, p. ej. «28»), que es como la clínica los conoce.
6. **`precioBase`:** usar el de Los Olivos, que es la única sede que tiene todos los ítems. Solo sirve de referencia, porque el precio real siempre sale de `preciosSede`.
7. **Duración (`duracionMin`):** la planilla no la trae.
   - Sin la duración, la agenda y la IA no pueden calcular cupos.
   - Mientras la clínica la entrega, usar 30 minutos en consultas y controles y pedirle el resto.
8. **Costo directo (`costeDirecto`):** la planilla no lo trae. Las notas hablan de costos de laboratorio que la clínica todavía está revisando. Dejarlo vacío.
9. **Servicios de la demo:** desactivar los 22 servicios actuales (no borrarlos, por el historial de pruebas).

**Precio del link de pago por WhatsApp:**
- El importe sale del servicio en la sede de la cita.
- **Consulta general:** S/ 100 en Miraflores y S/ 50 en Los Olivos. Hoy el link es de S/ 50 en Surco.
- La IA debe cotizar el precio de la sede que eligió el paciente.

### 3.3 Para confirmar con la clínica

| Qué | Ítems |
|---|---|
| **Pago al doctor vacío en Miraflores** | 54, 66, 78, 80, 87, 104, 110, 266, 274, 275, 292, 293, 294, 297, 303, 306, 311, 317, 319, 320. Para 274 y 275 la nota dice «se estipula 130». |
| **Pago al doctor 0 en un servicio clínico** (no producto) | 8, 9, 104, 110, 116, 150, 151, 211, 228, 266, 273, 292, 293, 294, 297, 299, 301, 302, 303, 305, 306, 307, 308, 309, 310, 311, 313, 317, 319, 320, 321, 322, 323, 324, 326. La endodoncia 7 tiene la nota «preguntar al endodoncista (pago por doctor de Los Olivos)», y la 8 y la 9 están marcadas igual; para 151, «falta pago por doctor». |
| **No se ofrece en Miraflores** | 27, Sedación consciente («NO VA VER»). |
| **Marcados en rojo en la planilla** | 27, 62, 76, 82, 90, 91, 101, 137, 144, 151, 211, 274, 275. Se desconoce qué significa el rojo. |
| **Diferencia de precio rara** | 102, Máscara de Petit + Hyrax: Los Olivos S/ 500, Miraflores S/ 3000 (¿error de tipeo?). |
| **Más caro en Los Olivos que en Miraflores** | 151, Sedación endovenosa 1 h (1950 frente a 1900); 211, Sedación endovenosa 2 h (3000 frente a 2600). |
| **Pago probablemente mal tipeado** | 145, Control preventivo medical: pago en Miraflores 50.8, cuando el resto de packs similares paga 50.88. |
| **Filas sin descripción** | 43 (al lado dice «REPOSICION DTES. PPR CON BM ENTERA»), 169, 170 y 174. |
| **Fila sin número de ítem** | «PORTA FERULA INTERNACIONAL» (S/ 50, Los Olivos). |
| **Nombres con errores de tipeo** | 324 «COMPLEA», 308 «INATALACION», 124 «ORTONAGTICA», 322 «INVISALING», 172 «HOWLEY» (Hawley), 259 y 272 «ENJUAGLE», 91 «BUCCALSHELFT», 301 «ATTACHMEN». Conviene corregirlos al cargar. |

**Notas internas de la planilla** (no son para el paciente):
- costo de hora-sillón: **S/ 32.49**;
- 4 sillones: **832 horas al mes**;
- notas sobre costos de laboratorio (Cúspide, lista de precios, «se le quita el 18 %… queda el 32 %»).

---

## 4. Lo que todavía falta pedir a la clínica

1. **Doctores reales:** los 6 actuales son de la demo. Para cada uno: nombre, COP, especialidad, sede o sedes y horario en cada sede.
2. **Horario de atención** de cada sede.
3. **Sillones por sede:** la planilla habla de 4 sillones en total.
4. **Teléfonos a publicar:**
   - el teléfono de cada sede;
   - el número de WhatsApp de Los Olivos, si lo tendrá.
5. **Correo y web públicos.**
6. **Series autorizadas** de boleta y factura.
7. **Duración de cada servicio:** al menos de los que agenda la IA (consultas, controles y profilaxis).
8. **IGV:** si los precios de la planilla **incluyen IGV**. El sistema muestra el desglose sin IGV / IGV / total; asumimos que lo incluyen, como en todo precio al consumidor.
9. **Las observaciones del punto 3.3.**

---

## 5. Orden sugerido de carga

1. Respaldar la base de datos.
2. Hacer el cambio de modelo en el backend: `pagoMedicoSede`, servicio no disponible en una sede, `moneda` y productos no agendables.
3. Cargar la empresa en `/clinica` (sección 1).
4. Renombrar y actualizar las dos sedes en `/sedes`, con el WhatsApp actual en **Miraflores** (sección 2).
5. Cargar los servicios desde `servicios-precios-por-sede.json` y desactivar los 22 de la demo.
6. Actualizar los textos de la IA para que tomen sede, dirección y precio de la base de datos.
7. Avisar al QA.

---

## 6. Qué verificará el QA en la próxima revisión

**En la API:**
- `/clinica`: RUC 20612478636, razón social, nombre comercial y domicilio fiscal.
- `/sedes`: 2 sedes con sus direcciones y el WhatsApp en Miraflores.
- `/servicios`: 242 ítems (o los que la clínica confirme).
  - Precio y pago al doctor por sede, comparados contra el CSV fila por fila.
  - Los 66 ítems de Los Olivos no se ofrecen en Miraflores.
  - Los 4 ítems están en dólares.

**En el sistema:**
- La comisión de un procedimiento atendido usa el pago al doctor de esa sede.
- **IA de WhatsApp:**
  - cotiza la consulta en S/ 100 en Miraflores y S/ 50 en Los Olivos;
  - el link de Izipay sale por ese importe;
  - la confirmación muestra la sede y la dirección reales.
- **Comprobantes y documentos:** el membrete muestra la razón social, el RUC y la dirección de la sede.
