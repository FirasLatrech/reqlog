import { useState, useEffect } from 'react';
import type { ReqlogEntry } from '../types.ts';

export type ConnectionStatus = 'connecting' | 'open' | 'error';

export function useSSE(url: string): {
  entries: ReqlogEntry[];
  clear: () => void;
  status: ConnectionStatus;
} {
  const [entries, setEntries] = useState<ReqlogEntry[]>([]);
  const [status, setStatus] = useState<ConnectionStatus>('connecting');

  useEffect(() => {
    let cancelled = false;
    setStatus('connecting');
    const es = new EventSource(url);

    es.onopen = () => { if (!cancelled) setStatus('open'); };
    es.onerror = () => {
      if (!cancelled) {
        setStatus(es.readyState === EventSource.CLOSED ? 'error' : 'connecting');
      }
    };

    es.onmessage = (e: MessageEvent) => {
      if (!cancelled) {
        try {
          const entry = JSON.parse(e.data as string) as ReqlogEntry;
          setEntries((prev) => {
            if (prev.some((p) => p.id === entry.id)) return prev;
            return [...prev, entry];
          });
        } catch { /* ignore */ }
      }
    };

    fetch('/api/requests')
      .then((r) => r.json())
      .then((data: unknown) => {
        if (!cancelled && Array.isArray(data)) {
          setEntries((prev) => {
            const fetchIds = new Set((data as ReqlogEntry[]).map((e) => e.id));
            const sseOnly = prev.filter((e) => !fetchIds.has(e.id));
            return [...(data as ReqlogEntry[]), ...sseOnly].sort((a, b) => a.timestamp - b.timestamp);
          });
        }
      })
      .catch(() => { if (!cancelled) setStatus('error'); });

    return () => {
      cancelled = true;
      es.close();
    };
  }, [url]);

  return { entries, clear: () => setEntries([]), status };
}
