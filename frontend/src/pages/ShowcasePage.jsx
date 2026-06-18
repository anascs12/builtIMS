import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Search, ChevronUp, ExternalLink, GitFork } from 'lucide-react';
import Layout    from '../components/Layout';
import Card      from '../components/ui/Card';
import Skeleton  from '../components/ui/Skeleton';
import EmptyState from '../components/ui/EmptyState';
import Avatar    from '../components/ui/Avatar';
import api       from '../api/axios';

const PROGRAMS  = [{ id: '', label: 'All Programs' }, { id: '1', label: 'BSCS' }, { id: '2', label: 'BSSE' }, { id: '3', label: 'BS-AI' }, { id: '4', label: 'BS-DS' }, { id: '5', label: 'BS-Cyber' }];
const SEMESTERS = ['All', '1', '2', '3', '4', '5', '6', '7', '8'];

function ProjectCard({ project }) {
  const hasImage = !!project.cover_image;
  const tagColor = (tag) => {
    const colors = { 'Python': '#3B82F6', 'JavaScript': '#F59E0B', 'TypeScript': '#3B82F6', 'React.js': '#60A5FA', 'Node.js': '#22C55E' };
    return colors[tag] || 'var(--text-muted)';
  };

  return (
    <Card hover padding="sm" className="flex flex-col overflow-hidden">
      {hasImage ? (
        <Link to={`/projects/${project.id}`} className="block -mx-3 -mt-3 mb-3 overflow-hidden" style={{ aspectRatio: '16/9' }}>
          <img src={project.cover_image} alt={project.title} className="w-full h-full object-cover transition-transform duration-300 hover:scale-105" />
        </Link>
      ) : (
        <div className="-mx-3 -mt-3 mb-3 flex items-center justify-center" style={{ aspectRatio: '16/9', background: 'var(--bg-hover)', borderBottom: '1px solid var(--border-subtle)' }}>
          <span className="text-xs" style={{ color: 'var(--text-disabled)' }}>No cover image</span>
        </div>
      )}

      <div className="flex-1 flex flex-col px-2">
        <Link to={`/projects/${project.id}`} className="text-sm font-semibold mb-1 hover:text-accent transition-colors line-clamp-1" style={{ color: 'var(--text-primary)' }}>
          {project.title}
        </Link>
        <p className="text-xs mb-2 line-clamp-2 flex-1" style={{ color: 'var(--text-secondary)' }}>{project.description}</p>

        {/* Tags */}
        {project.tech_tags?.filter(Boolean).length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {project.tech_tags.filter(Boolean).slice(0, 3).map((tag) => (
              <span key={tag} className="badge-gray text-[10px]">{tag}</span>
            ))}
            {project.tech_tags.filter(Boolean).length > 3 && (
              <span className="badge-gray text-[10px]">+{project.tech_tags.filter(Boolean).length - 3}</span>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-2" style={{ borderTop: '1px solid var(--border-subtle)' }}>
          <div className="flex items-center gap-1.5">
            <Avatar user={{ username: project.username, avatar_url: project.avatar_url }} size={18} />
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>@{project.username}</span>
          </div>
          <div className="flex items-center gap-2">
            {project.github_url && (
              <a href={project.github_url} target="_blank" rel="noopener noreferrer" className="btn-ghost p-1">
                <GitFork size={13} color="var(--text-muted)" />
              </a>
            )}
            <span className="flex items-center gap-0.5 text-xs" style={{ color: 'var(--text-muted)' }}>
              <ChevronUp size={12} strokeWidth={2} />
              {project.votes}
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
}

export default function ShowcasePage() {
  const [projects,    setProjects]    = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [search,      setSearch]      = useState('');
  const [program,     setProgram]     = useState('');
  const [semester,    setSemester]    = useState('');
  const [page,        setPage]        = useState(1);
  const [pagination,  setPagination]  = useState(null);
  const [searchInput, setSearchInput] = useState('');

  useEffect(() => { loadProjects(1); }, [search, program, semester]);

  const loadProjects = async (p) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: p, limit: 18 });
      if (search)   params.append('search',    search);
      if (program)  params.append('programId', program);
      if (semester && semester !== 'All') params.append('semester', semester);
      const { data } = await api.get(`/projects?${params}`);
      if (p === 1) setProjects(data.projects);
      else setProjects((prev) => [...prev, ...data.projects]);
      setPagination(data.pagination);
      setPage(p);
    } catch {}
    finally { setLoading(false); }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setSearch(searchInput);
  };

  return (
    <Layout>
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold" style={{ letterSpacing: '-0.02em' }}>Project Showcase</h1>
            <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
              {pagination ? `${pagination.total} projects` : 'Student-built projects'}
            </p>
          </div>
          <Link to="/projects/submit" className="btn-primary text-sm">Submit Project</Link>
        </div>

        {/* Filters */}
        <Card padding="md" className="mb-6">
          <div className="flex flex-wrap gap-3">
            <form onSubmit={handleSearch} className="flex gap-2 flex-1 min-w-[200px]">
              <div className="relative flex-1">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" color="var(--text-muted)" />
                <input
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Search projects..."
                  className="input pl-9"
                />
              </div>
              <button type="submit" className="btn-secondary">Search</button>
            </form>
            <select className="input" style={{ width: 'auto' }} value={program} onChange={e => setProgram(e.target.value)}>
              {PROGRAMS.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
            </select>
            <select className="input" style={{ width: 'auto' }} value={semester} onChange={e => setSemester(e.target.value)}>
              {SEMESTERS.map(s => <option key={s} value={s}>{s === 'All' ? 'All Semesters' : `Semester ${s}`}</option>)}
            </select>
          </div>
        </Card>

        {/* Grid */}
        {loading && projects.length === 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(9)].map((_, i) => (
              <Card key={i} padding="sm">
                <Skeleton width="100%" height={160} className="mb-3 -mx-3 -mt-3" style={{ borderRadius: 0 }} />
                <Skeleton width="60%" height={14} className="mb-1.5" />
                <Skeleton width="90%" height={10} />
              </Card>
            ))}
          </div>
        ) : projects.length === 0 ? (
          <EmptyState icon="Rocket" title="No projects found" description="Try different filters or be the first to submit" action={{ label: 'Submit Project', href: '/projects/submit' }} />
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {projects.map((p) => <ProjectCard key={p.id} project={p} />)}
            </div>

            {pagination && page < pagination.pages && (
              <button onClick={() => loadProjects(page + 1)} disabled={loading} className="btn-secondary w-full mt-4 justify-center">
                {loading ? 'Loading...' : 'Load more'}
              </button>
            )}
          </>
        )}
      </motion.div>
    </Layout>
  );
}
