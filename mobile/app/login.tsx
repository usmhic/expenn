import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeftIcon, BriefcaseIcon, CompassIcon, MailIcon, ShieldIcon, UserIcon } from '../components/Icon';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { isTablet, ms, radius, scale, SCREEN_W, shadow, spacing, typography } from '../constants/theme';

type AuthTab = 'email' | 'password' | 'ad';
type OtpStep = 'email' | 'code';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:5000';

export default function LoginScreen() {
  const { colors } = useTheme();
  const { sendOtp, verifyOtp, signInWithPassword, signInWithAD, startOidc } = useAuth();

  const [tab, setTab] = useState<AuthTab>('email');
  const [oidcEnabled, setOidcEnabled] = useState(false);
  const [oidcProviderName, setOidcProviderName] = useState('SSO');

  // Email OTP state
  const [otpStep, setOtpStep] = useState<OtpStep>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');

  // Password state
  const [pwEmail, setPwEmail] = useState('');
  const [pwPassword, setPwPassword] = useState('');

  // AD state
  const [adUsername, setAdUsername] = useState('');
  const [adPassword, setAdPassword] = useState('');

  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`${API_URL}/api/auth/oidc/info`)
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d?.enabled) {
          setOidcEnabled(true);
          if (d.providerName) setOidcProviderName(d.providerName);
        }
      })
      .catch(() => {});
  }, []);

  function clearError() { setError(''); }

  // ── Email OTP ───────────────────────────────────────────────────────────────

  async function requestCode() {
    clearError();
    if (!email.trim().includes('@')) { setError('Enter a valid email address.'); return; }
    setPending(true);
    const result = await sendOtp(email.trim().toLowerCase());
    setPending(false);
    if (result.error) { setError(result.error); return; }
    setOtpStep('code');
  }

  async function verifyCode() {
    clearError();
    if (code.trim().length < 4) { setError('Enter the code from your email.'); return; }
    setPending(true);
    const result = await verifyOtp(email.trim().toLowerCase(), code.trim());
    setPending(false);
    if (result.error) { setError(result.error); return; }
    router.replace('/(tabs)');
  }

  // ── Password ─────────────────────────────────────────────────────────────────

  async function signInPassword() {
    clearError();
    if (!pwEmail.trim().includes('@')) { setError('Enter a valid email address.'); return; }
    if (!pwPassword) { setError('Enter your password.'); return; }
    setPending(true);
    const result = await signInWithPassword(pwEmail.trim().toLowerCase(), pwPassword);
    setPending(false);
    if (result.error) { setError(result.error); return; }
    router.replace('/(tabs)');
  }

  // ── Active Directory ─────────────────────────────────────────────────────────

  async function signInAD() {
    clearError();
    if (!adUsername.trim()) { setError('Enter your domain username.'); return; }
    if (!adPassword) { setError('Enter your password.'); return; }
    setPending(true);
    const result = await signInWithAD(adUsername.trim(), adPassword);
    setPending(false);
    if (result.error) { setError(result.error); return; }
    router.replace('/(tabs)');
  }

  // ── OIDC/SSO ─────────────────────────────────────────────────────────────────

  async function handleOidc() {
    clearError();
    setPending(true);
    const result = await startOidc();
    setPending(false);
    if (result.error) { setError(result.error); return; }
    router.replace('/(tabs)');
  }

  function switchTab(t: AuthTab) {
    setTab(t);
    clearError();
    setOtpStep('email');
  }

  const headline =
    tab === 'email' && otpStep === 'code' ? 'Check your inbox.' : 'Welcome.';
  const tagline =
    tab === 'email' && otpStep === 'code'
      ? `We sent a sign-in code to ${email}. Enter it below.`
      : tab === 'ad'
      ? 'Sign in with your corporate Active Directory credentials.'
      : tab === 'password'
      ? 'Sign in with your email and password.'
      : 'Track expenses, capture receipts, and keep every trip organized.';

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: colors.bg }]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={s.flex}>
        <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
          <View style={s.panel}>

            {/* Brand */}
            <View style={s.brand}>
              <View style={s.logoRow}>
                <Image source={require('../assets/icon.png')} style={s.logoImage} />
                <Text style={[s.appName, { color: colors.textPrimary }]}>expenn</Text>
              </View>
              <Text style={[s.headline, { color: colors.textPrimary }]}>{headline}</Text>
              <Text style={[s.tagline, { color: colors.textSecondary }]}>{tagline}</Text>
            </View>

            {/* Use-case cards — visible on the first email step only */}
            {tab === 'email' && otpStep === 'email' && (
              <View style={s.useCaseRow}>
                <UseCaseCard colors={colors} icon={<BriefcaseIcon color={colors.accent} size={16} />} title="Work travel" body="Submit expenses and get approvals." />
                <UseCaseCard colors={colors} icon={<CompassIcon color={colors.accent} size={16} />} title="Personal trips" body="Track your own spending, your way." />
              </View>
            )}

            {/* SSO / OIDC button */}
            {oidcEnabled && otpStep === 'email' && (
              <TouchableOpacity
                style={[s.ssoBtn, { borderColor: colors.border, backgroundColor: colors.surface }, shadow.soft]}
                onPress={handleOidc}
                disabled={pending}
              >
                <ShieldIcon color={colors.accent} size={17} />
                <Text style={[s.ssoBtnText, { color: colors.textPrimary }]}>
                  Continue with {oidcProviderName}
                </Text>
              </TouchableOpacity>
            )}

            {/* Auth tabs */}
            {otpStep === 'email' && (
              <View style={[s.tabBar, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
                <TabBtn label="Email" active={tab === 'email'} onPress={() => switchTab('email')} colors={colors} />
                <TabBtn label="Password" active={tab === 'password'} onPress={() => switchTab('password')} colors={colors} />
                <TabBtn label="Active Directory" active={tab === 'ad'} onPress={() => switchTab('ad')} colors={colors} />
              </View>
            )}

            {/* Auth card */}
            <View style={[s.card, { backgroundColor: colors.surface, borderColor: colors.border }, shadow.soft]}>

              {/* ── Email OTP ── */}
              {tab === 'email' && otpStep === 'email' && (
                <>
                  <Text style={[s.cardLabel, { color: colors.textPrimary }]}>Your email</Text>
                  <InputRow colors={colors} icon={<MailIcon color={colors.textMuted} size={17} />}>
                    <TextInput
                      value={email}
                      onChangeText={setEmail}
                      placeholder="you@example.com"
                      placeholderTextColor={colors.textMuted}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoFocus
                      returnKeyType="go"
                      onSubmitEditing={requestCode}
                      style={[s.input, { color: colors.textPrimary }]}
                    />
                  </InputRow>
                  {!!error && <ErrorBanner colors={colors} message={error} />}
                  <SubmitButton label="Continue" pending={pending} onPress={requestCode} colors={colors} />
                  <Text style={[s.helper, { color: colors.textMuted }]}>We'll send a one-time sign-in code. No password needed.</Text>
                </>
              )}

              {tab === 'email' && otpStep === 'code' && (
                <>
                  <Text style={[s.cardLabel, { color: colors.textPrimary }]}>Sign-in code</Text>
                  <InputRow colors={colors}>
                    <TextInput
                      value={code}
                      onChangeText={setCode}
                      placeholder="123456"
                      placeholderTextColor={colors.textMuted}
                      keyboardType="number-pad"
                      autoFocus
                      returnKeyType="go"
                      onSubmitEditing={verifyCode}
                      style={[s.codeInput, { color: colors.textPrimary }]}
                    />
                  </InputRow>
                  {!!error && <ErrorBanner colors={colors} message={error} />}
                  <SubmitButton label="Verify & sign in" pending={pending} onPress={verifyCode} colors={colors} />
                  <TouchableOpacity onPress={() => { setOtpStep('email'); setCode(''); clearError(); }}>
                    <Text style={[s.helper, { color: colors.accent, textAlign: 'center' }]}>Use a different email</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => { setCode(''); requestCode(); }}>
                    <Text style={[s.helper, { color: colors.textMuted, textAlign: 'center' }]}>Didn't get it? Resend code</Text>
                  </TouchableOpacity>
                </>
              )}

              {/* ── Password ── */}
              {tab === 'password' && (
                <>
                  <Text style={[s.cardLabel, { color: colors.textPrimary }]}>Email</Text>
                  <InputRow colors={colors} icon={<MailIcon color={colors.textMuted} size={17} />}>
                    <TextInput
                      value={pwEmail}
                      onChangeText={setPwEmail}
                      placeholder="you@example.com"
                      placeholderTextColor={colors.textMuted}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoFocus
                      returnKeyType="next"
                      style={[s.input, { color: colors.textPrimary }]}
                    />
                  </InputRow>
                  <Text style={[s.cardLabel, { color: colors.textPrimary }]}>Password</Text>
                  <InputRow colors={colors}>
                    <TextInput
                      value={pwPassword}
                      onChangeText={setPwPassword}
                      placeholder="••••••••"
                      placeholderTextColor={colors.textMuted}
                      secureTextEntry
                      returnKeyType="go"
                      onSubmitEditing={signInPassword}
                      style={[s.input, { color: colors.textPrimary }]}
                    />
                  </InputRow>
                  {!!error && <ErrorBanner colors={colors} message={error} />}
                  <SubmitButton label="Sign in" pending={pending} onPress={signInPassword} colors={colors} />
                </>
              )}

              {/* ── Active Directory ── */}
              {tab === 'ad' && (
                <>
                  <Text style={[s.cardLabel, { color: colors.textPrimary }]}>Username</Text>
                  <InputRow colors={colors} icon={<UserIcon color={colors.textMuted} size={17} />}>
                    <TextInput
                      value={adUsername}
                      onChangeText={setAdUsername}
                      placeholder="DOMAIN\username or user@corp.com"
                      placeholderTextColor={colors.textMuted}
                      autoCapitalize="none"
                      autoCorrect={false}
                      autoFocus
                      returnKeyType="next"
                      style={[s.input, { color: colors.textPrimary }]}
                    />
                  </InputRow>
                  <Text style={[s.cardLabel, { color: colors.textPrimary }]}>Password</Text>
                  <InputRow colors={colors}>
                    <TextInput
                      value={adPassword}
                      onChangeText={setAdPassword}
                      placeholder="••••••••"
                      placeholderTextColor={colors.textMuted}
                      secureTextEntry
                      returnKeyType="go"
                      onSubmitEditing={signInAD}
                      style={[s.input, { color: colors.textPrimary }]}
                    />
                  </InputRow>
                  {!!error && <ErrorBanner colors={colors} message={error} />}
                  <SubmitButton label="Sign in with AD" pending={pending} onPress={signInAD} colors={colors} />
                  <Text style={[s.helper, { color: colors.textMuted }]}>Use your corporate network credentials.</Text>
                </>
              )}
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function TabBtn({ label, active, onPress, colors }: {
  label: string; active: boolean; onPress: () => void;
  colors: ReturnType<typeof useTheme>['colors'];
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[s.tabBtn, active && { backgroundColor: colors.surface, ...shadow.soft }]}
    >
      <Text style={[s.tabBtnText, { color: active ? colors.textPrimary : colors.textMuted }]}>{label}</Text>
    </TouchableOpacity>
  );
}

function InputRow({ colors, icon, children }: {
  colors: ReturnType<typeof useTheme>['colors'];
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <View style={[s.inputWrap, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
      {icon}
      {children}
    </View>
  );
}

function SubmitButton({ label, pending, onPress, colors }: {
  label: string; pending: boolean; onPress: () => void;
  colors: ReturnType<typeof useTheme>['colors'];
}) {
  return (
    <TouchableOpacity
      style={[s.submitBtn, { backgroundColor: colors.ink }, shadow.elegant]}
      onPress={onPress}
      disabled={pending}
    >
      {pending ? (
        <ActivityIndicator color={colors.bgElevated} />
      ) : (
        <>
          <Text style={[s.submitText, { color: colors.bgElevated }]}>{label}</Text>
          <ArrowLeftIcon color={colors.bgElevated} size={16} style={s.arrowRight} />
        </>
      )}
    </TouchableOpacity>
  );
}

function ErrorBanner({ colors, message }: { colors: ReturnType<typeof useTheme>['colors']; message: string }) {
  return (
    <View style={[s.errorWrap, { backgroundColor: colors.expired + '14', borderColor: colors.expired + '30' }]}>
      <Text style={[s.errorText, { color: colors.expired }]}>{message}</Text>
    </View>
  );
}

function UseCaseCard({ colors, icon, title, body }: {
  colors: ReturnType<typeof useTheme>['colors']; icon: React.ReactNode; title: string; body: string;
}) {
  return (
    <View style={[s.useCaseCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={[s.useCaseIcon, { backgroundColor: colors.accentDim }]}>{icon}</View>
      <Text style={[s.useCaseTitle, { color: colors.textPrimary }]}>{title}</Text>
      <Text style={[s.useCaseBody, { color: colors.textSecondary }]}>{body}</Text>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  content: { flexGrow: 1, minHeight: '100%', justifyContent: 'center', padding: spacing.md, gap: spacing.lg },
  panel: { width: '100%', maxWidth: isTablet ? 560 : SCREEN_W, alignSelf: 'center', gap: spacing.md },

  brand: { alignItems: 'center', gap: spacing.sm },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: scale(10) },
  logoImage: { width: scale(44), height: scale(44), borderRadius: scale(12) },
  appName: { fontFamily: 'Inter-Bold', fontSize: ms(30) },
  headline: { fontFamily: 'Inter-Bold', fontSize: typography.xl, lineHeight: typography.xl * 1.2, textAlign: 'center', marginTop: 4 },
  tagline: { fontFamily: 'Inter-Regular', fontSize: typography.sm, textAlign: 'center', lineHeight: typography.sm * 1.55, maxWidth: isTablet ? 440 : Math.min(SCREEN_W * 0.82, 340) },

  useCaseRow: { flexDirection: 'row', gap: spacing.sm },
  useCaseCard: { flex: 1, borderWidth: 1, borderRadius: radius.lg, padding: spacing.md, gap: 5, alignItems: 'flex-start' },
  useCaseIcon: { width: scale(32), height: scale(32), borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
  useCaseTitle: { fontFamily: 'Inter-Bold', fontSize: typography.sm },
  useCaseBody: { fontFamily: 'Inter-Regular', fontSize: typography.xs, lineHeight: typography.xs * 1.5 },

  ssoBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, height: scale(48), borderWidth: 1, borderRadius: radius.md },
  ssoBtnText: { fontFamily: 'Inter-Medium', fontSize: typography.sm },

  tabBar: { flexDirection: 'row', borderWidth: 1, borderRadius: radius.md, padding: 3, gap: 2 },
  tabBtn: { flex: 1, alignItems: 'center', paddingVertical: spacing.xs, borderRadius: radius.sm - 1 },
  tabBtnText: { fontFamily: 'Inter-Medium', fontSize: typography.xs },

  card: { borderWidth: 1, borderRadius: radius.xl, padding: spacing.md, gap: spacing.md },
  cardLabel: { fontFamily: 'Inter-Bold', fontSize: typography.sm },
  inputWrap: { minHeight: scale(52), borderWidth: 1, borderRadius: radius.md, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.md },
  input: { flex: 1, fontFamily: 'Inter-Regular', fontSize: typography.base },
  codeInput: { flex: 1, fontFamily: 'Inter-Bold', fontSize: typography.xl, letterSpacing: 6, textAlign: 'center' },
  errorWrap: { borderWidth: 1, borderRadius: radius.md, padding: spacing.sm },
  errorText: { fontFamily: 'Inter-Medium', fontSize: typography.sm },
  submitBtn: { height: scale(52), borderRadius: radius.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  submitText: { fontFamily: 'Inter-Bold', fontSize: typography.base },
  arrowRight: { transform: [{ rotate: '180deg' }] },
  helper: { fontFamily: 'Inter-Regular', fontSize: typography.xs, lineHeight: typography.xs * 1.55, textAlign: 'center' },
});
