/**
 * The NEXUS message box itself — what `nexusDialog.jsx` draws. Kept in its own file
 * because a module that exports functions should not also define components (it
 * breaks fast refresh). See `nexusDialog.jsx` for why this exists.
 */
import React, { useEffect, useRef, useState } from 'react';

const NexusDialogView = ({ dialog, onClose }) => {
    const [text, setText] = useState(dialog.defaultValue || '');
    const primaryRef = useRef(null);
    const fieldRef = useRef(null);

    useEffect(() => {
        (dialog.kind === 'prompt' ? fieldRef.current : primaryRef.current)?.focus?.();
    }, [dialog]);

    const accept = () => onClose(dialog.kind === 'prompt' ? text : true);
    const cancel = () => onClose(dialog.kind === 'prompt' ? null : false);

    const onKeyDown = (event) => {
        if (event.key === 'Escape') { event.preventDefault(); cancel(); }
        if (event.key === 'Enter' && dialog.kind !== 'prompt') { event.preventDefault(); accept(); }
    };

    return (
        <div
            data-nexus-dialog={dialog.kind}
            className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm"
            onKeyDown={onKeyDown}
        >
            <div
                role="alertdialog"
                aria-modal="true"
                aria-labelledby="nexus-dialog-title"
                aria-describedby="nexus-dialog-message"
                className="w-full max-w-sm rounded-2xl bg-slate-950 dark:bg-slate-900 border border-slate-700/60 shadow-2xl p-6"
            >
                <h2 id="nexus-dialog-title" className="text-sm font-black text-slate-100 uppercase tracking-widest mb-3">
                    {dialog.title}
                </h2>
                <p id="nexus-dialog-message" className="text-sm text-slate-300 leading-relaxed whitespace-pre-line">
                    {dialog.message}
                </p>
                {dialog.kind === 'prompt' && (
                    <form onSubmit={(event) => { event.preventDefault(); accept(); }}>
                        <input
                            ref={fieldRef}
                            type="text"
                            value={text}
                            placeholder={dialog.placeholder || ''}
                            aria-label={dialog.message}
                            onChange={(event) => setText(event.target.value)}
                            className="mt-4 w-full rounded-xl bg-slate-900 border border-slate-700 px-3 py-2.5 text-base sm:text-sm text-slate-100 outline-none focus:border-indigo-500"
                        />
                    </form>
                )}
                <div className={`mt-6 grid gap-3 ${dialog.kind === 'alert' ? 'grid-cols-1' : 'grid-cols-2'}`}>
                    {dialog.kind !== 'alert' && (
                        <button
                            type="button"
                            onClick={cancel}
                            className="min-h-11 px-5 rounded-xl text-xs font-black uppercase tracking-widest text-slate-300 bg-slate-800 hover:bg-slate-700 transition-colors"
                        >
                            {dialog.cancelLabel || 'Cancel'}
                        </button>
                    )}
                    <button
                        ref={primaryRef}
                        type="button"
                        onClick={accept}
                        className={`min-h-11 px-5 rounded-xl text-xs font-black uppercase tracking-widest transition-colors ${dialog.danger
                            ? 'bg-rose-600 hover:bg-rose-500 text-white'
                            : 'bg-slate-200 hover:bg-white text-slate-900'}`}
                    >
                        {dialog.confirmLabel || 'OK'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default NexusDialogView;
