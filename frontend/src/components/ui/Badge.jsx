const VARIANT_CLASS = {
  success: 'badge-green',
  warning: 'badge-yellow',
  error:   'badge-red',
  info:    'badge-blue',
  neutral: 'badge-gray',
  accent:  'badge-accent',
  purple:  'badge-purple',
};

export default function Badge({ variant = 'neutral', children, className = '' }) {
  return (
    <span className={`${VARIANT_CLASS[variant] || 'badge-gray'} ${className}`}>
      {children}
    </span>
  );
}
