import { Tabs } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { CameraIcon, DollarIcon, FileTextIcon, HomeIcon, PlaneIcon } from '../../components/Icon';
import { useTheme } from '../../context/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { radius, scale, shadow } from '../../constants/theme';

const MAX_TAB_WIDTH = 560;

function CaptureTabIcon({ color, focused }: { color: string; focused: boolean }) {
  const { colors } = useTheme();
  return (
    <View style={[
      styles.captureIcon,
      { backgroundColor: focused ? colors.accent : colors.ink },
      focused && shadow.elegant,
    ]}>
      <CameraIcon color={colors.bgElevated} size={20} />
    </View>
  );
}

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          borderTopWidth: 0,
          height: scale(64) + insets.bottom,
          paddingTop: scale(8),
          paddingBottom: insets.bottom || scale(10),
          paddingHorizontal: scale(6),
          elevation: 0,
          maxWidth: MAX_TAB_WIDTH,
          alignSelf: 'center',
          width: '100%',
        },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: styles.tabLabel,
        tabBarItemStyle: styles.tabItem,
        tabBarActiveBackgroundColor: colors.accentDim,
        tabBarBackground: () => (
          <View style={[styles.tabBarBg, { backgroundColor: colors.bgElevated, borderTopColor: colors.border }]} />
        ),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => <HomeIcon color={color} size={size - 2} />,
        }}
      />
      <Tabs.Screen
        name="trips"
        options={{
          title: 'Trips',
          tabBarIcon: ({ color, size }) => <PlaneIcon color={color} size={size - 2} />,
        }}
      />
      <Tabs.Screen
        name="scan"
        options={{
          title: '',
          tabBarIcon: ({ color, focused }) => <CaptureTabIcon color={color} focused={focused} />,
          tabBarItemStyle: styles.captureTabItem,
          tabBarActiveBackgroundColor: 'transparent',
        }}
      />
      <Tabs.Screen
        name="expenses"
        options={{
          title: 'Expenses',
          tabBarIcon: ({ color, size }) => <DollarIcon color={color} size={size - 2} />,
        }}
      />
      <Tabs.Screen
        name="documents"
        options={{
          title: 'Docs',
          tabBarIcon: ({ color, size }) => <FileTextIcon color={color} size={size - 2} />,
        }}
      />
      <Tabs.Screen name="settings" options={{ href: null }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBarBg: {
    flex: 1,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  tabItem: {
    marginHorizontal: 2,
    borderRadius: radius.md,
  },
  tabLabel: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 11,
    letterSpacing: 0,
  },
  captureTabItem: {
    marginHorizontal: 2,
    borderRadius: radius.full,
  },
  captureIcon: {
    width: scale(48),
    height: scale(48),
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: scale(4),
  },
});
