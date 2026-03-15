import styles from './RequestRow.module.css';

interface Props {
  method: string;
}

const KNOWN_METHODS = new Set(['get', 'post', 'put', 'patch', 'delete', 'options', 'head']);

export function MethodBadge({ method }: Props) {
  const normalizedMethod = method.toLowerCase();
  const methodClass = KNOWN_METHODS.has(normalizedMethod)
    ? styles[`method-${normalizedMethod}`]
    : styles['method-unknown'];

  return (
    <span className={`${styles['method-badge']} ${methodClass}`}>
      {method.toUpperCase()}
    </span>
  );
}
