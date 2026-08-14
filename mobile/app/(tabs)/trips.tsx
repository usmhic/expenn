import { useEffect, useState } from 'react';
import {
  ActivityIndicator, RefreshControl, ScrollView, StyleSheet,
  Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CalendarIcon, CameraIcon, ClockIcon, MapPinIcon, ReceiptIcon, SearchIcon } from '../../components/Icon';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { trips as tripsApi, expenses as expensesApi } from '../../lib/api';
import { radius, scale, shadow, spacing, statusStyle, TAB_BAR_H, typography } from '../../constants/theme';

type Trip = Awaited<ReturnType<typeof tripsApi.list>>[number];
type Expense = Awaited<ReturnType<typeof expensesApi.list>>[number];

const STATUSES = ['all', 'active', 'draft', 'completed', 'archived'];

export default function TripsTab() {
  const { colors } = useTheme();
  const { session } = useAuth();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [error, setError] = useState('');

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
      setError(err instanceof Error ? err.message : 'Could not load trips.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => { load(); }, [session?.access_token]);

  const filtered = trips
    .filter((t) => status === 'all' || t.status === status)
    .filter((t) => `${t.name} ${t.destination}`.toLowerCase().includes(search.trim().toLowerCase()));

  const activeTrip = trips.find((t) => t.status === 'active');

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: colors.bg }]} edges={['top']}>
      <ScrollView
        contentContainerStyle={s.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.accent} />}
      >
        {/* Header */}
        <View style={s.header}>
          <View style={s.headerText}>
            <Text style={[s.eyebrow, { color: colors.accent }]}>Trips</Text>
            <Text style={[s.title, { color: colors.textPrimary }]}>My trips</Text>
            <Text style={[s.subtitle, { color: colors.textSecondary }]}>
              {trips.length} trip{trips.length !== 1 ? 's' : ''} · tap to review dates, spend, and documents.
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

            {/* Featured active trip */}
            {activeTrip && (
              <TripCard colors={colors} trip={activeTrip} expenses={expenses} featured />
            )}

            {/* Filters */}
            <View style={[s.filterCard, { backgroundColor: colors.surface, borderColor: colors.border }, shadow.soft]}>
              <View style={[s.searchWrap, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
                <SearchIcon color={colors.textMuted} size={17} />
                <TextInput
                  value={search}
                  onChangeText={setSearch}
                  placeholder="Search trips"
                  placeholderTextColor={colors.textMuted}
                  style={[s.searchInput, { color: colors.textPrimary }]}
                />
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
            </View>

            {/* Trip list */}
            <View style={s.list}>
              {filtered.length > 0 ? (
                filtered.map((trip) => (
                  <TripCard key={trip.id} colors={colors} trip={trip} expenses={expenses} />
                ))
              ) : (
                <View style={[s.emptyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <MapPinIcon color={colors.textMuted} size={30} />
                  <Text style={[s.emptyTitle, { color: colors.textPrimary }]}>No trips found</Text>
                  <Text style={[s.emptyText, { color: colors.textSecondary }]}>Your trips will appear here — create one on the web or ask your admin to assign you to one.</Text>
                </View>
              )}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function tripProgressLabel(trip: Trip): string {
  const now = Date.now();
  const start = new Date(trip.startDate).getTime();
  const end = new Date(trip.endDate).getTime();
  const totalDays = Math.max(1, Math.ceil((end - start) / 86_400_000));
  if (now < start) {
    const inDays = Math.ceil((start - now) / 86_400_000);
    return `Starts in ${inDays}d`;
  }
  if (now > end) return `${totalDays}d · ended`;
  const elapsed = Math.ceil((now - start) / 86_400_000);
  return `Day ${elapsed} of ${totalDays}`;
}

function TripCard({
  colors, trip, expenses, featured = false,
}: {
  colors: ReturnType<typeof useTheme>['colors'];
  trip: Trip;
  expenses: Expense[];
  featured?: boolean;
}) {
  const tripExpenses = expenses.filter((e) => e.tripId === trip.id);
  const total = tripExpenses.reduce((sum, e) => sum + Number(e.amount), 0);
  const pending = tripExpenses.filter((e) => e.status === 'submitted').length;
  const progress = tripProgressLabel(trip);
  const tone = statusStyle(trip.status, colors);

  return (
    <TouchableOpacity
      style={[
        s.tripCard,
        {
          backgroundColor: featured ? colors.ink : colors.surface,
          borderColor: featured ? colors.accent + '30' : colors.border,
        },
        featured && shadow.elegant,
      ]}
      onPress={() => router.push(`/trips/${trip.id}` as never)}
    >
      <View style={s.tripTop}>
        <View style={[s.tripIcon, { backgroundColor: featured ? colors.accent + '22' : colors.accentDim }]}>
          <MapPinIcon color={featured ? colors.accent : colors.accent} size={17} />
        </View>
        <View style={s.tripBody}>
          <Text style={[s.tripName, { color: featured ? colors.bgElevated : colors.textPrimary }]} numberOfLines={1}>
            {trip.name}
          </Text>
          <Text style={[s.tripMeta, { color: featured ? colors.bgElevated + 'B8' : colors.textSecondary }]} numberOfLines={1}>
            {trip.destination}
          </Text>
        </View>
        <View style={[s.tripBadge, { backgroundColor: featured ? colors.bgElevated + '1F' : tone.bg }]}>
          <Text style={[s.tripBadgeText, { color: featured ? colors.bgElevated : tone.fg }]}>{trip.status}</Text>
        </View>
      </View>

      <View style={s.tripStats}>
        <SmallStat icon={<CalendarIcon color={featured ? colors.bgElevated + 'B8' : colors.textMuted} size={13} />} label={fmtDate(trip.startDate)} inverted={featured} colors={colors} />
        <SmallStat icon={<ReceiptIcon color={featured ? colors.bgElevated + 'B8' : colors.textMuted} size={13} />} label={`${trip.currency} ${total.toFixed(0)}`} inverted={featured} colors={colors} />
        <SmallStat icon={<ClockIcon color={featured ? colors.bgElevated + 'B8' : colors.textMuted} size={13} />} label={progress} inverted={featured} colors={colors} />
        {pending > 0 && (
          <SmallStat label={`${pending} pending`} inverted={featured} colors={colors} />
        )}
      </View>
    </TouchableOpacity>
  );
}

function SmallStat({
  colors, icon, label, inverted,
}: {
  colors: ReturnType<typeof useTheme>['colors'];
  icon?: React.ReactNode;
  label: string;
  inverted?: boolean;
}) {
  return (
    <View style={[s.smallStat, { backgroundColor: inverted ? colors.bgElevated + '14' : colors.surfaceAlt }]}>
      {icon}
      <Text style={[s.smallStatText, { color: inverted ? colors.bgElevated + 'D0' : colors.textSecondary }]}>{label}</Text>
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

  filterCard: { borderWidth: 1, borderRadius: radius.xl, padding: spacing.md, gap: spacing.sm },
  searchWrap: { minHeight: 46, borderWidth: 1, borderRadius: radius.md, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.md },
  searchInput: { flex: 1, fontFamily: 'Inter-Regular', fontSize: typography.base },
  pillRow: { gap: spacing.sm, paddingVertical: 2 },
  pill: { minHeight: 34, borderWidth: 1, borderRadius: radius.full, paddingHorizontal: spacing.md, alignItems: 'center', justifyContent: 'center' },
  pillText: { fontFamily: 'Inter-SemiBold', fontSize: typography.sm, textTransform: 'capitalize' },

  list: { gap: spacing.sm },
  tripCard: { borderWidth: 1, borderRadius: radius.xl, padding: spacing.md, gap: spacing.md },
  tripTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  tripIcon: { width: scale(38), height: scale(38), borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  tripBody: { flex: 1 },
  tripName: { fontFamily: 'Inter-Bold', fontSize: typography.md },
  tripMeta: { marginTop: 2, fontFamily: 'Inter-Regular', fontSize: typography.sm },
  tripBadge: { borderRadius: radius.full, paddingHorizontal: spacing.sm, paddingVertical: 4 },
  tripBadgeText: { fontFamily: 'Inter-Bold', fontSize: typography.xs, textTransform: 'capitalize' },
  tripStats: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  smallStat: { minHeight: 32, borderRadius: radius.md, paddingHorizontal: spacing.sm, flexDirection: 'row', alignItems: 'center', gap: 5 },
  smallStatText: { fontFamily: 'Inter-SemiBold', fontSize: typography.xs },

  emptyCard: { borderWidth: 1, borderRadius: radius.xl, padding: spacing.xl, alignItems: 'center', gap: spacing.sm },
  emptyTitle: { fontFamily: 'Inter-Bold', fontSize: typography.md },
  emptyText: { fontFamily: 'Inter-Regular', fontSize: typography.sm, textAlign: 'center' },
});
