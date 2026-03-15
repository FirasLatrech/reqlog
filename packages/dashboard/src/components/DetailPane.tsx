import { useState } from 'react';
import type { ReqlogEntry } from '../types.ts';
import { MethodBadge } from './MethodBadge.tsx';
import { DiffView } from './DiffView.tsx';
import { JsonBlock } from './JsonBlock.tsx';
import { HeadersTable } from './HeadersTable.tsx';
import { Icon } from './Icon.tsx';
import styles from './DetailPane.module.css';

interface Props {
  entry: ReqlogEntry;
  prevEntry: ReqlogEntry | null;
  onClose: () => void;
}

type Tab = 'overview' | 'headers' | 'body' | 'diff';

export function DetailPane({ entry, prevEntry, onClose }: Props) {
  const [tab, setTab] = useState<Tab>('overview');
  const [replayStatus, setReplayStatus] = useState<string | null>(null);
  const [replaying, setReplaying] = useState(false);

  const hasDiff =
    prevEntry !== null &&
    prevEntry.method === entry.method &&
    prevEntry.url === entry.url;

  async function handleReplay() {
    setReplaying(true);
    setReplayStatus(null);
    try {
      const resp = await fetch(`/api/replay/${entry.id}`, { method: 'POST' });
      const raw: unknown = await resp.json();
      const data = raw && typeof raw === 'object' ? raw as Record<string, unknown> : {};
      const statusCode = typeof data['status'] === 'number' ? data['status'] : null;
      const errorMsg = typeof data['error'] === 'string' ? data['error'] : null;
      if (errorMsg) {
        setReplayStatus(`Error: ${errorMsg}`);
      } else {
        setReplayStatus(`Replayed — got ${statusCode}`);
      }
    } catch (err) {
      setReplayStatus(`Failed: ${String(err)}`);
    } finally {
      setReplaying(false);
    }
  }

  return (
    <div className={styles['detail-pane']}>
      <div className={styles['detail-header']}>
        <div className={styles['detail-title']}>
          <MethodBadge method={entry.method} />
          <span className={styles['detail-url']} title={entry.url}>
            {entry.url}
          </span>
        </div>
        <button className={styles['btn-close']} onClick={onClose} title="Close">
          <Icon name="close" size={20} />
        </button>
      </div>

      <div className={styles['detail-tabs']}>
        {(['overview', 'headers', 'body', 'diff'] as Tab[]).map((t) => (
          <button
            key={t}
            className={[
              styles['tab-btn'],
              tab === t ? styles['active'] : '',
              t === 'diff' && !hasDiff ? styles['disabled'] : '',
            ].join(' ')}
            onClick={() => { if (t !== 'diff' || hasDiff) setTab(t); }}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
            {t === 'diff' && !hasDiff && <span className={styles['tab-hint']}> (n/a)</span>}
          </button>
        ))}
      </div>

      <div className={styles['detail-body']}>
        {tab === 'overview' && (
          <div className={styles['overview-grid']}>
            <div className={styles['overview-item']}>
              <span className={styles['ov-label']}>Status</span>
              <span className={`${styles['ov-value']} ${styles[`status-text-${Math.floor(entry.statusCode / 100)}xx`] ?? styles['status-text-0xx']}`}>
                {entry.statusCode}
              </span>
            </div>
            <div className={styles['overview-item']}>
              <span className={styles['ov-label']}>Latency</span>
              <span className={`${styles['ov-value']} ${entry.slow ? styles['slow-text'] : ''}`}>
                {entry.latency}ms{entry.slow ? ' ⚠' : ''}
              </span>
            </div>
            <div className={styles['overview-item']}>
              <span className={styles['ov-label']}>Method</span>
              <span className={styles['ov-value']}>{entry.method}</span>
            </div>
            <div className={styles['overview-item']}>
              <span className={styles['ov-label']}>Host</span>
              <span className={styles['ov-value']}>{entry.appHost}</span>
            </div>
            <div className={`${styles['overview-item']} ${styles['full-width']}`}>
              <span className={styles['ov-label']}>URL</span>
              <span className={styles['ov-value']}>{entry.url}</span>
            </div>
            <div className={`${styles['overview-item']} ${styles['full-width']}`}>
              <span className={styles['ov-label']}>Timestamp</span>
              <span className={styles['ov-value']}>{new Date(entry.timestamp).toLocaleString()}</span>
            </div>
            <div className={styles['divider']} />
            <div className={styles['replay-section']}>
              <button
                className={styles['btn-replay']}
                onClick={handleReplay}
                disabled={replaying}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Icon name="play" size={16} />
                  <span>{replaying ? 'Replaying…' : 'Replay Request'}</span>
                </div>
              </button>
              {replayStatus && <span className={styles['replay-status']}>{replayStatus}</span>}
            </div>
          </div>
        )}

        {tab === 'headers' && (
          <div className={styles['headers-section']}>
            <h3 className={styles['section-title']}>Request Headers</h3>
            <HeadersTable headers={entry.requestHeaders} />
            <h3 className={styles['section-title']}>Response Headers</h3>
            <HeadersTable headers={entry.responseHeaders} />
          </div>
        )}

        {tab === 'body' && (
          <div className={styles['body-section']}>
            <h3 className={styles['section-title']}>Request Body</h3>
            <JsonBlock value={entry.requestBody} />
            <h3 className={styles['section-title']}>Response Body</h3>
            <JsonBlock value={entry.responseBody} />
          </div>
        )}

        {tab === 'diff' && hasDiff && prevEntry && (
          <div>
            <h3 className={styles['section-title']}>Response Body Diff (prev → current)</h3>
            <DiffView prev={prevEntry.responseBody} curr={entry.responseBody} />
          </div>
        )}
      </div>
    </div>
  );
}
