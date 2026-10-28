export interface ThemeColors {
  primary: string;
  primaryLight: string;
  primaryDark: string;
  secondary: string;
  accent: string;

  background: string;
  surface: string;
  surfaceElevated: string;
  card: string;
  border: string;
  divider: string;

  text: string;
  textSecondary: string;
  textMuted: string;
  textInverse: string;

  success: string;
  warning: string;
  error: string;
  info: string;

  online: string;
  offline: string;

  gradientPrimary: [string, string];
  gradientDark: [string, string];
  glassOverlay: string;
}

export const darkColors: ThemeColors = {
  primary: '#FF3B30',
  primaryLight: '#FF6B6B',
  primaryDark: '#D32F2F',
  secondary: '#8A2BE2',
  accent: '#00D2FF',

  background: '#090A0F',
  surface: '#12131A',
  surfaceElevated: '#1A1C26',
  card: '#151620',
  border: '#232533',
  divider: '#1E202C',

  text: '#FFFFFF',
  textSecondary: '#A0A3BD',
  textMuted: '#6B6E82',
  textInverse: '#090A0F',

  success: '#00E676',
  warning: '#FFD600',
  error: '#FF1744',
  info: '#2979FF',

  online: '#00E676',
  offline: '#6B6E82',

  gradientPrimary: ['#FF416C', '#FF4B2B'],
  gradientDark: ['#12131A', '#090A0F'],
  glassOverlay: 'rgba(255, 255, 255, 0.05)',
};

export const lightColors: ThemeColors = {
  primary: '#FF3B30',
  primaryLight: '#FF6B6B',
  primaryDark: '#D32F2F',
  secondary: '#7B1FA2',
  accent: '#0288D1',

  background: '#F8F9FD',
  surface: '#FFFFFF',
  surfaceElevated: '#F1F3F9',
  card: '#FFFFFF',
  border: '#E2E6EF',
  divider: '#ECEFF5',

  text: '#11142D',
  textSecondary: '#5A607F',
  textMuted: '#8F95B2',
  textInverse: '#FFFFFF',

  success: '#00C853',
  warning: '#FFAB00',
  error: '#D50000',
  info: '#1976D2',

  online: '#00C853',
  offline: '#8F95B2',

  gradientPrimary: ['#FF416C', '#FF4B2B'],
  gradientDark: ['#FFFFFF', '#F8F9FD'],
  glassOverlay: 'rgba(0, 0, 0, 0.03)',
};

