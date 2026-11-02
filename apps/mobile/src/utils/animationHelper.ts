import { Platform } from 'react-native';

/**
 * Native animated driver is supported on iOS and Android.
 * On React Native Web, using native driver logs RCTAnimation missing warnings,
 * so we fall back to false cleanly on web while keeping 60FPS native drivers on mobile devices.
 */
export const useNativeDriver = Platform.OS !== 'web';
