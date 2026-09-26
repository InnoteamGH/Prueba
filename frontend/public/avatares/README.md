# Avatares genéricos del paciente

Aquí van las cuatro ilustraciones que se muestran cuando un paciente **no tiene
foto propia**. Se eligen solas según su edad y su género.

## Qué archivos poner

| Archivo | Cuándo se usa |
|---|---|
| `mujer.png`  | paciente femenino de 15 años o más |
| `hombre.png` | paciente masculino de 15 años o más |
| `nina.png`   | paciente femenino menor de 15 |
| `nino.png`   | paciente masculino menor de 15 |

Con esos nombres exactos, en minúsculas y sin tildes. Si prefieres `.webp` o
`.svg`, cambia la extensión en `AVATAR_GENERICO`, dentro de `frontend/src/comun.jsx`.

## Cómo deben ser

- **Cuadradas** (misma anchura que altura). Se recortan a un cuadrado con las
  esquinas redondeadas, así que lo que sobresalga de ese cuadrado se pierde.
- **512 × 512 px** va sobrado: el sitio más grande donde se muestran es de 88 px.
- **Fondo transparente o blanco.** Detrás se pinta el color de la ficha (teal en
  un adulto, celeste o rosa en un menor), así que un fondo de otro color chocará.
- **La cara centrada y con aire alrededor**, porque el recorte es circular por
  las esquinas.
- Cuanto más ligeras, mejor: por debajo de 60 KB cada una.

## Ojo con la licencia

Las ilustraciones de bancos de imágenes (Freepik, Adobe Stock y similares)
**necesitan licencia para usarse en un producto**, y algunas exigen atribución
visible. Antes de dejar aquí un archivo, comprueba que tienes derecho a usarlo:
es un software que se vende a clínicas, no un uso personal.

## Si falta algún archivo

No pasa nada: ese paciente muestra sus **iniciales** sobre un fondo de color. No
se ve ningún icono de imagen rota. Lo mismo si un paciente no tiene el género
registrado en su ficha — entonces tampoco se supone ninguna ilustración.

## Para cambiarlas

Reemplaza el archivo y recarga. No hay que tocar código ni volver a compilar.

## Estado actual

Las cuatro ilustraciones **ya están puestas**. Se procesaron al entrar:

| Archivo | Antes | Ahora |
|---|---|---|
| `hombre.png` | 1.052 KB | 73 KB |
| `mujer.png`  | 1.364 KB | 74 KB |
| `nina.png`   | 1.517 KB | 75 KB |
| `nino.png`   | 1.328 KB | 125 KB |

Venían entre 1.254 y 1.469 px —para un avatar que se ve a 88 px— y dos de ellas
no eran cuadradas, así que se habrían deformado. Se llevaron a un lienzo cuadrado
de 256 px con la imagen entera centrada (sin recortar nada) y fondo transparente.

`nino.png` además venía **sin canal de transparencia**: se le quitó el fondo blanco.
Se comprobó que los dientes y el brillo de los ojos, que también son blancos, no se
perdieran en el proceso.

En total, de 5.361 KB a 347 KB. Si en el futuro reemplazas alguna, pásale el mismo
tratamiento o la ficha cargará varios megas por paciente.
