import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Zap, ArrowRight, Flame, FolderGit2, BarChart3 } from 'lucide-react';
import Layout   from '../components/Layout';
import FeedItem from '../components/FeedItem';
import Card     from '../components/ui/Card';
import Skeleton from '../components/ui/Skeleton';
import EmptyState from '../components/ui/EmptyState';
import api      from '../api/axios';
import useAuthStore from '../store/authStore';

function StatCard({ icon: Icon, value, label, sub, accent }) {
  return (
    <Card padding="md" className="text-center">
      <div className="flex items-center justify-center mb-2">
        <Icon size={18} color={accent ? 'var(--accent)' : 'var(--text-muted)'} strokeWidth={1.5} />
      </div>
      <p className="text-xl font-bold mb-0.5" style={{ color: accent ? 'var(--accent)' : 'var(--text-primary)', letterSpacing: '-0.02em' }}>
        {value}
      </p>
      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{label}</p>
      {sub && <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--text-disabled)' }}>{sub}</p>}
    </Card>
  );
}

function FeedSkeleton() {
  return (
    <div className="space-y-3">
      {[...Array(4)].map((_, i) => (
        <Card key={i} padding="md">
          <div className="flex items-center gap-3 mb-3">
            <Skeleton width={32} height={32} rounded />
            <div className="flex-1 space-y-1.5">
              <Skeleton width="50%" height={12} />
              <Skeleton width="30%" height={10} />
            </div>
          </div>
          <Skeleton width="80%" height={12} />
        </Card>
      ))}
    </div>
  );
}

export default function HomePage() {
  const { isLoggedIn } = useAuthStore();
  const [feed,        setFeed]      = useState([]);
  const [challenge,   setChallenge] = useState(null);
  const [stats,       setStats]     = useState(null);
  const [feedLoading, setFeedLoading] = useState(true);
  const [page,        setPage]      = useState(1);
  const [hasMore,     setHasMore]   = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    loadFeed(1);
    loadTodayChallenge();
    loadStats();
  }, []);

  const loadFeed = async (p) => {
    try {
      if (p === 1) setFeedLoading(true); else setLoadingMore(true);
      const { data } = await api.get(`/feed?page=${p}&limit=20`);
      if (p === 1) setFeed(data.feed);
      else setFeed((prev) => [...prev, ...data.feed]);
      setHasMore(p < data.pagination.pages);
      setPage(p);
    } catch {}
    finally { setFeedLoading(false); setLoadingMore(false); }
  };

  const loadTodayChallenge = async () => {
    try {
      const { data } = await api.get('/challenges/today');
      setChallenge(data.challenge);
    } catch {}
  };

  const loadStats = async () => {
    try {
      const { data } = await api.get('/digest/stats');
      setStats(data.stats);
    } catch {}
  };

  return (
    <Layout>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="space-y-6"
      >

        {/* Today's Challenge banner */}
        {challenge && (
          <Card padding="md" style={{ borderColor: 'var(--accent-border)' }}>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <span className="badge-accent">Today's Challenge</span>
                  <span className="badge-gray capitalize">{challenge.day_type}</span>
                  <span className="badge-gray capitalize">{challenge.level}</span>
                </div>
                <h3 className="text-base font-semibold mb-1 leading-snug" style={{ color: 'var(--text-primary)' }}>
                  {challenge.title}
                </h3>
                <p className="text-sm line-clamp-2 mb-2" style={{ color: 'var(--text-secondary)' }}>
                  {challenge.description}
                </p>
                <p className="text-xs flex items-center gap-1.5" style={{ color: 'var(--text-muted)' }}>
                  <Zap size={11} color="var(--accent)" strokeWidth={2} />
                  <span><strong style={{ color: 'var(--text-secondary)' }}>{challenge.completionCount}</strong> students completed today
                  {isLoggedIn && ' — have you?'}</span>
                </p>
              </div>
              <Link to={`/challenges/${challenge.id}`} className="btn-primary flex-shrink-0 text-xs">
                Take it <ArrowRight size={13} />
              </Link>
            </div>
          </Card>
        )}

        {/* Stats row */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard icon={Zap}        value={stats.totalCompletions}  label="Completions"   sub="this week" />
            <StatCard icon={FolderGit2} value={stats.newProjects}       label="New Projects"  sub="this week" />
            {stats.topStreak && (
              <StatCard icon={Flame}    value={stats.topStreak.current_streak} label="Top Streak"  sub={`@${stats.topStreak.username}`} accent />
            )}
            {stats.topProject && (
              <StatCard icon={BarChart3} value={`${stats.topProject.votes}v`} label="Most Voted" sub={stats.topProject.title} />
            )}
          </div>
        )}

        {/* Feed */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
              Live Feed
            </h2>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Live</span>
            </div>
          </div>

          {feedLoading ? (
            <FeedSkeleton />
          ) : feed.length === 0 ? (
            <EmptyState
              icon="Zap"
              title="Nothing here yet"
              description="Submit a project or complete a challenge to kick things off"
              action={isLoggedIn ? { label: 'Submit a Project', href: '/projects/submit' } : undefined}
            />
          ) : (
            <>
              <div>
                {feed.map((item) => <FeedItem key={item.id} item={item} />)}
              </div>

              {hasMore && (
                <button
                  onClick={() => loadFeed(page + 1)}
                  disabled={loadingMore}
                  className="btn-secondary w-full mt-2 justify-center"
                >
                  {loadingMore ? 'Loading...' : 'Load more'}
                </button>
              )}
            </>
          )}
        </div>

      </motion.div>
    </Layout>
  );
}
