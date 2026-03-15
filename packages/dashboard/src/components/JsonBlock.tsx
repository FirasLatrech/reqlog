import { useState } from 'react';
import styles from './JsonBlock.module.css';

interface Props {
  value: unknown;
}

export function JsonBlock({ value }: Props) {
  const [copied, setCopied] = useState(false);

  if (value == null || value === '') {
    return <span className={styles['empty-body']}>— empty —</span>;
  }

  const jsonString = JSON.stringify(value, null, 2);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(jsonString);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy', err);
    }
  }

  return (
    <div className={styles['json-wrapper']}>
      <button 
        className={styles['copy-btn']} 
        onClick={handleCopy}
        title="Copy JSON"
      >
        {copied ? 'Copied!' : 'Copy'}
      </button>
      <pre className={styles['json-block']}>{jsonString}</pre>
    </div>
  );
}
