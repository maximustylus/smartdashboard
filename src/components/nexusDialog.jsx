/**
 * ==============================================================================
 * NEXUS DIALOGS — one in-app message box in place of the browser's (v2.20.0)
 * ==============================================================================
 *
 * `window.alert`, `window.confirm` and `window.prompt` are drawn by the browser,
 * titled with the site's address ("smartdashboard.web.app says"), unstyled, and
 * impossible to retitle. NEXUS had nineteen of them. The owner asked for every
 * pop-up to read as NEXUS's own, so these three functions replace them:
 *
 *   await nexusAlert(message)              → resolves when dismissed
 *   await nexusConfirm(message, options)   → true for OK, false for Cancel
 *   await nexusPrompt(message, options)    → the text, or null for Cancel
 *
 * NO PROVIDER TO MOUNT. The first call creates one host element in
 * `document.body` with its own React root, and every later call reuses it. That is
 * deliberate: the old calls lived in event handlers all over the app, including
 * components a test renders on its own, and a dialog that silently did nothing
 * outside some provider would turn a confirm into a hang.
 *
 * ONE AT A TIME. Calls queue; the next opens when the current one closes.
 *
 * ACCESSIBLE. `role="alertdialog"`, labelled by the title and described by the
 * message, focus moved to the primary button (or the prompt's field), Escape
 * cancels and Enter accepts — what the browser's own box did for free.
 * ==============================================================================
 */

import React from 'react';
import NexusDialogView from './NexusDialogView';
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';

const DEFAULT_TITLE = 'NEXUS says';

let host = null;
let root = null;
const queue = [];

const render = () => {
    if (typeof document === 'undefined') return;
    if (!host || !host.isConnected) {
        host = document.createElement('div');
        host.setAttribute('data-nexus-dialog-host', '');
        document.body.appendChild(host);
        root = createRoot(host);
    }
    const current = queue[0] || null;
    const close = (value) => {
        const done = queue.shift();
        render();
        if (done) done.resolve(value);
    };
    // Synchronous, so the dialog is on screen by the time the caller's next line
    // runs — the same guarantee the browser's blocking box gave.
    flushSync(() => {
        root.render(current ? <NexusDialogView key={current.id} dialog={current} onClose={close} /> : null);
    });
};

let nextId = 1;
const open = (dialog) => new Promise((resolve) => {
    queue.push({ ...dialog, id: nextId++, title: dialog.title || DEFAULT_TITLE, message: String(dialog.message ?? ''), resolve });
    if (queue.length === 1) render();
});

/** Tell the person something. Resolves when they dismiss it. */
export const nexusAlert = (message, options = {}) =>
    open({ ...options, kind: 'alert', message }).then(() => undefined);

/** Ask a yes/no question. Resolves `true` for the primary button, `false` otherwise. */
export const nexusConfirm = (message, options = {}) => open({ ...options, kind: 'confirm', message });

/** Ask for a line of text. Resolves the text, or `null` if they cancel. */
export const nexusPrompt = (message, options = {}) => open({ ...options, kind: 'prompt', message });

/** For tests: close everything and forget the host. */
export const resetNexusDialogs = () => {
    queue.length = 0;
    if (root) flushSync(() => root.render(null));
};
