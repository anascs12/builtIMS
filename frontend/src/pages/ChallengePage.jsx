import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Code2, Palette, Bug, FileText, Hammer, ArrowRight } from 'lucide-react';
import Layout from '../components/Layout';
import Card   from '../components/ui/Card';
import Skeleton from '../components/ui/Skeleton';
import EmptyState from '../components/ui/EmptyState';
import api    from '../api/axios';
import useAuthStore from '../store/authStore';

const DAY_CONFIG = {
  code:    { icon: Code2,    color: '#60a5fa',  label: 'Code' },
  design:  { icon: Palette,  color: '#c4b5fd',  label: 'Design' },
  debug:   { icon: Bug,      color: '#fcd34d',  label: 'Debug' },
  explain: { icon: FileText, color: '#86efac',  label: 'Explain' },
  build:   { icon: Hammer,   color: '#FF7340',  label: 'Build' },
};

const LEVEL_BADGE = { beginner: 'badge-green', intermediate: 'badge-blue', advanced: 'badge-red' };

function ChallengeCard({ challenge }) {
  const meta = DAY_CONFIG[challenge.day_type] || DAY_CONFIG.code;
  const Icon = meta.icon;
  return (
    <Card hover padding="md">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-[6px] flex items-center justify-center flex-shrink-0"
            style={{ background: `${meta.color}15`, border: `1px solid ${meta.color}30` }}>
            <Icon size={14} color={meta.color} strokeWidth={1.5} />
          </div>
          <span className="text-xs font-medium" style={{ color: meta.color }}>{meta.label}</span>
        </div>
        <span className={`${LEVEL_BADGE[challenge.level] || 'badge-gray'} capitalize`}>{challenge.level}</span>
      </div>
      <Link to={`/challenges/${challenge.id}`}
        className="text-sm font-semibold mb-1 block transition-colors"
        style={{ color: 'var(--text-primary)' }}
        onMouseEnter={e => e.currentTarget.style.color = 'var(--accent)'}
        onMouseLeave={e => e.currentTarget.style.color = 'var(--text-primary)'}
      >
        {challenge.title}
      </Link>
      <p className="text-xs line-clamp-2 mb-3" style={{ color: 'var(--text-secondary)' }}>{challenge.description}</p>
      <div className="flex items-center justify-between">
        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
          {challenge.publish_date ? new Date(challenge.publish_date).toLocaleDateString() : ''}
        </span>
        <Link to={`/challenges/${challenge.id}`} className="btn-ghost text-xs py-1 px-2 flex items-center gap-1">
          Attempt <ArrowRight size={11} />
        </Link>
      </div>
    </Card>
  );
}

export default function ChallengePage() {
  const { isLoggedIn } = useAuthStore();
  const [today,     setToday]     = useState(null);
  const [challenges,setChallenges]= useState([]);
  const [loading,   setLoading]   = useState(true);
  const [activeTab, setActiveTab] = useState('all');

  const DAY_TABS = [
    { id: 'all',     label: 'All' },
    ...Object.entries(DAY_CONFIG).map(([id, c]) => ({ id, label: c.label })),
  ];

  useEffect(() => {
    api.get('/challenges/today').then(({ data }) => setToday(data.challenge)).catch(() => {});
    loadChallenges();
  }, []);

  const loadChallenges = async (dayType) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: 30 });
      if (dayType && dayType !== 'all') params.append('dayType', dayType);
      const { data } = await api.get(`/challenges?${params}`);
      setChallenges(data.challenges || []);
    } catch {}
    finally { setLoading(false); }
  };

  const handleTab = (id) => {
    setActiveTab(id);
    loadChallenges(id === 'all' ? '' : id);
  };

  return (
    <Layout>
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <h1 className="text-xl font-bold mb-1" style={{ letterSpacing: '-0.02em' }}>Daily Challenges</h1>
        <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>One challenge every weekday. Build the habit.</p>

        {/* Today's challenge */}
        {today && (
          <Card padding="md" className="mb-6" style={{ borderColor: 'var(--accent-border)' }}>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="badge-accent">Today</span>
                  <span className="badge-gray capitalize">{today.day_type}</span>
                  <span className="badge-gray capitalize">{today.level}</span>
                </div>
                <p className="text-base font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>{today.title}</p>
                <p className="text-sm line-clamp-2" style={{ color: 'var(--text-secondary)' }}>{today.description}</p>
              </div>
              <Link to={`/challenges/${today.id}`} className="btn-primary flex-shrink-0 text-xs">
                Attempt <ArrowRight size={13} />
              </Link>
            </div>
          </Card>
        )}

        {/* Day type tabs */}
        <div className="flex gap-1 mb-5 flex-wrap">
          {DAY_TABS.map((t) => {
            const cfg = DAY_CONFIG[t.id];
            const Icon = cfg?.icon;
            return (
              <button
                key={t.id}
                onClick={() => handleTab(t.id)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-sm transition-all"
                style={{
                  background: activeTab === t.id ? 'var(--bg-hover)' : 'transparent',
                  color: activeTab === t.id ? (cfg?.color || 'var(--text-primary)') : 'var(--text-muted)',
                  border: `1px solid ${activeTab === t.id ? 'var(--border-default)' : 'transparent'}`,
                }}
              >
                {Icon && <Icon size={13} strokeWidth={1.5} />}
                {t.label}
              </button>
            );
          })}
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => <Skeleton key={i} height={160} />)}
          </div>
        ) : challenges.length === 0 ? (
          <EmptyState icon="Target" title="No challenges found" description="Try a different filter" />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {challenges.map((c) => <ChallengeCard key={c.id} challenge={c} />)}
          </div>
        )}
      </motion.div>
    </Layout>
  );
}
