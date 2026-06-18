import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import Button from '../components/ui/Button';
import toast from 'react-hot-toast';
import useAuthStore from '../store/authStore';

export default function LoginPage() {
  const navigate  = useNavigate();
  const login     = useAuthStore((s) => s.login);
  const [form,    setForm]    = useState({ email: '', password: '' });
  const [errors,  setErrors]  = useState({});
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setErrors({ ...errors, [e.target.name]: '' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(form.email, form.password);
      toast.success('Welcome back.');
      navigate('/');
    } catch (err) {
      const code = err.response?.data?.code;
      const msg  = err.response?.data?.message || 'Login failed.';
      if (code === 'EMAIL_NOT_VERIFIED') toast.error('Verify your email first.');
      else if (code === 'ACCOUNT_LOCKED') toast.error(msg);
      else setErrors({ general: msg });
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg-base)' }}>
      {/* Top bar */}
      <div className="px-8 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
        <Link to="/" className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-[8px] flex items-center justify-center" style={{ background: 'var(--accent)' }}>
            <span className="text-white font-black text-xs">B</span>
          </div>
          <span className="font-bold text-base" style={{ letterSpacing: '-0.02em' }}>
            Build<span style={{ color: 'var(--accent)' }}>IMS</span>
          </span>
        </Link>
        <Link to="/register" className="text-sm" style={{ color: 'var(--text-muted)' }}>
          No account?{' '}
          <span className="transition-colors" style={{ color: 'var(--accent)' }}>Join free</span>
        </Link>
      </div>

      {/* Main */}
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-[380px]"
        >
          <div className="mb-7 text-center">
            <h1 className="text-2xl font-bold mb-1.5" style={{ letterSpacing: '-0.03em' }}>Welcome back</h1>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Sign in to continue building</p>
          </div>

          <div className="rounded-[var(--radius-lg)] p-7" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-default)' }}>
            <form onSubmit={handleSubmit} className="space-y-4">
              {errors.general && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                  className="rounded-[8px] px-3 py-2.5" style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)' }}>
                  <p className="text-sm" style={{ color: '#fca5a5' }}>{errors.general}</p>
                </motion.div>
              )}

              <div>
                <label className="label">Email address</label>
                <input type="email" name="email" value={form.email} onChange={handleChange}
                  placeholder="you@example.com" className="input" required autoFocus />
                {errors.email && <p className="error-text">{errors.email}</p>}
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="label mb-0">Password</label>
                  <Link to="/forgot-password" className="text-xs transition-colors" style={{ color: 'var(--text-muted)' }}
                    onMouseEnter={e => e.target.style.color = 'var(--accent)'}
                    onMouseLeave={e => e.target.style.color = 'var(--text-muted)'}>
                    Forgot?
                  </Link>
                </div>
                <input type="password" name="password" value={form.password} onChange={handleChange}
                  placeholder="••••••••" className="input" required />
                {errors.password && <p className="error-text">{errors.password}</p>}
              </div>

              <Button type="submit" loading={loading} className="w-full justify-center mt-1" style={{ paddingTop: 10, paddingBottom: 10 }}>
                Sign in <ArrowRight size={14} />
              </Button>
            </form>
          </div>

          <p className="text-center mt-5 text-sm" style={{ color: 'var(--text-muted)' }}>
            New here?{' '}
            <Link to="/register" className="transition-colors"
              style={{ color: 'var(--text-secondary)' }}
              onMouseEnter={e => e.target.style.color = 'var(--accent)'}
              onMouseLeave={e => e.target.style.color = 'var(--text-secondary)'}>
              Create an account
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
