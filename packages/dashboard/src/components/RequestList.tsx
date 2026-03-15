import { useMemo } from 'react';
import type { ReqlogEntry } from '../types.ts';
import type { ConnectionStatus } from '../hooks/useSSE.ts';
import { useTheme } from '../hooks/useTheme.ts';
import { RequestRow } from './RequestRow.tsx';
import { Icon } from './Icon.tsx';
import styles from './RequestList.module.css';

interface Props {
  entries: ReqlogEntry[];
  selectedId: string | null;
  onSelect: (entry: ReqlogEntry) => void;
  onClear: () => void;
  connectionStatus: ConnectionStatus;
}

export function RequestList({ entries, selectedId, onSelect, onClear, connectionStatus }: Props) {
  const reversed = useMemo(() => [...entries].reverse(), [entries]);
  const { theme, toggleTheme } = useTheme();

  const dotClass = connectionStatus === 'open'
    ? styles['conn-open']
    : connectionStatus === 'error'
      ? styles['conn-error']
      : styles['conn-connecting'];

  return (
    <div className={styles['request-list']}>
      <div className={styles['list-header']}>
        {/* Using CSS masking for theme-aware icon color or just SVG switch */}
        <div className={styles['logo-wrapper']}>
          {theme === 'dark' ? (
             <img src="/brand-logo.svg" alt="reqlog" className={styles.logo} />
          ) : (
             <img src="/brand-logo-light.svg" alt="reqlog" className={styles.logo} />
          )}
        </div>
        <span className={styles['list-count']}>{entries.length}</span>
        <div className={styles['header-actions']}>
          <button 
            className={styles['theme-toggle']} 
            onClick={toggleTheme}
            title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          >
            <Icon name={theme === 'dark' ? 'moon' : 'sun'} size={18} />
          </button>
          <div className={`${styles['conn-dot']} ${dotClass}`} title={connectionStatus} />
          <button className={styles['btn-clear']} onClick={onClear} title="Clear all requests">
            <Icon name="trash" size={16} />
          </button>
        </div>
      </div>
      <div className={styles['list-body']}>
        {entries.length === 0 && (
          <div className={styles['list-empty']}>
            <p>Waiting for requests…</p>
            <p className={styles['hint']}>Make requests to your server to see them here</p>
          </div>
        )}
        {reversed.map((entry) => (
          <RequestRow
            key={entry.id}
            entry={entry}
            selected={entry.id === selectedId}
            onClick={() => onSelect(entry)}
          />
        ))}
      </div>
    </div>
  );
}
