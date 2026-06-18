import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Trophy, Flame, FolderGit2, ChevronUp, Medal } from 'lucide-react';
import Layout  from '../components/Layout';
import Card    from '../components/ui/Card';
import Skeleton from '../components/ui/Skeleton';
import Avatar  from '../components/ui/Avatar';
import api     from '../api/axios';

const TABS = ['Projects', 'Streaks', 'Students', 'Programs', 'Hall of Fame'];

function RankBadge({ index }) {
  const colors = ['#FFD700', '#A8A9AD', '#CD7F32'];
  if (index < 3) return <Medal size={16} color={colors[index]} strokeWidth={1.5} />;
  return <span className="text-xs font-mono" style={{ color: 'var(--text-muted)', minWidth: 20, textAlign: 'center' }}>#{index + 1}</span>;
}

function Table({ columns, rows, keyFn, renderRow }) {
  return (
    <div className="overflow-x-auto">
      <table className="data-table">
        <thead>
          <tr>{columns.map((col) => <th key={col}>{col}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((row, i) => renderRow(row, i))}
        </tbody>
      </table>
    </div>
  );
}

function SkeletonTable({ cols = 4, rows = 5 }) {
  return (
    <div className="space-y-3">
      {[...Array(rows)].map((_, i) => (
        <div key={i} className="flex gap-4">
          {[...Array(cols)].map((_, j) => <Skeleton key={j} height={16} width={j === 0 ? 32 : undefined} className="flex-1" />)}
        </div>
      ))}
    </div>
  );
}

export default function LeaderboardPage() {
  const [tab,     setTab]     = useState('Streaks');
  const [data,    setData]    = useState([]);
  const [loading, setLoading] = useState(true);

  const API_MAP = {
    Projects:       { url: '/leaderboard/projects',   key: 'leaderboard' },
    Streaks:        { url: '/leaderboard/streaks',    key: 'leaderboard' },
    Students:       { url: '/leaderboard/users',      key: 'leaderboard' },
    Programs:       { url: '/leaderboard/programs',   key: 'leaderboard' },
    'Hall of Fame': { url: '/leaderboard/hall-of-fame', key: 'hallOfFame' },
  };

  useEffect(() => {
    setLoading(true);
    setData([]);
    const { url, key } = API_MAP[tab];
    api.get(url)
      .then(({ data: d }) => setData(d[key] || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [tab]);

  return (
    <Layout>
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <div className="flex items-center gap-3 mb-6">
          <Trophy size={22} color="var(--accent)" strokeWidth={1.5} />
          <div>
            <h1 className="text-xl font-bold" style={{ letterSpacing: '-0.02em' }}>Leaderboard</h1>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Updated in real time</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-0.5 p-1 rounded-[10px] mb-5" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', width: 'fit-content' }}>
          {TABS.map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className="px-3 py-1.5 rounded-[8px] text-sm font-medium transition-colors whitespace-nowrap"
              style={{ background: tab === t ? 'var(--bg-hover)' : 'transparent', color: tab === t ? 'var(--text-primary)' : 'var(--text-muted)' }}
            >
              {t}
            </button>
          ))}
        </div>

        <Card padding="md">
          {loading ? <SkeletonTable /> : (

            tab === 'Streaks' && (
              <Table
                columns={['#', 'Student', 'Program', 'Streak', 'Longest', 'Total']}
                rows={data}
                renderRow={(row, i) => (
                  <tr key={row.username}>
                    <td><RankBadge index={i} /></td>
                    <td>
                      <Link to={`/u/${row.username}`} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                        <Avatar user={row} size={26} />
                        <div>
                          <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{row.full_name}</p>
                          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>@{row.username}</p>
                        </div>
                      </Link>
                    </td>
                    <td><span className="badge-gray">{row.program_code || '—'}</span></td>
                    <td>
                      <span className="flex items-center gap-1 text-sm font-medium" style={{ color: 'var(--accent)' }}>
                        <Flame size={13} strokeWidth={2} /> {row.current_streak}
                      </span>
                    </td>
                    <td className="text-sm" style={{ color: 'var(--text-secondary)' }}>{row.longest_streak}</td>
                    <td className="text-sm" style={{ color: 'var(--text-muted)' }}>{row.total_completions}</td>
                  </tr>
                )}
              />
            )
            ||
            tab === 'Projects' && (
              <Table
                columns={['#', 'Project', 'Author', 'Votes']}
                rows={data}
                renderRow={(row, i) => (
                  <tr key={row.id}>
                    <td><RankBadge index={i} /></td>
                    <td>
                      <Link to={`/projects/${row.id}`} className="text-sm font-medium transition-colors" style={{ color: 'var(--text-primary)' }}
                        onMouseEnter={e => e.currentTarget.style.color = 'var(--accent)'}
                        onMouseLeave={e => e.currentTarget.style.color = 'var(--text-primary)'}
                      >
                        {row.title}
                      </Link>
                    </td>
                    <td>
                      <Link to={`/u/${row.username}`} className="flex items-center gap-1.5 hover:opacity-80 transition-opacity">
                        <Avatar user={row} size={22} />
                        <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>@{row.username}</span>
                      </Link>
                    </td>
                    <td>
                      <span className="flex items-center gap-1 text-sm" style={{ color: 'var(--text-primary)' }}>
                        <ChevronUp size={13} strokeWidth={2} /> {row.weighted_votes}
                      </span>
                    </td>
                  </tr>
                )}
              />
            )
            ||
            tab === 'Students' && (
              <Table
                columns={['#', 'Student', 'Program', 'Challenges', 'Projects', 'Score']}
                rows={data}
                renderRow={(row, i) => (
                  <tr key={row.username}>
                    <td><RankBadge index={i} /></td>
                    <td>
                      <Link to={`/u/${row.username}`} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                        <Avatar user={row} size={26} />
                        <div>
                          <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{row.full_name}</p>
                          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Sem {row.current_semester}</p>
                        </div>
                      </Link>
                    </td>
                    <td><span className="badge-gray">{row.program_code || '—'}</span></td>
                    <td className="text-sm" style={{ color: 'var(--text-secondary)' }}>{row.total_challenges_completed}</td>
                    <td className="text-sm" style={{ color: 'var(--text-secondary)' }}>{row.projects_submitted}</td>
                    <td className="text-sm font-medium" style={{ color: 'var(--accent)' }}>{row.score}</td>
                  </tr>
                )}
              />
            )
            ||
            tab === 'Programs' && (
              <Table
                columns={['#', 'Program', 'Students', 'Challenges', 'Projects', 'Score']}
                rows={data}
                renderRow={(row, i) => (
                  <tr key={row.program_code}>
                    <td><RankBadge index={i} /></td>
                    <td>
                      <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{row.program_name}</p>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{row.program_code}</p>
                    </td>
                    <td className="text-sm" style={{ color: 'var(--text-secondary)' }}>{row.total_students}</td>
                    <td className="text-sm" style={{ color: 'var(--text-secondary)' }}>{row.total_challenges}</td>
                    <td className="text-sm" style={{ color: 'var(--text-secondary)' }}>{row.total_projects}</td>
                    <td className="text-sm font-medium" style={{ color: 'var(--accent)' }}>{Math.round(row.score)}</td>
                  </tr>
                )}
              />
            )
            ||
            tab === 'Hall of Fame' && (
              <Table
                columns={['#', 'Project', 'Author', 'Semester', 'Votes']}
                rows={data}
                renderRow={(row, i) => (
                  <tr key={row.id}>
                    <td><RankBadge index={i} /></td>
                    <td>
                      <Link to={`/projects/${row.id}`} className="text-sm font-medium transition-colors" style={{ color: 'var(--text-primary)' }}
                        onMouseEnter={e => e.currentTarget.style.color = 'var(--accent)'}
                        onMouseLeave={e => e.currentTarget.style.color = 'var(--text-primary)'}
                      >
                        {row.title}
                      </Link>
                    </td>
                    <td>
                      <Link to={`/u/${row.username}`} className="text-xs transition-colors" style={{ color: 'var(--text-secondary)' }}>
                        @{row.username}
                      </Link>
                    </td>
                    <td className="text-sm" style={{ color: 'var(--text-muted)' }}>Sem {row.semester}</td>
                    <td>
                      <span className="flex items-center gap-1 text-sm" style={{ color: 'var(--text-primary)' }}>
                        <ChevronUp size={13} strokeWidth={2} /> {row.weighted_votes}
                      </span>
                    </td>
                  </tr>
                )}
              />
            )

          )}

          {!loading && data.length === 0 && (
            <p className="text-center py-8 text-sm" style={{ color: 'var(--text-muted)' }}>No data yet</p>
          )}
        </Card>
      </motion.div>
    </Layout>
  );
}
