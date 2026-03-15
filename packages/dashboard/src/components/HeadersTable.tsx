import styles from './HeadersTable.module.css';

interface Props {
  headers: Record<string, string>;
}

export function HeadersTable({ headers }: Props) {
  const entries = Object.entries(headers);
  if (entries.length === 0) {
    return <span className={styles['empty-body']}>No headers</span>;
  }
  return (
    <table className={styles['headers-table']}>
      <tbody>
        {entries.map(([k, v]) => (
          <tr key={k}>
            <td className={styles['header-key']}>{k}</td>
            <td className={styles['header-val']}>{v}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
