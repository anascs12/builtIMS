import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lightbulb, Plus, Users, CheckCircle2, X, Send } from 'lucide-react';
import Layout  from '../components/Layout';
import Card    from '../components/ui/Card';
import Button  from '../components/ui/Button';
import Skeleton from '../components/ui/Skeleton';
import EmptyState from '../components/ui/EmptyState';
import Avatar  from '../components/ui/Avatar';
import CountdownTimer from '../components/ui/CountdownTimer';
import api     from '../api/axios';
import toast   from 'react-hot-toast';
import useAuthStore from '../store/authStore';

const STATUS_BADGE = {
  active:    'badge-green',
  shipped:   'badge-blue',
  abandoned: 'badge-red',
};

function IdeaCard({ idea, onCollaborate }) {
  const isExpired = idea.status !== 'active';

  return (
    <Card hover padding="md" className={`feed-card-idea flex flex-col`}>
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <Avatar user={{ username: idea.username, avatar_url: idea.avatar_url }} size={28} />
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>@{idea.username}</span>
        </div>
        <span className={`${STATUS_BADGE[idea.status] || 'badge-gray'} capitalize`}>{idea.status}</span>
      </div>

      <h3 className="text-sm font-semibold mb-1.5 flex-1" style={{ color: 'var(--text-primary)' }}>{idea.title}</h3>
      <p className="text-xs line-clamp-3 mb-3" style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>{idea.description}</p>

      {idea.tech_stack?.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {idea.tech_stack.slice(0, 4).map((t) => <span key={t} className="badge-gray text-[10px]">{t}</span>)}
        </div>
      )}

      {idea.status === 'active' && (
        <div className="mb-3">
          <CountdownTimer deadline={new Date(Date.now() + (idea.seconds_remaining || 0) * 1000).toISOString()} />
        </div>
      )}

      <div className="flex items-center justify-between pt-2" style={{ borderTop: '1px solid var(--border-subtle)' }}>
        <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>
          <Users size={12} strokeWidth={1.5} />
          <span>{idea.collaborator_count || 0}/3 collaborators</span>
        </div>
        {idea.status === 'active' && onCollaborate && (
          <button onClick={() => onCollaborate(idea)}
            className="badge-blue cursor-pointer hover:opacity-80 transition-opacity"
            style={{ cursor: 'pointer' }}
          >
            <Send size={10} /> Request
          </button>
        )}
        {idea.status === 'shipped' && (
          <span className="badge-blue flex items-center gap-1"><CheckCircle2 size={10} /> Shipped</span>
        )}
      </div>
    </Card>
  );
}

export default function IdeaGaragePage() {
  const { isLoggedIn } = useAuthStore();
  const [ideas,     setIdeas]     = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [statusTab, setStatusTab] = useState('active');
  const [showForm,  setShowForm]  = useState(false);
  const [form,      setForm]      = useState({ title: '', description: '', techStack: [] });
  const [submitting,setSubmitting]= useState(false);
  const [collab,    setCollab]    = useState(null); // idea to collab on
  const [collabMsg, setCollabMsg] = useState('');
  const [sendingCollab, setSendingCollab] = useState(false);

  useEffect(() => { loadIdeas(); }, [statusTab]);

  const loadIdeas = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/ideas?status=${statusTab}&limit=30`);
      setIdeas(data.ideas || []);
    } catch {}
    finally { setLoading(false); }
  };

  const handleSubmitIdea = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.description.trim()) { toast.error('Title and description are required.'); return; }
    setSubmitting(true);
    try {
      await api.post('/ideas', { title: form.title, description: form.description, techStack: form.techStack });
      toast.success('Idea posted! You have 21 days to ship it.');
      setShowForm(false);
      setForm({ title: '', description: '', techStack: [] });
      loadIdeas();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to post idea.'); }
    finally { setSubmitting(false); }
  };

  const handleCollabRequest = async () => {
    if (!collab) return;
    setSendingCollab(true);
    try {
      await api.post(`/ideas/${collab.id}/collaborate`, { message: collabMsg });
      toast.success('Collaboration request sent!');
      setCollab(null);
      setCollabMsg('');
    } catch (err) { toast.error(err.response?.data?.message || 'Request failed.'); }
    finally { setSendingCollab(false); }
  };

  const TECH_OPTIONS = ['Python','JavaScript','React.js','Node.js','Django','Flutter','React Native','PostgreSQL','MongoDB','TensorFlow'];

  return (
    <Layout>
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold mb-0.5" style={{ letterSpacing: '-0.02em' }}>Idea Garage</h1>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Post an idea. 21 days to ship it or lose it.</p>
          </div>
          {isLoggedIn && (
            <button onClick={() => setShowForm(!showForm)} className="btn-primary text-sm">
              <Plus size={14} /> New Idea
            </button>
          )}
        </div>

        {/* Post form */}
        <AnimatePresence>
          {showForm && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
              <Card padding="md" className="mb-6">
                <form onSubmit={handleSubmitIdea} className="space-y-4">
                  <div>
                    <label className="label">Idea Title</label>
                    <input className="input" placeholder="What are you building?" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
                  </div>
                  <div>
                    <label className="label">Description</label>
                    <textarea className="input resize-none" rows={3} placeholder="Describe your idea and the problem it solves..." value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
                  </div>
                  <div>
                    <label className="label mb-2">Tech Stack</label>
                    <div className="flex flex-wrap gap-1.5">
                      {TECH_OPTIONS.map((t) => {
                        const sel = form.techStack.includes(t);
                        return (
                          <button key={t} type="button"
                            onClick={() => setForm(f => ({ ...f, techStack: sel ? f.techStack.filter(x => x !== t) : [...f.techStack, t] }))}
                            className="badge transition-all"
                            style={{
                              background: sel ? 'var(--accent-dim)' : 'var(--bg-hover)',
                              color:      sel ? 'var(--accent)' : 'var(--text-secondary)',
                              border:     `1px solid ${sel ? 'var(--accent-border)' : 'var(--border-subtle)'}`,
                              cursor: 'pointer',
                            }}
                          >{t}</button>
                        );
                      })}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button type="submit" loading={submitting}>Post Idea</Button>
                    <Button type="button" variant="secondary" onClick={() => setShowForm(false)}>Cancel</Button>
                  </div>
                </form>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Status tabs */}
        <div className="flex gap-1 mb-5">
          {['active', 'shipped', 'all'].map((s) => (
            <button key={s} onClick={() => setStatusTab(s)}
              className="px-3 py-1.5 rounded-[8px] text-sm capitalize transition-colors"
              style={{
                background: statusTab === s ? 'var(--bg-hover)' : 'transparent',
                color: statusTab === s ? 'var(--text-primary)' : 'var(--text-muted)',
                border: `1px solid ${statusTab === s ? 'var(--border-default)' : 'transparent'}`,
              }}
            >{s === 'all' ? 'All Ideas' : s}</button>
          ))}
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => <Skeleton key={i} height={200} />)}
          </div>
        ) : ideas.length === 0 ? (
          <EmptyState icon="Lightbulb" title="No ideas yet" description="Post the first idea and start shipping"
            action={isLoggedIn ? { label: 'Post Idea', href: '#' } : undefined} />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {ideas.map((idea) => (
              <IdeaCard key={idea.id} idea={idea} onCollaborate={isLoggedIn ? setCollab : null} />
            ))}
          </div>
        )}

        {/* Collaboration modal */}
        <AnimatePresence>
          {collab && (
            <motion.div
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
              style={{ background: 'rgba(0,0,0,0.7)' }}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={(e) => { if (e.target === e.currentTarget) setCollab(null); }}
            >
              <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="w-full max-w-md">
                <Card padding="lg">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>Request to Collaborate</h3>
                      <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>{collab.title}</p>
                    </div>
                    <button onClick={() => setCollab(null)} className="btn-ghost p-1"><X size={16} /></button>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="label">Message <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional)</span></label>
                      <textarea className="input resize-none" rows={3} placeholder="Why do you want to collaborate?" value={collabMsg} onChange={e => setCollabMsg(e.target.value)} />
                    </div>
                    <div className="flex gap-2">
                      <Button loading={sendingCollab} onClick={handleCollabRequest} className="flex-1 justify-center">Send Request</Button>
                      <Button variant="secondary" onClick={() => setCollab(null)}>Cancel</Button>
                    </div>
                  </div>
                </Card>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </Layout>
  );
}
