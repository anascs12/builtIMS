import { useState, useEffect } from 'react';
import api from '../api/axios';

export default function StatsBar() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    api.get('/digest/stats')
      .then(({ data }) => setStats(data.stats))
      .catch(() => {});
  }, []);

  if (!stats) return null;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">

      <div className="card p-4 text-center">
        <p className="text-2xl font-bold text-white">{stats.totalCompletions}</p>
        <p className="text-xs text-dark-400 mt-1">Challenge Completions</p>
        <p className="text-xs text-dark-600">this week</p>
      </div>

      <div className="card p-4 text-center">
        <p className="text-2xl font-bold text-white">{stats.newProjects}</p>
        <p className="text-xs text-dark-400 mt-1">New Projects</p>
        <p className="text-xs text-dark-600">this week</p>
      </div>

      {stats.topStreak && (
        <div className="card p-4 text-center">
          <p className="text-2xl font-bold text-accent">🔥 {stats.topStreak.current_streak}</p>
          <p className="text-xs text-dark-400 mt-1">Top Streak</p>
          <p className="text-xs text-dark-600">@{stats.topStreak.username}</p>
        </div>
      )}

      {stats.topProject && (
        <div className="card p-4 text-center">
          <p className="text-2xl font-bold text-white">#{stats.topProject.votes}</p>
          <p className="text-xs text-dark-400 mt-1">Top Votes</p>
          <p className="text-xs text-dark-600 truncate">{stats.topProject.title}</p>
        </div>
      )}

    </div>
  );
}