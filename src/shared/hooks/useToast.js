import { useRef, useState } from 'react';

// A short message at the top of the screen that disappears by itself.
export function useToast(durationMs = 3500) {
    const [toast, setToast] = useState('');
    const timerRef = useRef(null);
    const showToast = (msg) => {
        setToast(msg);
        clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => setToast(''), durationMs);
    };
    return { toast, showToast };
}
