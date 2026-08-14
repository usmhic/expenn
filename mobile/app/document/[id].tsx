import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeftIcon, FileTextIcon } from '../../components/Icon';
import { useTheme } from '../../context/ThemeContext';
import { documents } from '../../lib/api';
import { radius, scale, spacing, typography } from '../../constants/theme';

type DocumentRow = Awaited<ReturnType<typeof documents.getById>>;

export default function DocumentDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const [document, setDocument] = useState<DocumentRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    documents.getById(id)
      .then(setDocument)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Document not found.'))
      .finally(() => setLoading(false));
  }, [id]);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <TouchableOpacity style={styles.back} onPress={() => router.back()}>
          <ArrowLeftIcon color={colors.textPrimary} size={20} />
          <Text style={[styles.backText, { color: colors.textPrimary }]}>Back</Text>
        </TouchableOpacity>

        {loading ? (
          <View style={styles.loading}><ActivityIndicator color={colors.accent} /></View>
        ) : error ? (
          <Text style={[styles.error, { color: colors.expired }]}>{error}</Text>
        ) : document ? (
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={[styles.iconBox, { backgroundColor: colors.accentDim }]}>
              <FileTextIcon color={colors.accent} size={30} />
            </View>
            <Text style={[styles.title, { color: colors.textPrimary }]}>{document.title}</Text>
            <Meta colors={colors} label="Type" value={document.kind} />
            <Meta colors={colors} label="Issuer" value={document.issuer ?? 'Not set'} />
            <Meta colors={colors} label="Document #" value={document.isSensitive ? 'Protected' : document.documentNumber ?? 'Not set'} />
            <Meta colors={colors} label="Expiry" value={document.expiryDate ? new Date(document.expiryDate).toLocaleDateString() : 'Not set'} />
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function Meta({ colors, label, value }: { colors: ReturnType<typeof useTheme>['colors']; label: string; value: string }) {
  return (
    <View style={[styles.meta, { borderTopColor: colors.borderSubtle }]}>
      <Text style={[styles.metaLabel, { color: colors.textMuted }]}>{label}</Text>
      <Text style={[styles.metaValue, { color: colors.textPrimary }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: spacing.lg, paddingBottom: spacing.xxl },
  back: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.lg },
  backText: { fontFamily: 'Inter-SemiBold', fontSize: typography.base },
  loading: { minHeight: 320, alignItems: 'center', justifyContent: 'center' },
  error: { fontFamily: 'Inter-Medium', fontSize: typography.sm },
  card: { borderWidth: 1, borderRadius: radius.xl, padding: spacing.lg },
  iconBox: { width: scale(58), height: scale(58), borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md },
  title: { fontFamily: 'Inter-Bold', fontSize: typography.xl, marginBottom: spacing.md },
  meta: { borderTopWidth: StyleSheet.hairlineWidth, paddingVertical: spacing.md },
  metaLabel: { fontFamily: 'Inter-Medium', fontSize: typography.xs, textTransform: 'uppercase' },
  metaValue: { marginTop: 4, fontFamily: 'Inter-SemiBold', fontSize: typography.base },
});
