import { Dimensions, PixelRatio } from 'react-native';

// ─── Screen metrics ────────────────────────────────────────────────────────────
const { width: W, height: H } = Dimensions.get('window');
const BASE_W = 390;   // iPhone 14 / Pixel 7 — our design reference
const BASE_H = 844;

export const SCREEN_W  = W;
export const SCREEN_H  = H;
export const isTablet  = W >= 600;
export const isSmall   = W < 360;   // small Android (Galaxy A)

// Horizontal scale — used for widths, padding, icon sizes
// Capped at 1.35× so tablets don't blow up
const hFactor = Math.min(W / BASE_W, isTablet ? 1.35 : 1.15);

// Font scale — gentler (factor 0.35) so text grows slowly
const fFactor = 1 + (hFactor - 1) * 0.35;

export function scale(n: number): number {
  return Math.round(n * hFactor);
}

// Moderate scale — used for typography
export function ms(n: number): number {
  return Math.round(n * fFactor);
}

// ─── Color palette matching web design system ────────────────────────────────
export const lightColors = {
  bg:             '#FAFAFE',
  bgElevated:     '#FFFFFF',
  surface:        '#FFFFFF',
  surfaceAlt:     '#F3F4FA',
  surfaceElevated:'#EAECF5',
  border:         '#E5E7F0',
  borderSubtle:   '#EEF0F8',
  textPrimary:    '#1A1E36',
  textSecondary:  '#5A6177',
  textMuted:      '#8C92A8',
  valid:          '#0E8F73',
  expiring:       '#B45309',
  expired:        '#DC2626',
  accent:         '#7033E0',
  accentDim:      '#EDE8FC',
  accentFg:       '#FFFFFF',
  mint:           '#18BFA7',
  mintDim:        '#DFF9F4',
  ink:            '#1A1830',
  white:          '#FFFFFF',
  black:          '#000000',
};

export const darkColors = {
  bg:             '#191826',
  bgElevated:     '#1F2134',
  surface:        '#1F2134',
  surfaceAlt:     '#262840',
  surfaceElevated:'#31344E',
  border:         '#FFFFFF1F',
  borderSubtle:   '#FFFFFF14',
  textPrimary:    '#F8F9FF',
  textSecondary:  '#B0B4CC',
  textMuted:      '#787D96',
  valid:          '#2DD4B0',
  expiring:       '#F59E0B',
  expired:        '#F87171',
  accent:         '#9B7FFF',
  accentDim:      '#302454',
  accentFg:       '#191826',
  mint:           '#35D3BE',
  mintDim:        '#193E3E',
  ink:            '#F8F9FF',
  white:          '#FFFFFF',
  black:          '#000000',
};

export type AppColors = typeof darkColors;

// ─── Spacing (scales with screen width) ───────────────────────────────────────
export const spacing = {
  xs:  scale(4),
  sm:  scale(8),
  md:  scale(16),
  lg:  scale(24),
  xl:  scale(32),
  xxl: scale(48),
};

// ─── Typography (gentle moderate scaling) ─────────────────────────────────────
export const typography = {
  xs:   ms(11),
  sm:   ms(13),
  base: ms(15),
  md:   ms(17),
  lg:   ms(20),
  xl:   ms(24),
  xxl:  ms(30),
  xxxl: ms(38),
};

// ─── Border radius ─────────────────────────────────────────────────────────────
export const radius = {
  xs:   scale(6),
  sm:   scale(8),
  md:   scale(12),
  lg:   scale(16),
  xl:   scale(20),
  xxl:  scale(28),
  full: 9999,
};

// ─── Tab bar height helper ─────────────────────────────────────────────────────
// Screens add this to their scroll padding so content clears the tab bar.
// The actual bar is 64 dp; add lg for a comfortable gap.
export const TAB_BAR_H = scale(64) + spacing.lg;

// ─── Shadows ──────────────────────────────────────────────────────────────────
export const shadow = {
  soft: {
    shadowColor: '#1A1830',
    shadowOpacity: 0.07,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  elegant: {
    shadowColor: '#7033E0',
    shadowOpacity: 0.28,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 14 },
    elevation: 6,
  },
  card: {
    shadowColor: '#1A1830',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
};

// ─── Status badge helper ───────────────────────────────────────────────────────
export type StatusTone = { bg: string; fg: string };

export function statusStyle(status: string, colors: AppColors): StatusTone {
  switch (status) {
    case 'approved':
    case 'active':
      return { bg: colors.valid + '22', fg: colors.valid };
    case 'reimbursed':
    case 'completed':
      return { bg: colors.mint + '22', fg: colors.mint };
    case 'submitted':
      return { bg: colors.expiring + '22', fg: colors.expiring };
    case 'draft':
      return { bg: colors.expiring + '18', fg: colors.expiring };
    case 'rejected':
      return { bg: colors.expired + '22', fg: colors.expired };
    case 'archived':
      return { bg: colors.textMuted + '18', fg: colors.textMuted };
    default:
      return { bg: colors.accent + '18', fg: colors.accent };
  }
}
