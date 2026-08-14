import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ArrowLeftIcon } from '../Icon';
import { useTheme } from '../../context/ThemeContext';
import { radius, spacing, typography } from '../../constants/theme';

interface ScreenProps {
  children: React.ReactNode;
  title?: string;
  back?: boolean;
  headerRight?: React.ReactNode;
  edges?: Array<'top' | 'bottom' | 'left' | 'right'>;
}

export function Screen({ children, title, back = false, headerRight, edges = ['top'] }: ScreenProps) {
  const { colors } = useTheme();
  const hasHeader = title || back || headerRight;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={edges}>
      {hasHeader && (
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          {back ? (
            <TouchableOpacity
              style={[styles.backBtn, { backgroundColor: colors.accentDim }]}
              onPress={() => router.back()}
            >
              <ArrowLeftIcon color={colors.accent} size={18} />
            </TouchableOpacity>
          ) : (
            <View style={styles.backBtn} />
          )}
          {title && (
            <Text style={[styles.title, { color: colors.textPrimary }]} numberOfLines={1}>
              {title}
            </Text>
          )}
          <View style={styles.headerRight}>
            {headerRight}
          </View>
        </View>
      )}
      {children}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: spacing.sm,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    flex: 1,
    fontFamily: 'Inter-Bold',
    fontSize: typography.md,
    textAlign: 'center',
  },
  headerRight: {
    width: 36,
    alignItems: 'flex-end',
  },
});
