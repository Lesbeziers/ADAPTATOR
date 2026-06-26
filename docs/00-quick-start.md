# Quick-start — Tu primer proyecto en 10 minutos

Vas a:

1. Abrir Adaptator.
2. Importar una imagen y un título.
3. Ver cómo Adaptator coloca todo automáticamente en **todos los formatos**.
4. Ajustar 2 detalles a mano.
5. Exportar.

Sin teoría. Si después quieres entender por qué funciona como funciona, salta a [Conceptos clave](01-conceptos.md).

---

## 1. Abrir Adaptator

Abre el archivo `index.html` del proyecto en tu navegador (Chrome o Safari). Ves esto:

> 📸 *Captura: pantalla inicial vacía con el panel izquierdo de modalidades.*

A la izquierda tienes el panel de control (modalidades, capas, transformaciones). A la derecha, el lienzo del formato activo.

> 💡 **Tip** — Si te llegó como ZIP, descomprime antes y abre el `index.html` con doble clic.

---

## 2. Elige una modalidad

Arriba a la izquierda, **MODALIDADES** → selecciona **Dispositivos**.

Aparecen los formatos: 199 PUBLI, AD PAUSE, APPLE TV, MUX4 FONDO, MOVIL MUX FONDO, etc. Esos son los formatos finales que vas a generar.

Click en **CARÁTULA H** (te lo recomiendo para empezar — es 1920×1080, fácil de visualizar).

---

## 3. Importa una imagen y un título

Panel **CAPAS** → botón **`+`** abajo a la izquierda → selecciona dos archivos:

- Una **imagen de fondo o sujeto** (cualquier JPG/PNG bonito).
- Una **imagen de título** (un PNG con el título de la pieza, con transparencia).

Adaptator detecta automáticamente qué es cada cosa por el nombre del archivo (si pone "TITLE" en el nombre, lo detecta como título). Pero te abre un **modal de roles** para que confirmes:

> 📸 *Captura: modal de asignación de roles con tres dropdowns: FONDO / IMAGEN / TÍTULO HORIZONTAL.*

Para esta prueba:

- Imagen bonita → rol **IMAGEN** (sujeto principal).
- Imagen del título → rol **TÍTULO HORIZONTAL**.

Pulsa **APLICAR**.

---

## 4. La magia: ya está maquetado

Sin haber tocado nada más, Adaptator ha:

- Posicionado tu imagen en CARÁTULA H respetando la zona de seguridad.
- Posicionado el título en la zona reservada para texto.
- Generado las **composiciones horneadas** (MUX4, MOVIL, AMAZON, TEXTO H/V) — son las "cápsulas" de texto que se ven en los banners.
- Aplicado la misma maquetación a **todos los formatos** de la modalidad.

Click en otros formatos del panel izquierdo (199 PUBLI, MUX4 FONDO, AD PAUSE…) y verás que la composición se adapta automáticamente a cada uno.

> ⚠️ **Aviso** — A veces los formatos verticales o muy estrechos quedan raros y necesitas ajustar a mano. Eso es normal y se ve en el punto 6.

---

## 5. Ver el resultado de todos los formatos a la vez

Arriba a la izquierda, junto a "EDITOR", hay un botón **VER TODAS**. Pulsa.

> 📸 *Captura: vista en mosaico con todos los formatos generados.*

Esta es la vista que muestras al cliente: todos los formatos resueltos en una sola pantalla. Útil para ver de un vistazo si algo chirría.

Vuelve a **EDITOR** para seguir trabajando.

---

## 6. Ajustar manualmente en un formato concreto

Pongamos que en **MUX4 FONDO** la imagen quedó muy a la izquierda y prefieres centrarla.

1. Click en **MUX4 FONDO** en el panel izquierdo.
2. Click en la capa de la imagen en el panel **CAPAS**.
3. Arrastra la imagen en el lienzo, o usa el panel **TRANSFORMAR** abajo a la izquierda:
   - **ESCALA** → tamaño.
   - **GIRO** → rotación.
   - **TRANSPARENCIA** → opacidad.
   - **DESENFOQUE**, **RUIDO**, **BRILLO**, **CONTRASTE**, **SATURACIÓN** → ajustes.

> 💡 **Tip** — Con las flechas del teclado mueves la capa 1 píxel. Con shift, 10 píxeles.

El ajuste vale **solo para MUX4 FONDO**. Otros formatos quedan como estaban.

---

## 7. Exportar

Arriba a la derecha → **EXPORTAR IMÁGENES**.

Adaptator genera un ZIP con todos los formatos en JPG/PNG, cada uno respetando su tamaño máximo en MB y su DPI. Listo para enviar a producción.

---

## ¿Y ahora qué?

Acabas de hacer un proyecto básico en 10 minutos. Pero Adaptator hace mucho más:

- **Distintas variantes A/B/C** del mismo formato → [Maquetación](05-maquetacion.md).
- **Sombras blureadas** con máscaras estilo Photoshop → [Máscaras](07-mascaras.md).
- **Composiciones horneadas** para texto MUX4 / MOVIL / AMAZON → [Textos y composiciones](04-textos.md).
- **Formatos especiales**: SIL (silueta), PERFIL (circular), Fanart MOD N → [Sistemas especiales](08-sistemas-especiales.md).
- **Guardar y volver a abrir** sin perder nada → [Proyecto](02-proyecto.md).

Si entendiste el quick-start, lo demás se lee bien. Si algo te chirría, empieza por [Conceptos clave](01-conceptos.md) — son 5 minutos y te ahorran muchas vueltas.

---

← [Volver al índice](MANUAL.md) · Siguiente → [01 — Conceptos clave](01-conceptos.md)
