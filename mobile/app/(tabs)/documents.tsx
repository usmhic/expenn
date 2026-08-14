import { useEffect, useState } from 'react';
import {
  ActivityIndicator, RefreshControl, ScrollView, StyleSheet,
  Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FileTextIcon, PlusIcon, SearchIcon } from '../../components/Icon';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { documents as documentsApi } from '../../lib/api';
import { radius, scale, shadow, spacing, TAB_BAR_H, typography } from '../../constants/theme';

type DocumentRow = Awaited<ReturnType<typeof documentsApi.list>>[number];

const DOC_KINDS = ['other', 'receipt', 'itinerary', 'passport', 'visa', 'id_card'];
const KIND_LABELS: Record<string, string> = {
  other: 'Other', receipt: 'Receipt', itinerary: 'Itinerary',
  passport: 'Passport', visa: 'Visa', id_card: 'ID Card',
};

export default function DocumentsTab() {
  const { colors } = useTheme();
  const { session } = useAuth();
  const [documents, setDocuments] = useState<DocumentRow[]>([]);
  const [docTitle, setDocTitle] = useState('');
  const [docKind, setDocKind] = useState('other');
  const [filterKind, setFilterKind] = useState('all');
  const [search, setSearch] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');

  async function load() {
    if (!session) { router.replace('/login'); return; }
    setError('');
    try {
      const rows = await documentsApi.list();
      setDocuments(rows);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load documents.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => { load(); }, [session?.access_token]);

  async function createDocument() {
    if (!docTitle.trim()) return;
    setPending(true);
    try {
      await documentsApi.create({ title: docTitle.trim(), kind: docKind, isSensitive: false });
      setDocTitle('');
      setShowAddForm(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create document.');
    } finally {
      setPending(false);
    }
  }

  const filtered = documents.filter((doc) => {
    const matchSearch = doc.title.toLowerCase().includes(search.trim().toLowerCase());
    const matchKind = filterKind === 'all' || doc.kind === filterKind;
    return matchSearch && matchKind;
  });

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: colors.bg }]} edges={['top']}>
      <ScrollView
        contentContainerStyle={s.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.accent} />}
      >
        {/* Header */}
        <View style={s.header}>
          <View style={s.headerText}>
            <Text style={[s.eyebrow, { color: colors.accent }]}>Docs</Text>
            <Text style={[s.title, { color: colors.textPrimary }]}>Documents</Text>
            <Text style={[s.subtitle, { color: colors.textSecondary }]}>
              Passports, visas, itineraries, and receipts.
            </Text>
          </View>
          <TouchableOpacity
            style={[s.addBtn, { backgroundColor: showAddForm ? colors.accentDim : colors.ink }, !showAddForm && shadow.elegant]}
            onPress={() => setShowAddForm((v) => !v)}
          >
            <PlusIcon color={showAddForm ? colors.accent : colors.bgElevated} size={20} />
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

            {/* Add document form — collapsible */}
            {showAddForm && (
              <View style={[s.formCard, { backgroundColor: colors.surface, borderColor: colors.border }, shadow.soft]}>
                <Text style={[s.formTitle, { color: colors.textPrimary }]}>Add document</Text>
                <TextInput
                  value={docTitle}
                  onChangeText={setDocTitle}
                  placeholder="Document title"
                  placeholderTextColor={colors.textMuted}
                  style={[s.input, { backgroundColor: colors.surfaceAlt, borderColor: colors.border, color: colors.textPrimary }]}
                />
                <Text style={[s.fieldLabel, { color: colors.textMuted }]}>Type</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.pillRow}>
                  {DOC_KINDS.map((kind) => (
                    <TouchableOpacity
                      key={kind}
                      style={[s.pill, {
                        borderColor: docKind === kind ? colors.accent : colors.border,
                        backgroundColor: docKind === kind ? colors.accentDim : colors.surfaceAlt,
                      }]}
                      onPress={() => setDocKind(kind)}
                    >
                      <Text style={[s.pillText, { color: docKind === kind ? colors.accent : colors.textSecondary }]}>
                        {KIND_LABELS[kind]}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                <TouchableOpacity
                  style={[s.submitBtn, { backgroundColor: colors.ink }, shadow.elegant]}
                  onPress={createDocument}
                  disabled={pending || !docTitle.trim()}
                >
                  {pending
                    ? <ActivityIndicator color={colors.bgElevated} />
                    : <><PlusIcon color={colors.bgElevated} size={16} /><Text style={[s.submitText, { color: colors.bgElevated }]}>Add document</Text></>
                  }
                </TouchableOpacity>
              </View>
            )}

            {/* Search + filter */}
            <View style={[s.filterCard, { backgroundColor: colors.surface, borderColor: colors.border }, shadow.soft]}>
              <View style={[s.searchWrap, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
                <SearchIcon color={colors.textMuted} size={17} />
                <TextInput
                  value={search}
                  onChangeText={setSearch}
                  placeholder="Search documents"
                  placeholderTextColor={colors.textMuted}
                  style={[s.searchInput, { color: colors.textPrimary }]}
                />
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.pillRow}>
                {['all', ...DOC_KINDS].map((kind) => (
                  <TouchableOpacity
                    key={kind}
                    style={[s.pill, {
                      borderColor: filterKind === kind ? colors.accent : colors.border,
                      backgroundColor: filterKind === kind ? colors.accentDim : colors.surfaceAlt,
                    }]}
                    onPress={() => setFilterKind(kind)}
                  >
                    <Text style={[s.pillText, { color: filterKind === kind ? colors.accent : colors.textSecondary }]}>
                      {kind === 'all' ? 'All' : KIND_LABELS[kind]}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Document list */}
            <View style={[s.listCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={s.listHeader}>
                <Text style={[s.listTitle, { color: colors.textPrimary }]}>
                  {filtered.length} document{filtered.length !== 1 ? 's' : ''}
                </Text>
              </View>
              {filtered.length > 0 ? (
                filtered.map((doc) => (
                  <View key={doc.id} style={[s.docRow, { borderTopColor: colors.borderSubtle }]}>
                    <View style={[s.docIcon, { backgroundColor: colors.accentDim }]}>
                      <FileTextIcon color={colors.accent} size={17} />
                    </View>
                    <View style={s.docBody}>
                      <Text style={[s.docTitle, { color: colors.textPrimary }]} numberOfLines={1}>{doc.title}</Text>
                      <Text style={[s.docKind, { color: colors.textSecondary }]}>{KIND_LABELS[doc.kind] ?? doc.kind}</Text>
                    </View>
                    {doc.isSensitive && (
                      <View style={[s.sensitiveBadge, { backgroundColor: colors.expiring + '18' }]}>
                        <Text style={[s.sensitiveBadgeText, { color: colors.expiring }]}>Sensitive</Text>
                      </View>
                    )}
                  </View>
                ))
              ) : (
                <View style={s.empty}>
                  <FileTextIcon color={colors.textMuted} size={30} />
                  <Text style={[s.emptyTitle, { color: colors.textPrimary }]}>No documents found</Text>
                  <Text style={[s.emptyText, { color: colors.textSecondary }]}>
                    Tap the + button to add passports, visas, or other travel documents.
                  </Text>
                </View>
              )}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: spacing.lg, paddingBottom: TAB_BAR_H, gap: spacing.md },

  header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.md },
  headerText: { flex: 1 },
  eyebrow: { fontFamily: 'Inter-Bold', fontSize: typography.xs, textTransform: 'uppercase', letterSpacing: 0.5 },
  title: { marginTop: 3, fontFamily: 'Inter-Bold', fontSize: typography.xxl },
  subtitle: { marginTop: 4, fontFamily: 'Inter-Regular', fontSize: typography.sm },
  addBtn: { width: scale(44), height: scale(44), borderRadius: radius.full, alignItems: 'center', justifyContent: 'center' },
  loading: { minHeight: 280, alignItems: 'center', justifyContent: 'center' },

  errorBanner: { borderWidth: 1, borderRadius: radius.lg, padding: spacing.md },
  errorText: { fontFamily: 'Inter-Medium', fontSize: typography.sm },

  formCard: { borderWidth: 1, borderRadius: radius.xl, padding: spacing.md, gap: spacing.sm },
  formTitle: { fontFamily: 'Inter-Bold', fontSize: typography.md },
  input: { minHeight: scale(48), borderWidth: 1, borderRadius: radius.md, paddingHorizontal: spacing.md, fontFamily: 'Inter-Regular', fontSize: typography.base },
  fieldLabel: { fontFamily: 'Inter-Bold', fontSize: typography.xs, textTransform: 'uppercase', letterSpacing: 0.4 },
  pillRow: { gap: spacing.sm, paddingVertical: 2 },
  pill: { minHeight: scale(34), borderWidth: 1, borderRadius: radius.full, paddingHorizontal: spacing.md, alignItems: 'center', justifyContent: 'center' },
  pillText: { fontFamily: 'Inter-SemiBold', fontSize: typography.sm },
  submitBtn: { minHeight: scale(48), borderRadius: radius.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, marginTop: spacing.xs },
  submitText: { fontFamily: 'Inter-Bold', fontSize: typography.base },

  filterCard: { borderWidth: 1, borderRadius: radius.xl, padding: spacing.md, gap: spacing.sm },
  searchWrap: { minHeight: scale(46), borderWidth: 1, borderRadius: radius.md, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.md },
  searchInput: { flex: 1, fontFamily: 'Inter-Regular', fontSize: typography.base },

  listCard: { borderWidth: 1, borderRadius: radius.xl, paddingHorizontal: spacing.md, paddingTop: spacing.md },
  listHeader: { paddingBottom: spacing.sm },
  listTitle: { fontFamily: 'Inter-Bold', fontSize: typography.md },
  docRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderTopWidth: StyleSheet.hairlineWidth, paddingVertical: spacing.md },
  docIcon: { width: scale(38), height: scale(38), borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  docBody: { flex: 1 },
  docTitle: { fontFamily: 'Inter-SemiBold', fontSize: typography.base },
  docKind: { marginTop: 2, fontFamily: 'Inter-Regular', fontSize: typography.sm },
  sensitiveBadge: { borderRadius: radius.full, paddingHorizontal: 8, paddingVertical: 3 },
  sensitiveBadgeText: { fontFamily: 'Inter-Bold', fontSize: typography.xs },

  empty: { paddingVertical: spacing.xl, alignItems: 'center', gap: spacing.sm },
  emptyTitle: { fontFamily: 'Inter-Bold', fontSize: typography.md },
  emptyText: { fontFamily: 'Inter-Regular', fontSize: typography.sm, textAlign: 'center', lineHeight: 20 },
});
