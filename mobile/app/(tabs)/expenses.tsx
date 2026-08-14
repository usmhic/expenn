import { useEffect, useState } from 'react';
import {
  ActivityIndicator, RefreshControl, ScrollView, StyleSheet,
  Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraIcon, FilterIcon, ReceiptIcon, SearchIcon, SendIcon } from '../../components/Icon';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { trips as tripsApi, expenses as expensesApi } from '../../lib/api';
import { radius, scale, shadow, spacing, statusStyle, TAB_BAR_H, typography } from '../../constants/theme';

type Trip = Awaited<ReturnType<typeof tripsApi.list>>[number];
type Expense = Awaited<ReturnType<typeof expensesApi.list>>[number];

const STATUSES = ['all', 'draft', 'submitted', 'approved', 'rejected', 'reimbursed'];

export default function ExpensesTab() {
  const { colors } = useTheme();
  const { session } = useAuth();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [tripId, setTripId] = useState('all');
  const [error, setError] = useState('');

  async function load() {
    if (!session) { router.replace('/login'); return; }
    setError('');
    try {
      const [expenseRows, tripRows] = await Promise.all([
        expensesApi.list({ mine: true }),
        tripsApi.list(),
      ]);
      setExpenses(expenseRows);
      setTrips(tripRows);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load expenses.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function submitExpense(expenseId: string) {
    try {
      await expensesApi.submit(expenseId);
      await load();
    } catch {
      // best-effort
    }
  }

  useEffect(() => { load(); }, [session?.access_token]);

  const filtered = expenses
    .filter((e) => status === 'all' || e.status === status)
    .filter((e) => tripId === 'all' || e.tripId === tripId)
    .filter((e) => `${e.merchant} ${e.category} ${e.tripName ?? ''}`.toLowerCase().includes(search.trim().toLowerCase()));

  const total = filtered.reduce((sum, e) => sum + Number(e.amount), 0);
  const currency = filtered[0]?.currency ?? expenses[0]?.currency ?? 'USD';
  const draftCount = expenses.filter((e) => e.status === 'draft').length;
  const missingReceipts = expenses.filter((e) => !e.receiptFileUrl).length;

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: colors.bg }]} edges={['top']}>
      <ScrollView
        contentContainerStyle={s.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.accent} />}
      >
        {/* Header */}
        <View style={s.header}>
          <View style={s.headerText}>
            <Text style={[s.eyebrow, { color: colors.accent }]}>Expenses</Text>
            <Text style={[s.title, { color: colors.textPrimary }]}>My expenses</Text>
            <Text style={[s.subtitle, { color: colors.textSecondary }]}>
              {expenses.length} expense{expenses.length !== 1 ? 's' : ''}
              {draftCount > 0 && ` · ${draftCount} draft${draftCount !== 1 ? 's' : ''}`}
            </Text>
          </View>
          <TouchableOpacity style={[s.iconBtn, { backgroundColor: colors.accentDim }]} onPress={() => router.push('/(tabs)/scan')}>
            <CameraIcon color={colors.accent} size={20} />
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={s.loading}><ActivityIndicator color={colors.accent} /></View>
        ) : (
          <>
            {!!error && (
              <View style={[s.errorBanner, { backgroundColor: colors.expired + '16', borderColor: colors.expired + '35' }]}>
                <Text style={[s.errorText, { color: colors.expired }]}>{error}</Text>
              </View>
            )}

            {/* Draft CTA — mirrors web's amber banner */}
            {draftCount > 0 && status !== 'submitted' && (
              <View style={[s.draftBanner, { backgroundColor: colors.expiring + '14', borderColor: colors.expiring + '30' }]}>
                <SendIcon color={colors.expiring} size={16} />
                <Text style={[s.draftText, { color: colors.expiring }]}>
                  {draftCount} draft{draftCount !== 1 ? 's' : ''} not submitted — tap Submit on each row to send for review.
                </Text>
              </View>
            )}

            {/* Metrics */}
            <View style={s.metrics}>
              <Metric colors={colors} label="Visible total" value={`${currency} ${total.toFixed(2)}`} />
              <Metric colors={colors} label="Submitted" value={String(expenses.filter((e) => e.status === 'submitted').length)} />
              <Metric colors={colors} label="Missing" value={String(missingReceipts)} danger={missingReceipts > 0} />
            </View>

            {/* Filters */}
            <View style={[s.filterCard, { backgroundColor: colors.surface, borderColor: colors.border }, shadow.soft]}>
              <View style={[s.searchWrap, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
                <SearchIcon color={colors.textMuted} size={17} />
                <TextInput
                  value={search}
                  onChangeText={setSearch}
                  placeholder="Search merchant, trip, category"
                  placeholderTextColor={colors.textMuted}
                  style={[s.searchInput, { color: colors.textPrimary }]}
                />
              </View>
              <View style={s.filterLabel}>
                <FilterIcon color={colors.textMuted} size={14} />
                <Text style={[s.labelText, { color: colors.textMuted }]}>Status</Text>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.pillRow}>
                {STATUSES.map((item) => {
                  const active = status === item;
                  const tone = item === 'all' ? undefined : statusStyle(item, colors);
                  return (
                    <TouchableOpacity
                      key={item}
                      style={[s.pill, {
                        borderColor: active ? (tone?.fg ?? colors.accent) : colors.border,
                        backgroundColor: active ? (tone?.bg ?? colors.accentDim) : colors.surfaceAlt,
                      }]}
                      onPress={() => setStatus(item)}
                    >
                      <Text style={[s.pillText, { color: active ? (tone?.fg ?? colors.accent) : colors.textSecondary }]}>{item}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
              <View style={s.filterLabel}>
                <FilterIcon color={colors.textMuted} size={14} />
                <Text style={[s.labelText, { color: colors.textMuted }]}>Trip</Text>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.pillRow}>
                {[{ id: 'all', name: 'All trips' }, ...trips.map((t) => ({ id: t.id, name: t.name }))].map((t) => (
                  <TouchableOpacity
                    key={t.id}
                    style={[s.pill, {
                      borderColor: tripId === t.id ? colors.accent : colors.border,
                      backgroundColor: tripId === t.id ? colors.accentDim : colors.surfaceAlt,
                    }]}
                    onPress={() => setTripId(t.id)}
                  >
                    <Text style={[s.pillText, { color: tripId === t.id ? colors.accent : colors.textSecondary }]}>{t.name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Expense list */}
            <View style={[s.listCard, { backgroundColor: colors.surface, borderColor: colors.border }, shadow.soft]}>
              {filtered.length > 0 ? (
                filtered.map((expense) => {
                  const tone = statusStyle(expense.status, colors);
                  return (
                    <View key={expense.id} style={[s.expenseRow, { borderTopColor: colors.borderSubtle }]}>
                      <View style={[s.rowIcon, { backgroundColor: colors.accentDim }]}>
                        <ReceiptIcon color={colors.accent} size={17} />
                      </View>
                      <View style={s.rowBody}>
                        <Text style={[s.rowTitle, { color: colors.textPrimary }]} numberOfLines={1}>{expense.merchant}</Text>
                        <Text style={[s.rowMeta, { color: colors.textSecondary }]} numberOfLines={1}>
                          {fmtDate(expense.expenseDate)} · {expense.tripName ?? 'No trip'} · {expense.category}
                        </Text>
                      </View>
                      <View style={s.rowEnd}>
                        <Text style={[s.amount, { color: colors.textPrimary }]}>{expense.currency} {Number(expense.amount).toFixed(2)}</Text>
                        <View style={[s.badge, { backgroundColor: tone.bg }]}>
                          <Text style={[s.badgeText, { color: tone.fg }]}>{expense.status}</Text>
                        </View>
                        {expense.status === 'draft' && (
                          <TouchableOpacity
                            style={[s.submitBtn, { backgroundColor: colors.expiring + '16', borderColor: colors.expiring + '30' }]}
                            onPress={() => submitExpense(expense.id)}
                          >
                            <SendIcon color={colors.expiring} size={13} />
                            <Text style={[s.submitBtnText, { color: colors.expiring }]}>Submit</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  );
                })
              ) : (
                <View style={s.empty}>
                  <ReceiptIcon color={colors.textMuted} size={30} />
                  <Text style={[s.emptyTitle, { color: colors.textPrimary }]}>No expenses found</Text>
                  <Text style={[s.emptyText, { color: colors.textSecondary }]}>Capture a receipt or adjust the filters.</Text>
                </View>
              )}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Metric({ colors, label, value, danger }: { colors: ReturnType<typeof useTheme>['colors']; label: string; value: string; danger?: boolean }) {
  return (
    <View style={[s.metric, { backgroundColor: colors.surface, borderColor: danger ? colors.expiring + '40' : colors.border }]}>
      <Text style={[s.metricValue, { color: danger ? colors.expiring : colors.textPrimary }]}>{value}</Text>
      <Text style={[s.metricLabel, { color: colors.textMuted }]}>{label}</Text>
    </View>
  );
}

function fmtDate(value: Date | string) {
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' }).format(new Date(value));
}

const s = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: spacing.lg, paddingBottom: TAB_BAR_H, gap: spacing.md },

  header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.md },
  headerText: { flex: 1 },
  eyebrow: { fontFamily: 'Inter-Bold', fontSize: typography.xs, textTransform: 'uppercase', letterSpacing: 0.5 },
  title: { marginTop: 3, fontFamily: 'Inter-Bold', fontSize: typography.xxl },
  subtitle: { marginTop: 4, fontFamily: 'Inter-Regular', fontSize: typography.sm },
  iconBtn: { width: scale(44), height: scale(44), borderRadius: radius.full, alignItems: 'center', justifyContent: 'center' },
  loading: { minHeight: 280, alignItems: 'center', justifyContent: 'center' },

  errorBanner: { borderWidth: 1, borderRadius: radius.lg, padding: spacing.md },
  errorText: { fontFamily: 'Inter-Medium', fontSize: typography.sm },

  draftBanner: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, borderWidth: 1, borderRadius: radius.lg, padding: spacing.md },
  draftText: { flex: 1, fontFamily: 'Inter-Medium', fontSize: typography.sm, lineHeight: 19 },

  metrics: { flexDirection: 'row', gap: spacing.sm },
  metric: { flex: 1, borderWidth: 1, borderRadius: radius.lg, padding: spacing.md },
  metricValue: { fontFamily: 'Inter-Bold', fontSize: typography.md },
  metricLabel: { marginTop: 3, fontFamily: 'Inter-Regular', fontSize: typography.xs },

  filterCard: { borderWidth: 1, borderRadius: radius.xl, padding: spacing.md, gap: spacing.sm },
  searchWrap: { minHeight: 46, borderWidth: 1, borderRadius: radius.md, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.md },
  searchInput: { flex: 1, fontFamily: 'Inter-Regular', fontSize: typography.base },
  filterLabel: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.xs },
  labelText: { fontFamily: 'Inter-Bold', fontSize: typography.xs, textTransform: 'uppercase', letterSpacing: 0.4 },
  pillRow: { gap: spacing.sm, paddingVertical: 2 },
  pill: { minHeight: 34, borderWidth: 1, borderRadius: radius.full, paddingHorizontal: spacing.md, alignItems: 'center', justifyContent: 'center' },
  pillText: { fontFamily: 'Inter-SemiBold', fontSize: typography.sm, textTransform: 'capitalize' },

  listCard: { borderWidth: 1, borderRadius: radius.xl, paddingHorizontal: spacing.md },
  expenseRow: { borderTopWidth: StyleSheet.hairlineWidth, paddingVertical: spacing.md, flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  rowIcon: { width: scale(38), height: scale(38), borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  rowBody: { flex: 1 },
  rowTitle: { fontFamily: 'Inter-SemiBold', fontSize: typography.base },
  rowMeta: { marginTop: 2, fontFamily: 'Inter-Regular', fontSize: typography.sm },
  rowEnd: { alignItems: 'flex-end', gap: 5, paddingTop: 2 },
  amount: { fontFamily: 'Inter-Bold', fontSize: typography.sm },
  badge: { borderRadius: radius.full, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { fontFamily: 'Inter-Bold', fontSize: typography.xs, textTransform: 'capitalize' },
  submitBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderRadius: radius.full, paddingHorizontal: 8, paddingVertical: 3 },
  submitBtnText: { fontFamily: 'Inter-Bold', fontSize: typography.xs },

  empty: { paddingVertical: spacing.xl, alignItems: 'center', gap: spacing.sm },
  emptyTitle: { fontFamily: 'Inter-Bold', fontSize: typography.md },
  emptyText: { fontFamily: 'Inter-Regular', fontSize: typography.sm, textAlign: 'center' },
});
