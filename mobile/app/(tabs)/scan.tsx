import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, Image, ScrollView, StyleSheet,
  Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraIcon, CheckCircleIcon, ReceiptIcon, XIcon } from '../../components/Icon';
import { useTheme } from '../../context/ThemeContext';
import { trips as tripsApi, expenses as expensesApi } from '../../lib/api';
import { radius, scale, SCREEN_H, shadow, spacing, TAB_BAR_H, typography } from '../../constants/theme';

type Trip = Awaited<ReturnType<typeof tripsApi.list>>[number];

const CATEGORIES = ['Travel', 'Accommodation', 'Meals', 'Transport', 'Communication', 'Office', 'Entertainment', 'Other'];

export default function CaptureTab() {
  const { colors } = useTheme();
  const { tripId: paramTripId } = useLocalSearchParams<{ tripId?: string }>();
  const cameraRef = useRef<any>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [merchant, setMerchant] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Meals');
  const [notes, setNotes] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [tripId, setTripId] = useState(paramTripId ?? '');
  const [trips, setTrips] = useState<Trip[]>([]);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [photoUri, setPhotoUri] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (paramTripId) setTripId(paramTripId);
  }, [paramTripId]);

  useEffect(() => {
    tripsApi.list().then((rows: Trip[]) => setTrips(rows)).catch(() => null);
  }, []);

  async function openCamera() {
    if (!permission?.granted) {
      const result = await requestPermission();
      if (!result.granted) {
        setError('Camera permission is needed to capture a receipt.');
        return;
      }
    }
    setError('');
    setCameraOpen(true);
  }

  async function capturePhoto() {
    const photo = await cameraRef.current?.takePictureAsync?.({ quality: 0.75, skipProcessing: true });
    if (photo?.uri) {
      setPhotoUri(photo.uri);
      setCameraOpen(false);
    }
  }

  async function saveExpense() {
    setError('');
    const numericAmount = Number(amount);
    if (!merchant.trim() || !Number.isFinite(numericAmount) || numericAmount <= 0) {
      setError('Merchant and amount are required.');
      return;
    }
    setPending(true);
    try {
      await expensesApi.create({
        merchant: merchant.trim(),
        amount: numericAmount,
        currency: currency.trim() || 'USD',
        category: category.trim() || 'Other',
        expenseDate: new Date().toISOString().slice(0, 10),
        tripId: tripId || undefined,
        notes: notes.trim() || undefined,
      });
      setMerchant(''); setAmount(''); setNotes(''); setPhotoUri('');
      router.replace('/(tabs)/expenses');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save expense.');
    } finally {
      setPending(false);
    }
  }

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: colors.bg }]} edges={['top']}>
      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">

        {/* Header */}
        <View>
          <Text style={[s.eyebrow, { color: colors.accent }]}>Capture</Text>
          <Text style={[s.title, { color: colors.textPrimary }]}>New expense</Text>
          <Text style={[s.subtitle, { color: colors.textSecondary }]}>
            Capture a receipt, fill in details, and save as a draft.
          </Text>
        </View>

        {/* Camera card */}
        {cameraOpen ? (
          <View style={[s.cameraCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <CameraView ref={cameraRef} style={s.cameraPreview} facing="back" />
            <View style={s.cameraActions}>
              <TouchableOpacity
                style={[s.camCancelBtn, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}
                onPress={() => setCameraOpen(false)}
              >
                <XIcon color={colors.textPrimary} size={17} />
                <Text style={[s.camBtnText, { color: colors.textPrimary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.camShootBtn, { backgroundColor: colors.ink }, shadow.elegant]}
                onPress={capturePhoto}
              >
                <CameraIcon color={colors.bgElevated} size={18} />
                <Text style={[s.camBtnText, { color: colors.bgElevated }]}>Take photo</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <TouchableOpacity
            style={[s.receiptCard, { backgroundColor: colors.surface, borderColor: colors.border }, shadow.soft]}
            onPress={openCamera}
          >
            {photoUri ? (
              <>
                <Image source={{ uri: photoUri }} style={s.photoPreview} />
                <View style={[s.receiptBadge, { backgroundColor: colors.valid + '18' }]}>
                  <CheckCircleIcon color={colors.valid} size={14} />
                  <Text style={[s.receiptBadgeText, { color: colors.valid }]}>Receipt captured · tap to retake</Text>
                </View>
              </>
            ) : (
              <View style={[s.cameraBox, { backgroundColor: colors.accentDim, borderColor: colors.accent + '30' }]}>
                <View style={[s.cameraCircle, { backgroundColor: colors.accent + '20' }]}>
                  <CameraIcon color={colors.accent} size={32} />
                </View>
                <Text style={[s.cameraBoxTitle, { color: colors.accent }]}>Capture receipt</Text>
                <Text style={[s.cameraBoxSub, { color: colors.textSecondary }]}>Tap to open camera</Text>
              </View>
            )}
          </TouchableOpacity>
        )}

        {/* Form */}
        <View style={[s.form, { backgroundColor: colors.surface, borderColor: colors.border }, shadow.soft]}>
          <View style={s.formHeader}>
            <View style={[s.formIconWrap, { backgroundColor: colors.accentDim }]}>
              <ReceiptIcon color={colors.accent} size={18} />
            </View>
            <Text style={[s.formTitle, { color: colors.textPrimary }]}>Expense details</Text>
          </View>

          <FieldInput colors={colors} value={merchant} onChangeText={setMerchant} placeholder="Merchant name" />

          <View style={s.twoCol}>
            <FieldInput colors={colors} value={amount} onChangeText={setAmount} placeholder="Amount" keyboardType="decimal-pad" style={s.halfInput} />
            <FieldInput colors={colors} value={currency} onChangeText={setCurrency} placeholder="Currency" autoCapitalize="characters" style={s.halfInput} maxLength={5} />
          </View>

          <Text style={[s.fieldLabel, { color: colors.textMuted }]}>Category</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.pillRow}>
            {CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat}
                style={[s.pill, {
                  borderColor: category === cat ? colors.accent : colors.border,
                  backgroundColor: category === cat ? colors.accentDim : colors.surfaceAlt,
                }]}
                onPress={() => setCategory(cat)}
              >
                {category === cat && <CheckCircleIcon color={colors.accent} size={13} />}
                <Text style={[s.pillText, { color: category === cat ? colors.accent : colors.textSecondary }]}>{cat}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <Text style={[s.fieldLabel, { color: colors.textMuted }]}>Trip</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.pillRow}>
            {[{ id: '', name: 'No trip' }, ...trips.map((t) => ({ id: t.id, name: t.name }))].map((t) => (
              <TouchableOpacity
                key={t.id}
                style={[s.pill, {
                  borderColor: tripId === t.id ? colors.accent : colors.border,
                  backgroundColor: tripId === t.id ? colors.accentDim : colors.surfaceAlt,
                }]}
                onPress={() => setTripId(t.id)}
              >
                {tripId === t.id && <CheckCircleIcon color={colors.accent} size={13} />}
                <Text style={[s.pillText, { color: tripId === t.id ? colors.accent : colors.textSecondary }]}>{t.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <FieldInput
            colors={colors}
            value={notes}
            onChangeText={setNotes}
            placeholder="Notes (optional)"
            multiline
            style={{ minHeight: 80, paddingTop: spacing.md }}
          />

          {!!error && (
            <View style={[s.errorBanner, { backgroundColor: colors.expired + '14', borderColor: colors.expired + '30' }]}>
              <Text style={[s.errorText, { color: colors.expired }]}>{error}</Text>
            </View>
          )}

          <TouchableOpacity
            style={[s.submitBtn, { backgroundColor: colors.ink }, shadow.elegant]}
            onPress={saveExpense}
            disabled={pending}
          >
            {pending
              ? <ActivityIndicator color={colors.bgElevated} />
              : <Text style={[s.submitText, { color: colors.bgElevated }]}>Save expense</Text>
            }
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function FieldInput({ colors, style, ...props }: React.ComponentProps<typeof TextInput> & { colors: ReturnType<typeof useTheme>['colors'] }) {
  return (
    <TextInput
      {...props}
      placeholderTextColor={colors.textMuted}
      style={[
        s.input,
        { backgroundColor: colors.surfaceAlt, borderColor: colors.border, color: colors.textPrimary },
        style,
      ]}
    />
  );
}

const s = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: spacing.lg, paddingBottom: TAB_BAR_H, gap: spacing.md },

  eyebrow: { fontFamily: 'Inter-Bold', fontSize: typography.xs, textTransform: 'uppercase', letterSpacing: 0.5 },
  title: { marginTop: 3, fontFamily: 'Inter-Bold', fontSize: typography.xxl },
  subtitle: { marginTop: 4, fontFamily: 'Inter-Regular', fontSize: typography.sm, lineHeight: 20 },

  cameraCard: { borderWidth: 1, borderRadius: radius.xl, overflow: 'hidden' },
  cameraPreview: { height: Math.round(SCREEN_H * 0.33) },
  cameraActions: { flexDirection: 'row', gap: spacing.sm, padding: spacing.md },
  camCancelBtn: { flex: 1, minHeight: scale(48), borderWidth: 1, borderRadius: radius.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  camShootBtn: { flex: 2, minHeight: scale(48), borderRadius: radius.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  camBtnText: { fontFamily: 'Inter-Bold', fontSize: typography.sm },

  receiptCard: { borderWidth: 1, borderRadius: radius.xl, overflow: 'hidden' },
  photoPreview: { height: Math.round(SCREEN_H * 0.22) },
  receiptBadge: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, padding: spacing.md },
  receiptBadgeText: { fontFamily: 'Inter-SemiBold', fontSize: typography.sm },
  cameraBox: { minHeight: scale(160), borderWidth: 1, borderStyle: 'dashed', margin: spacing.md, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center', gap: spacing.sm, padding: spacing.lg },
  cameraCircle: { width: scale(64), height: scale(64), borderRadius: radius.full, alignItems: 'center', justifyContent: 'center' },
  cameraBoxTitle: { fontFamily: 'Inter-Bold', fontSize: typography.base },
  cameraBoxSub: { fontFamily: 'Inter-Regular', fontSize: typography.sm },

  form: { borderWidth: 1, borderRadius: radius.xl, padding: spacing.md, gap: spacing.sm },
  formHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.xs },
  formIconWrap: { width: scale(36), height: scale(36), borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  formTitle: { fontFamily: 'Inter-Bold', fontSize: typography.md },

  twoCol: { flexDirection: 'row', gap: spacing.sm },
  halfInput: { flex: 1 },
  input: { minHeight: scale(50), borderWidth: 1, borderRadius: radius.md, paddingHorizontal: spacing.md, fontFamily: 'Inter-Regular', fontSize: typography.base },
  fieldLabel: { fontFamily: 'Inter-Bold', fontSize: typography.xs, textTransform: 'uppercase', letterSpacing: 0.4, marginTop: spacing.xs },
  pillRow: { gap: spacing.sm, paddingVertical: 2 },
  pill: { minHeight: 34, borderWidth: 1, borderRadius: radius.full, paddingHorizontal: spacing.md, flexDirection: 'row', alignItems: 'center', gap: 5 },
  pillText: { fontFamily: 'Inter-SemiBold', fontSize: typography.sm },

  errorBanner: { borderWidth: 1, borderRadius: radius.md, padding: spacing.sm },
  errorText: { fontFamily: 'Inter-Medium', fontSize: typography.sm },
  submitBtn: { height: scale(52), borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', marginTop: spacing.xs },
  submitText: { fontFamily: 'Inter-Bold', fontSize: typography.base },
});
