#!/usr/bin/env bash
# Instalador de la extensión GNOME Shell "CSIRT Alertas"
set -euo pipefail

UUID="csirt-alertas@critercl"
SRC="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEST="$HOME/.local/share/gnome-shell/extensions/$UUID"

echo "==> Instalando en: $DEST"
mkdir -p "$DEST/schemas"

cp "$SRC/metadata.json"   "$DEST/"
cp "$SRC/extension.js"    "$DEST/"
cp "$SRC/prefs.js"        "$DEST/"
cp "$SRC/stylesheet.css"  "$DEST/"
cp "$SRC/schemas/org.gnome.shell.extensions.csirt-alertas.gschema.xml" "$DEST/schemas/"

# Foto del autor (opcional)
for p in author.jpg author.jpeg author.png; do
    [ -f "$SRC/$p" ] && cp "$SRC/$p" "$DEST/"
done

echo "==> Compilando esquema de configuración (GSettings)"
glib-compile-schemas "$DEST/schemas"

echo "==> Habilitando extensión"
if command -v gnome-extensions >/dev/null 2>&1; then
    gnome-extensions enable "$UUID" || true
fi

echo
echo "Listo. Ahora:"
echo "  - En Wayland: cierra sesión y vuelve a entrar (Alt+F2 'r' no funciona en Wayland)."
echo "  - En X11: pulsa Alt+F2, escribe 'r' y Enter."
echo "  - Verifica con: gnome-extensions info $UUID"
echo "  - Abre preferencias con: gnome-extensions prefs $UUID"
