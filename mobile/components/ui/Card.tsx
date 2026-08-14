import { StyleSheet, View, ViewStyle } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { radius, shadow, spacing } from '../../constants/theme';

export function Card({
  children,
  style,
  padding = 'md',
  noBorder = false,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  noBorder?: boolean;
}) {
  const { colors } = useTheme();
  const paddings = { none: 0, sm: spacing.sm, md: spacing.md, lg: spacing.lg };
  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          padding: paddings[padding],
          borderWidth: noBorder ? 0 : 1,
        },
        shadow.card,
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.xl,
    overflow: 'hidden',
  },
});
