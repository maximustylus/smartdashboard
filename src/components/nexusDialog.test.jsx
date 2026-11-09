/**
 * ==============================================================================
 * NEXUS DIALOGS — the in-app message box, and the guard that keeps the browser's
 * own pop-ups out of the app (v2.20.0)
 * ==============================================================================
 * The owner saw "smartdashboard.web.app says — Admins Only Access" and asked for
 * every pop-up to read as NEXUS's own. A browser box cannot be retitled, so all
 * nineteen were replaced; the last block here fails if one comes back.
 * ==============================================================================
 */

import { describe, it, expect, afterEach } from 'vitest';
import { act, fireEvent, screen } from '@testing-library/react';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { nexusAlert, nexusConfirm, nexusPrompt, resetNexusDialogs } from './nexusDialog';

afterEach(() => { act(() => resetNexusDialogs()); });

const dialog = () => screen.queryByRole('alertdialog');

describe('nexusAlert', () => {
    it('shows the message under "NEXUS says", and resolves when dismissed', async () => {
        let done = false;
        act(() => { nexusAlert('Saved.').then(() => { done = true; }); });
        expect(dialog()).not.toBeNull();
        expect(screen.getByText('NEXUS says')).toBeTruthy();
        expect(screen.getByText('Saved.')).toBeTruthy();
        expect(screen.queryByRole('button', { name: /cancel/i })).toBeNull();
        await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'OK' })); });
        expect(done).toBe(true);
        expect(dialog()).toBeNull();
    });

    it('moves focus to OK, like the browser box did', () => {
        act(() => { nexusAlert('Hello'); });
        expect(document.activeElement).toBe(screen.getByRole('button', { name: 'OK' }));
    });
});

describe('nexusConfirm', () => {
    it('resolves true for the primary button and false for Cancel', async () => {
        let answer;
        act(() => { nexusConfirm('Delete it?', { confirmLabel: 'Delete', danger: true }).then((a) => { answer = a; }); });
        await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Delete' })); });
        expect(answer).toBe(true);

        act(() => { nexusConfirm('Delete it?').then((a) => { answer = a; }); });
        await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Cancel' })); });
        expect(answer).toBe(false);
    });

    it('Escape cancels and Enter accepts', async () => {
        let answer;
        act(() => { nexusConfirm('Sure?').then((a) => { answer = a; }); });
        await act(async () => { fireEvent.keyDown(dialog(), { key: 'Escape' }); });
        expect(answer).toBe(false);

        act(() => { nexusConfirm('Sure?').then((a) => { answer = a; }); });
        await act(async () => { fireEvent.keyDown(dialog(), { key: 'Enter' }); });
        expect(answer).toBe(true);
    });
});

describe('nexusPrompt', () => {
    it('returns the typed text, or null when cancelled', async () => {
        let answer;
        act(() => { nexusPrompt('Why?').then((a) => { answer = a; }); });
        const field = screen.getByRole('textbox', { name: 'Why?' });
        expect(document.activeElement).toBe(field);
        fireEvent.change(field, { target: { value: 'Duplicate request' } });
        await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'OK' })); });
        expect(answer).toBe('Duplicate request');

        act(() => { nexusPrompt('Why?').then((a) => { answer = a; }); });
        await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Cancel' })); });
        expect(answer).toBeNull();
    });
});

describe('queueing', () => {
    it('shows one at a time, in order', async () => {
        act(() => { nexusAlert('First'); nexusAlert('Second'); });
        expect(screen.getByText('First')).toBeTruthy();
        expect(screen.queryByText('Second')).toBeNull();
        await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'OK' })); });
        expect(screen.getByText('Second')).toBeTruthy();
    });
});

describe('no browser pop-ups anywhere in the app', () => {
    const SRC = join(process.cwd(), 'src');
    const files = (dir, out = []) => {
        for (const entry of readdirSync(dir)) {
            const path = join(dir, entry);
            if (statSync(path).isDirectory()) files(path, out);
            else if (/\.jsx?$/.test(entry) && !/\.test\.jsx?$/.test(entry)) out.push(path);
        }
        return out;
    };

    it('has no window.alert, window.confirm or window.prompt — use nexusDialog', () => {
        const offenders = [];
        for (const file of files(SRC)) {
            readFileSync(file, 'utf8').split('\n').forEach((line, i) => {
                const code = line.replace(/\/\/.*$/, '');
                if (/^\s*\*/.test(line)) return;
                if (/(?<![\w.$])(window\.)?(alert|confirm|prompt)\s*\(/.test(code)) {
                    offenders.push(`${relative(SRC, file)}:${i + 1}  ${line.trim()}`);
                }
            });
        }
        expect(offenders, offenders.join('\n')).toEqual([]);
    });
});
