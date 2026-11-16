import { useMemo } from 'react';
import { useEvents, useOccurrences } from './data';
import { occurrencesForDay, conflictKeys } from '@/lib/schedule';

export function useDay(isoDate: string) {
  const events = useEvents();
  const occ = useOccurrences(isoDate, isoDate);
  const items = useMemo(() => occurrencesForDay(events.data ?? [], occ.data ?? [], isoDate), [events.data, occ.data, isoDate]);
  const conflicts = useMemo(() => conflictKeys(items), [items]);
  return { items, conflicts, isLoading: events.isLoading || occ.isLoading, error: events.error ?? occ.error, hasAnyEvent: (events.data?.length ?? 0) > 0 };
}
