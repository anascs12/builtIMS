import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Camera, LogOut, AlertTriangle } from 'lucide-react';
import Layout  from '../components/Layout';
import Card    from '../components/ui/Card';
import Button  from '../components/ui/Button';
import Avatar  from '../components/ui/Avatar';
import api     from '../api/axios';
import toast   from 'react-hot-toast';
import useAuthStore from '../store/authStore';
import { getAvatarUrl } from '../utils/avatar';

const PROGRAMS = [
  { id: 1, label: 'BSCS — Computer Science' },
  { id: 2, label: 'BSSE — Software Engineering' },
  { id: 3, label: 'BS-AI — Artificial Intelligence' },
  { id: 4, label: 'BS-DS — Data Science' },
  { id: 5, label: 'BS-Cyber — Cybersecurity' },
];

const INTERESTS = [
  { id: 1, label: 'Web Development' }, { id: 2, label: 'Mobile Development' },
  { id: 3, label: 'AI / Machine Learning' }, { id: 4, label: 'Data Science' },
  { id: 5, label: 'Cybersecurity' }, { id: 6, label: 'DevOps / Cloud' },
  { id: 7, label: 'Game Development' }, { id: 8, label: 'Embedded Systems' },
  { id: 9, label: 'UI/UX Design' }, { id: 10, label: 'Freelancing' },
];

const TABS = ['Profile', 'Avatar', 'Password', 'Account'];

export default function SettingsPage() {
  const navigate = useNavigate();
  const { user, setUser, logout } = useAuthStore();
  const [tab,       setTab]       = useState('Profile');
  const [form,      setForm]      = useState({ fullName: '', bio: '', currentSemester: '', careerInterestId: '', githubUsername: '', linkedinUrl: '', programId: '' });
  const [passwords, setPasswords] = useState({ current: '', newPass: '', confirm: '' });
  const [loading,   setLoading]   = useState(false);
  const [pwLoading, setPwLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (user) setForm({
      fullName: user.full_name || '', bio: user.bio || '', currentSemester: user.current_semester || '',
      careerInterestId: '', githubUsername: user.github_username || '', linkedinUrl: user.linkedin_url || '', programId: user.program_id || '',
    });
  }, [user]);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.put('/users/me', {
        fullName: form.fullName || undefined, bio: form.bio || undefined,
        currentSemester: form.currentSemester ? parseInt(form.currentSemester) : undefined,
        careerInterestId: form.careerInterestId ? parseInt(form.careerInterestId) : undefined,
        githubUsername: form.githubUsername || undefined, linkedinUrl: form.linkedinUrl || undefined,
      });
      setUser({ ...user, ...data.user });
      toast.success('Profile updated!');
    } catch (err) { toast.error(err.response?.data?.message || 'Failed.'); }
    finally { setLoading(false); }
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('avatar', file);
      const res  = await fetch('/api/upload/avatar', { method: 'POST', headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` }, body: formData });
      const data = await res.json();
      if (data.success) { setUser({ ...user, avatar_url: data.avatarUrl }); toast.success('Photo uploaded!'); }
      else toast.error(data.message || 'Upload failed.');
    } catch { toast.error('Upload failed.'); }
    finally { setUploading(false); }
  };

  const handleResetToRobot = async () => {
    try {
      await api.put('/users/me/avatar', { avatar: 'avatar_01.png' });
      setUser({ ...user, avatar_url: null });
      toast.success('Robot avatar restored!');
    } catch { toast.error('Failed.'); }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (passwords.newPass !== passwords.confirm) { toast.error('Passwords do not match.'); return; }
    if (passwords.newPass.length < 8) { toast.error('Min 8 characters.'); return; }
    setPwLoading(true);
    try {
      await api.put('/users/me/password', { currentPassword: passwords.current, newPassword: passwords.newPass });
      toast.success('Password changed!');
      setPasswords({ current: '', newPass: '', confirm: '' });
    } catch (err) { toast.error(err.response?.data?.message || 'Failed.'); }
    finally { setPwLoading(false); }
  };

  return (
    <Layout>
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}
        className="max-w-2xl mx-auto">
        <div className="mb-6">
          <h1 className="text-xl font-bold mb-0.5" style={{ letterSpacing: '-0.02em' }}>Settings</h1>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Manage your BuildIMS account</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-0.5 mb-5" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
          {TABS.map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className="px-4 py-2.5 text-sm transition-all -mb-px"
              style={{
                borderBottom: tab === t ? '2px solid var(--accent)' : '2px solid transparent',
                color: tab === t ? 'var(--text-primary)' : 'var(--text-muted)',
                fontWeight: tab === t ? 500 : 400,
              }}>
              {t}
            </button>
          ))}
        </div>

        {tab === 'Profile' && (
          <form onSubmit={handleSaveProfile}>
            <Card padding="lg" className="space-y-4">
              <h2 className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>Profile Information</h2>
              <div>
                <label className="label">Full Name</label>
                <input name="fullName" value={form.fullName} onChange={handleChange} className="input" placeholder="Your full name" />
              </div>
              <div>
                <label className="label">Bio</label>
                <textarea name="bio" value={form.bio} onChange={handleChange} className="input resize-none" rows={4} placeholder="Tell others about yourself..." maxLength={500} />
                <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{form.bio.length}/500</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Program</label>
                  <select name="programId" value={form.programId} onChange={handleChange} className="input">
                    <option value="">Select program</option>
                    {PROGRAMS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Semester</label>
                  <select name="currentSemester" value={form.currentSemester} onChange={handleChange} className="input">
                    <option value="">Select semester</option>
                    {[1,2,3,4,5,6,7,8].map((s) => <option key={s} value={s}>Semester {s}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="label">Career Interest</label>
                <select name="careerInterestId" value={form.careerInterestId} onChange={handleChange} className="input">
                  <option value="">Select interest</option>
                  {INTERESTS.map((i) => <option key={i.id} value={i.id}>{i.label}</option>)}
                </select>
              </div>
              <div>
                <label className="label">GitHub Username</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: 'var(--text-muted)' }}>github.com/</span>
                  <input name="githubUsername" value={form.githubUsername} onChange={handleChange} className="input pl-24" placeholder="your-username" />
                </div>
              </div>
              <div>
                <label className="label">LinkedIn URL</label>
                <input name="linkedinUrl" value={form.linkedinUrl} onChange={handleChange} className="input" placeholder="https://linkedin.com/in/yourname" />
              </div>
              <Button type="submit" loading={loading}>Save Changes</Button>
            </Card>
          </form>
        )}

        {tab === 'Avatar' && (
          <div className="space-y-4">
            <Card padding="lg" className="space-y-5">
              <h2 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Profile Picture</h2>
              <div className="flex items-center gap-4">
                <Avatar user={user} size={64} style={{ border: '2px solid var(--accent-border)', borderRadius: '50%' }} />
                <div>
                  <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Current Avatar</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                    {user?.avatar_url?.startsWith('/uploads') ? 'Custom photo' : 'Robot avatar (DiceBear Bottts)'}
                  </p>
                </div>
              </div>

              <div>
                <p className="text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>Upload Your Photo</p>
                <label htmlFor="avatar-upload"
                  className="flex flex-col items-center justify-center p-8 rounded-[var(--radius-md)] cursor-pointer transition-colors"
                  style={{
                    border: `2px dashed ${uploading ? 'var(--accent-border)' : 'var(--border-default)'}`,
                    background: uploading ? 'var(--accent-dim)' : 'var(--bg-hover)',
                  }}
                  onMouseEnter={e => { if (!uploading) e.currentTarget.style.borderColor = 'var(--accent-border)'; }}
                  onMouseLeave={e => { if (!uploading) e.currentTarget.style.borderColor = 'var(--border-default)'; }}
                >
                  {uploading ? (
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-6 h-6 border-2 rounded-full animate-spin" style={{ borderColor: 'var(--accent-border)', borderTopColor: 'var(--accent)' }} />
                      <p className="text-sm" style={{ color: 'var(--accent)' }}>Uploading...</p>
                    </div>
                  ) : (
                    <>
                      <Camera size={24} strokeWidth={1.5} style={{ color: 'var(--text-muted)', marginBottom: 8 }} />
                      <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Click to upload</p>
                      <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>JPEG, PNG or WebP — max 5MB</p>
                    </>
                  )}
                </label>
                <input id="avatar-upload" type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handlePhotoUpload} disabled={uploading} />
              </div>
            </Card>

            <Card padding="lg">
              <p className="text-sm font-medium mb-3" style={{ color: 'var(--text-primary)' }}>Robot Avatar</p>
              <div className="flex items-center gap-4 p-3 rounded-[var(--radius-md)]" style={{ background: 'var(--bg-hover)', border: '1px solid var(--border-subtle)' }}>
                <div style={{ width: 48, height: 48, borderRadius: '50%', overflow: 'hidden', border: '1px solid var(--border-subtle)', background: 'white', flexShrink: 0 }}>
                  <img src={`https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(user?.username || 'default')}`} alt="Robot" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Your unique robot</p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Auto-generated from your username</p>
                </div>
                <Button variant="secondary" size="sm" onClick={handleResetToRobot}>Use Robot</Button>
              </div>
            </Card>
          </div>
        )}

        {tab === 'Password' && (
          <form onSubmit={handleChangePassword}>
            <Card padding="lg" className="space-y-4">
              <h2 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Change Password</h2>
              {[
                { label: 'Current Password', key: 'current', placeholder: '••••••••' },
                { label: 'New Password',     key: 'newPass', placeholder: 'Min 8 chars, 1 uppercase, 1 number' },
                { label: 'Confirm New',      key: 'confirm', placeholder: 'Repeat new password' },
              ].map((f) => (
                <div key={f.key}>
                  <label className="label">{f.label}</label>
                  <input type="password" value={passwords[f.key]}
                    onChange={(e) => setPasswords({ ...passwords, [f.key]: e.target.value })}
                    className="input" placeholder={f.placeholder} />
                </div>
              ))}
              <Button type="submit" loading={pwLoading}>Change Password</Button>
            </Card>
          </form>
        )}

        {tab === 'Account' && (
          <div className="space-y-4">
            <Card padding="lg">
              <h2 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-muted)' }}>Account Information</h2>
              <div className="divide-y" style={{ borderColor: 'var(--border-subtle)' }}>
                {[
                  { label: 'Email',        value: user?.email },
                  { label: 'Username',     value: `@${user?.username}` },
                  { label: 'Role',         value: user?.role },
                  { label: 'Member since', value: user?.created_at ? new Date(user.created_at).toLocaleDateString('en-PK', { year: 'numeric', month: 'long' }) : '—' },
                ].map((row) => (
                  <div key={row.label} className="flex justify-between py-3">
                    <span className="text-sm" style={{ color: 'var(--text-muted)' }}>{row.label}</span>
                    <span className="text-sm capitalize" style={{ color: 'var(--text-primary)' }}>{row.value}</span>
                  </div>
                ))}
              </div>
            </Card>

            <Card padding="lg">
              <h2 className="text-sm font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>Sign Out</h2>
              <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>Sign out of your BuildIMS account on this device.</p>
              <Button variant="secondary" onClick={async () => { await logout(); navigate('/login'); }}>
                <LogOut size={13} /> Sign Out
              </Button>
            </Card>

            <Card padding="lg" style={{ borderColor: 'rgba(248,113,113,0.2)' }}>
              <div className="flex items-start gap-2 mb-3">
                <AlertTriangle size={16} color="#f87171" strokeWidth={1.5} style={{ flexShrink: 0, marginTop: 2 }} />
                <div>
                  <h2 className="text-sm font-semibold mb-0.5" style={{ color: '#f87171' }}>Danger Zone</h2>
                  <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Contact admin to delete your account.</p>
                </div>
              </div>
              <button onClick={() => toast.error('Contact admin to delete your account.')}
                className="text-sm px-3 py-1.5 rounded-[8px] transition-colors"
                style={{ border: '1px solid rgba(248,113,113,0.25)', color: '#f87171' }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(248,113,113,0.06)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                Delete Account
              </button>
            </Card>
          </div>
        )}
      </motion.div>
    </Layout>
  );
}
