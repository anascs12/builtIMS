import { getAvatarUrl } from '../../utils/avatar';

export default function Avatar({ user, size = 32, className = '' }) {
  const url = getAvatarUrl(user?.avatar_url, user?.username);
  return (
    <img
      src={url}
      alt={user?.username || 'User'}
      width={size}
      height={size}
      className={className}
      style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', display: 'block', flexShrink: 0 }}
      onError={(e) => { e.target.src = getAvatarUrl(null, user?.username); }}
    />
  );
}
