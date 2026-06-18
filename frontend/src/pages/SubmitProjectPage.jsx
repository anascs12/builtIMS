import { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Upload, X, Image } from 'lucide-react';
import Layout from '../components/Layout';
import Card   from '../components/ui/Card';
import Button from '../components/ui/Button';
import api    from '../api/axios';
import toast  from 'react-hot-toast';

const PROGRAMS = [
  { id: 1, label: 'BSCS — Computer Science' },
  { id: 2, label: 'BSSE — Software Engineering' },
  { id: 3, label: 'BS-AI — Artificial Intelligence' },
  { id: 4, label: 'BS-DS — Data Science' },
  { id: 5, label: 'BS-Cyber — Cybersecurity' },
];

const ALL_TAGS = [
  { id: 1, label: 'Python' },     { id: 2, label: 'JavaScript' },
  { id: 3, label: 'TypeScript' }, { id: 4, label: 'Java' },
  { id: 5, label: 'C++' },        { id: 6, label: 'React.js' },
  { id: 7, label: 'Vue.js' },     { id: 8, label: 'Node.js' },
  { id: 9, label: 'Express.js' }, { id: 10, label: 'Django' },
  { id: 11, label: 'Flask' },     { id: 12, label: 'PostgreSQL' },
  { id: 13, label: 'MySQL' },     { id: 14, label: 'MongoDB' },
  { id: 15, label: 'Firebase' },  { id: 16, label: 'TensorFlow' },
  { id: 17, label: 'Flutter' },   { id: 18, label: 'React Native' },
  { id: 19, label: 'Docker' },    { id: 20, label: 'AWS' },
  { id: 21, label: 'Git / GitHub' },
];

export default function SubmitProjectPage() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [form, setForm] = useState({
    title: '', description: '', programId: '', semester: '',
    githubUrl: '', demoUrl: '', techTags: [],
  });
  const [coverImage, setCoverImage] = useState(null); // file
  const [coverPreview, setCoverPreview] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  const update = (field, value) => setForm((f) => ({ ...f, [field]: value }));

  const toggleTag = (id) => {
    setForm((f) => ({
      ...f,
      techTags: f.techTags.includes(id) ? f.techTags.filter(t => t !== id) : [...f.techTags, id],
    }));
  };

  const handleFile = (file) => {
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      toast.error('Only JPG, PNG, or WebP images allowed.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) { toast.error('Image must be under 5MB.'); return; }
    setCoverImage(file);
    const reader = new FileReader();
    reader.onload = (e) => setCoverPreview(e.target.result);
    reader.readAsDataURL(file);
  };

  const onDrop = useCallback((e) => {
    e.preventDefault();
    setDragging(false);
    handleFile(e.dataTransfer.files[0]);
  }, []);

  const validate = () => {
    const err = {};
    if (!form.title.trim())       err.title = 'Title is required';
    if (!form.description.trim()) err.description = 'Description is required';
    if (!form.programId)          err.programId = 'Select a program';
    if (!form.semester)           err.semester = 'Select a semester';
    setErrors(err);
    return Object.keys(err).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      const { data } = await api.post('/projects', {
        title:       form.title,
        description: form.description,
        programId:   parseInt(form.programId),
        semester:    parseInt(form.semester),
        githubUrl:   form.githubUrl || undefined,
        demoUrl:     form.demoUrl   || undefined,
        techTags:    form.techTags,
      });

      const projectId = data.project?.id;

      // Upload cover image if provided
      if (coverImage && projectId) {
        const formData = new FormData();
        formData.append('image', coverImage);
        try {
          await api.post(`/projects/${projectId}/cover-image`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
        } catch { toast.error('Project saved but cover image upload failed.'); }
      }

      toast.success('Project submitted for review.');
      navigate('/showcase');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Submission failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Layout>
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <div className="max-w-2xl mx-auto">
          <div className="mb-6">
            <h1 className="text-xl font-bold mb-1" style={{ letterSpacing: '-0.02em' }}>Submit a Project</h1>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Projects are reviewed before appearing in the showcase.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">

            {/* Cover image */}
            <Card padding="md">
              <p className="label mb-3">Cover Image <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional)</span></p>

              {coverPreview ? (
                <div className="relative rounded-[var(--radius-md)] overflow-hidden" style={{ aspectRatio: '16/7' }}>
                  <img src={coverPreview} alt="Preview" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => { setCoverImage(null); setCoverPreview(null); }}
                    className="absolute top-2 right-2 btn-danger p-1.5 rounded-full"
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <div
                  className="flex flex-col items-center justify-center rounded-[var(--radius-md)] cursor-pointer transition-colors"
                  style={{
                    aspectRatio: '16/7',
                    border: `2px dashed ${dragging ? 'var(--accent)' : 'var(--border-default)'}`,
                    background: dragging ? 'var(--accent-dim)' : 'var(--bg-input)',
                  }}
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={onDrop}
                >
                  <Image size={24} color="var(--text-muted)" strokeWidth={1.5} />
                  <p className="text-sm mt-2" style={{ color: 'var(--text-secondary)' }}>Drag and drop or <span style={{ color: 'var(--accent)' }}>click to upload</span></p>
                  <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>JPG, PNG or WebP — max 5MB</p>
                </div>
              )}
              <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden"
                onChange={(e) => handleFile(e.target.files[0])} />
            </Card>

            {/* Core info */}
            <Card padding="md" className="space-y-4">
              <div>
                <label className="label">Project Title *</label>
                <input className={`input ${errors.title ? 'border-red-500' : ''}`}
                  placeholder="e.g. BuildIMS — Student Developer Platform"
                  value={form.title} onChange={e => update('title', e.target.value)} />
                {errors.title && <p className="error-text">{errors.title}</p>}
              </div>

              <div>
                <label className="label">Description *</label>
                <textarea
                  className={`input resize-none ${errors.description ? 'border-red-500' : ''}`}
                  rows={4}
                  placeholder="What does your project do? What problem does it solve?"
                  value={form.description} onChange={e => update('description', e.target.value)}
                />
                {errors.description && <p className="error-text">{errors.description}</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Program *</label>
                  <select className={`input ${errors.programId ? 'border-red-500' : ''}`}
                    value={form.programId} onChange={e => update('programId', e.target.value)}>
                    <option value="">Select program</option>
                    {PROGRAMS.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
                  </select>
                  {errors.programId && <p className="error-text">{errors.programId}</p>}
                </div>
                <div>
                  <label className="label">Semester *</label>
                  <select className={`input ${errors.semester ? 'border-red-500' : ''}`}
                    value={form.semester} onChange={e => update('semester', e.target.value)}>
                    <option value="">Select semester</option>
                    {[1,2,3,4,5,6,7,8].map(s => <option key={s} value={s}>Semester {s}</option>)}
                  </select>
                  {errors.semester && <p className="error-text">{errors.semester}</p>}
                </div>
              </div>
            </Card>

            {/* Links */}
            <Card padding="md" className="space-y-4">
              <div>
                <label className="label">GitHub URL</label>
                <input className="input" placeholder="https://github.com/..." value={form.githubUrl} onChange={e => update('githubUrl', e.target.value)} />
              </div>
              <div>
                <label className="label">Demo / Live URL</label>
                <input className="input" placeholder="https://..." value={form.demoUrl} onChange={e => update('demoUrl', e.target.value)} />
              </div>
            </Card>

            {/* Tech tags */}
            <Card padding="md">
              <label className="label mb-3">Tech Stack</label>
              <div className="flex flex-wrap gap-1.5">
                {ALL_TAGS.map((tag) => {
                  const selected = form.techTags.includes(tag.id);
                  return (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => toggleTag(tag.id)}
                      className="badge transition-all"
                      style={{
                        background: selected ? 'var(--accent-dim)' : 'var(--bg-hover)',
                        color:      selected ? 'var(--accent)' : 'var(--text-secondary)',
                        border:     `1px solid ${selected ? 'var(--accent-border)' : 'var(--border-subtle)'}`,
                        cursor: 'pointer',
                      }}
                    >
                      {tag.label}
                    </button>
                  );
                })}
              </div>
            </Card>

            <Button type="submit" loading={submitting} className="w-full justify-center py-2.5">
              Submit for Review
            </Button>
          </form>
        </div>
      </motion.div>
    </Layout>
  );
}
