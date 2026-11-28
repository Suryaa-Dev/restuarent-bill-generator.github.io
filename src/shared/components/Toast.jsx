import React from 'react';
import { Lock } from 'lucide-react';

// Short message at the top of the screen (see shared/hooks/useToast.js)
export default function Toast({ message, icon: Icon = Lock }) {
    if (!message) return null;
    return (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[90] max-w-[90vw] bg-gray-900 text-white text-sm font-semibold px-4 py-3 rounded-xl shadow-lg flex items-center gap-2">
            <Icon size={16} className="shrink-0 text-red-300" /> <span>{message}</span>
        </div>
    );
}
