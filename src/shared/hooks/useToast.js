import { useRef, useState } from 'react';

// A short message at the top of the screen that disappears by itself.
//   showToast('text')                      default icon, 3.5 s
//   showToast('text', { icon, durationMs }) own icon / duration
export function useToast(durationMs = 3500) {
    const [toast, setToast] = useState(null); // { message, icon }
    const timerRef = useRef(null);
    const showToast = (message, opts = {}) => {
        setToast({ message, icon: opts.icon, tone: opts.tone });
        clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => setToast(null), opts.durationMs || durationMs);
    };
    return { toast, showToast, hideToast: () => setToast(null) };
}
