// SPDX-FileCopyrightText: 2026 Aníbal Segovia Poblete
// SPDX-License-Identifier: GPL-2.0-or-later

import Adw from 'gi://Adw';
import Gtk from 'gi://Gtk';
import Gio from 'gi://Gio';

import {ExtensionPreferences} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

export default class CsirtAlertasPreferences extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        const settings = this.getSettings();

        const page = new Adw.PreferencesPage({
            title: 'General',
            icon_name: 'security-high-symbolic',
        });
        window.add(page);

        const group = new Adw.PreferencesGroup({
            title: 'Alertas CSIRT',
            description: 'Configuración del monitor de alertas de csirt.gob.cl',
        });
        page.add(group);

        const intervalRow = new Adw.SpinRow({
            title: 'Intervalo de actualización',
            subtitle: 'Minutos entre cada consulta del feed RSS',
            adjustment: new Gtk.Adjustment({
                lower: 1,
                upper: 1440,
                step_increment: 1,
                page_increment: 5,
            }),
        });
        group.add(intervalRow);
        settings.bind('refresh-interval', intervalRow, 'value', Gio.SettingsBindFlags.DEFAULT);

        const maxRow = new Adw.SpinRow({
            title: 'Alertas a mostrar',
            subtitle: 'Cantidad de alertas listadas en el menú',
            adjustment: new Gtk.Adjustment({
                lower: 1,
                upper: 30,
                step_increment: 1,
                page_increment: 5,
            }),
        });
        group.add(maxRow);
        settings.bind('max-items', maxRow, 'value', Gio.SettingsBindFlags.DEFAULT);

        const notifyRow = new Adw.SwitchRow({
            title: 'Notificar nuevas alertas',
            subtitle: 'Mostrar una notificación de escritorio cuando aparecen alertas nuevas',
        });
        group.add(notifyRow);
        settings.bind('notify-new', notifyRow, 'active', Gio.SettingsBindFlags.DEFAULT);

        const infoGroup = new Adw.PreferencesGroup();
        page.add(infoGroup);
        infoGroup.add(new Adw.ActionRow({
            title: 'Fuente de datos',
            subtitle: 'https://csirt.gob.cl/rss/alertas',
        }));

        const about = new Adw.PreferencesPage({
            title: 'Acerca de',
            icon_name: 'dialog-information-symbolic',
        });
        window.add(about);

        const avatar = new Adw.Avatar({
            size: 96,
            text: 'Aníbal Segovia Poblete',
            show_initials: true,
        });
        const headerBox = new Gtk.Box({
            orientation: Gtk.Orientation.VERTICAL,
            halign: Gtk.Align.CENTER,
            spacing: 6,
            margin_top: 14,
            margin_bottom: 6,
        });
        headerBox.append(avatar);
        headerBox.append(new Gtk.Label({
            label: '<b>Aníbal Segovia Poblete</b>',
            use_markup: true,
        }));
        headerBox.append(new Gtk.Label({
            label: 'Chile',
            css_classes: ['dim-label'],
        }));
        const photoGroup = new Adw.PreferencesGroup();
        photoGroup.add(headerBox);
        about.add(photoGroup);

        const authorGroup = new Adw.PreferencesGroup({title: 'Autor'});
        about.add(authorGroup);

        authorGroup.add(new Adw.ActionRow({
            title: 'Creado por',
            subtitle: 'Aníbal Segovia Poblete',
        }));

        const emailRow = new Adw.ActionRow({
            title: 'Correo',
            subtitle: 'critercl@gmail.com',
            activatable: true,
        });
        emailRow.add_suffix(new Gtk.Image({icon_name: 'mail-send-symbolic'}));
        emailRow.connect('activated', () => {
            Gio.AppInfo.launch_default_for_uri('mailto:critercl@gmail.com', null);
        });
        authorGroup.add(emailRow);

        authorGroup.add(new Adw.ActionRow({
            title: 'País',
            subtitle: 'Chile',
        }));

        const bioGroup = new Adw.PreferencesGroup({
            title: 'Sobre el autor',
            description:
                'Entusiasta de Linux y del software de código abierto, con foco en la ' +
                'ciberseguridad. Me dedico a construir herramientas para el escritorio ' +
                'GNOME que acercan información útil —como las alertas del CSIRT— a la vida ' +
                'diaria de las personas. Creo en la privacidad, en la transparencia del ' +
                'código abierto y en compartir el conocimiento con la comunidad, para que ' +
                'la seguridad digital esté al alcance de todos.',
        });
        about.add(bioGroup);

        const linkGroup = new Adw.PreferencesGroup();
        about.add(linkGroup);
        const repoRow = new Adw.ActionRow({
            title: 'Código fuente',
            subtitle: 'https://github.com/critercl/csirt-alertas',
            activatable: true,
        });
        repoRow.add_suffix(new Gtk.Image({icon_name: 'web-browser-symbolic'}));
        repoRow.connect('activated', () => {
            Gio.AppInfo.launch_default_for_uri('https://github.com/critercl/csirt-alertas', null);
        });
        linkGroup.add(repoRow);
    }
}
