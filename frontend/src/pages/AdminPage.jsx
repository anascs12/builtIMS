import { useState, useEffect, useCallback } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Users, FolderGit2, Zap, Flame, CheckCircle2, Swords, Bot, Send, ShieldCheck } from 'lucide-react';
import Layout  from '../components/Layout';
import Card    from '../components/ui/Card';
import Avatar  from '../components/ui/Avatar';
import Button  from '../components/ui/Button';
import Skeleton from '../components/ui/Skeleton';
import EmptyState from '../components/ui/EmptyState';
import api     from '../api/axios';
import toast   from 'react-hot-toast';
import useAuthStore from '../store/authStore';
import { formatDistanceToNow } from 'date-fns';

const TABS      = ['Dashboard', 'Moderation', 'Challenges', 'Showdowns', 'Users', 'Digest'];
const DAY_TYPES = ['code', 'design', 'debug', 'explain', 'build'];
const LEVELS    = ['beginner', 'intermediate', 'advanced', 'expert'];

export default function AdminPage() {
  const { user } = useAuthStore();
  const [tab,           setTab]           = useState('Dashboard');
  const [stats,         setStats]         = useState(null);
  const [pending,       setPending]       = useState([]);
  const [challenges,    setChallenges]    = useState([]);
  const [showdowns,     setShowdowns]     = useState([]);
  const [users,         setUsers]         = useState([]);
  const [digestStats,   setDigestStats]   = useState(null);
  const [loading,       setLoading]       = useState(true);
  const [userSearch,    setUserSearch]    = useState('');
  const [userRole,      setUserRole]      = useState('');
  const [challengeForm, setChallengeForm] = useState({
    title: '', description: '', dayType: 'code', level: 'beginner',
    publishDate: new Date().toISOString().split('T')[0], minSemester: 1, maxSemester: 8,
  });
  const [showdownForm, setShowdownForm] = useState({
    title: '', theme: '', description: '', rules: '',
    minSemester: 1, maxSemester: 8, startsAt: '', endsAt: '',
  });

  if (!user || (user.role !== 'faculty' && user.role !== 'admin')) return <Navigate to="/" replace />;

  const loadUsers = useCallback(async (search = userSearch, role = userRole) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: 50 });
      if (search) params.append('search', search);
      if (role)   params.append('role',   role);
      const { data } = await api.get(`/admin/users?${params}`);
      setUsers(data.users || []);
    } catch { toast.error('Failed to load users.'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        if      (tab === 'Dashboard')  { const { data } = await api.get('/admin/dashboard');        setStats(data.stats); }
        else if (tab === 'Moderation') { const { data } = await api.get('/admin/projects/pending'); setPending(data.projects || []); }
        else if (tab === 'Challenges') { const { data } = await api.get('/admin/challenges');        setChallenges(data.challenges || []); }
        else if (tab === 'Showdowns')  { const { data } = await api.get('/showdowns');               setShowdowns(data.showdowns || []); }
        else if (tab === 'Users')      { await loadUsers('', ''); }
        else if (tab === 'Digest')     { const { data } = await api.get('/admin/digest/stats');      setDigestStats(data.stats); }
      } catch {} finally { setLoading(false); }
    };
    load();
  }, [tab]);

  const handleModerate = async (projectId, action) => {
    const reason = action === 'rejected' ? prompt('Rejection reason (required):') : null;
    if (action === 'rejected' && !reason) return;
    try {
      await api.patch(`/admin/projects/${projectId}/moderate`, { action, rejectionReason: reason });
      toast.success(`Project ${action}!`);
      setPending((prev) => prev.filter((p) => p.id !== projectId));
    } catch (err) { toast.error(err.response?.data?.message || 'Failed.'); }
  };

  const handleCreateChallenge = async (e) => {
    e.preventDefault();
    try {
      await api.post('/admin/challenges', challengeForm);
      toast.success('Challenge created!');
      setChallengeForm({ title: '', description: '', dayType: 'code', level: 'beginner', publishDate: new Date().toISOString().split('T')[0], minSemester: 1, maxSemester: 8 });
      const { data } = await api.get('/admin/challenges');
      setChallenges(data.challenges || []);
    } catch (err) { toast.error(err.response?.data?.message || 'Failed.'); }
  };

  const handleCreateShowdown = async (e) => {
    e.preventDefault();
    try {
      await api.post('/showdowns', {
        ...showdownForm,
        startsAt: new Date(showdownForm.startsAt).toISOString(),
        endsAt:   new Date(showdownForm.endsAt).toISOString(),
      });
      toast.success('Showdown created!');
      setShowdownForm({ title: '', theme: '', description: '', rules: '', minSemester: 1, maxSemester: 8, startsAt: '', endsAt: '' });
      const { data } = await api.get('/showdowns');
      setShowdowns(data.showdowns || []);
    } catch (err) { toast.error(err.response?.data?.message || 'Failed.'); }
  };

  const handleShowdownStatus = async (id, status) => {
    try {
      await api.patch(`/showdowns/${id}/status`, { status });
      toast.success('Status updated!');
      setShowdowns((prev) => prev.map((s) => s.id === id ? { ...s, status } : s));
    } catch { toast.error('Failed.'); }
  };

  const handleRoleChange   = async (userId, role)   => { try { await api.patch(`/admin/users/${userId}/role`,   { role });   toast.success('Role updated!');   setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, role }   : u)); } catch (err) { toast.error(err.response?.data?.message || 'Failed.'); } };
  const handleStatusChange = async (userId, status) => { try { await api.patch(`/admin/users/${userId}/status`, { status }); toast.success('Status updated!'); setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, status } : u)); } catch (err) { toast.error(err.response?.data?.message || 'Failed.'); } };

  const handleSendDigest = async () => {
    if (!window.confirm('Send weekly digest now?')) return;
    try { const { data } = await api.post('/admin/digest/send'); toast.success(`Sent to ${data.sent} users!`); }
    catch (err) { toast.error(err.response?.data?.message || 'Failed.'); }
  };

  const SHOWDOWN_STATUS_BADGES = {
    upcoming: 'badge-blue', active: 'badge-green', judging: 'badge-yellow', closed: 'badge-gray'
  };

  const selectClass = 'text-xs rounded-[8px] px-2 py-1.5 outline-none transition-colors';
  const selectStyle = { background: 'var(--bg-hover)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)' };

  return (
    <Layout>
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold" style={{ letterSpacing: '-0.02em' }}>Admin Panel</h1>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Manage BuildIMS platform</p>
          </div>
          <span className="badge-accent capitalize flex items-center gap-1">
            <ShieldCheck size={11} strokeWidth={2} /> {user.role}
          </span>
        </div>

        {/* Tabs */}
        <div className="flex gap-0.5 mb-5 overflow-x-auto" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
          {TABS.map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className="px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-all -mb-px flex items-center gap-1.5"
              style={{ borderBottom: tab === t ? '2px solid var(--accent)' : '2px solid transparent', color: tab === t ? 'var(--text-primary)' : 'var(--text-muted)' }}>
              {t}
              {t === 'Moderation' && pending.length > 0 && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: 'var(--accent)', color: 'white' }}>{pending.length}</span>
              )}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="space-y-3">{[...Array(4)].map((_, i) => <Skeleton key={i} height={80} />)}</div>
        ) : (
          <>
            {/* Dashboard */}
            {tab === 'Dashboard' && stats && (
              <div className="space-y-5">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { label: 'Total Users',   value: stats.users.total,               sub: `${stats.users.newThisWeek} this week`,        icon: Users },
                    { label: 'Active Users',  value: stats.users.active,              sub: 'verified',                                   icon: CheckCircle2 },
                    { label: 'Projects',      value: stats.projects.total,            sub: `${stats.projects.pending} pending`,            icon: FolderGit2 },
                    { label: 'Submissions',   value: stats.challenges.totalSubmissions, sub: `${stats.challenges.completionsThisWeek}/wk`, icon: Zap },
                  ].map((s, i) => {
                    const Icon = s.icon;
                    return (
                      <Card key={s.label} padding="md" className="text-center">
                        <Icon size={16} strokeWidth={1.5} style={{ margin: '0 auto 6px', color: 'var(--text-muted)' }} />
                        <p className="text-2xl font-bold mb-0.5" style={{ color: 'var(--text-primary)', letterSpacing: '-0.03em' }}>{s.value}</p>
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{s.label}</p>
                        <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)', opacity: 0.7 }}>{s.sub}</p>
                      </Card>
                    );
                  })}
                </div>

                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: 'Top Streak',     value: stats.streaks.top,            sub: `${stats.streaks.active} active`,     icon: Flame, color: 'var(--accent)' },
                    { label: 'Feed Actions',   value: stats.feed.actionsThisWeek,   sub: 'this week',                          icon: Zap },
                    { label: 'Pending Review', value: stats.pendingModeration,      sub: null,                                 icon: FolderGit2, warn: stats.pendingModeration > 0 },
                  ].map((s) => {
                    const Icon = s.icon;
                    return (
                      <Card key={s.label} padding="md" className="text-center">
                        <Icon size={16} strokeWidth={1.5} style={{ margin: '0 auto 6px', color: s.color || (s.warn ? '#fbbf24' : 'var(--text-muted)') }} />
                        <p className="text-2xl font-bold mb-0.5" style={{ color: s.color || (s.warn ? '#fbbf24' : 'var(--text-primary)'), letterSpacing: '-0.03em' }}>{s.value}</p>
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{s.label}</p>
                        {s.warn && stats.pendingModeration > 0 && (
                          <button onClick={() => setTab('Moderation')} className="text-xs mt-1 transition-colors" style={{ color: 'var(--accent)' }}>Review now</button>
                        )}
                      </Card>
                    );
                  })}
                </div>

                <Card padding="md">
                  <h2 className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: 'var(--text-muted)' }}>MVP Success Criteria</h2>
                  <div className="space-y-4">
                    {[
                      { label: '30 students registered',         current: stats.users.total,                    target: 30 },
                      { label: '10+ projects submitted',         current: stats.projects.approved,              target: 10 },
                      { label: '10+ daily feed actions',         current: stats.feed.actionsThisWeek,           target: 10 },
                      { label: '15+ challenge completions/week', current: stats.challenges.completionsThisWeek, target: 15 },
                    ].map(({ label, current, target }) => {
                      const pct  = Math.min(Math.round((current / target) * 100), 100);
                      const done = current >= target;
                      return (
                        <div key={label}>
                          <div className="flex justify-between text-xs mb-1.5">
                            <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
                            <span style={{ color: done ? '#4ade80' : 'var(--text-muted)' }}>{current}/{target}{done ? ' ✓' : ''}</span>
                          </div>
                          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-hover)' }}>
                            <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ delay: 0.4, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                              className="h-full rounded-full"
                              style={{ background: done ? '#4ade80' : 'var(--accent)' }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </Card>
              </div>
            )}

            {/* Moderation */}
            {tab === 'Moderation' && (
              <div className="space-y-3">
                {pending.length === 0 ? (
                  <EmptyState icon="CheckCircle2" title="All caught up!" description="No projects pending review" />
                ) : pending.map((project, i) => (
                  <Card key={project.id} padding="md">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="badge-blue">{project.program_code}</span>
                          <span className="badge-gray">S{project.semester}</span>
                          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                            {formatDistanceToNow(new Date(project.created_at), { addSuffix: true })}
                          </span>
                        </div>
                        <h3 className="font-semibold text-base mb-1" style={{ color: 'var(--text-primary)' }}>{project.title}</h3>
                        <p className="text-sm line-clamp-2 mb-3" style={{ color: 'var(--text-secondary)' }}>{project.description}</p>
                        <div className="flex items-center gap-3">
                          <Link to={`/u/${project.username}`} className="flex items-center gap-1.5">
                            <Avatar user={{ username: project.username, avatar_url: project.avatar_url }} size={22} />
                            <span className="text-xs transition-colors" style={{ color: 'var(--accent)' }}>@{project.username}</span>
                          </Link>
                          {project.github_url && (
                            <a href={project.github_url} target="_blank" rel="noreferrer" className="text-xs" style={{ color: 'var(--text-muted)' }}>GitHub</a>
                          )}
                        </div>
                        {project.tech_tags?.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {project.tech_tags.map((tag) => <span key={tag} className="badge-gray text-[10px]">{tag}</span>)}
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col gap-2 flex-shrink-0">
                        <button onClick={() => handleModerate(project.id, 'approved')}
                          className="px-3 py-1.5 rounded-[8px] text-xs font-medium transition-colors"
                          style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.25)', color: '#4ade80' }}>
                          Approve
                        </button>
                        <button onClick={() => handleModerate(project.id, 'rejected')}
                          className="px-3 py-1.5 rounded-[8px] text-xs font-medium transition-colors"
                          style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)', color: '#f87171' }}>
                          Reject
                        </button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}

            {/* Challenges */}
            {tab === 'Challenges' && (
              <div className="space-y-5">
                <Card padding="md">
                  <h2 className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: 'var(--text-muted)' }}>Create Daily Challenge</h2>
                  <form onSubmit={handleCreateChallenge} className="space-y-4">
                    <div>
                      <label className="label">Title</label>
                      <input value={challengeForm.title} onChange={(e) => setChallengeForm({ ...challengeForm, title: e.target.value })} className="input" placeholder="e.g. Build a REST API endpoint" required />
                    </div>
                    <div>
                      <label className="label">Description</label>
                      <textarea value={challengeForm.description} onChange={(e) => setChallengeForm({ ...challengeForm, description: e.target.value })} className="input resize-none" rows={4} placeholder="Describe the challenge in detail..." required />
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div>
                        <label className="label">Day Type</label>
                        <select value={challengeForm.dayType} onChange={(e) => setChallengeForm({ ...challengeForm, dayType: e.target.value })} className="input">
                          {DAY_TYPES.map((d) => <option key={d} value={d}>{d}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="label">Level</label>
                        <select value={challengeForm.level} onChange={(e) => setChallengeForm({ ...challengeForm, level: e.target.value })} className="input">
                          {LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="label">Publish Date</label>
                        <input type="date" value={challengeForm.publishDate} onChange={(e) => setChallengeForm({ ...challengeForm, publishDate: e.target.value })} className="input" required />
                      </div>
                      <div>
                        <label className="label">Semesters</label>
                        <div className="flex gap-2">
                          <select value={challengeForm.minSemester} onChange={(e) => setChallengeForm({ ...challengeForm, minSemester: parseInt(e.target.value) })} className="input">
                            {[1,2,3,4,5,6,7,8].map((s) => <option key={s} value={s}>S{s}</option>)}
                          </select>
                          <select value={challengeForm.maxSemester} onChange={(e) => setChallengeForm({ ...challengeForm, maxSemester: parseInt(e.target.value) })} className="input">
                            {[1,2,3,4,5,6,7,8].map((s) => <option key={s} value={s}>S{s}</option>)}
                          </select>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-wrap">
                      <Button type="submit">Create Challenge</Button>
                      <Button type="button" variant="secondary"
                        onClick={async () => {
                          const tid = toast.loading('Generating with ML model...');
                          try {
                            const { data } = await api.post('/admin/ml/generate');
                            toast.dismiss(tid);
                            if (data.success) {
                              toast.success(`Generated: "${data.challenge.title}"`);
                              const res = await api.get('/admin/challenges');
                              setChallenges(res.data.challenges || []);
                            } else { toast.error(data.message); }
                          } catch { toast.dismiss(tid); toast.error('ML generation failed — is ml_server running?'); }
                        }}>
                        <Bot size={13} /> Auto-Generate with ML
                      </Button>
                    </div>
                  </form>
                </Card>

                <div>
                  <h2 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-muted)' }}>Recent Challenges</h2>
                  <div className="space-y-2">
                    {challenges.map((c) => (
                      <Card key={c.id} padding="sm" className="flex items-center gap-4">
                        <span className="badge-gray text-[10px] capitalize flex-shrink-0">{c.day_type}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{c.title}</p>
                          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                            {new Date(c.publish_date).toLocaleDateString('en-PK', { weekday: 'short', month: 'short', day: 'numeric' })}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="badge-gray text-[10px] capitalize">{c.level}</span>
                          <span className="text-xs flex items-center gap-0.5" style={{ color: 'var(--text-muted)' }}>
                            <Zap size={10} strokeWidth={2} /> {c.submissions}
                          </span>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Showdowns */}
            {tab === 'Showdowns' && (
              <div className="space-y-5">
                <Card padding="md">
                  <h2 className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: 'var(--text-muted)' }}>Create Semester Showdown</h2>
                  <form onSubmit={handleCreateShowdown} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="label">Title</label>
                        <input value={showdownForm.title} onChange={(e) => setShowdownForm({ ...showdownForm, title: e.target.value })} className="input" placeholder="e.g. AI Warfare Showdown" required />
                      </div>
                      <div>
                        <label className="label">Theme</label>
                        <input value={showdownForm.theme} onChange={(e) => setShowdownForm({ ...showdownForm, theme: e.target.value })} className="input" placeholder="e.g. Build something using AI" required />
                      </div>
                    </div>
                    <div>
                      <label className="label">Description</label>
                      <textarea value={showdownForm.description} onChange={(e) => setShowdownForm({ ...showdownForm, description: e.target.value })} className="input resize-none" rows={3} placeholder="Describe the showdown..." />
                    </div>
                    <div>
                      <label className="label">Rules</label>
                      <textarea value={showdownForm.rules} onChange={(e) => setShowdownForm({ ...showdownForm, rules: e.target.value })} className="input resize-none" rows={3} placeholder="1. Solo only&#10;2. GitHub required" />
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div>
                        <label className="label">Min Semester</label>
                        <select value={showdownForm.minSemester} onChange={(e) => setShowdownForm({ ...showdownForm, minSemester: parseInt(e.target.value) })} className="input">
                          {[1,2,3,4,5,6,7,8].map((s) => <option key={s} value={s}>S{s}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="label">Max Semester</label>
                        <select value={showdownForm.maxSemester} onChange={(e) => setShowdownForm({ ...showdownForm, maxSemester: parseInt(e.target.value) })} className="input">
                          {[1,2,3,4,5,6,7,8].map((s) => <option key={s} value={s}>S{s}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="label">Start Date & Time</label>
                        <input type="datetime-local" value={showdownForm.startsAt} onChange={(e) => setShowdownForm({ ...showdownForm, startsAt: e.target.value })} className="input" required />
                      </div>
                      <div>
                        <label className="label">End Date & Time</label>
                        <input type="datetime-local" value={showdownForm.endsAt} onChange={(e) => setShowdownForm({ ...showdownForm, endsAt: e.target.value })} className="input" required />
                      </div>
                    </div>
                    <Button type="submit"><Swords size={13} /> Create Showdown</Button>
                  </form>
                </Card>

                <div>
                  <h2 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-muted)' }}>All Showdowns</h2>
                  {showdowns.length === 0 ? (
                    <EmptyState icon="Swords" title="No showdowns yet" description="" />
                  ) : (
                    <div className="space-y-2">
                      {showdowns.map((s) => (
                        <Card key={s.id} padding="sm" className="flex items-center gap-4">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{s.title}</p>
                            <p className="text-xs" style={{ color: 'var(--accent)' }}>{s.theme}</p>
                            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                              {new Date(s.starts_at).toLocaleDateString()} — {new Date(s.ends_at).toLocaleDateString()}
                              · {s.participant_count} participants · {s.submission_count} submissions
                            </p>
                          </div>
                          <div className="flex items-center gap-3 flex-shrink-0">
                            <span className={`${SHOWDOWN_STATUS_BADGES[s.status] || 'badge-gray'} capitalize`}>{s.status}</span>
                            <select value={s.status} onChange={(e) => handleShowdownStatus(s.id, e.target.value)}
                              className={selectClass} style={selectStyle}>
                              <option value="upcoming">Upcoming</option>
                              <option value="active">Active</option>
                              <option value="judging">Judging</option>
                              <option value="closed">Closed</option>
                            </select>
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Users */}
            {tab === 'Users' && (
              <div className="space-y-4">
                <div className="flex gap-3">
                  <input value={userSearch} onChange={(e) => setUserSearch(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && loadUsers(userSearch, userRole)}
                    placeholder="Search by name, username or email..." className="input flex-1" />
                  <select value={userRole} onChange={(e) => setUserRole(e.target.value)} className="input w-auto">
                    <option value="">All Roles</option>
                    <option value="student">Student</option>
                    <option value="faculty">Faculty</option>
                    <option value="admin">Admin</option>
                  </select>
                  <Button onClick={() => loadUsers(userSearch, userRole)}>Filter</Button>
                </div>
                {users.length === 0 ? (
                  <EmptyState icon="Users" title="No users found" description="Try different search criteria" />
                ) : (
                  <Card padding="sm">
                    <div className="overflow-x-auto">
                      <table className="data-table">
                        <thead>
                          <tr>{['User', 'Program', 'Role', 'Status', ''].map((h) => <th key={h}>{h}</th>)}</tr>
                        </thead>
                        <tbody>
                          {users.map((u) => (
                            <tr key={u.id}>
                              <td>
                                <div className="flex items-center gap-2.5">
                                  <Avatar user={u} size={28} />
                                  <div>
                                    <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{u.full_name}</p>
                                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>@{u.username}</p>
                                  </div>
                                </div>
                              </td>
                              <td><span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{u.program_code || '—'}</span></td>
                              <td>
                                <select value={u.role} onChange={(e) => handleRoleChange(u.id, e.target.value)} className={selectClass} style={selectStyle}>
                                  <option value="student">Student</option>
                                  <option value="faculty">Faculty</option>
                                  <option value="admin">Admin</option>
                                </select>
                              </td>
                              <td>
                                <select value={u.status} onChange={(e) => handleStatusChange(u.id, e.target.value)} className={selectClass} style={selectStyle}>
                                  <option value="active">Active</option>
                                  <option value="pending_verification">Pending</option>
                                  <option value="suspended">Suspended</option>
                                </select>
                              </td>
                              <td>
                                <Link to={`/u/${u.username}`} className="text-xs transition-colors" style={{ color: 'var(--accent)' }}>View</Link>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </Card>
                )}
              </div>
            )}

            {/* Digest */}
            {tab === 'Digest' && digestStats && (
              <div className="space-y-4">
                <Card padding="md">
                  <h2 className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: 'var(--text-muted)' }}>Platform Stats This Week</h2>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { val: digestStats.totalCompletions, lbl: 'Challenge Completions' },
                      { val: digestStats.newProjects,      lbl: 'New Projects' },
                      ...(digestStats.topStreak  ? [{ val: digestStats.topStreak.current_streak,  lbl: `Top Streak — @${digestStats.topStreak.username}`, accent: true }] : []),
                      ...(digestStats.topProject ? [{ val: `${digestStats.topProject.votes} votes`, lbl: digestStats.topProject.title }] : []),
                    ].map((s) => (
                      <Card key={s.lbl} padding="md">
                        <p className="text-2xl font-bold mb-0.5" style={{ color: s.accent ? 'var(--accent)' : 'var(--text-primary)', letterSpacing: '-0.03em' }}>{s.val}</p>
                        <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{s.lbl}</p>
                      </Card>
                    ))}
                  </div>
                </Card>
                <Card padding="md">
                  <h2 className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>Send Weekly Digest</h2>
                  <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
                    Sends personalised email to all subscribed students. Auto-runs every Sunday at 6PM PKT.
                  </p>
                  <Button onClick={handleSendDigest}><Send size={13} /> Send Digest Now</Button>
                </Card>
              </div>
            )}
          </>
        )}
      </motion.div>
    </Layout>
  );
}
