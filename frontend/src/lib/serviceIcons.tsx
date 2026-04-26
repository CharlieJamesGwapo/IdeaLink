import {
  BookOpen, FileText, Award, Shield, CreditCard, Shuffle, HelpCircle,
  DollarSign, GraduationCap, Receipt, RotateCcw, AlertTriangle,
  Building2, Calculator, Star, CheckCircle2, Tag, Mail, User, Settings,
} from 'lucide-react'
import type { ComponentType } from 'react'

// 20 curated Lucide icons available in the admin Services catalog picker.
// Order is the order shown in the icon-picker grid (5 cols × 4 rows).
export const ICON_CHOICES = [
  'BookOpen', 'FileText', 'Award', 'Shield', 'CreditCard',
  'Shuffle', 'HelpCircle', 'DollarSign', 'GraduationCap', 'Receipt',
  'RotateCcw', 'AlertTriangle', 'Building2', 'Calculator', 'Star',
  'CheckCircle2', 'Tag', 'Mail', 'User', 'Settings',
] as const

export type IconName = (typeof ICON_CHOICES)[number]

const MAP: Record<IconName, ComponentType<{ size?: number; className?: string }>> = {
  BookOpen, FileText, Award, Shield, CreditCard, Shuffle, HelpCircle,
  DollarSign, GraduationCap, Receipt, RotateCcw, AlertTriangle,
  Building2, Calculator, Star, CheckCircle2, Tag, Mail, User, Settings,
}

interface Props {
  name: string
  size?: number
  className?: string
}

// Renders a curated Lucide icon by its registry name. Falls back to
// HelpCircle for unknown names so legacy/typoed data never crashes the UI.
export function ServiceIcon({ name, size = 16, className }: Props) {
  const Cmp = MAP[name as IconName] ?? HelpCircle
  return <Cmp size={size} className={className} />
}
