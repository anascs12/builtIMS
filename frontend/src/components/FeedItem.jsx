import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { Rocket, Zap, Flame, Award, Lightbulb, Package, Trophy, UserPlus, CheckCircle2, Swords } from 'lucide-react';
import Avatar from './ui/Avatar';

const ACTION_META = {
  project_submitted:  { icon: Rocket,       color: 'var(--blue)',   card: 'feed-card-project',   label: 'Project'   },
  project_approved:   { icon: CheckCircle2,  color: 'var(--green)',  card: 'feed-card-project',   label: 'Project'   },
  project_voted:      { icon: CheckCircle2,  color: 'var(--blue)',   card: 'feed-card-project',   label: 'Project'   },
  challenge_completed:{ icon: Zap,           color: 'var(--accent)', card: 'feed-card-challenge', label: 'Challenge' },
  streak_milestone:   { icon: Flame,         color: 'var(--accent)', card: 'feed-card-challenge', label: 'Streak'    },
  badge_earned:       { icon: Award,         color: 'var(--green)',  card: 'feed-card-badge',     label: 'Badge'     },
  idea_posted:        { icon: Lightbulb,     color: 'var(--yellow)', card: 'feed-card-idea',      label: 'Idea'      },
  idea_shipped:       { icon: Package,       color: 'var(--yellow)', card: 'feed-card-idea',      label: 'Idea'      },
  showcase_winner:    { icon: Trophy,        color: '#A855F7',       card: 'feed-card-showdown',  label: 'Showdown'  },
  showdown_submitted: { icon: Swords,        color: '#A855F7',       card: 'feed-card-showdown',  label: 'Showdown'  },
  user_registered:    { icon: UserPlus,      color: 'var(--green)',  card: 'feed-card-badge',     label: 'New'       },
};

export default function FeedItem({ item }) {
  const meta = ACTION_META[item.action] || { icon: Zap, color: 'var(--text-muted)', card: '', label: '' };
  const Icon = meta.icon;
  const time = formatDistanceToNow(new Date(item.createdAt), { addSuffix: true });

  const coverImage = item.project?.cover_image;

  return (
    <div
      className={`card card-hover ${meta.card} rounded-[var(--radius-lg)] p-4 mb-3`}
      style={{ borderLeftWidth: meta.card ? undefined : undefined }}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2.5">
          <Link to={`/u/${item.actor.username}`}>
            <Avatar user={{ username: item.actor.username, avatar_url: item.actor.avatar }} size={32} />
          </Link>
          <div>
            <Link to={`/u/${item.actor.username}`} className="text-sm font-semibold transition-colors" style={{ color: 'var(--text-primary)' }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--accent)'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--text-primary)'}
            >
              @{item.actor.username}
            </Link>
            <span className="text-xs ml-1.5" style={{ color: 'var(--text-muted)' }}>{time}</span>
          </div>
        </div>

        <span className="badge-gray flex items-center gap-1 flex-shrink-0">
          <Icon size={11} color={meta.color} strokeWidth={2} />
          <span>{meta.label}</span>
        </span>
      </div>

      {/* Action description */}
      <p className="text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>
        {item.action === 'project_submitted' && (
          <>Submitted a project — <Link to={`/projects/${item.project?.id}`} className="font-medium transition-colors" style={{ color: 'var(--text-primary)' }} onMouseEnter={e => e.currentTarget.style.color = 'var(--accent)'} onMouseLeave={e => e.currentTarget.style.color = 'var(--text-primary)'}>{item.project?.title}</Link></>
        )}
        {item.action === 'project_approved' && (
          <>Project approved — <Link to={`/projects/${item.project?.id}`} className="font-medium" style={{ color: 'var(--text-primary)' }}>{item.project?.title}</Link></>
        )}
        {item.action === 'project_voted' && (
          <>Voted on <Link to={`/projects/${item.project?.id}`} className="font-medium" style={{ color: 'var(--text-primary)' }}>{item.project?.title}</Link></>
        )}
        {item.action === 'challenge_completed' && (
          <>Completed today's challenge — <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{item.challenge?.title}</span></>
        )}
        {item.action === 'streak_milestone' && (
          <>Reached a streak milestone</>
        )}
        {item.action === 'badge_earned' && (
          <>Earned a badge</>
        )}
        {item.action === 'idea_posted' && (
          <>Posted a new idea</>
        )}
        {item.action === 'idea_shipped' && (
          <>Shipped an idea</>
        )}
        {item.action === 'showcase_winner' && (
          <>Won a showcase category</>
        )}
        {item.action === 'user_registered' && (
          <>Joined BuildIMS</>
        )}
        {!ACTION_META[item.action] && item.message?.replace(item.actor.name, '').trim()}
      </p>

      {/* Cover image (project cards only) */}
      {coverImage && (
        <Link to={`/projects/${item.project?.id}`} className="block mb-3 rounded-[var(--radius-md)] overflow-hidden" style={{ aspectRatio: '16/7' }}>
          <img
            src={coverImage}
            alt={item.project?.title}
            className="w-full h-full object-cover transition-transform duration-300"
            onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.02)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
          />
        </Link>
      )}

      {/* Metadata chips */}
      <div className="flex items-center gap-2 flex-wrap">
        {item.extra?.streak && (
          <span className="badge-accent flex items-center gap-1">
            <Flame size={10} strokeWidth={2} />
            {item.extra.streak} day streak
          </span>
        )}
        {item.extra?.badge && (
          <span className="badge-yellow flex items-center gap-1">
            <Award size={10} strokeWidth={2} />
            {item.extra.badge}
          </span>
        )}
        {item.challenge?.type && (
          <span className="badge-gray capitalize">{item.challenge.type}</span>
        )}
        {item.project?.id && (
          <Link to={`/projects/${item.project.id}`} className="badge-gray ml-auto hover:border-[var(--border-default)] transition-colors" style={{ marginLeft: 'auto' }}>
            View Project
          </Link>
        )}
      </div>
    </div>
  );
}
