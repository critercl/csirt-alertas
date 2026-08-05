// SPDX-FileCopyrightText: 2026 Aníbal Segovia Poblete
// SPDX-License-Identifier: GPL-2.0-or-later

import GObject from 'gi://GObject';
import St from 'gi://St';
import Soup from 'gi://Soup';
import GLib from 'gi://GLib';
import Gio from 'gi://Gio';
import Clutter from 'gi://Clutter';

import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';
import * as MessageTray from 'resource:///org/gnome/shell/ui/messageTray.js';
import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';

const RSS_URL = 'https://csirt.gob.cl/rss/alertas';
const ALERTS_URL = 'https://csirt.gob.cl/alertas/';
const NOISE_CATEGORIES = new Set(['Alerta', 'No Caigas']);

function decodeEntities(text) {
    if (!text)
        return '';
    return text
        .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
        .replace(/<[^>]+>/g, '')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&#x27;/g, "'")
        .replace(/&aacute;/g, 'á').replace(/&eacute;/g, 'é')
        .replace(/&iacute;/g, 'í').replace(/&oacute;/g, 'ó')
        .replace(/&uacute;/g, 'ú').replace(/&ntilde;/g, 'ñ')
        .replace(/&Aacute;/g, 'Á').replace(/&Eacute;/g, 'É')
        .replace(/&Iacute;/g, 'Í').replace(/&Oacute;/g, 'Ó')
        .replace(/&Uacute;/g, 'Ú').replace(/&Ntilde;/g, 'Ñ')
        .replace(/&amp;/g, '&')
        .trim();
}

function tagContent(block, name) {
    const re = new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, 'i');
    const m = block.match(re);
    return m ? m[1] : '';
}

function parseRss(xml) {
    const items = [];
    const itemRe = /<item[^>]*>([\s\S]*?)<\/item>/gi;
    let match;
    while ((match = itemRe.exec(xml)) !== null) {
        const block = match[1];
        const title = decodeEntities(tagContent(block, 'title'));
        const link = decodeEntities(tagContent(block, 'link'));
        const guid = decodeEntities(tagContent(block, 'guid')) || link;
        const pubDate = decodeEntities(tagContent(block, 'pubDate'));

        const categories = [];
        const catRe = /<category[^>]*>([\s\S]*?)<\/category>/gi;
        let cm;
        while ((cm = catRe.exec(block)) !== null) {
            const c = decodeEntities(cm[1]);
            if (c)
                categories.push(c);
        }

        if (title && link)
            items.push({title, link, guid, pubDate, categories});
    }
    return items;
}

function extractSummary(html) {
    const skip = /Gobierno de Chile|Twitter|Mastodon|Telegram|verifico|portal principal|Descargar Informe|Sitio\s+oficial/i;
    const re = /<p[^>]*>([\s\S]*?)<\/p>/gi;
    const paras = [];
    let m;
    while ((m = re.exec(html)) !== null) {
        const t = decodeEntities(m[1]).replace(/\s+/g, ' ').trim();
        if (t.length >= 60 && !skip.test(t))
            paras.push(t);
    }
    if (!paras.length)
        return '';
    let s = paras[0];
    if (paras[1] && s.length < 160)
        s = `${s} ${paras[1]}`;
    if (s.length > 320)
        s = `${s.slice(0, 317)}…`;
    return s;
}

function iconForItem(it) {
    const text = `${it.title} ${it.categories.join(' ')}`.toLowerCase();
    if (/vulnerab|cve|exploit|parche|actualiz/.test(text))
        return {iconName: 'security-low-symbolic', sev: 'vuln'};
    if (/ransom|malware|troyano|botnet|backdoor/.test(text))
        return {iconName: 'dialog-error-symbolic', sev: 'malware'};
    if (/phishing|fraude|estafa|suplant|falso|falsific/.test(text))
        return {iconName: 'dialog-warning-symbolic', sev: 'phishing'};
    return {iconName: 'security-high-symbolic', sev: 'default'};
}

function relativeDate(pubDate) {
    const t = Date.parse(pubDate);
    if (isNaN(t))
        return pubDate || '';
    const diff = Math.floor((Date.now() - t) / 1000);
    if (diff < 60)
        return 'hace un momento';
    if (diff < 3600)
        return `hace ${Math.floor(diff / 60)} min`;
    if (diff < 86400)
        return `hace ${Math.floor(diff / 3600)} h`;
    const days = Math.floor(diff / 86400);
    if (days < 30)
        return `hace ${days} d`;
    return new Date(t).toLocaleDateString('es-CL');
}

const CsirtIndicator = GObject.registerClass(
class CsirtIndicator extends PanelMenu.Button {
    _init(extension) {
        super._init(0.0, 'CSIRT Alertas');

        this._extension = extension;
        this._settings = extension.getSettings();
        this._session = new Soup.Session();
        this._session.timeout = 30;
        this._cancellable = new Gio.Cancellable();
        this._timeoutId = 0;
        this._notifSource = null;
        this._summaryCache = {};
        this._loadSummaryCache();
        this._lastItems = [];
        this._settingsIds = [];
        this._activeFilter = null;

        const box = new St.BoxLayout({style_class: 'panel-status-menu-box'});
        this._icon = new St.Icon({
            icon_name: 'security-high-symbolic',
            style_class: 'system-status-icon',
        });
        this._badge = new St.Label({
            text: '',
            y_align: Clutter.ActorAlign.CENTER,
            style_class: 'csirt-badge',
            visible: false,
        });
        box.add_child(this._icon);
        box.add_child(this._badge);
        this.add_child(box);

        this._buildMenu();
        this._loadCachedThenRefresh();
        this._scheduleRefresh();

        this._settingsIds = [
            this._settings.connect('changed::refresh-interval',
                () => this._scheduleRefresh()),
            this._settings.connect('changed::max-items',
                () => this._renderItems(this._lastItems ?? [])),
        ];
    }

    _buildMenu() {
        this._header = new PopupMenu.PopupMenuItem('Alertas CSIRT', {reactive: false});
        this._header.label.style_class = 'csirt-header';
        this.menu.addMenuItem(this._header);

        this._buildFilterBar();

        this._itemsSection = new PopupMenu.PopupMenuSection();
        this.menu.addMenuItem(this._itemsSection);
        this._setStatus('Cargando…');

        this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

        const refreshItem = new PopupMenu.PopupImageMenuItem('Actualizar ahora', 'view-refresh-symbolic');
        refreshItem.connect('activate', () => this._refresh());
        this.menu.addMenuItem(refreshItem);

        const openItem = new PopupMenu.PopupImageMenuItem('Abrir csirt.gob.cl', 'web-browser-symbolic');
        openItem.connect('activate', () => this._openUri(ALERTS_URL));
        this.menu.addMenuItem(openItem);

        const prefsItem = new PopupMenu.PopupImageMenuItem('Preferencias', 'preferences-system-symbolic');
        prefsItem.connect('activate', () => this._extension.openPreferences());
        this.menu.addMenuItem(prefsItem);
    }

    _setStatus(text) {
        this._itemsSection.removeAll();
        const item = new PopupMenu.PopupMenuItem(text, {reactive: false});
        item.label.style_class = 'csirt-status';
        this._itemsSection.addMenuItem(item);
    }

    _buildFilterBar() {
        const filters = [
            {key: null, label: 'Todas', sev: 'all'},
            {key: 'default', label: 'Info', sev: 'default'},
            {key: 'phishing', label: 'Fraude', sev: 'phishing'},
            {key: 'vuln', label: 'Vuln.', sev: 'vuln'},
            {key: 'malware', label: 'Crítico', sev: 'malware'},
        ];

        const item = new PopupMenu.PopupBaseMenuItem({
            reactive: false,
            can_focus: false,
            style_class: 'csirt-filterbar-item',
        });
        const bar = new St.BoxLayout({style_class: 'csirt-filterbar', x_expand: true});

        this._filterButtons = [];
        for (const f of filters) {
            const btn = new St.Button({
                label: f.label,
                style_class: `csirt-filter csirt-filter-${f.sev}`,
                can_focus: true,
            });
            btn.connect('clicked', () => this._setFilter(f.key));
            this._filterButtons.push({btn, key: f.key});
            bar.add_child(btn);
        }
        item.add_child(bar);
        this.menu.addMenuItem(item);
        this._updateFilterButtons();
    }

    _setFilter(key) {
        this._activeFilter = key;
        this._updateFilterButtons();
        this._renderItems(this._lastItems);
    }

    _updateFilterButtons() {
        for (const {btn, key} of this._filterButtons ?? []) {
            if (key === this._activeFilter)
                btn.add_style_class_name('csirt-filter-active');
            else
                btn.remove_style_class_name('csirt-filter-active');
        }
    }

    _renderItems(items) {
        this._lastItems = items;
        this._itemsSection.removeAll();
        const max = this._settings.get_int('max-items');
        const filtered = this._activeFilter
            ? items.filter(it => iconForItem(it).sev === this._activeFilter)
            : items;
        const shown = filtered.slice(0, max);

        if (shown.length === 0) {
            this._setStatus(this._activeFilter
                ? 'Sin alertas de este tipo'
                : 'Sin alertas disponibles');
            return;
        }

        for (const it of shown) {
            const menuItem = new PopupMenu.PopupBaseMenuItem({style_class: 'csirt-card'});
            const row = new St.BoxLayout({vertical: false, x_expand: true});

            const {iconName, sev} = iconForItem(it);
            const badge = new St.Bin({
                style_class: `csirt-icon-badge csirt-tint-${sev}`,
                y_align: Clutter.ActorAlign.START,
            });
            badge.set_child(new St.Icon({
                style_class: `csirt-badge-icon csirt-fg-${sev}`,
                icon_name: iconName,
                icon_size: 20,
            }));
            row.add_child(badge);

            const col = new St.BoxLayout({
                vertical: true,
                x_expand: true,
                style_class: 'csirt-textcol',
            });

            const titleLabel = new St.Label({
                text: it.title,
                style_class: 'csirt-item-title',
            });
            titleLabel.clutter_text.line_wrap = true;
            titleLabel.clutter_text.ellipsize = 0;
            col.add_child(titleLabel);

            const metaRow = new St.BoxLayout({vertical: false, style_class: 'csirt-meta-row'});
            metaRow.add_child(new St.Label({
                text: relativeDate(it.pubDate),
                style_class: 'csirt-date',
                y_align: Clutter.ActorAlign.CENTER,
            }));
            const cats = it.categories.filter(c => !NOISE_CATEGORIES.has(c));
            for (const c of cats.slice(0, 3)) {
                metaRow.add_child(new St.Label({
                    text: c,
                    style_class: 'csirt-chip',
                    y_align: Clutter.ActorAlign.CENTER,
                }));
            }
            if (cats.length > 3) {
                metaRow.add_child(new St.Label({
                    text: `+${cats.length - 3}`,
                    style_class: 'csirt-chip csirt-chip-more',
                    y_align: Clutter.ActorAlign.CENTER,
                }));
            }
            col.add_child(metaRow);

            const summary = new St.Label({text: '', style_class: 'csirt-item-summary'});
            summary.clutter_text.line_wrap = true;
            summary.clutter_text.ellipsize = 0;
            summary.visible = false;
            col.add_child(summary);
            this._loadSummary(it, summary);

            row.add_child(col);
            menuItem.add_child(row);
            menuItem.connect('activate', () => this._openUri(it.link));
            this._itemsSection.addMenuItem(menuItem);
        }
    }

    _summaryCacheFile() {
        const dir = GLib.build_filenamev([GLib.get_user_cache_dir(), 'csirt-alertas']);
        GLib.mkdir_with_parents(dir, 0o755);
        return Gio.File.new_for_path(GLib.build_filenamev([dir, 'resumenes.json']));
    }

    _writeAsync(file, text) {
        try {
            const bytes = new GLib.Bytes(new TextEncoder().encode(text));
            file.replace_contents_bytes_async(
                bytes, null, false, Gio.FileCreateFlags.REPLACE_DESTINATION,
                this._cancellable,
                (f, res) => {
                    try {
                        f.replace_contents_finish(res);
                    } catch (e) {
                    }
                }
            );
        } catch (e) {
        }
    }

    _loadSummaryCache() {
        const file = this._summaryCacheFile();
        file.load_contents_async(this._cancellable, (f, res) => {
            try {
                const [ok, contents] = f.load_contents_finish(res);
                if (!ok)
                    return;
                const obj = JSON.parse(new TextDecoder().decode(contents));
                if (obj && typeof obj === 'object')
                    Object.assign(this._summaryCache, obj);
            } catch (e) {
            }
        });
    }

    _saveSummaryCache() {
        this._writeAsync(this._summaryCacheFile(), JSON.stringify(this._summaryCache));
    }

    _loadSummary(it, label) {
        const cached = this._summaryCache[it.guid];
        if (cached) {
            label.text = cached;
            label.visible = true;
            return;
        }

        const message = Soup.Message.new('GET', it.link);
        if (!message)
            return;
        message.request_headers.append('User-Agent', 'gnome-csirt-alertas/1.0');

        this._session.send_and_read_async(
            message, GLib.PRIORITY_DEFAULT, this._cancellable,
            (session, result) => {
                try {
                    const bytes = session.send_and_read_finish(result);
                    if (message.get_status() !== Soup.Status.OK)
                        return;
                    const html = new TextDecoder('utf-8').decode(bytes.get_data());
                    const summary = extractSummary(html);
                    if (!summary)
                        return;
                    this._summaryCache[it.guid] = summary;
                    this._saveSummaryCache();
                    label.text = summary;
                    label.visible = true;
                } catch (e) {
                }
            }
        );
    }

    _refresh() {
        const message = Soup.Message.new('GET', RSS_URL);
        if (!message) {
            this._setStatus('URL inválida');
            return;
        }
        message.request_headers.append('User-Agent', 'gnome-csirt-alertas/1.0');

        this._session.send_and_read_async(
            message,
            GLib.PRIORITY_DEFAULT,
            this._cancellable,
            (session, result) => {
                let bytes;
                try {
                    bytes = session.send_and_read_finish(result);
                } catch (e) {
                    if (!e.matches?.(Gio.IOErrorEnum, Gio.IOErrorEnum.CANCELLED))
                        this._setStatus('Error de conexión');
                    return;
                }
                if (message.get_status() !== Soup.Status.OK) {
                    this._setStatus(`Error HTTP ${message.get_status()}`);
                    return;
                }
                const data = bytes?.get_data();
                if (!data) {
                    this._setStatus('Respuesta vacía');
                    return;
                }
                const xml = new TextDecoder('utf-8').decode(data);
                const items = parseRss(xml);
                this._onItems(items);
            }
        );
    }

    _onItems(items) {
        this._renderItems(items);
        this._cacheItems(items);

        if (items.length === 0)
            return;

        const lastSeen = this._settings.get_string('last-seen-guid');
        let newCount = 0;
        for (const it of items) {
            if (it.guid === lastSeen)
                break;
            newCount++;
        }

        if (lastSeen === '')
            newCount = 0;

        this._updateBadge(newCount);

        if (newCount > 0 && this._settings.get_boolean('notify-new'))
            this._notifyNew(items.slice(0, Math.min(newCount, 3)), newCount);

        this._settings.set_string('last-seen-guid', items[0].guid);
    }

    _updateBadge(count) {
        if (count > 0) {
            this._badge.text = count > 99 ? '99+' : String(count);
            this._badge.visible = true;
            this._icon.add_style_class_name('csirt-icon-alert');
        } else {
            this._badge.visible = false;
            this._icon.remove_style_class_name('csirt-icon-alert');
        }
        this._header.label.text = count > 0
            ? `Alertas CSIRT — ${count} nueva${count === 1 ? '' : 's'}`
            : 'Alertas CSIRT';
    }

    _ensureSource() {
        if (this._notifSource)
            return this._notifSource;
        this._notifSource = new MessageTray.Source({
            title: 'CSIRT Alertas',
            iconName: 'security-high-symbolic',
        });
        this._notifSource.connectObject(
            'destroy', () => (this._notifSource = null), this);
        Main.messageTray.add(this._notifSource);
        return this._notifSource;
    }

    _notifyNew(newest, count) {
        const source = this._ensureSource();
        const title = count === 1
            ? 'Nueva alerta CSIRT'
            : `${count} nuevas alertas CSIRT`;
        const body = newest.map(it => `• ${it.title}`).join('\n');

        const notification = new MessageTray.Notification({
            source,
            title,
            body,
            urgency: MessageTray.Urgency.HIGH,
            isTransient: false,
        });
        const primary = newest[0];
        notification.connectObject(
            'activated', () => this._openUri(primary.link), this);
        source.addNotification(notification);
    }

    _cacheFile() {
        const dir = GLib.build_filenamev([GLib.get_user_cache_dir(), 'csirt-alertas']);
        GLib.mkdir_with_parents(dir, 0o755);
        return Gio.File.new_for_path(GLib.build_filenamev([dir, 'alertas.json']));
    }

    _cacheItems(items) {
        this._writeAsync(this._cacheFile(), JSON.stringify(items.slice(0, 30)));
    }

    _loadCachedThenRefresh() {
        const file = this._cacheFile();
        file.load_contents_async(this._cancellable, (f, res) => {
            try {
                const [ok, contents] = f.load_contents_finish(res);
                if (!ok)
                    return;
                const items = JSON.parse(new TextDecoder().decode(contents));
                if (Array.isArray(items) && items.length && this._lastItems.length === 0)
                    this._renderItems(items);
            } catch (e) {
            }
        });
        this._refresh();
    }

    _scheduleRefresh() {
        if (this._timeoutId) {
            GLib.source_remove(this._timeoutId);
            this._timeoutId = 0;
        }
        const minutes = Math.max(1, this._settings.get_int('refresh-interval'));
        this._timeoutId = GLib.timeout_add_seconds(
            GLib.PRIORITY_DEFAULT,
            minutes * 60,
            () => {
                this._refresh();
                return GLib.SOURCE_CONTINUE;
            }
        );
    }

    _openUri(uri) {
        try {
            Gio.AppInfo.launch_default_for_uri(uri, null);
        } catch (e) {
            Main.notifyError('CSIRT Alertas', `No se pudo abrir ${uri}`);
        }
    }

    destroy() {
        for (const id of this._settingsIds ?? [])
            this._settings.disconnect(id);
        this._settingsIds = [];
        if (this._timeoutId) {
            GLib.source_remove(this._timeoutId);
            this._timeoutId = 0;
        }
        this._cancellable?.cancel();
        this._session?.abort();
        this._notifSource?.disconnectObject(this);
        this._notifSource?.destroy();
        this._notifSource = null;
        super.destroy();
    }
});

export default class CsirtAlertasExtension extends Extension {
    enable() {
        this._indicator = new CsirtIndicator(this);
        Main.panel.addToStatusArea('csirt-alertas', this._indicator);
    }

    disable() {
        this._indicator?.destroy();
        this._indicator = null;
    }
}
