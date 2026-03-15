import { useState } from 'react';
import { useSSE } from './hooks/useSSE.ts';
import { RequestList } from './components/RequestList.tsx';
import { DetailPane } from './components/DetailPane.tsx';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
import { Icon } from './components/Icon.tsx';
import type { ReqlogEntry } from './types.ts';
import './App.css';

export default function App() {
  const { entries, clear, status } = useSSE('/events');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selectedEntry = entries.find((e) => e.id === selectedId) ?? null;

  const prevEntry: ReqlogEntry | null = (() => {
    if (!selectedEntry) return null;
    const idx = entries.findIndex((e) => e.id === selectedId);
    if (idx <= 0) return null;
    for (let i = idx - 1; i >= 0; i--) {
      if (
        entries[i].method === selectedEntry.method &&
        entries[i].url === selectedEntry.url
      ) {
        return entries[i];
      }
    }
    return null;
  })();

  function handleSelect(entry: ReqlogEntry) {
    setSelectedId(entry.id === selectedId ? null : entry.id);
  }

  return (
    <div className={`app ${selectedEntry ? 'has-detail' : ''}`}>
      <RequestList
        entries={entries}
        selectedId={selectedId}
        onSelect={handleSelect}
        onClear={clear}
        connectionStatus={status}
      />
      {selectedEntry && (
        <ErrorBoundary>
          <DetailPane
            entry={selectedEntry}
            prevEntry={prevEntry}
            onClose={() => setSelectedId(null)}
          />
        </ErrorBoundary>
      )}
      {!selectedEntry && (
        <div className="empty-detail">
          <div className="empty-detail-inner">
            <div className="empty-detail-icon">
              <Icon name="lightning" size={32} />
            </div>
            <h2>Select a request</h2>
            <p>Click any request to inspect headers, body, and replay it</p>
          </div>
        </div>
      )}
    </div>
  );
}
