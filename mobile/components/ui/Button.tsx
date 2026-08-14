import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, ViewStyle } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../context/ThemeContext';
import { radius, shadow, spacing, typography } from '../../constants/theme';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  style?: ViewStyle;
  fullWidth?: boolean;
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  icon,
  style,
  fullWidth = false,
}: ButtonProps) {
  const { colors } = useTheme();

  function handlePress() {
    if (disabled || loading) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  }

  const bg =
    variant === 'primary' ? colors.ink :
    variant === 'danger'  ? colors.expired + '18' :
    variant === 'ghost'   ? 'transparent' :
    colors.surfaceAlt;

  const borderColor =
    variant === 'secondary' ? colors.border :
    variant === 'danger'    ? colors.expired + '35' :
    'transparent';

  const textColor =
    variant === 'primary' ? colors.bg :
    variant === 'danger'  ? colors.expired :
    variant === 'ghost'   ? colors.accent :
    colors.textPrimary;

  const heights: Record<Size, number> = { sm: 38, md: 48, lg: 54 };
  const fontSizes: Record<Size, number> = { sm: typography.sm, md: typography.base, lg: typography.md };

  return (
    <TouchableOpacity
      style={[
        styles.btn,
        { backgroundColor: bg, borderColor, height: heights[size], borderWidth: variant === 'secondary' || variant === 'danger' ? 1 : 0 },
        fullWidth && styles.fullWidth,
        (variant === 'primary') && shadow.elegant,
        disabled && styles.disabled,
        style,
      ]}
      onPress={handlePress}
      disabled={disabled || loading}
      activeOpacity={0.75}
    >
      {loading ? (
        <ActivityIndicator color={textColor} size="small" />
      ) : (
        <>
          {icon}
          <Text style={[styles.label, { color: textColor, fontSize: fontSizes[size] }]}>{label}</Text>
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    alignSelf: 'flex-start',
  },
  fullWidth: { alignSelf: 'stretch' },
  label: { fontFamily: 'Inter-Bold' },
  disabled: { opacity: 0.55 },
});
