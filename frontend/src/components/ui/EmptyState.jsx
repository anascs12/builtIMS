import { Link } from 'react-router-dom';
import Icon from '../Icon';

export default function EmptyState({ icon = 'Inbox', title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="mb-4 rounded-2xl p-4" style={{ background: 'var(--bg-hover)', border: '1px solid var(--border-subtle)' }}>
        <Icon name={icon} size={28} color="var(--text-muted)" strokeWidth={1.5} />
      </div>
      <h3 className="text-base font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>{title}</h3>
      {description && (
        <p className="text-sm mb-4 max-w-xs" style={{ color: 'var(--text-muted)' }}>{description}</p>
      )}
      {action && (
        <Link to={action.href} className="btn-primary text-sm">
          {action.label}
        </Link>
      )}
    </div>
  );
}
