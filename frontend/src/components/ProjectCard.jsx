import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

const ExternalLink = ({ href, children, className }) => (
  <a href={href} target="_blank" rel="noreferrer" className={className}>{children}</a>
);

export default function ProjectCard({ project }) {
  return (
    <motion.div
      whileHover={{ y: -2 }}
      transition={{ duration: 0.2 }}
      className="rounded-2xl p-5 relative overflow-hidden"
      style={{
        background: 'rgba(255,255,255,0.04)',
        backdropFilter: 'blur(12px)',
        border: '1px solid rgba(255,255,255,0.07)',
        boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
        transition: 'border-color 0.2s ease',
      }}
      onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'}
      onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <Link to={`/projects/${project.id}`}
            className="font-bold text-white hover:text-accent transition-colors line-clamp-1 text-base"
            style={{ fontFamily: 'Syne, sans-serif', letterSpacing: '-0.01em' }}>
            {project.title}
          </Link>
          <p className="text-sm mt-1.5 line-clamp-2" style={{ color: 'rgba(255,255,255,0.38)', fontFamily: 'DM Sans, sans-serif', lineHeight: 1.6 }}>
            {project.description}
          </p>
          {project.tech_tags?.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {project.tech_tags.slice(0, 4).map((tag) => (
                <span key={tag} className="badge-gray text-xs">{tag}</span>
              ))}
              {project.tech_tags.length > 4 && (
                <span className="badge-gray text-xs">+{project.tech_tags.length - 4}</span>
              )}
            </div>
          )}
        </div>

        {/* Vote */}
        <motion.div whileHover={{ scale: 1.05 }} className="flex flex-col items-center gap-0.5 flex-shrink-0 rounded-xl px-3 py-2"
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', minWidth: '48px' }}>
          <span className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>▲</span>
          <span className="text-sm font-bold text-white" style={{ fontFamily: 'Syne, sans-serif' }}>{project.votes || 0}</span>
        </motion.div>
      </div>

      <div className="flex items-center gap-3 mt-4 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <span className="text-xs" style={{ color: 'rgba(255,255,255,0.2)', fontFamily: 'DM Sans, sans-serif' }}>
          Semester {project.semester}
        </span>
        {project.github_url && (
          <ExternalLink href={project.github_url} className="text-xs transition-colors"
            style={{ color: 'rgba(255,255,255,0.3)', fontFamily: 'DM Sans, sans-serif' }}
            onMouseEnter={e => e.target.style.color = '#FF7340'}
            onMouseLeave={e => e.target.style.color = 'rgba(255,255,255,0.3)'}>
            GitHub →
          </ExternalLink>
        )}
        {project.demo_url && (
          <ExternalLink href={project.demo_url} className="text-xs transition-colors"
            style={{ color: 'rgba(255,255,255,0.3)', fontFamily: 'DM Sans, sans-serif' }}
            onMouseEnter={e => e.target.style.color = '#FF7340'}
            onMouseLeave={e => e.target.style.color = 'rgba(255,255,255,0.3)'}>
            Live Demo →
          </ExternalLink>
        )}
        <span className={`ml-auto text-xs px-2.5 py-1 rounded-full font-medium
          ${project.status === 'approved' ? 'bg-green-500/10 text-green-400' :
            project.status === 'pending_moderation' ? 'bg-yellow-500/10 text-yellow-400' :
            'bg-white/5 text-white/30'}`}
          style={{ fontFamily: 'DM Sans, sans-serif' }}>
          {project.status === 'pending_moderation' ? 'Pending' : project.status}
        </span>
      </div>
    </motion.div>
  );
}