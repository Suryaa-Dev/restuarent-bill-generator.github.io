import React from 'react';
import { ChevronRight } from 'lucide-react';

// Building blocks of the Settings screens (same look everywhere).

export const SettingsSection = ({ title, children }) => (
    <section>
        <h2 className="px-1 mb-2 text-xs font-bold uppercase tracking-wider text-gray-500">{title}</h2>
        <div className="bg-white rounded-2xl border border-gray-200 divide-y divide-gray-100 overflow-hidden">{children}</div>
    </section>
);

export const SettingsRow = ({ icon: Icon, tint, title, desc, onClick }) => (
    <button onClick={onClick} className="w-full flex items-center gap-3 p-4 text-left active:bg-gray-50">
        <span className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${tint}`}><Icon size={20} /></span>
        <span className="flex-1 min-w-0">
            <span className="block font-semibold text-gray-900">{title}</span>
            {desc && <span className="block text-xs text-gray-500 mt-0.5">{desc}</span>}
        </span>
        <ChevronRight size={18} className="text-gray-300 shrink-0" />
    </button>
);

export const SettingsSegment = ({ options, value, onChange }) => (
    <div className="flex gap-1 p-1 rounded-xl bg-gray-100">
        {options.map(o => (
            <button
                key={o.id}
                onClick={() => onChange(o.id)}
                aria-pressed={value === o.id}
                className={`flex-1 h-10 rounded-lg text-sm font-bold transition-colors ${value === o.id ? 'bg-orange-500 text-white shadow-sm' : 'text-gray-600 active:bg-gray-200'}`}
            >
                {o.label}
            </button>
        ))}
    </div>
);
