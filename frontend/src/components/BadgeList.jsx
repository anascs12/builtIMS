const BADGE_ICONS = {
  'first-project':    '🚀',
  'first-vote':       '👍',
  'bronze-builder':   '🥉',
  'silver-builder':   '🥈',
  'gold-builder':     '🥇',
  'most-innovative':  '💡',
  'best-ui':          '🎨',
  'best-tech':        '⚙️',
  'faculty-choice':   '🎓',
  'reliable-builder': '🤝',
  'shipped-idea':     '📦',
  'active-mentor':    '👨‍🏫',
  'subject-expert':   '🧠',
  'showdown-champion':'🏆',
  'perfect-week':     '⭐',
};

const BADGE_COLORS = {
  streak:        'bg-orange-500/10 border-orange-500/20 text-orange-400',
  showcase:      'bg-blue-500/10 border-blue-500/20 text-blue-400',
  social:        'bg-green-500/10 border-green-500/20 text-green-400',
  challenge:     'bg-purple-500/10 border-purple-500/20 text-purple-400',
  mentorship:    'bg-yellow-500/10 border-yellow-500/20 text-yellow-400',
  accountability:'bg-pink-500/10 border-pink-500/20 text-pink-400',
  special:       'bg-accent/10 border-accent/20 text-accent',
};

export default function BadgeList({ badges }) {
  if (!badges?.length) return (
    <div className="text-center py-8">
      <p className="text-3xl mb-2">🏅</p>
      <p className="text-dark-400 text-sm">No badges yet</p>
      <p className="text-dark-600 text-xs mt-1">Complete challenges and submit projects to earn badges</p>
    </div>
  );

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {badges.map((badge) => (
        <div
          key={badge.slug}
          className={`border rounded-lg p-3 flex items-start gap-3 ${BADGE_COLORS[badge.category] || BADGE_COLORS.special}`}
        >
          <span className="text-2xl flex-shrink-0">
            {BADGE_ICONS[badge.slug] || '🏅'}
          </span>
          <div className="min-w-0">
            <p className="font-semibold text-sm leading-tight">{badge.name}</p>
            <p className="text-xs opacity-70 mt-0.5 leading-tight">{badge.description}</p>
          </div>
        </div>
      ))}
    </div>
  );
}