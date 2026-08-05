# CSIRT Alertas — Extensión de GNOME Shell

Muestra las últimas alertas de ciberseguridad del **CSIRT de Chile**
([csirt.gob.cl](https://csirt.gob.cl/alertas/)) en la barra superior de GNOME.

## Características
- Icono de escudo en el panel con **contador de alertas nuevas**.
- Menú con las últimas alertas (título, antigüedad y categorías). Clic → abre la alerta en el navegador.
- **Notificaciones de escritorio** cuando aparecen alertas nuevas.
- Preferencias: intervalo de actualización, nº de alertas y notificaciones on/off.
- Caché local: muestra las últimas alertas aunque no haya red al iniciar.

Fuente de datos: feed RSS oficial `https://csirt.gob.cl/rss/alertas`.

## Requisitos
- GNOME Shell 45–48 (probado en 48.7, Debian 13).

## Instalación
```bash
./install.sh
```
Luego, en **Wayland** cierra sesión y vuelve a entrar. En **X11** pulsa `Alt+F2`, escribe `r` y Enter.

Después de reiniciar la sesión, habilita la extensión si no lo está:
```bash
gnome-extensions enable csirt-alertas@critercl
```

## Uso
- Preferencias: `gnome-extensions prefs csirt-alertas@critercl`
- Estado / logs: `gnome-extensions info csirt-alertas@critercl`
- Depuración: `journalctl -f -o cat /usr/bin/gnome-shell`

## Desinstalar
```bash
gnome-extensions disable csirt-alertas@critercl
rm -rf ~/.local/share/gnome-shell/extensions/csirt-alertas@critercl
```
