import styles from './DiffView.module.css';

interface Props {
  prev: unknown;
  curr: unknown;
}

interface DiffLine {
  type: 'added' | 'removed' | 'unchanged';
  text: string;
}

function diffLines(a: string, b: string): DiffLine[] {
  const aLines = a.split('\n');
  const bLines = b.split('\n');
  const m = aLines.length;
  const n = bLines.length;

  const dp: number[][] = Array.from({ length: m + 1 }, () =>
    new Array(n + 1).fill(0)
  );
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = aLines[i - 1] === bLines[j - 1]
        ? dp[i - 1][j - 1] + 1
        : Math.max(dp[i - 1][j], dp[i][j - 1]);
    }
  }

  const result: DiffLine[] = [];
  let i = m, j = n;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && aLines[i - 1] === bLines[j - 1]) {
      result.push({ type: 'unchanged', text: aLines[i - 1] });
      i--; j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      result.push({ type: 'added', text: bLines[j - 1] });
      j--;
    } else {
      result.push({ type: 'removed', text: aLines[i - 1] });
      i--;
    }
  }
  return result.reverse();
}

const MAX_DIFF_LINES = 2000;

export function DiffView({ prev, curr }: Props) {
  const prevStr = JSON.stringify(prev, null, 2) ?? '';
  const currStr = JSON.stringify(curr, null, 2) ?? '';

  if (prevStr === currStr) {
    return <div className={styles['diff-identical']}><span>No changes from previous request</span></div>;
  }

  const prevLines = prevStr.split('\n');
  const currLines = currStr.split('\n');

  if (prevLines.length > MAX_DIFF_LINES || currLines.length > MAX_DIFF_LINES) {
    return (
      <div className={styles['diff-identical']}>
        <span>Response too large to diff ({Math.max(prevLines.length, currLines.length).toLocaleString()} lines)</span>
      </div>
    );
  }

  const lines = diffLines(prevStr, currStr);
  const hasChanges = lines.some((l) => l.type !== 'unchanged');

  if (!hasChanges) {
    return (
      <div className={styles['diff-identical']}>
        <span>Bodies are identical</span>
      </div>
    );
  }

  return (
    <div className={styles['diff-view']}>
      {lines.map((line, i) => (
        <div
          key={`${line.type}-${i}-${line.text.slice(0, 30)}`}
          className={`${styles['diff-line']} ${styles[`diff-${line.type}`]}`}
        >
          <span className={styles['diff-sign']}>
            {line.type === 'added' ? '+' : line.type === 'removed' ? '-' : ' '}
          </span>
          <span className={styles['diff-text']}>{line.text}</span>
        </div>
      ))}
    </div>
  );
}
