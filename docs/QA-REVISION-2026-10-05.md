# QA de revisión: Dento Check (05/10/2026, segunda ronda)

Se volvió a probar todo en producción después de la última ronda de correcciones:
- se llamó a la API directamente con los usuarios demo;
- se recorrieron las pantallas de `app.odontosonrisa.biz` con 6 perfiles: recepción, doctora, administrador general, administrador de sede, gerencia y TI.

Los datos de prueba llevan «QA» en el nombre.

**Resultado general:** se corrigió casi todo.
- En el recorrido de los 6 perfiles hubo **0 errores en pantalla y 0 llamadas a la API con error**.
- La web publicada tiene la última versión del frontend, con la corrección de servicios incluida.

---

## 1. Verificado como corregido ✅
- **Pacientes nuevos (B2):** ya aparecen en el listado de recepción y del administrador, y sus saldos salen en Caja → «por cobrar».
- **Datos entre sedes:**
  - la doctora de Surco ya no puede abrir la ficha, la historia, las recetas, las radiografías, el odontograma ni el periodontograma de un paciente de San Isidro (403);
  - reseñas, laboratorio, disponibilidad, sillones y egresos ya se filtran por sede;
  - un envío de laboratorio nuevo guarda su sede y solo lo ve esa sede.
- **Doctora:**
  - borra su propio bloqueo;
  - lee los datos de la clínica para imprimir;
  - ve el registro de actividad del paciente.
- **Permisos de lectura:**
  - recepción ya lee laboratorio, consentimientos y auditoría;
  - el administrador de sede, consentimientos, resumen de tratamientos y usuarios;
  - gerencia, usuarios;
  - TI, salud de WhatsApp, sillones y datos de impresión.
- **Rutas nuevas:** `/sillones/asignaciones`, `/facturacion-electronica/config`, `/facturacion-electronica/comprobantes` y `/disponibilidad/mi`.
- **Metas por sede:** `PUT /medicos/{id}/metas/{sedeId}` ya existe.
- **Caja:**
  - el cierre ya calcula el esperado en soles con los egresos (S/ 50 − S/ 3 = S/ 47);
  - el cierre del día ya suma en «efectivo» lo cobrado en dólares.
- **`GET /sillones`:** 10 de 10 respuestas correctas, sin el error 500.
- **Horario de la Dra. Carla:** ya está solo en San Isidro.

---

## 2. Sigue pendiente

### 2.1 Importante
1. **El cierre del día no filtra por sede.**
   - `GET /pagos/cierre?fecha=2026-10-04&sedeIds=<Surco>` devuelve los 2 cobros de San Isidro (S/ 28.75 de «QA Prueba Doctor»).
   - Con el usuario de recepción de Surco devuelve lo mismo, con o sin `sedeIds`.
   - Recepción de Surco ve en su cierre los cobros de San Isidro.
2. **Cierre de caja en dólares.**
   - Con fondo US$ 10 y sin cobros en dólares, el servidor devuelve `efectivoEsperadoUsd: 0`, cuando debería ser 10.
   - Tiene que sumar el fondo en dólares más los cobros en dólares y restar los egresos en dólares.
3. **`PUT /medicos/{id}/metas/{sedeId}` acepta un médico que no existe.** Con `medicoId 00000000-0000-0000-0000-00000000dead` respondió 200 y guardó la meta. Debe responder 404, y hay que borrar ese registro de prueba.
4. **WhatsApp por sede:**
   - recepción de San Isidro ve los 18 chats, incluido uno de un paciente de Surco y 10 sin paciente asociado;
   - recepción de Surco no ve ninguno.
   - Hay que asignar la sede por el número de WhatsApp o por el paciente, y no mostrar los chats de la otra sede.

### 2.2 Menores
5. **`POST /tratamientos/{id}/fases`** sigue descartando `cara`: se envió `"cara": "V"` y volvió `null`.
6. **`/pacientes/resumen`** sigue incluyendo pacientes archivados: 47 frente a 43 del listado, porque incluye «QA ARCHIVADO» ×3 y «QA Oleada D».
7. **`PATCH /citas/{id}/checkin`** sigue aceptando citas futuras: marcó la llegada de una cita del 09/10.
8. **`/medicos`** sigue sin devolver `sedes[]` ni el nombre de la especialidad.

### 2.3 No se volvieron a probar en esta ronda
- `/radiografias` con `piezas`, y fotos con `vista` y `momento`.
- El estado `cerrada_sistema` en `/ficha360`.
- Las imágenes guardadas en base64.
- Que el login obligue a cambiar una clave temporal.
- Que `PUT /automatizaciones` rechace una plantilla vacía.

---

## 3. Datos de la clínica (siguen igual)
1. **Catálogo:**
   - los 14 servicios de `/servicios` no tienen `codigo`, `hallazgos` ni `preciosSede`;
   - no hay servicios periodontales (IHO, PRO, RAR, REE, CIR, FUR, FER y MAN), por eso la proforma periodontal sale en S/ 0;
   - sin `hallazgos`, el odontograma no puede «pasar al presupuesto».
2. **RUC 20123456789:** no es válido en SUNAT.
3. **Dirección de la clínica:** está vacía en `/clinica`.
4. **Insumos:** los 5 están sin sede y aparecen iguales en las dos sedes.
5. **Usuario ajeno «T»** (t2@t.pe): eliminarlo.

---

## 4. Registros de prueba para borrar al final
- **Pacientes:**
  - QA Prueba Recepción (99100201)
  - QA Recepción Curl (99100202)
  - QA Agenda Recepción (99100203)
  - QA Cancelar Recepción (99100205)
  - QA Prueba Doctor (99260410)
  - QA Reverificacion Octubre (99100510)
- **Citas:**
  - 05/10 a las 11:30, 14:00 y 15:00 (canceladas);
  - 09/10 a las 10:00 y 10/10 a las 09:00, con la Dra. Carla.
- **Datos clínicos de «QA Prueba Doctor»:**
  - el plan con 2 procedimientos («QA Endodoncia molar» quedó terminada);
  - la evolución, la receta, 2 radiografías y 1 foto;
  - el odontograma y el periodontograma.
- **Caja:**
  - jornadas QA con fecha 04/10 en San Isidro y Surco, las dos cerradas;
  - 2 cobros de «QA Prueba Doctor» (S/ 10 y US$ 5);
  - 2 egresos «QA egreso prueba» de S/ 3.
- **Meta de prueba:** la del médico inexistente `…dead` en San Isidro (punto 2.1.3).
- **WhatsApp:** el mensaje «QA prueba recepción (ignorar)» en el chat «QA Smoke WA2».
- **Usuario:** «QA Usuario Prueba» (qa.prueba+20261004@sonrie.pe), desactivado.
- **Ya borrados:** los envíos de laboratorio, los bloqueos, el seguro y la fase de prueba de esta ronda.
