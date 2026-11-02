import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFeedStore } from '../../store/useFeedStore';
import { spacing } from '../../theme/spacing';

interface ReelsTopNavProps {
  onOpenCreateReel: () => void;
  onOpenSearch: () => void;
}

export const ReelsTopNav: React.FC<ReelsTopNavProps> = ({
  onOpenCreateReel,
  onOpenSearch,
}) => {
  const insets = useSafeAreaInsets();
  const { reelFeedType, setReelFeedType, reelSearchQuery, setReelSearchQuery } = useFeedStore();
  const [isSearchActive, setIsSearchActive] = useState(false);

  return (
    <View
      style={[
        styles.topNavContainer,
        { paddingTop: Math.max(insets.top, Platform.OS === 'android' ? 12 : 8) },
      ]}
      pointerEvents="box-none"
    >
      {isSearchActive ? (
        /* Inline Search Bar Mode */
        <View style={styles.searchBarRow}>
          <TouchableOpacity
            style={styles.backSearchBtn}
            onPress={() => {
              setIsSearchActive(false);
              setReelSearchQuery('');
            }}
          >
            <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.searchInputContainer}>
            <Ionicons name="search" size={16} color="#8E8E93" style={{ marginRight: 6 }} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search reels or #hashtags..."
              placeholderTextColor="#8E8E93"
              value={reelSearchQuery}
              onChangeText={setReelSearchQuery}
              autoFocus
              autoCorrect={false}
            />
            {reelSearchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setReelSearchQuery('')}>
                <Ionicons name="close-circle" size={16} color="#8E8E93" />
              </TouchableOpacity>
            )}
          </View>
        </View>
      ) : (
        /* Standard Instagram Reels Top Navigation Overlay */
        <View style={styles.standardNavRow}>
          {/* Left: Reels Title / Brand */}
          <View style={styles.leftSection}>
            <Text style={styles.reelsBrandTitle}>Reels</Text>
          </View>

          {/* Center: "For You" & "Following" Tabs */}
          <View style={styles.centerSection}>
            <TouchableOpacity
              onPress={() => setReelFeedType('for_you')}
              style={styles.tabBtn}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text
                style={[
                  styles.tabText,
                  reelFeedType === 'for_you' && styles.tabTextActive,
                ]}
              >
                For You
              </Text>
              {reelFeedType === 'for_you' && <View style={styles.activeTabIndicator} />}
            </TouchableOpacity>

            <View style={styles.tabDivider} />

            <TouchableOpacity
              onPress={() => setReelFeedType('following')}
              style={styles.tabBtn}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text
                style={[
                  styles.tabText,
                  reelFeedType === 'following' && styles.tabTextActive,
                ]}
              >
                Following
              </Text>
              {reelFeedType === 'following' && <View style={styles.activeTabIndicator} />}
            </TouchableOpacity>
          </View>

          {/* Right: Search & Camera / Create Reel Icons */}
          <View style={styles.rightSection}>
            <TouchableOpacity
              style={styles.navIconBtn}
              onPress={() => setIsSearchActive(true)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="search" size={23} color="#FFFFFF" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.navIconBtn}
              onPress={onOpenCreateReel}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="camera-outline" size={26} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  topNavContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 40,
    paddingHorizontal: spacing.md,
    paddingBottom: 8,
  },
  standardNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 44,
  },
  leftSection: {
    flex: 1,
    alignItems: 'flex-start',
  },
  reelsBrandTitle: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.5,
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  centerSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabBtn: {
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    position: 'relative',
  },
  tabText: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 14.5,
    fontWeight: '600',
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  tabTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  activeTabIndicator: {
    position: 'absolute',
    bottom: -2,
    width: 20,
    height: 2.5,
    borderRadius: 1.5,
    backgroundColor: '#A020F0',
  },
  tabDivider: {
    width: 1,
    height: 12,
    backgroundColor: 'rgba(255,255,255,0.3)',
    marginHorizontal: 4,
  },
  rightSection: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 12,
  },
  navIconBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 4,
  },
  searchBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 44,
  },
  backSearchBtn: {
    padding: 6,
    marginRight: 6,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(26, 26, 36, 0.92)',
    borderRadius: 18,
    paddingHorizontal: 12,
    height: 36,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  searchInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 13,
  },
});

