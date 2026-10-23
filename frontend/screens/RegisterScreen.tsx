/** 用途：註冊畫面，保留帳密驗證並提供欄位提示與提交回饋。 */
import React, { useRef, useState } from 'react';
import {
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/Colors';
import { SoftButton, SoftEntrance, SoftField } from '../components/SoftMotion';
import { LottieArt } from '../components/LottieArt';
import { Type } from '../constants/Typography';

const REGISTER_DOG_RUN = require('../assets/artwork/auth/dog-run-v1.json');
// 建立中的按鈕是深棕底，改用白色版本才看得見。
const REGISTER_PAWS_LOADING = require('../assets/artwork/auth/paws-loading-light-v1.json');

interface RegisterScreenProps {
  onRegisterSuccess: (email: string, password: string) => void | Promise<void>;
  onGoToLogin: () => void;
}
type Field = 'email' | 'password' | 'confirmPassword';

export default function RegisterScreen({ onRegisterSuccess, onGoToLogin }: RegisterScreenProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [focused, setFocused] = useState<Field | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const passwordRef = useRef<TextInput>(null);
  const confirmRef = useRef<TextInput>(null);
  const emailRef = useRef<TextInput>(null);

  const change = (field: Field, value: string) => {
    ({ email: setEmail, password: setPassword, confirmPassword: setConfirmPassword })[field](value);
    setErrors((current) => ({
      ...current,
      [field]: undefined,
      ...(field === 'password' ? { confirmPassword: undefined } : {}),
    }));
  };
  const handleRegisterPress = async () => {
    if (submittingRef.current) return;
    const next: Partial<Record<Field, string>> = {};
    if (!email) next.email = '請填寫電子郵件';
    if (!password) next.password = '請填寫密碼';
    if (!confirmPassword) next.confirmPassword = '請再次輸入密碼';
    if (email && password && confirmPassword) {
      if (password.length < 8) next.password = '密碼至少需要 8 個字元';
      else if (password !== confirmPassword) next.confirmPassword = '兩次輸入的密碼不一致';
    }
    setErrors(next);
    if (Object.keys(next).length) {
      (next.email ? emailRef : next.password ? passwordRef : confirmRef).current?.focus();
      return;
    }
    submittingRef.current = true;
    setSubmitting(true);
    Keyboard.dismiss();
    try {
      await onRegisterSuccess(email, password);
    } catch (error) {
      Alert.alert('操作失敗', (error as Error).message || '暫時無法建立帳號，請再試一次');
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };
  const fields = [
    {
      key: 'email' as const,
      label: '電子郵件',
      placeholder: '你的電子郵件',
      icon: 'mail-outline' as const,
      value: email,
      ref: emailRef,
    },
    {
      key: 'password' as const,
      label: '密碼',
      placeholder: '你的密碼',
      icon: 'lock-closed-outline' as const,
      value: password,
      ref: passwordRef,
    },
    {
      key: 'confirmPassword' as const,
      label: '確認密碼',
      placeholder: '再次輸入密碼',
      icon: 'shield-checkmark-outline' as const,
      value: confirmPassword,
      ref: confirmRef,
    },
  ];
  return (
    <View style={styles.background}>
      <SafeAreaView edges={['top', 'left', 'right']} style={styles.root}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.root}
        >
          <ScrollView
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            showsVerticalScrollIndicator={false}
          >
            <TouchableOpacity
              style={styles.backButton}
              onPress={onGoToLogin}
              disabled={submitting}
              accessibilityRole="button"
              accessibilityLabel="返回登入"
            >
              <Ionicons name="chevron-back" size={22} color={Colors.text} />
            </TouchableOpacity>
            <SoftEntrance style={styles.hero}>
              <LottieArt
                source={REGISTER_DOG_RUN}
                accessibilityLabel="奔跑的狗狗插畫"
                style={styles.heroArtwork}
              />
              <Text style={styles.brand}>MEGO</Text>
              <Text style={styles.title}>建立帳號</Text>
              <Text style={styles.subtitle}>開始記錄毛孩生活</Text>
            </SoftEntrance>
            <View style={styles.form}>
              {fields.map((field) => {
                const visible = field.key === 'password' ? showPassword : showConfirmPassword;
                const toggle = field.key === 'password' ? setShowPassword : setShowConfirmPassword;
                return (
                  <View key={field.key}>
                    <Text style={styles.label}>{field.label}</Text>
                    <SoftField
                      style={styles.inputShell}
                      focused={focused === field.key}
                      invalid={!!errors[field.key]}
                    >
                      <Ionicons
                        name={field.icon}
                        size={21}
                        color={focused === field.key ? Colors.primaryDecoration : Colors.subtext}
                      />
                      <TextInput
                        ref={field.ref}
                        style={styles.input}
                        accessibilityLabel={field.label}
                        placeholder={field.placeholder}
                        placeholderTextColor={Colors.subtext}
                        value={field.value}
                        onChangeText={(value) => change(field.key, value)}
                        editable={!submitting}
                        onFocus={() => setFocused(field.key)}
                        onBlur={() => setFocused(null)}
                        keyboardType={field.key === 'email' ? 'email-address' : 'default'}
                        autoCapitalize="none"
                        autoCorrect={false}
                        secureTextEntry={field.key !== 'email' && !visible}
                        textContentType={field.key === 'email' ? 'emailAddress' : 'newPassword'}
                        returnKeyType={field.key === 'confirmPassword' ? 'done' : 'next'}
                        submitBehavior={
                          field.key === 'confirmPassword' ? 'blurAndSubmit' : 'submit'
                        }
                        onSubmitEditing={() =>
                          field.key === 'email'
                            ? passwordRef.current?.focus()
                            : field.key === 'password'
                              ? confirmRef.current?.focus()
                              : void handleRegisterPress()
                        }
                      />
                      {field.key !== 'email' && (
                        <TouchableOpacity
                          style={styles.eyeButton}
                          disabled={submitting}
                          onPress={() => toggle((value) => !value)}
                          accessibilityRole="button"
                          accessibilityLabel={`${visible ? '隱藏' : '顯示'}${field.label}`}
                        >
                          <Ionicons
                            name={visible ? 'eye-off-outline' : 'eye-outline'}
                            size={21}
                            color={Colors.subtext}
                          />
                        </TouchableOpacity>
                      )}
                    </SoftField>
                    {errors[field.key] ? (
                      <Text accessibilityRole="alert" style={styles.error}>
                        {errors[field.key]}
                      </Text>
                    ) : field.key === 'password' ? (
                      <Text style={styles.hint}>至少 8 個字元</Text>
                    ) : null}
                  </View>
                );
              })}
              <SoftButton
                style={styles.registerButton}
                onPress={handleRegisterPress}
                disabled={submitting}
                accessibilityRole="button"
                accessibilityState={{ busy: submitting, disabled: submitting }}
              >
                {submitting && (
                  <LottieArt source={REGISTER_PAWS_LOADING} style={styles.loadingPaw} />
                )}
                <Text style={styles.registerButtonText}>{submitting ? '建立中…' : '註冊帳號'}</Text>
              </SoftButton>
              <TouchableOpacity
                style={styles.loginLinkButton}
                onPress={onGoToLogin}
                disabled={submitting}
                accessibilityRole="button"
                accessibilityLabel="已有帳號？立即登入"
              >
                <Text style={styles.loginSecondary}>已有帳號？ </Text>
                <Text style={styles.loginAccent}>立即登入</Text>
                <Ionicons name="chevron-forward" size={16} color={Colors.primaryDecoration} />
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}
const styles = StyleSheet.create({
  background: { flex: 1, backgroundColor: Colors.background },
  root: { flex: 1 },
  content: { flexGrow: 1, paddingHorizontal: 28, paddingTop: 18, paddingBottom: 32 },
  backButton: { width: 44, height: 44, alignItems: 'flex-start', justifyContent: 'center' },
  hero: { alignItems: 'center', marginTop: 8, marginBottom: 24 },
  heroArtwork: { width: 116, height: 116, marginBottom: 6 },
  loadingPaw: { width: 22, height: 22, marginRight: 8 },
  brand: {
    fontSize: Type.display2,
    fontWeight: '800',
    letterSpacing: 2,
    color: Colors.text,
    marginBottom: 8,
  },
  title: { fontSize: Type.display, fontWeight: '700', color: Colors.text },
  subtitle: { marginTop: 8, fontSize: Type.body, color: Colors.subtext },
  form: { width: '100%', maxWidth: 480, alignSelf: 'center', gap: 12 },
  label: { color: Colors.text, fontSize: Type.subhead, fontWeight: '600', marginBottom: 6 },
  inputShell: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: 'rgba(255,255,255,0.78)',
    paddingHorizontal: 18,
  },
  focused: { borderColor: Colors.primary },
  invalid: { borderColor: Colors.danger },
  hint: { fontSize: Type.caption, color: Colors.subtext, marginTop: 4 },
  error: { fontSize: Type.caption, color: Colors.danger, marginTop: 4 },
  input: {
    flex: 1,
    height: '100%',
    paddingHorizontal: 12,
    fontSize: Type.callout,
    color: Colors.text,
  },
  eyeButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  registerButton: {
    height: 56,
    marginTop: 8,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    backgroundColor: Colors.primary,
  },
  registerButtonText: { color: Colors.onPrimary, fontSize: Type.headline, fontWeight: '700' },
  loginLinkButton: {
    minHeight: 44,
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loginSecondary: { color: Colors.subtext, fontSize: Type.body },
  loginAccent: { color: Colors.primary, fontSize: Type.body, fontWeight: '700' },
});
