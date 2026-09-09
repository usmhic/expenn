import { StyleSheet, Text, View } from 'react-native';
import { Link, Stack } from 'expo-router';
import { useTheme } from '../context/ThemeContext';
import { ms, scale } from '../constants/theme';

/**
 * Catch-all for URLs that match no route — most often a stale or malformed
 * `expenn://` deep link. The root layout declares this screen, so the file has
 * to exist even when it is never reached.
 */
export default function NotFoundScreen() {
  const { colors } = useTheme();

  return (
    <>
      <Stack.Screen options={{ title: 'Not found' }} />
      <View style={[styles.container, { backgroundColor: colors.bg }]}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>This screen doesn&apos;t exist</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          The link you followed points somewhere Expenn can&apos;t open.
        </Text>
        <Link href="/" style={[styles.link, { color: colors.accent }]}>
          Go to home screen
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: scale(24) },
  title: { fontFamily: 'Inter-SemiBold', fontSize: ms(18), textAlign: 'center' },
  subtitle: { fontFamily: 'Inter-Regular', fontSize: ms(14), textAlign: 'center', marginTop: scale(8) },
  link: { fontFamily: 'Inter-Medium', fontSize: ms(14), marginTop: scale(20) },
});
