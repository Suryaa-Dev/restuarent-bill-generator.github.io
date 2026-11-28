import React from 'react';
import { Lock } from 'lucide-react';

// Short message at the top of the screen (see shared/hooks/useToast.js). Tap to dismiss.
export default function Toast({ toast, onClose }) {
    if (!toast) return null;
    const Icon = toast.icon || Lock;
    const tone = toast.tone === 'info' ? 'bg-purple-700' : 'bg-gray-900';
    return (
        <button
            onClick={onClose}
            className={`fixed top-20 left-1/2 -translate-x-1/2 z-[90] max-w-[90vw] ${tone} text-white text-sm font-semibold px-4 py-3 rounded-xl shadow-lg flex items-center gap-2 text-left`}
        >
            <Icon size={16} className={`shrink-0 ${toast.tone === 'info' ? 'text-purple-200' : 'text-red-300'}`} /> <span>{toast.message}</span>
        </button>
    );
}
