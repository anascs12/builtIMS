import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Radio, Target, AlertTriangle, CheckCircle2, ExternalLink } from 'lucide-react';
import Layout  from '../components/Layout';
import Card    from '../components/ui/Card';
import Skeleton from '../components/ui/Skeleton';
import api     from '../api/axios';
import useAuthStore from '../store/authStore';

const CATEGORY_COLORS = {
  'Language': { bg: 'rgba(96,165,250,0.1)',  text: '#93c5fd', border: 'rgba(96,165,250,0.2)',  bar: '#60a5fa' },
  'Frontend':  { bg: 'rgba(167,139,250,0.1)', text: '#c4b5fd', border: 'rgba(167,139,250,0.2)', bar: '#a78bfa' },
  'Backend':   { bg: 'rgba(74,222,128,0.1)',  text: '#86efac', border: 'rgba(74,222,128,0.2)',  bar: '#4ade80' },
  'Database':  { bg: 'rgba(251,191,36,0.1)',  text: '#fcd34d', border: 'rgba(251,191,36,0.2)',  bar: '#fbbf24' },
  'AI/ML':     { bg: 'rgba(244,114,182,0.1)', text: '#f9a8d4', border: 'rgba(244,114,182,0.2)', bar: '#f472b6' },
  'Mobile':    { bg: 'rgba(99,102,241,0.1)',  text: '#a5b4fc', border: 'rgba(99,102,241,0.2)',  bar: '#818cf8' },
  'DevOps':    { bg: 'rgba(251,146,60,0.1)',  text: '#fdba74', border: 'rgba(251,146,60,0.2)',  bar: '#fb923c' },
  'Tools':     { bg: 'rgba(148,163,184,0.1)', text: '#cbd5e1', border: 'rgba(148,163,184,0.2)', bar: '#94a3b8' },
};

const getCat = (cat) => CATEGORY_COLORS[cat] || CATEGORY_COLORS['Tools'];

export default function RadarPage() {
  const { user, isLoggedIn } = useAuthStore();
  const [radar,    setRadar]    = useState(null);
  const [personal, setPersonal] = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [tab,      setTab]      = useState('radar');
  const [filter,   setFilter]   = useState('all');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const { data } = await api.get('/radar/platform');
        setRadar(data);
        if (isLoggedIn) {
          const { data: pd } = await api.get('/radar/personal');
          setPersonal(pd);
        }
      } catch {} finally { setLoading(false); }
    };
    load();
  }, [isLoggedIn]);

  const categories = radar ? ['all', ...new Set(radar.radar.map((s) => s.category).filter(Boolean))] : ['all'];
  const filtered   = radar?.radar.filter((s) => filter === 'all' || s.category === filter) || [];
  const maxDemand  = Math.max(...(filtered.map((s) => s.demandScore)), 1);

  const TABS = [
    { id: 'radar',    icon: Radio,  label: 'Market Radar' },
    ...(isLoggedIn ? [{ id: 'personal', icon: Target, label: 'Your Gap' }] : []),
  ];

  return (
    <Layout>
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <h1 className="text-xl font-bold mb-0.5" style={{ letterSpacing: '-0.02em' }}>Skills Gap Radar</h1>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Pakistan job market demand vs IMSciences student skills</p>
            {radar && (
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)', opacity: 0.6 }}>
                {radar.totalJobsScanned} job signals · Updated {new Date(radar.lastUpdated).toLocaleDateString('en-PK')}
              </p>
            )}
          </div>
          {isLoggedIn && personal && (
            <Card padding="md" className="text-center flex-shrink-0">
              <p className="text-2xl font-bold mb-0.5" style={{ color: 'var(--accent)', letterSpacing: '-0.03em' }}>{personal.gapCount}</p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>skills to close</p>
            </Card>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-0.5 mb-5" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
          {TABS.map(({ id, icon: Icon, label }) => (
            <button key={id} onClick={() => setTab(id)}
              className="flex items-center gap-1.5 px-4 py-2.5 text-sm transition-colors -mb-px"
              style={{
                borderBottom: tab === id ? '2px solid var(--accent)' : '2px solid transparent',
                color: tab === id ? 'var(--text-primary)' : 'var(--text-muted)',
              }}
            >
              <Icon size={13} strokeWidth={1.5} />
              {label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="space-y-4">
            {[...Array(6)].map((_, i) => <Skeleton key={i} height={52} />)}
          </div>
        ) : (
          <>
            {tab === 'radar' && radar && (
              <div className="space-y-4">
                <div className="flex flex-wrap gap-1.5">
                  {categories.map((cat) => (
                    <button key={cat} onClick={() => setFilter(cat)}
                      className="px-3 py-1.5 rounded-[8px] text-xs font-medium transition-all capitalize"
                      style={filter === cat
                        ? { background: 'var(--accent-dim)', color: 'var(--accent)', border: '1px solid var(--accent-border)' }
                        : { background: 'var(--bg-hover)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)' }
                      }
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                <Card padding="md">
                  <h2 className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: 'var(--text-muted)' }}>
                    Top In-Demand Skills — Pakistan
                  </h2>
                  {filtered.length === 0 ? (
                    <p className="text-center py-8 text-sm" style={{ color: 'var(--text-muted)' }}>
                      No data yet — trigger a scrape from Admin Panel
                    </p>
                  ) : filtered.map((skill, i) => {
                    const cat      = getCat(skill.category);
                    const barWidth = Math.round((skill.demandScore / maxDemand) * 100);
                    return (
                      <motion.div key={skill.tagId} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.03 }} className="mb-4 last:mb-0">
                        <div className="flex items-center justify-between gap-3 mb-1.5">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="badge flex-shrink-0 text-[10px]"
                              style={{ background: cat.bg, color: cat.text, border: `1px solid ${cat.border}` }}>
                              {skill.category}
                            </span>
                            <span className="font-medium text-sm truncate" style={{ color: 'var(--text-primary)' }}>{skill.label}</span>
                          </div>
                          <div className="flex items-center gap-3 flex-shrink-0">
                            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{skill.demandScore} jobs</span>
                            {skill.sampleUrls?.length > 0 && (
                              <a href={skill.sampleUrls[0]} target="_blank" rel="noreferrer"
                                className="flex items-center gap-0.5 text-xs transition-colors"
                                style={{ color: 'var(--accent)' }}>
                                <ExternalLink size={10} />
                              </a>
                            )}
                          </div>
                        </div>
                        <div className="relative h-6 rounded-[6px] overflow-hidden" style={{ background: 'var(--bg-base)' }}>
                          <motion.div initial={{ width: 0 }} animate={{ width: `${barWidth}%` }}
                            transition={{ delay: 0.15 + i * 0.03, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                            className="absolute left-0 top-0 h-full rounded-[6px]"
                            style={{ background: cat.bar, opacity: 0.25 }} />
                          <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(skill.adoptionRate, 100)}%` }}
                            transition={{ delay: 0.2 + i * 0.03, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                            className="absolute left-0 top-0 h-full rounded-[6px]"
                            style={{ background: '#4ade80', opacity: 0.5 }} />
                          <div className="absolute inset-0 flex items-center justify-between px-2.5">
                            <span className="text-[10px] font-medium" style={{ color: 'var(--text-muted)' }}>demand</span>
                            <span className="text-[10px]" style={{ color: '#86efac' }}>{skill.adoptionRate}% students</span>
                          </div>
                        </div>
                        {skill.gapScore > 2 && (
                          <p className="text-xs mt-1 flex items-center gap-1" style={{ color: '#fbbf24' }}>
                            <AlertTriangle size={10} strokeWidth={2} />
                            Gap score: {skill.gapScore} — only {skill.studentCount} student{skill.studentCount !== 1 ? 's' : ''} demonstrated this
                          </p>
                        )}
                      </motion.div>
                    );
                  })}
                </Card>

                <div className="flex items-center gap-6 px-1">
                  {[
                    { color: 'var(--border-default)', label: 'Market demand (job postings)' },
                    { color: '#4ade80', label: 'Student adoption' },
                  ].map((l) => (
                    <div key={l.label} className="flex items-center gap-2">
                      <div className="w-4 h-2 rounded-full" style={{ background: l.color }} />
                      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{l.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {tab === 'personal' && personal && (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { val: personal.demonstratedCount, lbl: 'Demonstrated',  color: '#4ade80' },
                    { val: personal.gapCount,          lbl: 'Skills to Close', color: 'var(--accent)' },
                    { val: personal.gaps.filter(g => !g.demonstrated && g.demandScore > 5).length, lbl: 'High Priority', color: '#fbbf24' },
                  ].map((s) => (
                    <Card key={s.lbl} padding="md" className="text-center">
                      <p className="text-2xl font-bold mb-0.5" style={{ color: s.color, letterSpacing: '-0.03em' }}>{s.val}</p>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{s.lbl}</p>
                    </Card>
                  ))}
                </div>

                <Card padding="md">
                  <h2 className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: 'var(--text-muted)' }}>
                    Skills to Demonstrate
                  </h2>
                  <div className="space-y-2">
                    {personal.gaps.filter((g) => !g.demonstrated).sort((a, b) => b.demandScore - a.demandScore).map((gap, i) => {
                      const cat = getCat(gap.category);
                      return (
                        <motion.div key={gap.tagId} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.04 }}
                          className="flex items-center gap-4 p-3 rounded-[8px]"
                          style={{ background: 'var(--bg-hover)', border: '1px solid var(--border-subtle)' }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className="badge text-[10px]" style={{ background: cat.bg, color: cat.text, border: `1px solid ${cat.border}` }}>{gap.category}</span>
                              <span className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>{gap.label}</span>
                            </div>
                            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                              {gap.demandScore} jobs · est. {gap.weeksToClose}w to demonstrate
                            </p>
                          </div>
                          {gap.sampleUrls?.[0] && (
                            <a href={gap.sampleUrls[0]} target="_blank" rel="noreferrer"
                              className="text-xs flex-shrink-0 transition-colors"
                              style={{ color: 'var(--accent)' }}>
                              Jobs <ExternalLink size={10} className="inline" />
                            </a>
                          )}
                        </motion.div>
                      );
                    })}
                    {personal.gaps.filter(g => !g.demonstrated).length === 0 && (
                      <p className="text-sm py-4 text-center" style={{ color: 'var(--text-muted)' }}>No skill gaps detected — great work!</p>
                    )}
                  </div>
                </Card>

                <Card padding="md">
                  <h2 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-muted)' }}>
                    Skills Demonstrated
                  </h2>
                  <div className="flex flex-wrap gap-2">
                    {personal.gaps.filter((g) => g.demonstrated).map((gap) => {
                      const cat = getCat(gap.category);
                      return (
                        <span key={gap.tagId} className="badge flex items-center gap-1"
                          style={{ background: cat.bg, color: cat.text, border: `1px solid ${cat.border}` }}>
                          <CheckCircle2 size={10} strokeWidth={2} /> {gap.label}
                        </span>
                      );
                    })}
                    {personal.gaps.filter(g => g.demonstrated).length === 0 && (
                      <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                        Submit a project with tech tags to demonstrate your skills.
                      </p>
                    )}
                  </div>
                </Card>

                <Card padding="md" style={{ borderColor: 'var(--accent-border)' }}>
                  <p className="text-sm font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>How to close your gaps</p>
                  <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
                    Submit projects using missing skills or complete daily challenges tagged with those technologies.
                  </p>
                  <div className="flex gap-3">
                    <Link to="/projects/submit" className="btn-primary text-sm">Submit Project</Link>
                    <Link to="/challenges" className="btn-secondary text-sm">Take a Challenge</Link>
                  </div>
                </Card>
              </div>
            )}

            {tab === 'personal' && !isLoggedIn && (
              <div className="text-center py-20">
                <Target size={36} strokeWidth={1.5} style={{ margin: '0 auto 12px', color: 'var(--text-muted)' }} />
                <p className="font-semibold text-lg mb-1">Sign in to see your gap</p>
                <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>Your personal skill gap analysis based on your projects</p>
                <Link to="/login" className="btn-primary">Sign in</Link>
              </div>
            )}
          </>
        )}
      </motion.div>
    </Layout>
  );
}
