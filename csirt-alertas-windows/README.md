# CSIRT Alertas — Windows (bandeja del sistema)

Versión para **Windows** de la extensión de GNOME [`csirt-alertas`](../csirt-alertas-extension).
Vive como un icono junto al **reloj de Windows** (área de notificaciones) y
muestra las alertas de ciberseguridad del **CSIRT de Chile**
(<https://csirt.gob.cl>) con el **mismo diseño** de tarjetas: badge de color por
severidad, chips de categoría y resumen de la página. Incluye notificaciones de
escritorio cuando aparecen alertas nuevas.

## Requisitos
- Windows 10/11 con **Python 3.10+** (probado con Python 3.14 + PySide6 6.11).
- Dependencia: **PySide6** (Qt).

## Ejecutar (modo desarrollo)
```bat
pip install -r requirements.txt
pythonw csirt_tray.py
```
Usa `pythonw` (no `python`) para que no abra una ventana de consola.

## Uso
- **Clic izquierdo** en el icono de la bandeja → abre/cierra la lista de alertas.
- **Clic derecho** → menú: Ver alertas · Actualizar ahora · Abrir csirt.gob.cl · Preferencias · Salir.
- Clic en una alerta → abre el detalle en el navegador.
- Clic en una notificación → abre la alerta más reciente.
- **Preferencias**: intervalo de actualización, cantidad de alertas y
  notificaciones on/off. Se aplican **en vivo**.

## Generar un .exe (para distribuir sin Python)
```bat
build_exe.bat
```
Genera `dist\CSIRT Alertas.exe` (un solo archivo, sin consola) con PyInstaller.

## Iniciar con Windows (opcional)
1. Pulsa `Win + R`, escribe `shell:startup` y Enter.
2. Crea en esa carpeta un acceso directo a `CSIRT Alertas.exe`
   (o a `pythonw.exe "ruta\csirt_tray.py"` si lo corres con Python).

## Dónde guarda datos
- Configuración: `%APPDATA%\CSIRT Alertas\config.json`
- Caché de resúmenes/alertas: `%LOCALAPPDATA%\CSIRT Alertas\cache\`

## Equivalencias con la extensión de GNOME
| GNOME Shell | Windows (este proyecto) |
|-------------|-------------------------|
| Icono en la barra superior | Icono en la bandeja (junto al reloj) |
| Menú desplegable | Ventana emergente sobre el reloj |
| Notificaciones GNOME | `showMessage` (toast de Windows) |
| GSettings + prefs.js | `config.json` + diálogo de Preferencias |
| Estilos CSS (St) | Hoja de estilos QSS |

Aplicación creada por Anibal Segovia Poblete.
