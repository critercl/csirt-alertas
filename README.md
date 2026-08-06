<div align="center">

# 🛡️ CSIRT Alertas

**Extensión de GNOME Shell que muestra las últimas alertas de ciberseguridad del [CSIRT de Chile](https://csirt.gob.cl) en la barra superior de tu escritorio.**

[![GNOME Shell](https://img.shields.io/badge/GNOME%20Shell-46--50-4A86CF?logo=gnome&logoColor=white)](https://www.gnome.org/)
[![License: GPL v2+](https://img.shields.io/badge/License-GPL%20v2%2B-blue.svg)](LICENSE)
[![Made in Chile](https://img.shields.io/badge/Hecho%20en-Chile%20%F0%9F%87%A8%F0%9F%87%B1-red.svg)](#)

</div>

---

## 📖 Descripción

**CSIRT Alertas** integra el feed oficial del **Equipo de Respuesta ante Incidentes de Seguridad Informática** del Gobierno de Chile directamente en GNOME Shell. Muestra un icono de escudo en la barra superior con la **segmentación de alertas por tipo** y un menú con las últimas alertas —campañas de phishing/fraude, vulnerabilidades críticas, malware— con su resumen y categorías. Cuando aparecen alertas nuevas, lanza una notificación de escritorio.

> Fuente de datos: feed RSS oficial `https://csirt.gob.cl/rss/alertas`.

## ✨ Características

- 🛡️ **Icono en el panel** con contadores **segmentados por tipo** (Info · Fraude · Vuln. · Crítico), cada uno con su color.
- 📰 **Menú de alertas** con tarjetas: badge de severidad, título, antigüedad, chips de categoría y **resumen de la página**.
- 🔎 **Filtros** por tipo de alerta (Todas / Info / Fraude / Vuln. / Crítico), cada filtro muestra su cantidad.
- 🔔 **Notificaciones de escritorio** cuando aparecen alertas nuevas (clic → abre la alerta).
- 💾 **Caché local** de resúmenes y alertas: funciona aunque no haya red al iniciar.
- ⚙️ **Preferencias** (intervalo de actualización, nº de alertas, notificaciones on/off) que se aplican **en vivo**.
- 🌐 Clic en cualquier alerta → abre el detalle en el navegador.

## 🖼️ Capturas

<div align="center">

| Barra superior | Menú de alertas |
|:---:|:---:|
| ![Panel](docs/panel.png) | ![Menú](docs/menu.png) |

</div>

> _Coloca tus capturas en la carpeta `docs/` con esos nombres para que se muestren aquí._

## 📦 Requisitos

- **GNOME Shell 46 – 50** (probado en 48, Debian 13 / Ubuntu 24.04+).
- Sesión Wayland o X11.

## 🚀 Instalación

### Opción A — desde extensions.gnome.org (recomendada)

Una vez publicada, búscala como **"CSIRT Alertas"** en <https://extensions.gnome.org> o instálala con la app *Extensiones*.

### Opción B — desde el código fuente

```bash
git clone https://github.com/critercl/csirt-alertas.git
cd csirt-alertas
./install.sh
```

Luego recarga GNOME Shell:
- **Wayland:** cierra sesión y vuelve a entrar.
- **X11:** pulsa `Alt` + `F2`, escribe `r` y presiona Enter.

Y habilítala si no lo está:

```bash
gnome-extensions enable csirt-alertas@critercl
```

### Opción C — instalación manual

```bash
UUID=csirt-alertas@critercl
DEST=~/.local/share/gnome-shell/extensions/$UUID
mkdir -p "$DEST/schemas"
cp extension.js prefs.js stylesheet.css metadata.json "$DEST/"
cp schemas/*.gschema.xml "$DEST/schemas/"
glib-compile-schemas "$DEST/schemas"
gnome-extensions enable "$UUID"
```

## 🕹️ Uso

- **Clic** en el escudo → abre/cierra el menú de alertas.
- **Filtros** en la parte superior del menú → filtra por tipo; cada uno muestra su cantidad.
- **Clic en una alerta** → abre el detalle en el navegador.
- **Actualizar ahora** → fuerza una consulta al feed.
- **Preferencias** → ajusta intervalo, cantidad de alertas y notificaciones.

## ⚙️ Configuración

Abre las preferencias con:

```bash
gnome-extensions prefs csirt-alertas@critercl
```

| Opción | Descripción | Por defecto |
|--------|-------------|:---:|
| Intervalo de actualización | Minutos entre cada consulta del feed | 15 |
| Alertas a mostrar | Cantidad de alertas listadas en el menú | 10 |
| Notificar nuevas alertas | Notificación de escritorio ante novedades | Activado |

Todos los cambios se aplican **en el momento**, sin reiniciar.

## 🧩 Estructura del proyecto

```
csirt-alertas/
├── extension.js        # Lógica principal (indicador, feed, notificaciones)
├── prefs.js            # Ventana de preferencias (libadwaita)
├── stylesheet.css      # Estilos del panel y del menú
├── metadata.json       # Metadatos de la extensión
├── schemas/
│   └── org.gnome.shell.extensions.csirt-alertas.gschema.xml
├── install.sh          # Instalador local
└── README.md
```

## 🛠️ Desarrollo

**Empaquetar** para subir a extensions.gnome.org:

```bash
gnome-extensions pack . --extra-source=stylesheet.css --force -o ..
```

**Ver logs** de la extensión en vivo:

```bash
journalctl -f -o cat /usr/bin/gnome-shell
```

> ⚠️ En **Wayland** no se puede recargar el código en caliente: tras editar hay que cerrar sesión y volver a entrar. En X11 basta con `Alt`+`F2` → `r`.

## 🌐 Fuente de datos

- **RSS:** `https://csirt.gob.cl/rss/alertas`
- **API pública de ciberseguridad:** `https://csirt.gob.cl/api/v1/docs`

Los resúmenes se obtienen de la página de cada alerta y se cachean localmente en `~/.cache/csirt-alertas/`.

## 🪟 Versión para Windows

Existe una app equivalente para Windows (icono en la bandeja, junto al reloj) escrita en Python + PySide6, con el mismo diseño y lógica. Consulta la carpeta [`csirt-alertas-windows`](../csirt-alertas-windows)).

## 👤 Autor

**Aníbal Segovia Poblete** — entusiasta de Linux, el software libre y la ciberseguridad.

## 📄 Licencia

Distribuido bajo licencia **GPL-2.0-or-later**. Consulta el archivo [`LICENSE`](LICENSE).

---

<div align="center">
<sub>Este proyecto no está afiliado oficialmente al CSIRT de Chile. Usa datos de su feed público con fines informativos.</sub>
</div>
