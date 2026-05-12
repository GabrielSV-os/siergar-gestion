import { useEffect } from 'react';
import { supabase } from './supabase';

/**
 * Subscribe to realtime changes on one or more Supabase tables.
 * Calls `onUpdate` whenever any of the tables receive an INSERT, UPDATE, or DELETE.
 * 
 * @param {string[]} tables - Array of table names to listen to
 * @param {Function} onUpdate - Callback function when changes are detected
 * @param {string} [channelName] - Optional unique channel name
 */
export function useRealtime(tables, onUpdate, channelName) {
    useEffect(() => {
        const name = channelName || `realtime-${tables.join('-')}`;
        const channel = supabase.channel(name);

        tables.forEach(table => {
            channel.on(
                'postgres_changes',
                { event: '*', schema: 'public', table },
                () => onUpdate()
            );
        });

        channel.subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);  // eslint-disable-line react-hooks/exhaustive-deps
}
