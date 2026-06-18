import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Swords, Rocket, Users, Target, Calendar, GraduationCap, Trophy, Zap, ChevronUp, X } from 'lucide-react';
import Layout  from '../components/Layout';
import Card    from '../components/ui/Card';
import Button  from '../components/ui/Button';
import Skeleton from '../components/ui/Skeleton';
import Avatar  from '../components/ui/Avatar';
import EmptyState from '../components/ui/EmptyState';
import CountdownTimer from '../components/ui/CountdownTimer';
import api     from '../api/axios';
import toast   from 'react-hot-toast';
import useAuthStore from '../store/authStore';

const ALL_TAGS = [
  'Python','JavaScript','React.js','Node.js','Django','Flutter',
  'React Native','PostgreSQL','MongoDB','TensorFlow','Docker','AWS',
];

const STATUS_CFG = {
  upcoming: { label: 'Coming Soon', color: '#60a5fa', badgeClass: 'badge-blue' },
  active:   { label: 'LIVE NOW',    color: '#4ade80', badgeClass: 'badge-green' },
  judging:  { label: 'Judging',     color: '#fbbf24', badgeClass: 'badge-yellow' },
  closed:   { label: 'Closed',      color: 'var(--text-muted)', badgeClass: 'badge-gray' },
};

export default function ShowdownsPage() {
  const { user, isLoggedIn } = useAuthStore();
  const [showdowns,  setShowdowns]  = useState([]);
  const [selected,   setSelected]   = useState(null);
  const [activity,   setActivity]   = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showSubmit, setShowSubmit] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', githubUrl: '', demoUrl: '', techStack: [], hoursSpent: '' });

  useEffect(() => { loadShowdowns(); }, []);

  useEffect(() => {
    if (selected) loadActivity(selected.id);
  }, [selected?.id]);

  const loadShowdowns = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/showdowns');
      setShowdowns(data.showdowns);
    } catch {}
    finally { setLoading(false); }
  };

  const loadActivity = async (id) => {
    try {
      const { data } = await api.get(`/showdowns/${id}/activity`);
      setActivity(data.activity);
    } catch {}
  };

  const handleSelectShowdown = async (id) => {
    if (selected?.id === id) { setSelected(null); setActivity([]); return; }
    try {
      const { data } = await api.get(`/showdowns/${id}`);
      setSelected(data.showdown);
    } catch {}
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) { toast.error('Title required.'); return; }
    setSubmitting(true);
    try {
      await api.post(`/showdowns/${selected.id}/submit`, {
        ...form, hoursSpent: form.hoursSpent ? parseInt(form.hoursSpent) : null,
      });
      toast.success('Entry submitted!');
      setShowSubmit(false);
      setForm({ title: '', description: '', githubUrl: '', demoUrl: '', techStack: [], hoursSpent: '' });
      const { data } = await api.get(`/showdowns/${selected.id}`);
      setSelected(data.showdown);
      loadActivity(selected.id);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Submission failed.');
    } finally { setSubmitting(false); }
  };

  const handleVote = async (submissionId) => {
    if (!isLoggedIn) { toast.error('Log in to vote.'); return; }
    try {
      await api.post(`/showdowns/${selected.id}/vote/${submissionId}`);
      toast.success('Voted!');
      const { data } = await api.get(`/showdowns/${selected.id}`);
      setSelected(data.showdown);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not vote.');
    }
  };

  const toggleTag = (tag) => {
    setForm((prev) => ({
      ...prev,
      techStack: prev.techStack.includes(tag) ? prev.techStack.filter((t) => t !== tag) : [...prev.techStack, tag],
    }));
  };

  return (
    <Layout>
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <div className="flex items-center gap-3 mb-6">
          <Swords size={22} color="var(--accent)" strokeWidth={1.5} />
          <div>
            <h1 className="text-xl font-bold" style={{ letterSpacing: '-0.02em' }}>Semester Showdowns</h1>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>48-hour build sprints. Build fast, build public, win reputation.</p>
          </div>
        </div>

        {loading ? (
          <div className="space-y-3">{[...Array(2)].map((_, i) => <Skeleton key={i} height={120} />)}</div>
        ) : showdowns.length === 0 ? (
          <EmptyState icon="Swords" title="No showdowns yet" description="Faculty will announce the next showdown soon. Stay tuned." />
        ) : (
          <div className="space-y-3">
            {showdowns.map((s, i) => {
              const cfg        = STATUS_CFG[s.status] || STATUS_CFG.closed;
              const isLive     = s.status === 'active';
              const seconds    = parseFloat(s.seconds_remaining) || 0;
              const isSelected = selected?.id === s.id;
              const deadline   = seconds > 0 ? new Date(Date.now() + seconds * 1000).toISOString() : null;

              return (
                <div key={s.id}>
                  <Card hover padding="md"
                    className="cursor-pointer"
                    style={{ borderColor: isSelected ? `${cfg.color}40` : 'var(--border-subtle)', boxShadow: isLive ? `0 0 32px ${cfg.color}12` : 'none' }}
                    onClick={() => handleSelectShowdown(s.id)}
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          {isLive && (
                            <span className="flex items-center gap-1.5 text-xs font-bold" style={{ color: '#4ade80' }}>
                              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse inline-block" />
                              LIVE
                            </span>
                          )}
                          <span className={cfg.badgeClass}>{cfg.label}</span>
                          <span className="badge-gray">S{s.min_semester}–S{s.max_semester}</span>
                        </div>
                        <h3 className="font-semibold text-base mb-0.5" style={{ color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>{s.title}</h3>
                        <p className="text-xs mb-2" style={{ color: 'var(--accent)', fontWeight: 500 }}>Theme: {s.theme}</p>
                        <div className="flex items-center gap-4">
                          <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                            <Users size={11} strokeWidth={1.5} /> {s.participant_count} participants
                          </span>
                          <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                            <Rocket size={11} strokeWidth={1.5} /> {s.submission_count} submissions
                          </span>
                        </div>
                      </div>
                      {isLive && deadline && (
                        <div className="flex-shrink-0 w-48">
                          <CountdownTimer deadline={deadline} />
                        </div>
                      )}
                    </div>
                  </Card>

                  {/* Expanded detail panel */}
                  <AnimatePresence>
                    {isSelected && selected && (
                      <motion.div
                        initial={{ opacity: 0, y: -6, scaleY: 0.97 }}
                        animate={{ opacity: 1, y: 0, scaleY: 1 }}
                        exit={{ opacity: 0, y: -6, scaleY: 0.97 }}
                        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                        className="mt-2 ml-4 space-y-4"
                        style={{ borderLeft: `2px solid ${cfg.color}30`, paddingLeft: 16 }}
                      >
                        {/* Detail header */}
                        <Card padding="md">
                          <h2 className="text-base font-semibold mb-1" style={{ color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>{selected.title}</h2>
                          <p className="text-sm mb-3" style={{ color: 'var(--accent)', fontWeight: 500 }}>
                            <Target size={12} className="inline mr-1" strokeWidth={1.5} />Theme: {selected.theme}
                          </p>
                          {selected.description && (
                            <p className="text-sm mb-3" style={{ color: 'var(--text-secondary)', lineHeight: 1.7 }}>{selected.description}</p>
                          )}
                          {selected.rules && (
                            <div className="rounded-[8px] p-3 mb-3" style={{ background: 'var(--bg-hover)', border: '1px solid var(--border-subtle)' }}>
                              <p className="text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>Rules</p>
                              <p className="text-sm whitespace-pre-wrap" style={{ color: 'var(--text-secondary)', lineHeight: 1.7 }}>{selected.rules}</p>
                            </div>
                          )}
                          <div className="flex items-center gap-4 flex-wrap mb-3">
                            <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                              <Calendar size={11} strokeWidth={1.5} />
                              {new Date(selected.starts_at).toLocaleDateString('en-PK')} — {new Date(selected.ends_at).toLocaleDateString('en-PK')}
                            </span>
                            <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                              <GraduationCap size={11} strokeWidth={1.5} />
                              Semester {selected.min_semester}–{selected.max_semester}
                            </span>
                          </div>
                          {selected.status === 'active' && isLoggedIn && (
                            <button onClick={(e) => { e.stopPropagation(); setShowSubmit(true); }} className="btn-primary text-sm">
                              <Rocket size={13} /> Submit Entry
                            </button>
                          )}
                        </Card>

                        {/* Live activity */}
                        {activity.length > 0 && (
                          <Card padding="md">
                            <p className="text-xs font-semibold uppercase tracking-wider mb-3 flex items-center gap-1.5" style={{ color: 'var(--text-muted)' }}>
                              <Zap size={11} strokeWidth={2} /> Live Activity
                            </p>
                            <div className="space-y-2.5">
                              {activity.map((a, idx) => (
                                <motion.div key={idx} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay: idx * 0.04 }} className="flex items-center gap-2.5">
                                  <Avatar user={{ username: a.username, avatar_url: a.avatar_url }} size={26} />
                                  <p className="text-sm flex-1" style={{ color: 'var(--text-secondary)' }}>
                                    <Link to={`/u/${a.username}`} className="font-medium" style={{ color: 'var(--text-primary)' }}>@{a.username}</Link>
                                    {' '}submitted{' '}
                                    <span style={{ color: 'var(--accent)' }}>"{a.submission_title}"</span>
                                  </p>
                                  <span className="text-xs flex-shrink-0" style={{ color: 'var(--text-muted)' }}>
                                    {new Date(a.created_at).toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                </motion.div>
                              ))}
                            </div>
                          </Card>
                        )}

                        {/* Submissions */}
                        {selected.submissions?.length > 0 && (
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-wider mb-3 flex items-center gap-1.5" style={{ color: 'var(--text-muted)' }}>
                              {selected.status === 'judging'
                                ? <><Trophy size={11} /> Vote for the Best</>
                                : <><Rocket size={11} /> Submissions</>}
                            </p>
                            <div className="space-y-3">
                              {selected.submissions.map((sub, idx) => (
                                <Card key={sub.id} padding="md">
                                  {idx === 0 && selected.status === 'closed' && (
                                    <div className="flex justify-end mb-2">
                                      <span className="badge flex items-center gap-1" style={{ background: 'rgba(251,191,36,0.12)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.25)' }}>
                                        <Trophy size={10} /> Winner
                                      </span>
                                    </div>
                                  )}
                                  <div className="flex items-start gap-3">
                                    <Avatar user={{ username: sub.username, avatar_url: sub.avatar_url }} size={34} />
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-start justify-between gap-3">
                                        <div>
                                          <h4 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{sub.title}</h4>
                                          <div className="flex items-center gap-2">
                                            <Link to={`/u/${sub.username}`} className="text-xs transition-colors" style={{ color: 'var(--accent)' }}>@{sub.username}</Link>
                                            {sub.hours_spent && (
                                              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>· {sub.hours_spent}h</span>
                                            )}
                                          </div>
                                        </div>
                                        {selected.status === 'judging' && isLoggedIn && sub.username !== user?.username ? (
                                          <button onClick={() => handleVote(sub.id)}
                                            className="flex flex-col items-center px-2.5 py-1.5 rounded-[8px] flex-shrink-0 transition-colors"
                                            style={{ background: 'var(--accent-dim)', border: '1px solid var(--accent-border)' }}>
                                            <ChevronUp size={13} color="var(--accent)" strokeWidth={2} />
                                            <span className="text-xs font-bold" style={{ color: 'var(--accent)' }}>{sub.votes}</span>
                                          </button>
                                        ) : (
                                          <div className="flex flex-col items-center px-2.5 py-1.5 rounded-[8px] flex-shrink-0"
                                            style={{ background: 'var(--bg-hover)', border: '1px solid var(--border-subtle)' }}>
                                            <ChevronUp size={13} strokeWidth={2} style={{ color: 'var(--text-muted)' }} />
                                            <span className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>{sub.votes}</span>
                                          </div>
                                        )}
                                      </div>
                                      {sub.description && (
                                        <p className="text-xs mt-2 line-clamp-2" style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>{sub.description}</p>
                                      )}
                                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                                        {sub.tech_stack?.map((t) => <span key={t} className="badge-gray text-[10px]">{t}</span>)}
                                        {sub.github_url && (
                                          <a href={sub.github_url} target="_blank" rel="noreferrer" className="text-xs transition-colors" style={{ color: 'var(--text-muted)' }}>GitHub</a>
                                        )}
                                        {sub.demo_url && (
                                          <a href={sub.demo_url} target="_blank" rel="noreferrer" className="text-xs transition-colors" style={{ color: 'var(--accent)' }}>Live Demo</a>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </Card>
                              ))}
                            </div>
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        )}

        {/* Submit entry modal */}
        <AnimatePresence>
          {showSubmit && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
              style={{ background: 'rgba(0,0,0,0.75)' }}
              onClick={(e) => { if (e.target === e.currentTarget) setShowSubmit(false); }}>
              <motion.div initial={{ scale: 0.95, y: 12 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95 }}
                className="w-full max-w-[520px] max-h-[90vh] overflow-y-auto">
                <Card padding="lg">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>Submit Entry</h2>
                      <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>You can update your submission until the deadline.</p>
                    </div>
                    <button onClick={() => setShowSubmit(false)} className="btn-ghost p-1"><X size={16} /></button>
                  </div>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <label className="label">Project Title</label>
                      <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
                        placeholder="e.g. AI Study Assistant" className="input" required />
                    </div>
                    <div>
                      <label className="label">Description</label>
                      <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                        placeholder="What did you build? How does it work?" className="input resize-none" rows={3} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="label">GitHub URL</label>
                        <input value={form.githubUrl} onChange={(e) => setForm({ ...form, githubUrl: e.target.value })}
                          placeholder="https://github.com/..." className="input" />
                      </div>
                      <div>
                        <label className="label">Demo URL</label>
                        <input value={form.demoUrl} onChange={(e) => setForm({ ...form, demoUrl: e.target.value })}
                          placeholder="https://..." className="input" />
                      </div>
                    </div>
                    <div>
                      <label className="label">Hours Spent</label>
                      <input type="number" min="1" max="48" value={form.hoursSpent}
                        onChange={(e) => setForm({ ...form, hoursSpent: e.target.value })}
                        placeholder="e.g. 24" className="input" />
                    </div>
                    <div>
                      <label className="label mb-2">Tech Stack</label>
                      <div className="flex flex-wrap gap-1.5">
                        {ALL_TAGS.map((tag) => {
                          const sel = form.techStack.includes(tag);
                          return (
                            <button key={tag} type="button" onClick={() => toggleTag(tag)}
                              className="badge transition-all"
                              style={{
                                background: sel ? 'var(--accent-dim)' : 'var(--bg-hover)',
                                color:      sel ? 'var(--accent)' : 'var(--text-secondary)',
                                border:     `1px solid ${sel ? 'var(--accent-border)' : 'var(--border-subtle)'}`,
                                cursor: 'pointer',
                              }}>{tag}</button>
                          );
                        })}
                      </div>
                    </div>
                    <div className="flex gap-2 pt-1">
                      <Button type="submit" loading={submitting} className="flex-1 justify-center">
                        <Rocket size={13} /> Submit Entry
                      </Button>
                      <Button type="button" variant="secondary" onClick={() => setShowSubmit(false)}>Cancel</Button>
                    </div>
                  </form>
                </Card>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </Layout>
  );
}
