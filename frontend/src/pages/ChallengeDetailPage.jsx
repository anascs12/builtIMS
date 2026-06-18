import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Code2, Palette, Bug, FileText, Hammer, ArrowLeft, CheckCircle2, Users } from 'lucide-react';
import Layout from '../components/Layout';
import Card   from '../components/ui/Card';
import Button from '../components/ui/Button';
import api    from '../api/axios';
import toast  from 'react-hot-toast';
import useAuthStore from '../store/authStore';

const DAY_CONFIG = {
  code:    { icon: Code2,    color: '#60a5fa',  label: 'Code' },
  design:  { icon: Palette,  color: '#c4b5fd',  label: 'Design' },
  debug:   { icon: Bug,      color: '#fcd34d',  label: 'Debug' },
  explain: { icon: FileText, color: '#86efac',  label: 'Explain' },
  build:   { icon: Hammer,   color: '#FF7340',  label: 'Build' },
};

const SUBMISSION_TYPES = [
  { value: 'code',  label: 'Code',        placeholder: 'Paste your code here...' },
  { value: 'text',  label: 'Explanation', placeholder: 'Write your explanation here...' },
  { value: 'link',  label: 'Link',        placeholder: 'https://github.com/your-repo' },
];

export default function ChallengeDetailPage() {
  const { id }               = useParams();
  const { isLoggedIn }       = useAuthStore();
  const [challenge,  setChallenge]  = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [notFound,   setNotFound]   = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted,  setSubmitted]  = useState(false);
  const [subType,    setSubType]    = useState('code');
  const [content,    setContent]    = useState('');
  const [notes,      setNotes]      = useState('');

  useEffect(() => {
    api.get(`/challenges/${id}`)
      .then(({ data }) => setChallenge(data.challenge))
      .catch((err) => { if (err.response?.status === 404) setNotFound(true); })
      .finally(() => setLoading(false));
  }, [id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!content.trim()) { toast.error('Please enter your submission.'); return; }
    setSubmitting(true);
    try {
      await api.post(`/challenges/${id}/submit`, { submissionType: subType, content, notes });
      toast.success('Challenge submitted!');
      setSubmitted(true);
    } catch (err) {
      const code = err.response?.data?.code;
      if (code === 'ALREADY_SUBMITTED') toast.error('Already submitted today.');
      else if (code === 'WRONG_DATE')   toast.error('This is not today\'s challenge.');
      else toast.error(err.response?.data?.message || 'Submission failed.');
    } finally { setSubmitting(false); }
  };

  if (loading) return <Layout><div className="space-y-4"><div className="skeleton h-8 w-64 rounded" /><div className="skeleton h-48 rounded" /></div></Layout>;
  if (notFound) return <Layout><Card padding="lg" className="text-center"><h2 className="text-lg font-semibold mb-2">Challenge not found</h2><Link to="/challenges" className="btn-secondary">Back</Link></Card></Layout>;

  const meta = DAY_CONFIG[challenge?.day_type] || DAY_CONFIG.code;
  const Icon = meta.icon;

  return (
    <Layout>
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <Link to="/challenges" className="inline-flex items-center gap-1.5 text-sm mb-6 transition-colors" style={{ color: 'var(--text-muted)' }}
          onMouseEnter={e => e.currentTarget.style.color = 'var(--text-secondary)'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
        >
          <ArrowLeft size={14} /> Back to Challenges
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-5">
            <Card padding="md">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-[6px] flex items-center justify-center" style={{ background: `${meta.color}15`, border: `1px solid ${meta.color}30` }}>
                  <Icon size={14} color={meta.color} strokeWidth={1.5} />
                </div>
                <span className="text-xs font-medium" style={{ color: meta.color }}>{meta.label}</span>
                <span className="badge-gray capitalize">{challenge.level}</span>
              </div>
              <h1 className="text-xl font-bold mb-2" style={{ letterSpacing: '-0.02em' }}>{challenge.title}</h1>
              <p className="text-sm" style={{ color: 'var(--text-secondary)', lineHeight: 1.7 }}>{challenge.description}</p>
            </Card>

            {challenge.content && Object.keys(challenge.content).length > 0 && (
              <Card padding="md">
                <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>Challenge Details</h3>
                {challenge.content.instructions && (
                  <p className="text-sm mb-3" style={{ color: 'var(--text-secondary)', whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>
                    {challenge.content.instructions}
                  </p>
                )}
                {challenge.content.examples && (
                  <div className="rounded-[var(--radius-md)] p-4 font-mono text-xs" style={{ background: 'var(--bg-base)', color: 'var(--text-secondary)', whiteSpace: 'pre-wrap', overflowX: 'auto' }}>
                    {challenge.content.examples}
                  </div>
                )}
              </Card>
            )}

            {/* Submission form */}
            {isLoggedIn ? (
              submitted ? (
                <Card padding="md" className="text-center" style={{ borderColor: 'rgba(34,197,94,0.2)' }}>
                  <CheckCircle2 size={32} color="var(--green)" strokeWidth={1.5} style={{ margin: '0 auto 12px' }} />
                  <h3 className="text-base font-semibold mb-1">Submitted!</h3>
                  <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Great work. Come back tomorrow for the next challenge.</p>
                </Card>
              ) : (
                <Card padding="md">
                  <h3 className="text-sm font-semibold mb-4">Your Submission</h3>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <label className="label mb-2">Submission Type</label>
                      <div className="flex gap-2">
                        {SUBMISSION_TYPES.map((t) => (
                          <button key={t.value} type="button" onClick={() => setSubType(t.value)}
                            className="px-3 py-1.5 rounded-[8px] text-xs font-medium transition-all"
                            style={{
                              background: subType === t.value ? 'var(--accent-dim)' : 'var(--bg-hover)',
                              color:      subType === t.value ? 'var(--accent)' : 'var(--text-secondary)',
                              border:     `1px solid ${subType === t.value ? 'var(--accent-border)' : 'var(--border-subtle)'}`,
                            }}
                          >
                            {t.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="label">
                        {subType === 'code' ? 'Code' : subType === 'link' ? 'Link' : 'Your Answer'}
                      </label>
                      <textarea
                        className="input resize-none"
                        style={{ fontFamily: subType === 'code' ? 'var(--font-mono)' : 'var(--font-body)', fontSize: 13 }}
                        rows={subType === 'code' ? 8 : 4}
                        placeholder={SUBMISSION_TYPES.find(t => t.value === subType)?.placeholder}
                        value={content}
                        onChange={e => setContent(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="label">Notes <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional)</span></label>
                      <input className="input" placeholder="Any notes or explanations..." value={notes} onChange={e => setNotes(e.target.value)} />
                    </div>
                    <Button type="submit" loading={submitting} className="w-full justify-center">
                      Submit
                    </Button>
                  </form>
                </Card>
              )
            ) : (
              <Card padding="md" className="text-center" style={{ borderColor: 'var(--accent-border)' }}>
                <p className="text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>Sign in to submit and track your streak</p>
                <Link to="/login" className="btn-primary text-sm">Sign in</Link>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            <Card padding="md">
              <p className="text-xs font-medium mb-3" style={{ color: 'var(--text-muted)' }}>STATS</p>
              <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                <Users size={14} strokeWidth={1.5} />
                <span><strong style={{ color: 'var(--text-primary)' }}>{challenge.completionCount}</strong> completions today</span>
              </div>
            </Card>

            {challenge.tech_tags?.length > 0 && (
              <Card padding="md">
                <p className="text-xs font-medium mb-3" style={{ color: 'var(--text-muted)' }}>TECH TAGS</p>
                <div className="flex flex-wrap gap-1.5">
                  {challenge.tech_tags.map((t) => <span key={t} className="badge-gray">{t}</span>)}
                </div>
              </Card>
            )}

            <Card padding="md">
              <p className="text-xs font-medium mb-3" style={{ color: 'var(--text-muted)' }}>ELIGIBILITY</p>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                Semesters {challenge.min_semester}–{challenge.max_semester}
              </p>
            </Card>
          </div>
        </div>
      </motion.div>
    </Layout>
  );
}
