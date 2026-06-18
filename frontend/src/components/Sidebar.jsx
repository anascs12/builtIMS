import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Zap, Rocket, Target, Trophy, Swords, Radio, Lightbulb, Settings } from 'lucide-react';
import useAuthStore from '../store/authStore';
import Avatar from './ui/Avatar';

const NAV = [
  { label: 'Feed',         path: '/',            icon: Zap },
  { label: 'Showcase',     path: '/showcase',    icon: Rocket },
  { label: 'Challenges',   path: '/challenges',  icon: Target },
  { label: 'Leaderboard',  path: '/leaderboard', icon: Trophy },
  { label: 'Showdowns',    path: '/showdowns',   icon: Swords },
  { label: 'Skills Radar', path: '/radar',       icon: Radio },
  { label: 'Idea Garage',  path: '/ideas',       icon: Lightbulb },
];

export default function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isLoggedIn } = useAuthStore();

  return (
    <aside className="hidden lg:flex flex-col w-[220px] flex-shrink-0">
      <div className="sticky top-[68px] flex flex-col gap-0.5">
        {NAV.map((item) => {
          const active = location.pathname === item.path;
          const Icon   = item.icon;
          return (
            <Link
              key={item.path}
              to={item.path}
              className="flex items-center gap-2.5 px-3 py-2 rounded-[10px] text-sm transition-all duration-150 relative"
              style={{
                color:      active ? 'var(--accent)' : 'var(--text-secondary)',
                background: active ? 'var(--accent-dim)' : 'transparent',
                borderLeft: active ? '3px solid var(--accent)' : '3px solid transparent',
                paddingLeft: active ? 'calc(12px - 3px)' : '12px',
                fontWeight: active ? 500 : 400,
              }}
              onMouseEnter={e => { if (!active) { e.currentTarget.style.background = 'var(--bg-hover)'; e.currentTarget.style.color = 'var(--text-primary)'; } }}
              onMouseLeave={e => { if (!active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)'; } }}
            >
              <Icon size={15} strokeWidth={active ? 2 : 1.5} />
              <span>{item.label}</span>
            </Link>
          );
        })}

        {/* Divider */}
        <div className="my-3 divider" />

        {/* User card */}
        {isLoggedIn && user ? (
          <div
            className="rounded-[10px] p-3 transition-colors cursor-pointer"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}
            onClick={() => navigate(`/u/${user.username}`)}
            onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--border-default)'}
            onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-subtle)'}
          >
            <div className="flex items-center gap-2.5 mb-3">
              <Avatar user={user} size={30} />
              <div className="min-w-0">
                <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{user.full_name}</p>
                <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>@{user.username}</p>
              </div>
            </div>
            <Link
              to="/settings"
              className="flex items-center gap-1.5 text-xs transition-colors"
              style={{ color: 'var(--text-muted)' }}
              onClick={e => e.stopPropagation()}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--text-secondary)'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
            >
              <Settings size={12} strokeWidth={1.5} />
              Settings
            </Link>
          </div>
        ) : (
          <div
            className="rounded-[10px] p-3"
            style={{ background: 'var(--accent-dim)', border: '1px solid var(--accent-border)' }}
          >
            <p className="text-xs mb-2.5" style={{ color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Track your progress and showcase your work
            </p>
            <Link to="/register" className="btn-primary w-full text-xs py-1.5 justify-center">
              Get started free
            </Link>
          </div>
        )}
      </div>
    </aside>
  );
}
