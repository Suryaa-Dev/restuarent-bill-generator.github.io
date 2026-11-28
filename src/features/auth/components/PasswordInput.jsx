import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { authInputCls } from './AuthScreenLayout';

export default function PasswordInput({ value, onChange, autoComplete = 'current-password', ...rest }) {
    const [show, setShow] = useState(false);
    return (
        <div className="relative">
            <input
                type={show ? 'text' : 'password'}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                autoComplete={autoComplete}
                className={`${authInputCls} pr-12`}
                {...rest}
            />
            <button
                type="button"
                onClick={() => setShow(s => !s)}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center text-gray-500"
                aria-label={show ? 'Hide password' : 'Show password'}
            >
                {show ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
        </div>
    );
}
