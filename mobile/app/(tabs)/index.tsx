import { useEffect, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  AlertCircleIcon, CameraIcon, ChevronRightIcon, FileTextIcon,
  MapPinIcon, PlaneIcon, ReceiptIcon, SendIcon, UserIcon, ZapIcon,
} from '../../components/Icon';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { trips as tripsApi, expenses as expensesApi } from '../../lib/api';
import { radius, scale, shadow, spacing, statusStyle, TAB_BAR_H, typography } from '../../constants/theme';

type Trip = Awaited<ReturnType<typeof tripsApi.list>>[number];
type Expense = Awaited<ReturnType<typeof expensesApi.list>>[number];

function fmtDate(value: Date | string) {
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' }).format(new Date(value));
}

function tripCompletion(startDate: Date | string, endDate: Date | string) {
  const start = new Date(startDate).getTime();
  const end = new Date(endDate).getTime();
  if (end <= start) return 100;
  return Math.max(0, Math.min(100, Math.round(((Date.now() - start) / (end - start)) * 100)));
}

export default function TravelerHome() {
  const { colors } = useTheme();
  const { user, session } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [trips, setTrips] = useState<Trip[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);

  async function load() {
    if (!session) { router.replace('/login'); return; }
    setError('');
    try {
      const [tripRows, expenseRows] = await Promise.all([
        tripsApi.list(),
        expensesApi.list({ mine: true }),
      ]);
      setTrips(tripRows);
      setExpenses(expenseRows);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load traveler data.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => { load(); }, [session?.access_token]);

  const activeTrip = trips.find((t) => t.status === 'active') ?? trips[0];
  const missingReceipts = expenses.filter((e) => !e.receiptFileUrl).length;
  const recentExpenses = expenses.slice(0, 4);
  const recentTotal = recentExpenses.reduce((sum, e) => sum + Number(e.amount), 0);
  const submitted = expenses.filter((e) => e.status === 'submitted').length;
  const approved = expenses.filter((e) => e.status === 'approved' || e.status === 'reimbursed').length;
  const currency = expenses[0]?.currency ?? activeTrip?.currency ?? 'USD';
  const tripProgress = activeTrip ? tripCompletion(activeTrip.startDate, activeTrip.endDate) : 0;
  const firstName = user?.name?.split(' ')[0] ?? 'traveler';

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: colors.bg }]} edges={['top']}>
      <ScrollView
        contentContainerStyle={s.scroll}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.accent} />
        }
      >
        {/* Header */}
        <View style={s.header}>
          <View>
            <Text style={[s.eyebrow, { color: colors.textMuted }]}>
              {user?.workspace?.name ?? 'Workspace'}
            </Text>
            <Text style={[s.title, { color: colors.textPrimary }]}>Hi, {firstName}</Text>
          </View>
          <TouchableOpacity
            style={[s.avatarBtn, { backgroundColor: colors.accentDim }]}
            onPress={() => router.push('/(tabs)/settings')}
          >
            <Text style={[s.avatarText, { color: colors.accent }]}>
              {(user?.name ?? 'T').slice(0, 1).toUpperCase()}
            </Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={s.loading}><ActivityIndicator color={colors.accent} size="large" /></View>
        ) : (
          <>
            {!!error && (
              <View style={[s.notice, { backgroundColor: colors.expired + '16', borderColor: colors.expired + '35' }]}>
                <AlertCircleIcon color={colors.expired} size={16} />
                <Text style={[s.noticeText, { color: colors.expired }]}>{error}</Text>
              </View>
            )}

            {/* Missing receipts alert */}
            {missingReceipts > 0 && (
              <TouchableOpacity
                style={[s.notice, { backgroundColor: colors.expiring + '16', borderColor: colors.expiring + '35' }]}
                onPress={() => router.push('/(tabs)/expenses')}
              >
                <AlertCircleIcon color={colors.expiring} size={16} />
                <Text style={[s.noticeText, { color: colors.textPrimary }]} numberOfLines={1}>
                  {missingReceipts} expense{missingReceipts === 1 ? '' : 's'} missing receipts
                </Text>
                <Text style={[s.noticeAction, { color: colors.expiring }]}>Review</Text>
              </TouchableOpacity>
            )}

            {/* Hero: current trip — mirrors web's traveler-web-hero */}
            <TouchableOpacity
              style={[s.hero, { backgroundColor: colors.surface, borderColor: colors.accent + '30' }]}
              onPress={() => activeTrip && router.push(`/trips/${activeTrip.id}` as never)}
              activeOpacity={activeTrip ? 0.75 : 1}
            >
              {/* Tinted accent overlay */}
              <View style={[s.heroBg, { backgroundColor: colors.accent + '08' }]} />

              <View style={s.heroTop}>
                <View style={[s.heroIcon, { backgroundColor: colors.accentDim }]}>
                  <MapPinIcon color={colors.accent} size={18} />
                </View>
                <View style={s.heroMeta}>
                  <Text style={[s.heroEyebrow, { color: colors.accent }]}>
                    {activeTrip ? 'Active trip' : 'Ready to go'}
                  </Text>
                  <Text style={[s.heroName, { color: colors.textPrimary }]} numberOfLines={1}>
                    {activeTrip?.name ?? 'No active trip yet'}
                  </Text>
                </View>
                {activeTrip && (
                  <ChevronRightIcon color={colors.textMuted} size={18} />
                )}
              </View>

              {activeTrip ? (
                <>
                  <Text style={[s.heroDetail, { color: colors.textSecondary }]}>
                    {activeTrip.destination} · {fmtDate(activeTrip.startDate)} – {fmtDate(activeTrip.endDate)}
                  </Text>

                  {/* Progress bar */}
                  <View style={[s.progressTrack, { backgroundColor: colors.surfaceAlt }]}>
                    <View style={[s.progressFill, { backgroundColor: colors.accent, width: `${tripProgress}%` as any }]} />
                  </View>
                  <Text style={[s.heroCaption, { color: colors.textMuted }]}>
                    {tripProgress}% of travel window elapsed
                  </Text>

                  {/* Stats row */}
                  <View style={s.heroStats}>
                    <HeroStat colors={colors} label="Approved" value={`${approved}`} tint={colors.valid} />
                    <HeroStat colors={colors} label="Pending" value={`${submitted}`} tint={colors.expiring} />
                    <HeroStat colors={colors} label="Spent" value={`${currency} ${recentTotal.toFixed(0)}`} tint={colors.accent} />
                  </View>
                </>
              ) : (
                <Text style={[s.heroDetail, { color: colors.textSecondary }]}>
                  No active trip. You can still log expenses and link them to a trip later.
                </Text>
              )}
            </TouchableOpacity>

            {/* Action buttons */}
            <View style={s.actions}>
              <TouchableOpacity
                style={[s.primaryAction, { backgroundColor: colors.ink }, shadow.elegant]}
                onPress={() => router.push(activeTrip ? (`/(tabs)/scan?tripId=${activeTrip.id}` as never) : '/(tabs)/scan')}
              >
                <CameraIcon color={colors.bgElevated} size={18} />
                <Text style={[s.primaryActionText, { color: colors.bgElevated }]}>Capture receipt</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.secondaryAction, { backgroundColor: colors.surface, borderColor: colors.border }, shadow.soft]}
                onPress={() => router.push('/(tabs)/trips')}
              >
                <PlaneIcon color={colors.textPrimary} size={18} />
                <Text style={[s.secondaryActionText, { color: colors.textPrimary }]}>Trips</Text>
              </TouchableOpacity>
            </View>

            {/* Stats strip */}
            <View style={s.statsRow}>
              <StatChip colors={colors} icon={<PlaneIcon color={colors.accent} size={15} />} label="Trips" value={String(trips.length)} />
              <StatChip colors={colors} icon={<ReceiptIcon color={colors.accent} size={15} />} label="Missing" value={String(missingReceipts)} danger={missingReceipts > 0} />
              <StatChip colors={colors} icon={<FileTextIcon color={colors.accent} size={15} />} label="Expenses" value={String(expenses.length)} />
            </View>

            {/* Recent expenses */}
            <View style={[s.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={s.cardHeader}>
                <Text style={[s.cardTitle, { color: colors.textPrimary }]}>Recent expenses</Text>
                <TouchableOpacity style={s.seeAll} onPress={() => router.push('/(tabs)/expenses')}>
                  <Text style={[s.seeAllText, { color: colors.accent }]}>View all</Text>
                  <ChevronRightIcon color={colors.accent} size={13} />
                </TouchableOpacity>
              </View>
              {recentExpenses.length > 0 ? (
                recentExpenses.map((expense) => {
                  const tone = statusStyle(expense.status, colors);
                  return (
                    <View key={expense.id} style={[s.row, { borderTopColor: colors.borderSubtle }]}>
                      <View style={[s.rowIcon, { backgroundColor: colors.accentDim }]}>
                        <ReceiptIcon color={colors.accent} size={16} />
                      </View>
                      <View style={s.rowBody}>
                        <Text style={[s.rowTitle, { color: colors.textPrimary }]} numberOfLines={1}>{expense.merchant}</Text>
                        <Text style={[s.rowMeta, { color: colors.textSecondary }]}>{fmtDate(expense.expenseDate)} · {expense.category}</Text>
                      </View>
                      <View style={s.rowEnd}>
                        <Text style={[s.rowAmount, { color: colors.textPrimary }]}>{expense.currency} {Number(expense.amount).toFixed(2)}</Text>
                        <View style={[s.badge, { backgroundColor: tone.bg }]}>
                          <Text style={[s.badgeText, { color: tone.fg }]}>{expense.status}</Text>
                        </View>
                      </View>
                    </View>
                  );
                })
              ) : (
                <View style={s.empty}>
                  <ReceiptIcon color={colors.textMuted} size={28} />
                  <Text style={[s.emptyText, { color: colors.textSecondary }]}>No expenses yet. Capture a receipt to get started.</Text>
                </View>
              )}
            </View>

            {/* Upcoming trips */}
            {trips.length > 0 && (
              <View style={[s.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={s.cardHeader}>
                  <Text style={[s.cardTitle, { color: colors.textPrimary }]}>My trips</Text>
                  <TouchableOpacity style={s.seeAll} onPress={() => router.push('/(tabs)/trips')}>
                    <Text style={[s.seeAllText, { color: colors.accent }]}>View all</Text>
                    <ChevronRightIcon color={colors.accent} size={13} />
                  </TouchableOpacity>
                </View>
                {trips.slice(0, 3).map((trip) => {
                  const tone = statusStyle(trip.status, colors);
                  return (
                    <TouchableOpacity
                      key={trip.id}
                      style={[s.row, { borderTopColor: colors.borderSubtle }]}
                      onPress={() => router.push(`/trips/${trip.id}` as never)}
                    >
                      <View style={[s.rowIcon, { backgroundColor: colors.surfaceAlt }]}>
                        <MapPinIcon color={colors.textSecondary} size={16} />
                      </View>
                      <View style={s.rowBody}>
                        <Text style={[s.rowTitle, { color: colors.textPrimary }]} numberOfLines={1}>{trip.name}</Text>
                        <Text style={[s.rowMeta, { color: colors.textSecondary }]}>{trip.destination} · {fmtDate(trip.startDate)}</Text>
                      </View>
                      <View style={[s.badge, { backgroundColor: tone.bg }]}>
                        <Text style={[s.badgeText, { color: tone.fg }]}>{trip.status}</Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            {/* Ready to submit CTA */}
            {submitted === 0 && expenses.filter((e) => e.status === 'draft').length > 0 && (
              <TouchableOpacity
                style={[s.submitCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
                onPress={() => router.push('/(tabs)/expenses')}
              >
                <View style={s.submitText}>
                  <Text style={[s.cardTitle, { color: colors.textPrimary }]}>Ready to submit?</Text>
                  <Text style={[s.rowMeta, { color: colors.textSecondary }]}>
                    {expenses.filter((e) => e.status === 'draft').length} draft expense{expenses.filter((e) => e.status === 'draft').length === 1 ? '' : 's'} waiting.
                  </Text>
                </View>
                <View style={[s.sendBtn, { backgroundColor: colors.ink }]}>
                  <SendIcon color={colors.bgElevated} size={17} />
                </View>
              </TouchableOpacity>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function HeroStat({ colors, label, value, tint }: { colors: ReturnType<typeof useTheme>['colors']; label: string; value: string; tint: string }) {
  return (
    <View style={[s.heroStat, { backgroundColor: tint + '14' }]}>
      <Text style={[s.heroStatValue, { color: tint }]}>{value}</Text>
      <Text style={[s.heroStatLabel, { color: colors.textMuted }]}>{label}</Text>
    </View>
  );
}

function StatChip({ colors, icon, label, value, danger }: { colors: ReturnType<typeof useTheme>['colors']; icon: React.ReactNode; label: string; value: string; danger?: boolean }) {
  return (
    <View style={[s.statChip, { backgroundColor: colors.surface, borderColor: danger ? colors.expiring + '40' : colors.border }]}>
      {icon}
      <View>
        <Text style={[s.statValue, { color: danger ? colors.expiring : colors.textPrimary }]}>{value}</Text>
        <Text style={[s.statLabel, { color: colors.textMuted }]}>{label}</Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: spacing.lg, paddingBottom: TAB_BAR_H, gap: spacing.md },

  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  eyebrow: { fontFamily: 'Inter-SemiBold', fontSize: typography.xs, textTransform: 'uppercase', letterSpacing: 0.5 },
  title: { fontFamily: 'Inter-Bold', fontSize: typography.xxl, marginTop: 2 },
  avatarBtn: { width: scale(44), height: scale(44), borderRadius: radius.full, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontFamily: 'Inter-Bold', fontSize: typography.base },

  loading: { minHeight: 320, alignItems: 'center', justifyContent: 'center' },

  notice: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderWidth: 1, borderRadius: radius.lg, padding: spacing.md },
  noticeText: { flex: 1, fontFamily: 'Inter-Medium', fontSize: typography.sm },
  noticeAction: { fontFamily: 'Inter-Bold', fontSize: typography.sm },

  // Hero card — mirrors web .traveler-web-hero
  hero: { borderWidth: 1, borderRadius: radius.xl, padding: spacing.md, gap: spacing.sm, overflow: 'hidden' },
  heroBg: { ...StyleSheet.absoluteFillObject, borderRadius: radius.xl },
  heroTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  heroIcon: { width: scale(36), height: scale(36), borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  heroMeta: { flex: 1 },
  heroEyebrow: { fontFamily: 'Inter-Bold', fontSize: typography.xs, textTransform: 'uppercase', letterSpacing: 0.5 },
  heroName: { fontFamily: 'Inter-Bold', fontSize: typography.md, marginTop: 1 },
  heroDetail: { fontFamily: 'Inter-Regular', fontSize: typography.sm, lineHeight: 19 },
  progressTrack: { height: 6, borderRadius: radius.full, overflow: 'hidden', marginTop: 2 },
  progressFill: { height: '100%', borderRadius: radius.full },
  heroCaption: { fontFamily: 'Inter-Regular', fontSize: typography.xs },
  heroStats: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap', marginTop: 4 },
  heroStat: { borderRadius: radius.md, paddingHorizontal: spacing.sm, paddingVertical: 6, alignItems: 'center', minWidth: 72 },
  heroStatValue: { fontFamily: 'Inter-Bold', fontSize: typography.sm },
  heroStatLabel: { fontFamily: 'Inter-Regular', fontSize: typography.xs, marginTop: 1 },

  // Action buttons
  actions: { flexDirection: 'row', gap: spacing.sm },
  primaryAction: { flex: 2, minHeight: scale(48), borderRadius: radius.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  primaryActionText: { fontFamily: 'Inter-Bold', fontSize: typography.sm },
  secondaryAction: { flex: 1, minHeight: scale(48), borderWidth: 1, borderRadius: radius.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  secondaryActionText: { fontFamily: 'Inter-SemiBold', fontSize: typography.sm },

  // Stats strip
  statsRow: { flexDirection: 'row', gap: spacing.sm },
  statChip: { flex: 1, borderWidth: 1, borderRadius: radius.lg, padding: spacing.sm, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  statValue: { fontFamily: 'Inter-Bold', fontSize: typography.md },
  statLabel: { fontFamily: 'Inter-Regular', fontSize: typography.xs },

  // Card sections
  card: { borderWidth: 1, borderRadius: radius.xl, paddingHorizontal: spacing.md, paddingTop: spacing.md },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: spacing.sm },
  cardTitle: { fontFamily: 'Inter-Bold', fontSize: typography.md },
  seeAll: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  seeAllText: { fontFamily: 'Inter-Bold', fontSize: typography.sm },

  // Rows
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderTopWidth: StyleSheet.hairlineWidth, paddingVertical: spacing.md },
  rowIcon: { width: scale(36), height: scale(36), borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  rowBody: { flex: 1 },
  rowTitle: { fontFamily: 'Inter-SemiBold', fontSize: typography.base },
  rowMeta: { marginTop: 2, fontFamily: 'Inter-Regular', fontSize: typography.sm },
  rowEnd: { alignItems: 'flex-end', gap: 4 },
  rowAmount: { fontFamily: 'Inter-Bold', fontSize: typography.sm },
  badge: { alignSelf: 'flex-start', borderRadius: radius.full, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { fontFamily: 'Inter-Bold', fontSize: typography.xs, textTransform: 'capitalize' },

  // Empty state
  empty: { paddingVertical: spacing.lg, alignItems: 'center', gap: spacing.sm },
  emptyText: { fontFamily: 'Inter-Regular', fontSize: typography.sm, textAlign: 'center', lineHeight: 20 },

  // Submit CTA
  submitCard: { borderWidth: 1, borderRadius: radius.xl, padding: spacing.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  submitText: { flex: 1 },
  sendBtn: { width: scale(42), height: scale(42), borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
});
