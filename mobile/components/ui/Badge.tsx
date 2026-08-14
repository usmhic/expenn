import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { radius, typography } from '../../constants/theme';

type BadgeVariant = string;

function badgeColors(value: BadgeVariant, colors: ReturnType<typeof useTheme>['colors']) {
  switch (value) {
    case 'approved':
    case 'active':
    case 'reimbursed':
      return { bg: colors.valid + '20', text: colors.valid };
    case 'rejected':
    case 'expired':
    case 'cancelled':
      return { bg: colors.expired + '20', text: colors.expired };
    case 'submitted':
    case 'requested':
      return { bg: colors.expiring + '20', text: colors.expiring };
    case 'draft':
    case 'pending':
      return { bg: colors.textMuted + '20', text: colors.textMuted };
    case 'completed':
      return { bg: colors.mint + '20', text: colors.mint };
    default:
      return { bg: colors.accent + '18', text: colors.accent };
  }
}

export function Badge({ value, size = 'sm' }: { value: string; size?: 'xs' | 'sm' }) {
  const { colors } = useTheme();
  const { bg, text } = badgeColors(value, colors);
  return (
    <View style={[styles.badge, { backgroundColor: bg }, size === 'xs' && styles.badgeXs]}>
      <View style={[styles.dot, { backgroundColor: text }]} />
      <Text style={[styles.text, { color: text }, size === 'xs' && styles.textXs]} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    borderRadius: radius.full,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeXs: { paddingHorizontal: 6, paddingVertical: 2 },
  dot: { width: 5, height: 5, borderRadius: radius.full },
  text: {
    fontFamily: 'Inter-SemiBold',
    fontSize: typography.xs,
    textTransform: 'capitalize',
  },
  textXs: { fontSize: 10 },
});
