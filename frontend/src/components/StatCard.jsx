import { motion } from 'framer-motion';

export default function StatCard({ label, value, sub, icon, accent }) {
  return (
    <motion.div
      whileHover={{ y: -2 }}
      transition={{ duration: 0.2 }}
      className="rounded-2xl p-4 text-center relative overflow-hidden"
      style={{
        background: 'rgba(255,255,255,0.04)',
        backdropFilter: 'blur(12px)',
        border: '1px solid rgba(255,255,255,0.07)',
        boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
      }}
    >
      {accent && (
        <div className="absolute inset-0 opacity-30"
          style={{ background: 'radial-gradient(circle at 50% 0%, rgba(255,77,0,0.3) 0%, transparent 70%)' }} />
      )}
      {icon && <p className="text-2xl mb-1.5 relative z-10">{icon}</p>}
      <p className="text-2xl font-bold relative z-10"
        style={{ fontFamily: 'Syne, sans-serif', color: accent ? '#FF7340' : 'white', letterSpacing: '-0.03em' }}>
        {value ?? '—'}
      </p>
      <p className="text-xs mt-1 relative z-10" style={{ color: 'rgba(255,255,255,0.4)', fontFamily: 'DM Sans, sans-serif' }}>
        {label}
      </p>
      {sub && (
        <p className="text-xs mt-0.5 relative z-10" style={{ color: 'rgba(255,255,255,0.2)', fontFamily: 'DM Sans, sans-serif' }}>
          {sub}
        </p>
      )}
    </motion.div>
  );
}