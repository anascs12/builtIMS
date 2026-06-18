import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { GitFork, ExternalLink, ChevronUp, Users, Calendar, GraduationCap, ImageIcon } from 'lucide-react';
import Layout    from '../components/Layout';
import Card      from '../components/ui/Card';
import Skeleton  from '../components/ui/Skeleton';
import VoteButton from '../components/ui/VoteButton';
import Avatar    from '../components/ui/Avatar';
import api       from '../api/axios';
import useAuthStore from '../store/authStore';
import toast from 'react-hot-toast';

export default function ProjectDetailPage() {
  const { id }               = useParams();
  const { user, isLoggedIn } = useAuthStore();
  const [project,  setProject]  = useState(null);
  const [votes,    setVotes]    = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [voting,   setVoting]   = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => { loadProject(); loadVotes(); }, [id]);

  const loadProject = async () => {
    try {
      const { data } = await api.get(`/projects/${id}`);
      setProject(data.project);
    } catch (err) { if (err.response?.status === 404) setNotFound(true); }
    finally { setLoading(false); }
  };

  const loadVotes = async () => {
    try { const { data } = await api.get(`/projects/${id}/vote`); setVotes(data); } catch {}
  };

  const handleVote = async () => {
    if (!isLoggedIn) { toast.error('Please log in to vote.'); return; }
    setVoting(true);
    try {
      if (votes?.hasVoted) { await api.delete(`/projects/${id}/vote`); toast.success('Vote removed.'); }
      else                 { await api.post(`/projects/${id}/vote`);   toast.success('Voted!'); }
      loadVotes();
    } catch (err) { toast.error(err.response?.data?.message || 'Could not vote.'); }
    finally { setVoting(false); }
  };

  const handleImageUpload = async (file) => {
    if (!file) return;
    const formData = new FormData();
    formData.append('image', file);
    setUploading(true);
    try {
      await api.post(`/projects/${id}/cover-image`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success('Cover image updated.');
      loadProject();
    } catch (err) { toast.error(err.response?.data?.message || 'Upload failed.'); }
    finally { setUploading(false); }
  };

  const isOwner = user?.userId === project?.submitted_by || user?.username === project?.username;

  if (loading) return (
    <Layout>
      <div className="space-y-4">
        <Skeleton width="100%" height={280} />
        <Skeleton width="60%" height={28} />
        <Skeleton width="90%" height={14} />
      </div>
    </Layout>
  );

  if (notFound) return (
    <Layout>
      <Card padding="lg" className="text-center">
        <h2 className="text-lg font-semibold mb-2">Project not found</h2>
        <Link to="/showcase" className="btn-secondary">Back to Showcase</Link>
      </Card>
    </Layout>
  );

  return (
    <Layout>
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>

        {/* Cover image */}
        <div
          className="relative mb-6 rounded-[var(--radius-lg)] overflow-hidden"
          style={{ aspectRatio: '16/7', background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}
        >
          {project?.cover_image ? (
            <img src={project.cover_image} alt={project.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center gap-2" style={{ color: 'var(--text-muted)' }}>
              <ImageIcon size={32} strokeWidth={1} />
              <span className="text-sm">No cover image</span>
            </div>
          )}

          {isOwner && (
            <div className="absolute bottom-3 right-3">
              <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden"
                onChange={(e) => handleImageUpload(e.target.files[0])} />
              <button onClick={() => fileInputRef.current?.click()} className="btn-secondary text-xs" disabled={uploading}>
                {uploading ? 'Uploading...' : project?.cover_image ? 'Change image' : 'Add cover image'}
              </button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-5">
            <div>
              <div className="flex items-start justify-between gap-4 mb-3">
                <div>
                  <h1 className="text-2xl font-bold mb-1" style={{ letterSpacing: '-0.02em' }}>{project?.title}</h1>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`badge ${project?.status === 'approved' ? 'badge-green' : 'badge-yellow'}`}>
                      {project?.status?.replace('_', ' ')}
                    </span>
                    {project?.program_code && <span className="badge-gray">{project.program_code}</span>}
                    {project?.semester && (
                      <span className="badge-gray flex items-center gap-1">
                        <GraduationCap size={10} /> Semester {project.semester}
                      </span>
                    )}
                  </div>
                </div>
                <VoteButton
                  votes={votes?.weightedVotes || 0}
                  hasVoted={votes?.hasVoted}
                  onVote={handleVote}
                  disabled={voting || !isLoggedIn}
                />
              </div>

              <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{project?.description}</p>
            </div>

            {/* Tech tags */}
            {project?.tech_tags?.filter(Boolean).length > 0 && (
              <div>
                <p className="text-xs font-medium mb-2" style={{ color: 'var(--text-muted)' }}>TECH STACK</p>
                <div className="flex flex-wrap gap-1.5">
                  {project.tech_tags.filter(Boolean).map((tag) => (
                    <span key={tag} className="badge-blue">{tag}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Team members */}
            {project?.team?.length > 0 && (
              <Card padding="md">
                <p className="text-xs font-medium mb-3 flex items-center gap-1.5" style={{ color: 'var(--text-muted)' }}>
                  <Users size={12} /> TEAM MEMBERS
                </p>
                <div className="space-y-2">
                  {project.team.map((member) => (
                    <Link key={member.username} to={`/u/${member.username}`} className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
                      <Avatar user={member} size={28} />
                      <div>
                        <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{member.full_name}</p>
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>@{member.username}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Submitter */}
            <Card padding="md">
              <p className="text-xs font-medium mb-3" style={{ color: 'var(--text-muted)' }}>SUBMITTED BY</p>
              <Link to={`/u/${project?.username}`} className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
                <Avatar user={{ username: project?.username, avatar_url: project?.avatar_url }} size={36} />
                <div>
                  <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{project?.full_name}</p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>@{project?.username}</p>
                </div>
              </Link>
            </Card>

            {/* Links */}
            <Card padding="md">
              <p className="text-xs font-medium mb-3" style={{ color: 'var(--text-muted)' }}>LINKS</p>
              <div className="space-y-2">
                {project?.github_url && (
                  <a href={project.github_url} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm transition-colors"
                    style={{ color: 'var(--text-secondary)' }}
                    onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'}
                    onMouseLeave={e => e.currentTarget.style.color = 'var(--text-secondary)'}
                  >
                    <GitFork size={15} strokeWidth={1.5} />
                    View on GitHub
                    <ExternalLink size={11} className="ml-auto" />
                  </a>
                )}
                {project?.demo_url && (
                  <a href={project.demo_url} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm transition-colors"
                    style={{ color: 'var(--text-secondary)' }}
                    onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'}
                    onMouseLeave={e => e.currentTarget.style.color = 'var(--text-secondary)'}
                  >
                    <ExternalLink size={15} strokeWidth={1.5} />
                    Live Demo
                    <ExternalLink size={11} className="ml-auto" />
                  </a>
                )}
                {!project?.github_url && !project?.demo_url && (
                  <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No links provided</p>
                )}
              </div>
            </Card>

            {/* Stats */}
            <Card padding="md">
              <p className="text-xs font-medium mb-3" style={{ color: 'var(--text-muted)' }}>STATS</p>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span style={{ color: 'var(--text-secondary)' }}>Weighted votes</span>
                  <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{votes?.weightedVotes || 0}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span style={{ color: 'var(--text-secondary)' }}>Raw votes</span>
                  <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{votes?.rawVoteCount || 0}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span style={{ color: 'var(--text-secondary)' }}>Submitted</span>
                  <span className="font-medium" style={{ color: 'var(--text-primary)' }}>
                    <Calendar size={12} className="inline mr-1" />
                    {project?.created_at ? new Date(project.created_at).toLocaleDateString() : '—'}
                  </span>
                </div>
              </div>
            </Card>

            <Link to="/showcase" className="btn-secondary w-full justify-center text-sm">
              Back to Showcase
            </Link>
          </div>
        </div>

      </motion.div>
    </Layout>
  );
}
