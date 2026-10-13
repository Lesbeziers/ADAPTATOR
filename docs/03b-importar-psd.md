# 03b — Importar un PSD

Adaptator lee archivos **PSD y PSB** de Photoshop directamente. Ya no hace falta exportar capa por capa a PNG antes de empezar: abres el PSD, eliges qué capas quieres y con qué rol, y Adaptator las convierte en capas normales del proyecto.

A partir de ahí todo funciona igual que siempre: maquetación automática, formatos, máscaras, exportación.

---

## 1. Importar

Panel **CAPAS** → botón **`+`** → selecciona el `.psd` (o `.psb`).

Es **el mismo botón** con el que importas imágenes. Adaptator mira lo que has seleccionado y decide solo:

| Lo que seleccionas | Lo que hace |
|---|---|
| Imágenes (JPG, PNG…) | Importación normal de siempre |
| Un PSD o PSB | Abre el asistente de capas |
| Un PSD **junto a** imágenes | No importa nada y te avisa |
| Varios PSD a la vez | No importa nada y te avisa |

> ⚠️ **Aviso** — No se pueden mezclar un PSD e imágenes sueltas en la misma operación, ni importar dos PSD de golpe. En esos casos Adaptator **no toca el proyecto**: te avisa y lo haces en dos pasos con el mismo botón. Es a propósito: cada camino termina en su propio paso de asignación de roles, y encadenarlos dejaría dos ventanas peleándose.

La primera vez que abres un PSD tarda un instante más: Adaptator descarga la librería de lectura solo cuando hace falta, para no ralentizar el arranque de la app a quien no usa PSDs.

---

## 2. El asistente de capas

> 📸 *Captura: modal "Importar PSD" con el árbol de capas, miniaturas, casillas y desplegables de rol.*

Arriba ves el nombre del archivo, el tamaño del documento y cuántas capas tiene.

El árbol respeta la **jerarquía de grupos** y el **orden del panel de capas de Photoshop**: la primera fila es la capa de arriba, igual que la ves en Photoshop. Cada fila trae:

- **Casilla** — incluir o descartar esa capa.
- **Miniatura** — para reconocerla de un vistazo.
- **Nombre y tamaño** en píxeles.
- **Desplegable de rol** — FONDO / IMAGEN / TÍTULO HORIZONTAL / TÍTULO VERTICAL / FANART / NINGUNO.

El triángulo de la izquierda despliega y colapsa los grupos.

### Roles pre-asignados por nombre

Adaptator intenta adivinar el rol por el nombre de la capa, con las mismas palabras clave que usa al importar imágenes sueltas: `FANART`, `FONDO` / `BACKGROUND` / `BG_`, `MUJER` / `HOMBRE` / `SUBJECT` / `IMAGEN`, `TITULO_H`, `TITULO_V`…

Si no reconoce nada, el rol queda en **NINGUNO** y lo eliges tú.

> 💡 **Tip** — Los roles que vienen puestos son una propuesta, no una decisión. Repásalos antes de importar: de ellos depende cómo te maquete después.

> ⚠️ **Aviso** — No hay rol "Logo". Los logos oficiales se añaden con su propio botón (**Añadir logo**), que tira del catálogo de Movistar+, no desde el PSD.

### Qué viene marcado de entrada

Solo lo que es contenido de verdad. Quedan **desmarcadas**:

- Las capas que estaban **ocultas** en Photoshop (incluidas las que cuelgan de un grupo apagado — si el diseñador apagó el grupo, se respeta).
- Las capas de **anotación** de la plantilla (ver el punto 3).

Nada se esconde: todo sigue en el árbol y puedes marcarlo a mano si lo necesitas.

### Botones de selección rápida

| Botón | Qué hace |
|---|---|
| **Expandir todo** / **Colapsar todo** | Abre o cierra todos los grupos |
| **Nada** | Desmarca todo |
| **Contenido** | Marca todo lo que no sea anotación ni esté oculto |
| **Las 10 más grandes** | Marca las 10 capas de mayor superficie (ignorando anotaciones) |

---

## 3. Capas de anotación

Las plantillas de Movistar+ traen capas que **no son contenido**: textos de instrucciones, márgenes de seguridad, áreas de reserva, ejemplos de tipografía… Suelen vivir en un grupo llamado `ESPECIFICACIONES (OCULTAR CAPA AL EXPORTAR)`, `INDICACIONES EXPORTACIÓN`, `MÁRGENES DE SEGURIDAD` o `ÁREAS DE RESERVA`.

Adaptator las reconoce, las muestra **atenuadas** con la etiqueta `· anotación` y las deja **desmarcadas**. El grupo llega colapsado para que no estorbe.

> 🔧 **Detalle técnico** — El reconocimiento **se hereda del grupo**: una capa llamada `TEXTOS` es contenido si cuelga de `CREATIVIDAD`, y anotación si cuelga de `ESPECIFICACIONES`. Por el nombre suelto sería imposible distinguirlas. También se respetan las contraseñales: un grupo que dice `ELEMENTOS FIJOS (MANTENER AL EXPORTAR)` o `EXPORTAR DESDE OBJETO INTELIGENTE` cuenta como contenido, no como anotación.

Dos capas que **sí** llegan marcadas aunque lo parezcan:

- `FONDO SEGURIDAD` / `CAPA DE SEGURIDAD` — están en todas las plantillas y Adaptator las detecta como rol **FONDO**. Descartarlas te haría perder el fondo autodetectado. Si no la quieres, desmárcala.
- `EJEMPLO` — es una imagen de muestra real, no un texto de instrucciones.

---

## 4. Recortar al contenido

Arriba a la derecha del asistente hay una casilla **Recortar al contenido**, activada por defecto.

- **Activada** — cada capa se recorta a sus píxeles opacos, como cuando exportas un PNG a mano desde Photoshop. Es lo normal y lo más ligero. Un logo de 164×72 dentro de un documento de 1920×636 entra como imagen de 164×72.
- **Desactivada** — cada capa se exporta al **tamaño del documento**, conservando su posición relativa dentro del PSD. Útil si quieres mantener la composición exacta del original.

---

## 5. Importar

Pulsa **Importar**. Adaptator:

1. Rasteriza las capas elegidas a **PNG con transparencia**.
2. Las añade al panel de capas con los roles que hayas puesto.
3. Lanza la **maquetación automática** directamente, sin volver a preguntarte los roles (ya los has dado en el asistente).

Si solo hay un sujeto, aparecerá el **encuadre focal** de siempre para que lo ajustes por bandas de proporción.

---

## PSDs con muchas capas

Algunas plantillas tienen cientos de capas. Cuando hay más de 40 capas de contenido, el asistente arranca **sin nada marcado** y con los grupos **colapsados**, para que el árbol sea navegable y para que no importes 400 capas sin querer. El subtítulo te lo avisa: *"son muchas: elige las que necesites"*.

Desde ahí usa **Las 10 más grandes** o ve marcando a mano.

---

## Límites y casos especiales

### Tamaño del archivo

| Peso | Qué pasa |
|---|---|
| Hasta ~500 MB | Normal |
| 500 MB – 1,5 GB | Te pide confirmación: puede tardar o consumir mucha memoria |
| Más de 1,5 GB | **No se puede abrir** y te lo dice |

> ⚠️ **Aviso** — El límite de 1,5 GB no es un capricho: un navegador no puede cargar en memoria un archivo de ese tamaño (el techo está en unos 2 GB). Varias `SUPER_PLANTILLA` del equipo pesan entre 1,6 GB y 4,7 GB y **no se pueden importar tal cual**. Para usarlas, abre el PSD en Photoshop, descarta o aplana lo que no necesites y guarda una copia más ligera.

### Otros límites

- Máximo **600 capas** y **20.000 px** de lado (documento y capa).
- Solo **8 bits por canal**. Si el PSD es de 16 o 32 bits, vuelve a guardarlo en 8 bits desde Photoshop.
- **CMYK** se convierte a RGB automáticamente.

### Cómo se tratan los elementos de Photoshop

| Elemento | Tratamiento |
|---|---|
| **Texto editable** | Se rasteriza siempre, usando los píxeles que el PSD ya trae guardados. No necesitas tener instaladas las fuentes del partner |
| **Objetos inteligentes** | Se usa el render actual, no se desempaquetan |
| **Grupos** | Se importan aplanados en una sola capa |
| **Efectos de capa** | Solo aparecen si ya venían horneados en el píxel |
| **Capas de ajuste y formas sin rasterizar** | Aparecen como `sin píxeles` y no se pueden importar |

> ⚠️ **Aviso** — El aplanado de grupos es una **aproximación**: se pintan los hijos visibles en orden aplicando su opacidad, pero **sin modos de fusión ni máscaras de grupo**. Si un grupo usa Multiply, Screen o una máscara, impórtalo por capas sueltas y recompón en Adaptator.

### Marcar un grupo o sus hijos, no las dos cosas

Marcar un grupo y marcar sus capas son acciones **excluyentes**: si marcas el grupo, se desmarcan sus hijos, y al contrario. Así nunca importas lo mismo dos veces.

> 🔧 **Detalle técnico** — Adaptator **nunca escribe** en el PSD. La lectura es de solo lectura: tu archivo original queda intacto.

---

← [Volver al índice](MANUAL.md)
