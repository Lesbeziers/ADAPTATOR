# Manual de uso — Adaptator

**Adaptator** es la herramienta de Movistar+ para adaptar la gráfica de una pieza audiovisual (cine, series, deportes, eventos) a todos los formatos que necesita la plataforma — banners, fondos, módulos, fanart, perfiles, marcos, posters, smartphone, web…

Una sola maquetación, todos los formatos resueltos. Si lo tocas en uno, se propaga al resto inteligentemente.

---

## Para quién es este manual

- **Diseñador que abre Adaptator por primera vez.** Empieza por el [Quick-start](00-quick-start.md): 10 minutos y entiendes el flujo.
- **Diseñador con experiencia que quiere profundizar.** Salta a los bloques temáticos según el caso de uso que tengas entre manos.
- **Diseñador que necesita un dato concreto.** Última sección de [Referencia rápida](10-referencia.md): tablas con todos los formatos, MB, DPI y atajos.

---

## Índice

### Empezar

- **[00 — Quick-start](00-quick-start.md)**
  Tu primer proyecto en 10 minutos. Sin teoría, todo manos a la obra.

- **[01 — Conceptos clave](01-conceptos.md)**
  Qué es una capa, un formato, una modalidad, una composición horneada. Vocabulario común para que el resto del manual se lea fluido.

### Gestionar el proyecto

- **[02 — Proyecto](02-proyecto.md)**
  Abrir, guardar, recuperar. ZIP vs JSON, qué se guarda dónde, cómo compartirlo con un compañero.

- **[03 — Importar y organizar capas](03-importar-capas.md)**
  Imágenes, logos oficiales, texto, sólidos, degradados. Roles de capa (sujeto, fondo, fanart, título). Orden Z, bloqueo, enlace.

### Componer

- **[04 — Textos y composiciones](04-textos.md)**
  Títulos horizontal/vertical, composiciones MUX4 / MOVIL / AMAZON / TEXTO H/V. El lápiz para elegir variante de texto por formato.

- **[05 — Maquetación](05-maquetacion.md)**
  Auto-layout: una imagen → todos los formatos colocados solos. Variantes A/B/C. Ajustar manualmente. Propagar cambios entre formatos.

### Afinar el resultado

- **[06 — Efectos y filtros](06-efectos.md)**
  Desenfoque, ruido, brillo, contraste, saturación, tintar. Modos de capa (Multiply, Screen, Overlay…). Transparencia y rotación.

- **[07 — Máscaras](07-mascaras.md)**
  Recorte estilo Photoshop con halo opcional. Caso típico: sombras blureadas que respetan la silueta de una imagen.

### Casos especiales por formato

- **[08 — Sistemas especiales](08-sistemas-especiales.md)**
  SIL (silueta), PERFIL (circular), Fanart MOD N, pastilla publicitaria, marcas Sony e iPlus, moldura Fanart.

### Salida final

- **[09 — Exportación](09-exportacion.md)**
  Generar todos los formatos en JPG/PNG. Mockups con marcos. Tamaños máximos por formato.

### Referencia

- **[10 — Referencia rápida](10-referencia.md)**
  Tabla completa de formatos (dimensiones, MB máximos, DPI, fondos). Atajos de teclado. Glosario.

---

## ¿Qué es nuevo?

Las versiones recientes han añadido:

- **Sistema de máscaras Photoshop-style** ([capítulo 7](07-mascaras.md)) — recortes con halo, drag&drop, propagación entre formatos.
- **Sincronización inteligente entre formatos** — al modificar una capa o aplicar maquetación automática, las máscaras se reposicionan manteniendo su relación visual con la imagen.
- **Save/load robusto** — JSON autosuficiente con imágenes embebidas, ZIP autosuficiente, modo carpeta descomprimida.

---

## Convenciones del manual

A lo largo de los capítulos verás:

> 💡 **Tip** — atajo o forma más rápida de hacer algo.

> ⚠️ **Aviso** — comportamiento que sorprende si no lo conoces.

> 🔧 **Detalle técnico** — para los curiosos. Saltable si solo quieres el "cómo".

Las capturas de pantalla acompañan al texto para que puedas comparar lo que lees con lo que ves en la app.

---

## Soporte

Si encuentras un bug, una incoherencia entre lo que pone el manual y lo que hace la app, o una feature que falta documentar, ponte en contacto con **matias.cortinabatista@telefonica.com**.
