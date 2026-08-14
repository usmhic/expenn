import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FileTextIcon, LogOutIcon, MoonIcon, PlaneIcon, SunIcon } from '../../components/Icon';
import { radius, scale, shadow, spacing, TAB_BAR_H, typography } from '../../constants/theme';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { auth } from '../../lib/api';

type Me = Awaited<ReturnType<typeof auth.me>>;

export default function SettingsScreen() {
  const { colors, isDark, toggleTheme } = useTheme();
  const { user, session, signOut } = useAuth();
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session) { setLoading(false); return; }
    auth.me()
      .then(setMe)
      .catch(() => null)
      .finally(() => setLoading(false));
  }, [session?.access_token]);

  async function handleSignOut() {
    await signOut();
    router.replace('/login');
  }

  const displayName = me?.name ?? user?.name ?? 'Traveler';
  const displayEmail = me?.email ?? user?.email ?? '';
  const workspaceName = me?.activeOrganizationName ?? user?.workspace?.name ?? 'Workspace';
  const initial = displayName.slice(0, 1).toUpperCase();
  const role = user?.role ?? 'traveler';
  const roleLabel = role === 'owner' || role === 'admin'
    ? 'Admin — full workspace access'
    : role === 'manager'
    ? 'Manager — trips, approvals & team'
    : 'Member — trips & expenses';

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: colors.bg }]} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>

        <View>
          <Text style={[s.eyebrow, { color: colors.accent }]}>{workspaceName}</Text>
          <Text style={[s.title, { color: colors.textPrimary }]}>Profile</Text>
          <Text style={[s.subtitle, { color: colors.textSecondary }]}>Your account, preferences, and workspace info.</Text>
        </View>

        {/* Profile card */}
        <View style={[s.profileCard, { backgroundColor: colors.surface, borderColor: colors.border }, shadow.soft]}>
          <View style={[s.avatar, { backgroundColor: colors.ink }]}>
            <Text style={[s.avatarText, { color: colors.bgElevated }]}>{initial}</Text>
          </View>
          <View style={s.profileInfo}>
            <Text style={[s.profileName, { color: colors.textPrimary }]}>{displayName}</Text>
            {!!displayEmail && <Text style={[s.profileEmail, { color: colors.textSecondary }]}>{displayEmail}</Text>}
          </View>
          {loading && <ActivityIndicator color={colors.accent} size="small" />}
        </View>

        {/* Info rows */}
        <View style={[s.section, { backgroundColor: colors.surface, borderColor: colors.border }, shadow.soft]}>
          <Row
            colors={colors}
            icon={<PlaneIcon color={colors.accent} size={17} />}
            label="Workspace"
            value={workspaceName}
          />
          <Divider colors={colors} />
          <Row
            colors={colors}
            icon={<FileTextIcon color={colors.accent} size={17} />}
            label="Role"
            value={roleLabel}
          />
          <Divider colors={colors} />
          <Row
            colors={colors}
            icon={isDark ? <MoonIcon color={colors.accent} size={17} /> : <SunIcon color={colors.accent} size={17} />}
            label="Dark mode"
            value={isDark ? 'On' : 'Off'}
            right={
              <Switch
                value={isDark}
                onValueChange={toggleTheme}
                trackColor={{ true: colors.accent, false: colors.border }}
                thumbColor={colors.white}
              />
            }
          />
        </View>

        <TouchableOpacity
          style={[s.signOut, { backgroundColor: colors.expired + '14', borderColor: colors.expired + '30' }]}
          onPress={handleSignOut}
        >
          <LogOutIcon color={colors.expired} size={17} />
          <Text style={[s.signOutText, { color: colors.expired }]}>Sign out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({
  colors, icon, label, value, right,
}: {
  colors: ReturnType<typeof useTheme>['colors'];
  icon: React.ReactNode;
  label: string;
  value: string;
  right?: React.ReactNode;
}) {
  return (
    <View style={s.row}>
      <View style={[s.rowIcon, { backgroundColor: colors.accentDim }]}>{icon}</View>
      <View style={s.rowContent}>
        <Text style={[s.rowLabel, { color: colors.textPrimary }]}>{label}</Text>
        <Text style={[s.rowValue, { color: colors.textSecondary }]}>{value}</Text>
      </View>
      {right}
    </View>
  );
}

function Divider({ colors }: { colors: ReturnType<typeof useTheme>['colors'] }) {
  return <View style={[s.divider, { backgroundColor: colors.borderSubtle }]} />;
}

const s = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: spacing.lg, paddingBottom: TAB_BAR_H, gap: spacing.md },

  eyebrow: { fontFamily: 'Inter-Bold', fontSize: typography.xs, textTransform: 'uppercase', letterSpacing: 0.5 },
  title: { marginTop: 3, fontFamily: 'Inter-Bold', fontSize: typography.xxl },
  subtitle: { marginTop: 4, fontFamily: 'Inter-Regular', fontSize: typography.sm },

  profileCard: { borderWidth: 1, borderRadius: radius.xl, padding: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  avatar: { width: scale(52), height: scale(52), borderRadius: radius.full, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontFamily: 'Inter-Bold', fontSize: typography.lg },
  profileInfo: { flex: 1 },
  profileName: { fontFamily: 'Inter-Bold', fontSize: typography.md },
  profileEmail: { marginTop: 2, fontFamily: 'Inter-Regular', fontSize: typography.sm },

  section: { borderWidth: 1, borderRadius: radius.xl, paddingHorizontal: spacing.md },
  row: { minHeight: scale(64), flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  rowIcon: { width: scale(36), height: scale(36), borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  rowContent: { flex: 1 },
  rowLabel: { fontFamily: 'Inter-SemiBold', fontSize: typography.base },
  rowValue: { marginTop: 2, fontFamily: 'Inter-Regular', fontSize: typography.sm },
  divider: { height: StyleSheet.hairlineWidth, marginLeft: 52 },

  signOut: { borderWidth: 1, borderRadius: radius.xl, minHeight: scale(52), flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  signOutText: { fontFamily: 'Inter-Bold', fontSize: typography.base },
});
