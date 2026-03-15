import type { ReqlogEntry } from '../types.ts';
import { MethodBadge } from './MethodBadge.tsx';
import styles from './RequestRow.module.css';

interface Props {
  entry: ReqlogEntry;
  selected: boolean;
  onClick: () => void;
}

function StatusChip({ code }: { code: number }) {
  const cls =
    code >= 500 ? styles['status-5xx']
    : code >= 400 ? styles['status-4xx']
    : code >= 300 ? styles['status-3xx']
    : code >= 200 ? styles['status-2xx']
    : styles['status-1xx'];
  return <span className={`${styles['status-chip']} ${cls}`}>{code}</span>;
}

function LatencyChip({ ms, slow }: { ms: number; slow: boolean }) {
  return (
    <span className={`${styles['latency-chip']} ${slow ? styles['latency-slow'] : ''}`}>
      {ms}ms
    </span>
  );
}

export function RequestRow({ entry, selected, onClick }: Props) {
  const urlPath = (() => {
    try {
      return new URL(entry.url, 'http://x').pathname;
    } catch {
      return entry.url;
    }
  })();

  return (
    <div
      className={[
        styles['request-row'],
        selected ? styles['selected'] : '',
        entry.slow ? styles['slow'] : '',
      ].join(' ')}
      onClick={onClick}
    >
      <MethodBadge method={entry.method} />
      <span className={styles['request-path']} title={entry.url}>
        {urlPath}
      </span>
      <span className={styles['request-row-right']}>
        <StatusChip code={entry.statusCode} />
        <LatencyChip ms={entry.latency} slow={entry.slow} />
      </span>
    </div>
  );
}
