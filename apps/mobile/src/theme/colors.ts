export interface ThemeColors {
  primary: string;
  primaryLight: string;
  primaryDark: string;
  secondary: string;
  accent: string;

  // Dark-Purple Design Tokens
  primaryPurple: string;
  secondaryPurple: string;
  pinkAccent: string;

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
  gradientAccent: [string, string, string];
  gradientDark: [string, string];
  gradientCard: [string, string];
  glassOverlay: string;
  neonGlow: string;
  neonPinkGlow: string;
}

export const darkColors: ThemeColors = {
  primary: '#A020F0',          // Primary Purple
  primaryLight: '#C026D3',     // Secondary Purple
  primaryDark: '#7B0FBB',      // Deep Purple
  secondary: '#C026D3',        // Magenta / Secondary Purple
  accent: '#F04BBE',           // Pink Accent

  primaryPurple: '#A020F0',
  secondaryPurple: '#C026D3',
  pinkAccent: '#F04BBE',

  background: '#08060D',       // Primary Deep Black Background
  surface: '#15101D',          // Secondary Background
  surfaceElevated: '#21152B',  // Card Background / Elevated Surface
  card: '#21152B',             // Card Background
  border: '#30233B',           // Subtle Dark Purple Border
  divider: 'rgba(240, 75, 190, 0.12)',

  text: '#FFFFFF',             // Primary Text
  textSecondary: '#B7AFC0',     // Secondary Text
  textMuted: '#7E7688',        // Muted Text
  textInverse: '#08060D',

  success: '#00E676',
  warning: '#FFD600',
  error: '#FF2A6D',
  info: '#A020F0',

  online: '#00E676',
  offline: '#7E7688',

  gradientPrimary: ['#A020F0', '#F04BBE'],
  gradientAccent: ['#A020F0', '#C026D3', '#F04BBE'],
  gradientDark: ['#15101D', '#08060D'],
  gradientCard: ['#21152B', '#15101D'],
  glassOverlay: 'rgba(33, 21, 43, 0.75)',
  neonGlow: 'rgba(160, 32, 240, 0.35)',
  neonPinkGlow: 'rgba(240, 75, 190, 0.35)',
};

export const lightColors: ThemeColors = {
  ...darkColors, // Dark-first social platform
};


