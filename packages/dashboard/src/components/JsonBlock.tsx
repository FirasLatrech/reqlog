import styles from './JsonBlock.module.css';

interface Props {
  value: unknown;
}

export function JsonBlock({ value }: Props) {
  if (value == null || value === '') {
    return <span className={styles['empty-body']}>— empty —</span>;
  }
  return (
    <pre className={styles['json-block']}>{JSON.stringify(value, null, 2)}</pre>
  );
}
