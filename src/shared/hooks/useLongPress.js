import { useRef } from 'react';

// long-press for touch and mouse:  <div {...press(() => doSomething())}>
// A finger that moves (scrolling) cancels it, and the phone's own long-press menu is suppressed.
export function useLongPress(ms = 550) {
    const timer = useRef(null);
    const start = useRef({ x: 0, y: 0 });
    const clear = () => { clearTimeout(timer.current); timer.current = null; };

    return (callback) => ({
        onPointerDown: (e) => {
            if (e.button && e.button !== 0) return;
            clear();
            start.current = { x: e.clientX, y: e.clientY };
            timer.current = setTimeout(() => {
                timer.current = null;
                if (navigator.vibrate) navigator.vibrate(15);
                callback();
            }, ms);
        },
        onPointerMove: (e) => {
            if (timer.current && Math.hypot(e.clientX - start.current.x, e.clientY - start.current.y) > 10) clear();
        },
        onPointerUp: clear,
        onPointerLeave: clear,
        onPointerCancel: clear,
        onContextMenu: (e) => e.preventDefault(),
    });
}
