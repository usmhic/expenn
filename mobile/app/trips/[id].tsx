import { useEffect, useState } from 'react';
import {
  ActivityIndicator, RefreshControl, ScrollView, StyleSheet,
  Text, TouchableOpacity, View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowLeftIcon, CalendarIcon, CameraIcon, CheckCircleIcon,
  ClockIcon, MapPinIcon, ReceiptIcon,
} from '../../components/Icon';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { trips as tripsApi, expenses as expensesApi } from '../../lib/api';
import { radius, scale, shadow, spacing, statusStyle, typography } from '../../constants/theme';

type Trip = Awaited<ReturnType<typeof tripsApi.getById>>;
type Expense = Awaited<ReturnType<typeof expensesApi.list>>[number];

function tripProgress(trip: Trip): { label: string; kind: 'upcoming' | 'active' | 'ended'; pct: number } {
  const now = Date.now();
  const start = new Date(trip.startDate).getTime();
  const end = new Date(trip.endDate).getTime();
  const totalDays = Math.max(1, Math.ceil((end - start) / 86_400_000));
  if (now < start) {
    const inDays = Math.ceil((start - now) / 86_400_000);
    return { label: `Starts in ${inDays}d`, kind: 'upcoming', pct: 0 };
  }
  if (now > end) return { label: `${totalDays}d trip · ended`, kind: 'ended', pct: 100 };
  const elapsed = Math.ceil((now - start) / 86_400_000);
  const pct = Math.round((elapsed / totalDays) * 100);
  return { label: `Day ${elapsed} of ${totalDays}`, kind: 'active', pct };
}

function fmtDate(value: Date | string) {
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value));
}

export default function TripDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const { session } = useAuth();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  async function load() {
    if (!session) { router.replace('/login'); return; }
    if (!id) return;
    setError('');
    try {
      const [tripData, expenseData] = await Promise.all([
        tripsApi.getById(id),
        expensesApi.list({ tripId: id, mine: true }),
      ]);
      setTrip(tripData);
      setExpenses(expenseData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load trip.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => { load(); }, [session?.access_token, id]);

  const progress = trip ? tripProgress(trip) : null;
  const totalSpend = expenses
    .filter((e) => ['submitted', 'approved', 'reimbursed'].includes(e.status))
    .reduce((s, e) => s + Number(e.amount), 0);
  const budget = trip ? Number(trip.budget) : 0;
  const budgetPct = budget > 0 ? Math.min(100, Math.round((totalSpend / budget) * 100)) : 0;
  const overBudget = budget > 0 && totalSpend > budget;
  const pendingCount = expenses.filter((e) => e.status === 'submitted').length;

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: colors.bg }]} edges={['top']}>
      {/* Top navigation bar */}
      <View style={[s.navBar, { borderBottomColor: colors.border }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={[s.backBtn, { backgroundColor: colors.accentDim }]}
        >
          <ArrowLeftIcon color={colors.accent} size={18} />
        </TouchableOpacity>
        <Text style={[s.navTitle, { color: colors.textPrimary }]} numberOfLines={1}>
          {trip?.name ?? 'Trip'}
        </Text>
        {trip && (
          <TouchableOpacity
            style={[s.captureBtn, { backgroundColor: colors.ink }, shadow.elegant]}
            onPress={() => router.push(`/(tabs)/scan?tripId=${trip.id}` as never)}
          >
            <CameraIcon color={colors.bgElevated} size={17} />
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <View style={s.loadingContainer}><ActivityIndicator color={colors.accent} size="large" /></View>
      ) : error ? (
        <View style={s.loadingContainer}>
          <Text style={[s.errorText, { color: colors.expired }]}>{error}</Text>
        </View>
      ) : trip ? (
        <ScrollView
          contentContainerStyle={s.scroll}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.accent} />}
        >
          {/* Trip info card — mirrors web's trip-detail-hero */}
          <View style={[s.tripHero, { backgroundColor: colors.surface, borderColor: colors.accent + '28' }]}>
            {/* Accent overlay for the hero tint */}
            <View style={[s.heroTint, { backgroundColor: colors.accent + '06' }]} />

            <View style={s.heroTop}>
              <View>
                <Text style={[s.heroName, { color: colors.textPrimary }]}>{trip.name}</Text>
                <View style={s.heroMeta}>
                  <MapPinIcon color={colors.textMuted} size={13} />
                  <Text style={[s.heroMetaText, { color: colors.textSecondary }]}>{trip.destination}</Text>
                </View>
                <View style={s.heroMeta}>
                  <CalendarIcon color={colors.textMuted} size={13} />
                  <Text style={[s.heroMetaText, { color: colors.textSecondary }]}>
                    {fmtDate(trip.startDate)} – {fmtDate(trip.endDate)}
                  </Text>
                </View>
              </View>

              {progress && (
                <View style={[s.progressPill, {
                  backgroundColor: progress.kind === 'active'
                    ? colors.mint + '22'
                    : progress.kind === 'upcoming'
                    ? colors.accentDim
                    : colors.surfaceAlt,
                }]}>
                  <ClockIcon
                    color={progress.kind === 'active' ? colors.mint : progress.kind === 'upcoming' ? colors.accent : colors.textMuted}
                    size={13}
                  />
                  <Text style={[s.progressText, {
                    color: progress.kind === 'active' ? colors.mint : progress.kind === 'upcoming' ? colors.accent : colors.textMuted,
                  }]}>
                    {progress.label}
                  </Text>
                </View>
              )}
            </View>

            {/* Status + pending chips */}
            <View style={s.chipRow}>
              {(() => {
                const tone = statusStyle(trip.status, colors);
                return (
                  <View style={[s.chip, { backgroundColor: tone.bg }]}>
                    <Text style={[s.chipText, { color: tone.fg }]}>{trip.status}</Text>
                  </View>
                );
              })()}
              {pendingCount > 0 && (
                <View style={[s.chip, { backgroundColor: colors.expiring + '18' }]}>
                  <Text style={[s.chipText, { color: colors.expiring }]}>{pendingCount} pending</Text>
                </View>
              )}
            </View>

            {/* Budget bar — mirrors web */}
            {budget > 0 && (
              <View style={s.budgetSection}>
                <View style={s.budgetLabels}>
                  <Text style={[s.budgetLabel, { color: colors.textSecondary }]}>Spend</Text>
                  <Text style={[s.budgetValue, { color: overBudget ? colors.expired : colors.textPrimary }]}>
                    {trip.currency} {totalSpend.toFixed(0)}
                    <Text style={[s.budgetTotal, { color: colors.textMuted }]}> / {trip.currency} {budget.toFixed(0)}</Text>
                  </Text>
                </View>
                <View style={[s.budgetTrack, { backgroundColor: colors.surfaceAlt }]}>
                  <View style={[
                    s.budgetFill,
                    {
                      width: `${budgetPct}%` as any,
                      backgroundColor: overBudget ? colors.expired : colors.valid,
                    },
                  ]} />
                </View>
                {overBudget && (
                  <Text style={[s.budgetOverText, { color: colors.expired }]}>
                    {trip.currency} {(totalSpend - budget).toFixed(0)} over budget
                  </Text>
                )}
              </View>
            )}
          </View>

          {/* Expenses section */}
          <View style={s.section}>
            <View style={s.sectionHeader}>
              <Text style={[s.sectionTitle, { color: colors.textPrimary }]}>
                My expenses {expenses.length > 0 && `(${expenses.length})`}
              </Text>
              <TouchableOpacity
                style={[s.addBtn, { backgroundColor: colors.accentDim }]}
                onPress={() => router.push(`/(tabs)/scan?tripId=${id}` as never)}
              >
                <CameraIcon color={colors.accent} size={14} />
                <Text style={[s.addBtnText, { color: colors.accent }]}>Add</Text>
              </TouchableOpacity>
            </View>

            {expenses.length === 0 ? (
              <View style={[s.emptyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <ReceiptIcon color={colors.textMuted} size={28} />
                <Text style={[s.emptyTitle, { color: colors.textPrimary }]}>No expenses yet</Text>
                <Text style={[s.emptyText, { color: colors.textSecondary }]}>
                  Tap "Add" to capture a receipt for this trip.
                </Text>
              </View>
            ) : (
              <View style={s.expenseList}>
                {expenses.map((expense) => {
                  const tone = statusStyle(expense.status, colors);
                  return (
                    <View key={expense.id} style={[s.expenseCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                      <View style={s.expenseTop}>
                        <View style={[s.expenseIcon, { backgroundColor: colors.accentDim }]}>
                          <ReceiptIcon color={colors.accent} size={15} />
                        </View>
                        <View style={s.expenseBody}>
                          <Text style={[s.expenseMerchant, { color: colors.textPrimary }]} numberOfLines={1}>
                            {expense.merchant}
                          </Text>
                          <Text style={[s.expenseCategory, { color: colors.textSecondary }]}>
                            {expense.category}
                          </Text>
                        </View>
                        <View style={s.expenseRight}>
                          <Text style={[s.expenseAmount, { color: colors.textPrimary }]}>
                            {expense.currency} {Number(expense.amount).toFixed(2)}
                          </Text>
                          <View style={[s.statusBadge, { backgroundColor: tone.bg }]}>
                            <Text style={[s.statusBadgeText, { color: tone.fg }]}>{expense.status}</Text>
                          </View>
                        </View>
                      </View>

                      {expense.notes && (
                        <Text style={[s.expenseNotes, { color: colors.textMuted, borderLeftColor: colors.border }]} numberOfLines={2}>
                          {expense.notes}
                        </Text>
                      )}

                      {expense.receiptFileUrl && (
                        <View style={s.receiptRow}>
                          <CheckCircleIcon color={colors.valid} size={12} />
                          <Text style={[s.receiptText, { color: colors.valid }]}>Receipt attached</Text>
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        </ScrollView>
      ) : null}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1 },

  navBar: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    paddingHorizontal: spacing.lg, paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: { width: scale(36), height: scale(36), borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  captureBtn: { width: scale(36), height: scale(36), borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  navTitle: { flex: 1, fontFamily: 'Inter-Bold', fontSize: typography.md },

  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorText: { fontFamily: 'Inter-Medium', fontSize: typography.base },

  scroll: { padding: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.md },

  // Trip hero — mirrors web .trip-detail-hero
  tripHero: { borderWidth: 1, borderRadius: radius.xl, padding: spacing.md, gap: spacing.md, overflow: 'hidden' },
  heroTint: { ...StyleSheet.absoluteFillObject, borderRadius: radius.xl },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: spacing.sm },
  heroName: { fontFamily: 'Inter-Bold', fontSize: typography.lg, marginBottom: spacing.sm },
  heroMeta: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 3 },
  heroMetaText: { fontFamily: 'Inter-Regular', fontSize: typography.sm },
  progressPill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    borderRadius: radius.full, paddingHorizontal: spacing.sm, paddingVertical: 6,
    alignSelf: 'flex-start', flexShrink: 0,
  },
  progressText: { fontFamily: 'Inter-Bold', fontSize: typography.xs },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: radius.full, paddingHorizontal: spacing.sm, paddingVertical: 4 },
  chipText: { fontFamily: 'Inter-Bold', fontSize: typography.xs, textTransform: 'capitalize' },

  // Budget bar
  budgetSection: { gap: spacing.xs },
  budgetLabels: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  budgetLabel: { fontFamily: 'Inter-Regular', fontSize: typography.xs },
  budgetValue: { fontFamily: 'Inter-Bold', fontSize: typography.sm },
  budgetTotal: { fontFamily: 'Inter-Regular' },
  budgetTrack: { height: 8, borderRadius: radius.full, overflow: 'hidden' },
  budgetFill: { height: '100%', borderRadius: radius.full },
  budgetOverText: { fontFamily: 'Inter-Bold', fontSize: typography.xs },

  // Expenses
  section: { gap: spacing.sm },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { fontFamily: 'Inter-Bold', fontSize: typography.md },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: radius.md, paddingHorizontal: spacing.sm, paddingVertical: 6 },
  addBtnText: { fontFamily: 'Inter-Bold', fontSize: typography.sm },

  emptyCard: { borderWidth: 1, borderRadius: radius.xl, padding: spacing.xl, alignItems: 'center', gap: spacing.sm },
  emptyTitle: { fontFamily: 'Inter-Bold', fontSize: typography.md },
  emptyText: { fontFamily: 'Inter-Regular', fontSize: typography.sm, textAlign: 'center', lineHeight: 20 },

  expenseList: { gap: spacing.sm },
  expenseCard: { borderWidth: 1, borderRadius: radius.lg, padding: spacing.md, gap: spacing.sm },
  expenseTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  expenseIcon: { width: 34, height: 34, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  expenseBody: { flex: 1 },
  expenseMerchant: { fontFamily: 'Inter-Bold', fontSize: typography.base },
  expenseCategory: { fontFamily: 'Inter-Regular', fontSize: typography.sm, marginTop: 2 },
  expenseRight: { alignItems: 'flex-end', gap: 4 },
  expenseAmount: { fontFamily: 'Inter-Bold', fontSize: typography.sm },
  statusBadge: { borderRadius: radius.full, paddingHorizontal: 8, paddingVertical: 3 },
  statusBadgeText: { fontFamily: 'Inter-Bold', fontSize: typography.xs, textTransform: 'capitalize' },
  expenseNotes: { fontFamily: 'Inter-Regular', fontSize: typography.xs, lineHeight: 17, borderLeftWidth: 2, paddingLeft: spacing.sm },
  receiptRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  receiptText: { fontFamily: 'Inter-SemiBold', fontSize: typography.xs },
});
