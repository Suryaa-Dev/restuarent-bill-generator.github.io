import React from 'react';
import { Clock } from 'lucide-react';
import { ta } from '../../../i18n/adminExtra';
import { roundEtaMinutes } from '../utils/parcelEta';

// Parcel "Estimated Time" next to the table number: just the time, no label (tooltip explains it).
// Past the promised time it turns red and shows how late it is.
export default function EtaChip({ eta, lang }) {
    if (!eta) return null;
    const late = eta.minutesLeft <= 0;
    const clock = new Date(eta.readyAt).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' });
    return (
        <span
            title={`${ta('etaTooltip', lang)} · ${clock}`}
            aria-label={`${ta('etaTooltip', lang)} ${late ? '' : roundEtaMinutes(eta.minutesLeft)} min`}
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-sm font-bold tabular-nums shrink-0 ${late ? 'bg-red-50 text-red-700' : 'bg-purple-50 text-purple-700'}`}
        >
            <Clock size={15} />
            {late ? `+${Math.max(0, -eta.minutesLeft)} min` : `${roundEtaMinutes(eta.minutesLeft)} min`}
        </span>
    );
}
