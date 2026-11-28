import { supabase } from '../lib/supabaseClient';

/* One place for live (realtime) subscriptions.

   const stop = subscribeToChanges(`bills-${branch}`, [
       { table: 'bills', filter: `branch=eq.${branch}`, onChange: (payload) => ... },
   ], (status) => ...);
   ...
   stop(); // removes the channel

   `onStatus` receives 'SUBSCRIBED', 'CHANNEL_ERROR', 'TIMED_OUT' or 'CLOSED'. */
export function subscribeToChanges(channelName, listeners, onStatus) {
    let channel = supabase.channel(channelName);
    listeners.forEach(({ table, event = '*', filter, onChange }) => {
        channel = channel.on(
            'postgres_changes',
            { event, schema: 'public', table, ...(filter ? { filter } : {}) },
            onChange
        );
    });
    channel.subscribe(onStatus);
    return () => { supabase.removeChannel(channel); };
}
