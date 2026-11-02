import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useThemeStore } from '../../src/store/useThemeStore';
import { useCreateSheetStore } from '../../src/store/useCreateSheetStore';
import { AnimatedTabBarButton } from '../../src/components/navigation/AnimatedTabBarButton';
import { CreateBottomSheetModal } from '../../src/components/navigation/CreateBottomSheetModal';

export default function TabLayout() {
  const { colors } = useThemeStore();
  const insets = useSafeAreaInsets();
  const openCreateSheet = useCreateSheetStore((s) => s.open);

  // Responsive safe-area bottom padding
  const bottomPadding = insets.bottom > 0 ? insets.bottom : 8;
  const tabHeight = 58 + bottomPadding;

  return (
    <View style={styles.rootContainer}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarButton: (props) => <AnimatedTabBarButton {...props} />,
          tabBarStyle: {
            backgroundColor: colors.background,
            borderTopColor: colors.border,
            borderTopWidth: 1,
            height: tabHeight,
            paddingBottom: bottomPadding,
            paddingTop: 6,
          },
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.textSecondary,
          tabBarLabelStyle: {
            fontSize: 10.5,
            fontWeight: '600',
            marginTop: 2,
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Feed',
            tabBarIcon: ({ color, focused }) => (
              <Ionicons
                name={focused ? 'sparkles' : 'sparkles-outline'}
                size={23}
                color={String(color || colors.primary)}
              />
            ),
          }}
        />

        <Tabs.Screen
          name="reels"
          options={{
            title: 'Reels',
            tabBarStyle: {
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(8, 6, 13, 0.45)',
              borderTopWidth: 0,
              elevation: 0,
              height: tabHeight,
              paddingBottom: bottomPadding,
              paddingTop: 6,
            },
            tabBarIcon: ({ color, focused }) => (
              <Ionicons
                name={focused ? 'play-circle' : 'play-circle-outline'}
                size={25}
                color={String(color || colors.primary)}
              />
            ),
          }}
        />

        {/* Floating Circular Purple-Pink Gradient Create (+) Button */}
        <Tabs.Screen
          name="create"
          options={{
            title: '',
            tabBarIcon: () => (
              <View style={styles.floatingCreateWrapper}>
                <LinearGradient
                  colors={colors.gradientPrimary}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[
                    styles.floatingCreateButton,
                    {
                      shadowColor: colors.primary,
                    },
                  ]}
                >
                  <Ionicons name="add" size={26} color="#FFFFFF" />
                </LinearGradient>
              </View>
            ),
          }}
          listeners={{
            tabPress: (e) => {
              e.preventDefault();
              openCreateSheet();
            },
          }}
        />

        <Tabs.Screen
          name="chats"
          options={{
            title: 'Chats',
            tabBarIcon: ({ color, focused }) => (
              <Ionicons
                name={focused ? 'chatbubbles' : 'chatbubbles-outline'}
                size={23}
                color={String(color || colors.primary)}
              />
            ),
          }}
        />

        <Tabs.Screen
          name="profile"
          options={{
            title: 'Profile',
            tabBarIcon: ({ color, focused }) => (
              <Ionicons
                name={focused ? 'person' : 'person-outline'}
                size={23}
                color={String(color || colors.primary)}
              />
            ),
          }}
        />
      </Tabs>

      {/* Instagram-Style Create Bottom Sheet Modal */}
      <CreateBottomSheetModal />
    </View>
  );
}

const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
  },
  floatingCreateWrapper: {
    top: -12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  floatingCreateButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.45,
        shadowRadius: 10,
      },
      android: {
        elevation: 8,
      },
      web: {
        boxShadow: '0 4px 16px rgba(160, 32, 240, 0.45)',
      } as any,
    }),
  },
});
