export function Skeleton({
  width = '100%',
  height = '1rem',
  borderRadius = 'var(--radius-xs)',
  className = '',
  style = {},
}) {
  return (
    <div
      className={className}
      style={{
        width,
        height,
        borderRadius,
        backgroundColor: 'var(--border-light)',
        backgroundImage: 'linear-gradient(90deg, var(--border-light) 0%, #edf2f7 50%, var(--border-light) 100%)',
        backgroundSize: '200% 100%',
        animation: 'skeletonPulse 1.5s ease-in-out infinite',
        ...style,
      }}
      aria-hidden="true"
    />
  );
}
