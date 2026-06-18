import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { GitFork, Link2, FolderGit2, Flame, CheckCircle2, Award, XCircle, Medal, GraduationCap } from 'lucide-react';
import Layout  from '../components/Layout';
import Card    from '../components/ui/Card';
import Skeleton from '../components/ui/Skeleton';
import Avatar  from '../components/ui/Avatar';
import api     from '../api/axios';

const TABS = ['Projects', 'Challenges', 'Ideas', 'Showdowns'];

function StatBox({ icon: Icon, value, label, color }) {
  return (
    <Card padding="md" className="text-center">
      <Icon size={18} strokeWidth={1.5} style={{ margin: '0 auto 8px', color: color || 'var(--text-muted)' }} />
      <p className="text-2xl font-bold mb-0.5" style={{ color: 'var(--text-primary)', letterSpacing: '-0.03em' }}>{value}</p>
      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{label}</p>
    </Card>
  );
}

function BadgeItem({ badge }) {
  const colors = { 'bronze-builder': '#CD7F32', 'silver-builder': '#A8A9AD', 'gold-builder': '#FFD700', 'showdown-champion': '#A855F7' };
  const color = colors[badge.slug] || 'var(--accent)';
  return (
    <div className="flex items-center gap-2.5 py-2">
      <div className="flex items-center justify-center w-8 h-8 rounded-full" style={{ background: `${color}20`, border: `1px solid ${color}40` }}>
        <Medal size={15} color={color} strokeWidth={1.5} />
      </div>
      <div>
        <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{badge.name}</p>
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
          {badge.awarded_at ? new Date(badge.awarded_at).toLocaleDateString() : ''}
        </p>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const { username } = useParams();
  const [profile,  setProfile]  = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [tab,      setTab]      = useState('Projects');
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    setLoading(true);
    setNotFound(false);
    api.get(`/users/${username}`)
      .then(({ data }) => setProfile(data))
      .catch((err) => { if (err.response?.status === 404) setNotFound(true); })
      .finally(() => setLoading(false));
  }, [username]);

  if (loading) return (
    <Layout>
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <Skeleton width={80} height={80} rounded />
          <div className="flex-1 space-y-2">
            <Skeleton width="40%" height={22} />
            <Skeleton width="25%" height={14} />
          </div>
        </div>
        <div className="grid grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => <Skeleton key={i} height={80} />)}
        </div>
      </div>
    </Layout>
  );

  if (notFound) return (
    <Layout>
      <Card padding="lg" className="text-center">
        <h2 className="text-lg font-semibold mb-2">User not found</h2>
        <Link to="/" className="btn-secondary">Go home</Link>
      </Card>
    </Layout>
  );

  const { user, stats, badges, projects } = profile || {};

  return (
    <Layout>
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

          {/* Left column */}
          <div className="lg:col-span-1 space-y-4">
            <div className="flex lg:flex-col items-start gap-4">
              <Avatar user={user} size={72} style={{ borderRadius: 'var(--radius-lg)', width: 72, height: 72, border: '2px solid var(--border-default)', flexShrink: 0 }} />
              <div>
                <h1 className="text-xl font-bold mb-0.5" style={{ letterSpacing: '-0.02em' }}>{user?.full_name}</h1>
                <p className="text-sm mb-2" style={{ color: 'var(--text-muted)' }}>@{user?.username}</p>
                <div className="flex flex-wrap gap-1 mb-2">
                  {user?.program_code && <span className="badge-gray"><GraduationCap size={10} /> {user.program_code}</span>}
                  {user?.current_semester && <span className="badge-gray">Sem {user.current_semester}</span>}
                  {user?.role !== 'student' && <span className="badge-accent capitalize">{user.role}</span>}
                </div>
              </div>
            </div>

            {user?.bio && <p className="text-sm" style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>{user.bio}</p>}

            <div className="space-y-2">
              {user?.github_username && (
                <a href={`https://github.com/${user.github_username}`} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm transition-colors"
                  style={{ color: 'var(--text-secondary)' }}
                  onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'}
                  onMouseLeave={e => e.currentTarget.style.color = 'var(--text-secondary)'}
                >
                  <GitFork size={14} strokeWidth={1.5} />
                  @{user.github_username}
                </a>
              )}
              {user?.linkedin_url && (
                <a href={user.linkedin_url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm transition-colors"
                  style={{ color: 'var(--text-secondary)' }}
                  onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'}
                  onMouseLeave={e => e.currentTarget.style.color = 'var(--text-secondary)'}
                >
                  <Link2 size={14} strokeWidth={1.5} />
                  LinkedIn
                </a>
              )}
            </div>

            {badges?.length > 0 && (
              <Card padding="md">
                <p className="text-xs font-medium mb-2" style={{ color: 'var(--text-muted)' }}>BADGES</p>
                <div className="divide-y" style={{ '--tw-divide-opacity': 1 }}>
                  {badges.map((b, i) => <BadgeItem key={i} badge={b} />)}
                </div>
              </Card>
            )}
          </div>

          {/* Right column */}
          <div className="lg:col-span-3 space-y-5">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatBox icon={FolderGit2}   value={stats?.projects_submitted || 0}        label="Projects"      />
              <StatBox icon={Flame}        value={stats?.current_streak || 0}            label="Streak"        color="var(--accent)" />
              <StatBox icon={CheckCircle2} value={stats?.ideas_shipped || 0}            label="Shipped Ideas" color="var(--green)" />
              <StatBox icon={Award}        value={stats?.total_badges || 0}              label="Badges"        color="#FFD700" />
              {stats?.ideas_abandoned > 0 && (
                <StatBox icon={XCircle}   value={stats.ideas_abandoned}               label="Abandoned"     color="var(--red)" />
              )}
            </div>

            {/* Tabs */}
            <div className="flex gap-0.5 p-1 rounded-[10px]" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', width: 'fit-content' }}>
              {TABS.map((t) => (
                <button key={t} onClick={() => setTab(t)}
                  className="px-4 py-1.5 rounded-[8px] text-sm font-medium transition-colors"
                  style={{
                    background: tab === t ? 'var(--bg-hover)' : 'transparent',
                    color: tab === t ? 'var(--text-primary)' : 'var(--text-muted)',
                  }}
                >
                  {t}
                </button>
              ))}
            </div>

            {tab === 'Projects' && (
              projects?.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {projects.map((p) => (
                    <Card key={p.id} hover padding="md">
                      <Link to={`/projects/${p.id}`} className="text-sm font-semibold block mb-1 transition-colors" style={{ color: 'var(--text-primary)' }}
                        onMouseEnter={e => e.currentTarget.style.color = 'var(--accent)'}
                        onMouseLeave={e => e.currentTarget.style.color = 'var(--text-primary)'}
                      >
                        {p.title}
                      </Link>
                      <p className="text-xs line-clamp-2 mb-2" style={{ color: 'var(--text-secondary)' }}>{p.description}</p>
                      <div className="flex items-center justify-between">
                        <div className="flex flex-wrap gap-1">
                          {p.tech_tags?.filter(Boolean).slice(0, 3).map((t) => (
                            <span key={t} className="badge-gray text-[10px]">{t}</span>
                          ))}
                        </div>
                        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{p.votes} votes</span>
                      </div>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12" style={{ color: 'var(--text-muted)' }}>
                  <FolderGit2 size={28} strokeWidth={1.5} style={{ margin: '0 auto 8px' }} />
                  <p className="text-sm">No projects yet</p>
                </div>
              )
            )}

            {tab !== 'Projects' && (
              <div className="text-center py-12" style={{ color: 'var(--text-muted)' }}>
                <p className="text-sm">{tab} activity — coming soon</p>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </Layout>
  );
}
