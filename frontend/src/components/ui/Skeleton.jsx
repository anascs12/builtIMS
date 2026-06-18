export default function Skeleton({ width = '100%', height = 16, rounded = false, className = '' }) {
  return (
    <div
      className={`skeleton ${className}`}
      style={{
        width,
        height,
        borderRadius: rounded ? '9999px' : 'var(--radius-sm)',
      }}
    />
  );
}
