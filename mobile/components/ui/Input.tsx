import { StyleSheet, Text, TextInput, TextInputProps, View, ViewStyle } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { radius, spacing, typography } from '../../constants/theme';

interface InputProps extends TextInputProps {
  label?: string;
  icon?: React.ReactNode;
  error?: string;
  containerStyle?: ViewStyle;
}

export function Input({ label, icon, error, containerStyle, ...props }: InputProps) {
  const { colors } = useTheme();
  return (
    <View style={[styles.container, containerStyle]}>
      {label && <Text style={[styles.label, { color: colors.textPrimary }]}>{label}</Text>}
      <View
        style={[
          styles.wrap,
          {
            backgroundColor: colors.surfaceAlt,
            borderColor: error ? colors.expired : colors.border,
          },
        ]}
      >
        {icon && <View style={styles.icon}>{icon}</View>}
        <TextInput
          {...props}
          placeholderTextColor={colors.textMuted}
          style={[
            styles.input,
            {
              color: colors.textPrimary,
              fontFamily: 'Inter-Regular',
            },
            props.style,
          ]}
        />
      </View>
      {error && <Text style={[styles.error, { color: colors.expired }]}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 6 },
  label: { fontFamily: 'Inter-SemiBold', fontSize: typography.sm },
  wrap: {
    minHeight: 50,
    borderWidth: 1,
    borderRadius: radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  icon: { opacity: 0.7 },
  input: { flex: 1, fontSize: typography.base },
  error: { fontFamily: 'Inter-Regular', fontSize: typography.xs },
});
