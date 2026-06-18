import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, ArrowRight, ArrowLeft } from 'lucide-react';
import Button from '../components/ui/Button';
import toast from 'react-hot-toast';
import api from '../api/axios';

const PROGRAMS = [
  { id: 1, label: 'BSCS — Computer Science' },
  { id: 2, label: 'BSSE — Software Engineering' },
  { id: 3, label: 'BS-AI — Artificial Intelligence' },
  { id: 4, label: 'BS-DS — Data Science' },
  { id: 5, label: 'BS-Cyber — Cybersecurity' },
];

const INTERESTS = [
  { id: 1, label: 'Web Development' },    { id: 2, label: 'Mobile Development' },
  { id: 3, label: 'AI / Machine Learning' }, { id: 4, label: 'Data Science' },
  { id: 5, label: 'Cybersecurity' },      { id: 6, label: 'DevOps / Cloud' },
  { id: 7, label: 'Game Development' },   { id: 8, label: 'Embedded Systems' },
  { id: 9, label: 'UI/UX Design' },       { id: 10, label: 'Freelancing' },
];

export default function RegisterPage() {
  const [step,    setStep]    = useState(1);
  const [form,    setForm]    = useState({ fullName: '', email: '', username: '', password: '', programId: '', currentSemester: '', careerInterestId: '' });
  const [errors,  setErrors]  = useState({});
  const [loading, setLoading] = useState(false);
  const [done,    setDone]    = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setErrors({ ...errors, [e.target.name]: '' });
  };

  const validateStep1 = () => {
    const errs = {};
    if (!form.fullName.trim())    errs.fullName = 'Full name is required.';
    if (!form.email.trim())       errs.email    = 'Email is required.';
    if (!form.username.trim())    errs.username = 'Username is required.';
    if (!/^[a-z0-9_]{3,50}$/.test(form.username)) errs.username = 'Lowercase letters, numbers, underscores only.';
    if (!form.password)           errs.password = 'Password is required.';
    if (form.password.length < 8) errs.password = 'At least 8 characters.';
    if (!/[A-Z]/.test(form.password)) errs.password = 'Must contain an uppercase letter.';
    if (!/[0-9]/.test(form.password)) errs.password = 'Must contain a number.';
    return errs;
  };

  const handleNext = (e) => {
    e.preventDefault();
    const errs = validateStep1();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setStep(2);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/auth/register', {
        fullName: form.fullName, email: form.email, username: form.username.toLowerCase(), password: form.password,
        programId:        form.programId        ? parseInt(form.programId)        : undefined,
        currentSemester:  form.currentSemester  ? parseInt(form.currentSemester)  : undefined,
        careerInterestId: form.careerInterestId ? parseInt(form.careerInterestId) : undefined,
      });
      setDone(true);
    } catch (err) {
      const data = err.response?.data;
      if (data?.details) { setErrors(data.details); if (data.details.email || data.details.username) setStep(1); }
      else toast.error(data?.message || 'Registration failed.');
    } finally { setLoading(false); }
  };

  const topBar = (
    <div className="px-8 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
      <Link to="/" className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-[8px] flex items-center justify-center" style={{ background: 'var(--accent)' }}>
          <span className="text-white font-black text-xs">B</span>
        </div>
        <span className="font-bold text-base" style={{ letterSpacing: '-0.02em' }}>
          Build<span style={{ color: 'var(--accent)' }}>IMS</span>
        </span>
      </Link>
      <Link to="/login" className="text-sm" style={{ color: 'var(--text-muted)' }}>
        Have an account? <span style={{ color: 'var(--accent)' }}>Sign in</span>
      </Link>
    </div>
  );

  if (done) return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg-base)' }}>
      {topBar}
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.4 }}
          className="w-full max-w-sm text-center rounded-[var(--radius-lg)] p-10"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border-default)' }}>
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.15, type: 'spring', bounce: 0.4 }}
            className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-5"
            style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.25)' }}>
            <CheckCircle2 size={26} color="#4ade80" strokeWidth={2} />
          </motion.div>
          <h1 className="text-2xl font-bold mb-2" style={{ letterSpacing: '-0.03em' }}>Check your email</h1>
          <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            Verification link sent to{' '}
            <span style={{ color: 'var(--text-primary)' }}>{form.email}</span>
          </p>
          <Link to="/login" className="btn-primary inline-flex">Go to login <ArrowRight size={14} /></Link>
        </motion.div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg-base)' }}>
      {topBar}
      <div className="flex-1 flex items-center justify-center px-4 py-10">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-[420px]">
          <div className="mb-6 text-center">
            <h1 className="text-2xl font-bold mb-1.5" style={{ letterSpacing: '-0.03em' }}>
              {step === 1 ? 'Create your account' : 'One more thing'}
            </h1>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              {step === 1 ? 'Join the IMSciences developer community' : 'Help us personalise your experience'}
            </p>
          </div>

          {/* Step indicator */}
          <div className="flex gap-2 mb-6">
            {[1, 2].map((s) => (
              <div key={s} className="h-0.5 flex-1 rounded-full transition-all duration-500"
                style={{ background: step >= s ? 'var(--accent)' : 'var(--border-subtle)' }} />
            ))}
          </div>

          <div className="rounded-[var(--radius-lg)] p-7" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-default)' }}>
            <AnimatePresence mode="wait">
              {step === 1 ? (
                <motion.form key="step1"
                  initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 12 }} transition={{ duration: 0.25 }}
                  onSubmit={handleNext} className="space-y-4">
                  <div>
                    <label className="label">Full Name</label>
                    <input name="fullName" value={form.fullName} onChange={handleChange} placeholder="Ali Hassan" className="input" autoFocus />
                    {errors.fullName && <p className="error-text">{errors.fullName}</p>}
                  </div>
                  <div>
                    <label className="label">Email</label>
                    <input type="email" name="email" value={form.email} onChange={handleChange} placeholder="you@example.com" className="input" />
                    {errors.email && <p className="error-text">{errors.email}</p>}
                  </div>
                  <div>
                    <label className="label">Username</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: 'var(--text-muted)' }}>@</span>
                      <input name="username" value={form.username} onChange={handleChange} placeholder="ali_dev" className="input pl-7" />
                    </div>
                    {errors.username && <p className="error-text">{errors.username}</p>}
                  </div>
                  <div>
                    <label className="label">Password</label>
                    <input type="password" name="password" value={form.password} onChange={handleChange} placeholder="Min 8 chars, 1 uppercase, 1 number" className="input" />
                    {errors.password && <p className="error-text">{errors.password}</p>}
                  </div>
                  <Button type="submit" className="w-full justify-center mt-1" style={{ paddingTop: 10, paddingBottom: 10 }}>
                    Continue <ArrowRight size={14} />
                  </Button>
                </motion.form>
              ) : (
                <motion.form key="step2"
                  initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} transition={{ duration: 0.25 }}
                  onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="label">Program</label>
                    <select name="programId" value={form.programId} onChange={handleChange} className="input">
                      <option value="">Select your program</option>
                      {PROGRAMS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="label">Current Semester</label>
                    <select name="currentSemester" value={form.currentSemester} onChange={handleChange} className="input">
                      <option value="">Select semester</option>
                      {[1,2,3,4,5,6,7,8].map((s) => <option key={s} value={s}>Semester {s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="label">Career Interest</label>
                    <select name="careerInterestId" value={form.careerInterestId} onChange={handleChange} className="input">
                      <option value="">What do you want to build?</option>
                      {INTERESTS.map((i) => <option key={i.id} value={i.id}>{i.label}</option>)}
                    </select>
                  </div>
                  <p className="text-xs text-center" style={{ color: 'var(--text-muted)' }}>
                    All fields optional — you can fill them in later
                  </p>
                  <div className="flex gap-2">
                    <Button type="button" variant="secondary" onClick={() => setStep(1)} className="flex-1 justify-center">
                      <ArrowLeft size={14} /> Back
                    </Button>
                    <Button type="submit" loading={loading} className="flex-1 justify-center" style={{ paddingTop: 10, paddingBottom: 10 }}>
                      Create Account
                    </Button>
                  </div>
                </motion.form>
              )}
            </AnimatePresence>
          </div>

          {step === 1 && (
            <p className="text-center mt-5 text-sm" style={{ color: 'var(--text-muted)' }}>
              Already have an account?{' '}
              <Link to="/login" className="transition-colors"
                style={{ color: 'var(--text-secondary)' }}
                onMouseEnter={e => e.target.style.color = 'var(--accent)'}
                onMouseLeave={e => e.target.style.color = 'var(--text-secondary)'}>
                Sign in
              </Link>
            </p>
          )}
        </motion.div>
      </div>
    </div>
  );
}
