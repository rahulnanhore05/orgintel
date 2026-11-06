export function Badge({
  children,
  variant = 'neutral',
  icon: Icon = null,
  className = '',
}) {
  const variantClass = {
    success: 'badge-success',
    warning: 'badge-warning',
    danger: 'badge-danger',
    info: 'badge-info',
    neutral: 'badge-neutral',
  }[variant] || 'badge-neutral';

  return (
    <span className={`badge ${variantClass} ${className}`}>
      {Icon && <Icon size={12} aria-hidden="true" />}
      <span>{children}</span>
    </span>
  );
}
