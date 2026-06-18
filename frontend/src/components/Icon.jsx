import * as LucideIcons from 'lucide-react';

export default function Icon({ name, size = 16, color, className, strokeWidth = 1.5 }) {
  const LucideIcon = LucideIcons[name];
  if (!LucideIcon) return null;
  return <LucideIcon size={size} color={color} className={className} strokeWidth={strokeWidth} />;
}
