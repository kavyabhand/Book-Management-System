import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";

import { login, register } from "../api/auth";
import { colors, fieldReset, liftShadow, radius, sans, serif, spacing } from "../theme";

type Props = {
  onSuccess: () => void;
};

type Mode = "login" | "register";

const ACCOUNTS = [
  { role: "librarian", username: "admin", password: "admin123", note: "can add and edit books" },
  { role: "reader", username: "reader", password: "reader123", note: "can browse and search" },
];

export default function LoginScreen({ onSuccess }: Props) {
  const { width } = useWindowDimensions();
  const wide = width >= 860;
  const [mode, setMode] = useState<Mode>("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function switchMode(next: Mode) {
    setMode(next);
    setError(null);
    if (next === "register") {
      setUsername("");
      setPassword("");
    }
  }

  function fillAccount(name: string, pass: string) {
    setMode("login");
    setUsername(name);
    setPassword(pass);
    setError(null);
  }

  async function submit() {
    const name = username.trim();
    const pass = password;
    if (!name || !pass) {
      setError("enter a username and password");
      return;
    }
    if (mode === "register" && name.length < 3) {
      setError("username needs at least 3 characters");
      return;
    }
    if (mode === "register" && pass.length < 6) {
      setError("password needs at least 6 characters");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      if (mode === "login") {
        await login(name, pass);
      } else {
        await register(name, pass);
      }
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.page}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[styles.scroll, !wide && styles.scrollNarrow]}
        >
          <View style={[styles.shell, wide && styles.shellWide, liftShadow]}>
            <View style={[styles.brand, !wide && styles.brandNarrow, wide && styles.brandWide]}>
              <View>
                <Text style={styles.kicker}>local library</Text>
                <Text style={styles.wordmark}>bookstack</Text>
                <View style={styles.rule} />
                <Text style={styles.lede}>
                  one catalog, two kinds of account. the librarian keeps the
                  shelf. readers search it.
                </Text>
              </View>

              {mode === "login" ? (
                <View style={styles.accounts}>
                  {ACCOUNTS.map((account) => (
                    <Pressable
                      key={account.username}
                      style={({ pressed }) => [
                        styles.account,
                        pressed && styles.accountPressed,
                      ]}
                      onPress={() => fillAccount(account.username, account.password)}
                    >
                      <View style={styles.accountTop}>
                        <Text style={styles.accountRole}>{account.role}</Text>
                        <Text style={styles.accountUse}>use</Text>
                      </View>
                      <Text style={styles.accountCred}>
                        {account.username}  ·  {account.password}
                      </Text>
                      <Text style={styles.accountNote}>{account.note}</Text>
                    </Pressable>
                  ))}
                </View>
              ) : (
                <Text style={styles.registerNote}>
                  a new account is always a reader. it is saved in the local
                  database, separate from the librarian.
                </Text>
              )}
            </View>

            <View style={[styles.form, !wide && styles.formNarrow, wide && styles.formWide]}>
              <View style={styles.switch}>
                <Pressable
                  style={[styles.switchItem, mode === "login" && styles.switchOn]}
                  onPress={() => switchMode("login")}
                >
                  <Text style={[styles.switchText, mode === "login" && styles.switchTextOn]}>
                    sign in
                  </Text>
                </Pressable>
                <Pressable
                  style={[styles.switchItem, mode === "register" && styles.switchOn]}
                  onPress={() => switchMode("register")}
                >
                  <Text
                    style={[styles.switchText, mode === "register" && styles.switchTextOn]}
                  >
                    register
                  </Text>
                </Pressable>
              </View>

              <Text style={styles.formTitle}>
                {mode === "login" ? "welcome back" : "open a reader account"}
              </Text>
              <Text style={styles.formHint}>
                {mode === "login"
                  ? "pick a sample account, or use one you registered."
                  : "choose a username. you can browse and search after this."}
              </Text>

              <Text style={styles.label}>username</Text>
              <TextInput
                style={styles.input}
                placeholder="your name"
                placeholderTextColor={colors.muted}
                autoCapitalize="none"
                autoCorrect={false}
                value={username}
                onChangeText={setUsername}
              />

              <Text style={styles.label}>password</Text>
              <TextInput
                style={styles.input}
                placeholder={mode === "register" ? "at least 6 characters" : "password"}
                placeholderTextColor={colors.muted}
                secureTextEntry
                value={password}
                onChangeText={setPassword}
                onSubmitEditing={submit}
              />

              {error ? <Text style={styles.error}>{error}</Text> : null}

              <Pressable
                style={({ pressed }) => [
                  styles.button,
                  (pressed || loading) && styles.buttonPressed,
                ]}
                onPress={submit}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color={colors.cream} />
                ) : (
                  <Text style={styles.buttonText}>
                    {mode === "login" ? "sign in" : "create account"}
                  </Text>
                )}
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
      <StatusBar style="dark" />
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  flex: {
    flex: 1,
  },
  scroll: {
    flexGrow: 1,
    justifyContent: "center",
    padding: spacing.lg,
  },
  scrollNarrow: {
    padding: 12,
    justifyContent: "flex-start",
  },
  shell: {
    width: "100%",
    maxWidth: 920,
    alignSelf: "center",
    backgroundColor: colors.paper,
    borderRadius: radius.lg,
    overflow: "hidden",
  },
  shellWide: {
    flexDirection: "row",
    minHeight: 560,
  },
  brand: {
    backgroundColor: colors.forest,
    paddingHorizontal: 28,
    paddingTop: 32,
    paddingBottom: 28,
  },
  brandNarrow: {
    paddingTop: 22,
    paddingBottom: 18,
  },
  brandWide: {
    flex: 1.05,
    justifyContent: "space-between",
    paddingVertical: 40,
  },
  kicker: {
    ...sans,
    color: colors.gold,
    fontSize: 12,
    letterSpacing: 2.2,
    textTransform: "uppercase",
  },
  wordmark: {
    ...serif,
    color: colors.cream,
    fontSize: 48,
    lineHeight: 52,
    marginTop: 10,
  },
  rule: {
    width: 42,
    height: 2,
    backgroundColor: colors.gold,
    marginTop: 16,
    marginBottom: 16,
  },
  lede: {
    ...sans,
    color: "rgba(243, 238, 228, 0.82)",
    fontSize: 16,
    lineHeight: 24,
    maxWidth: 320,
  },
  accounts: {
    gap: 10,
    marginTop: 20,
  },
  account: {
    borderWidth: 1,
    borderColor: "rgba(243, 238, 228, 0.16)",
    backgroundColor: "rgba(243, 238, 228, 0.06)",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  accountPressed: {
    backgroundColor: "rgba(243, 238, 228, 0.14)",
  },
  accountTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  accountRole: {
    ...sans,
    color: colors.cream,
    fontSize: 14,
    fontWeight: "600",
  },
  accountUse: {
    ...sans,
    color: colors.gold,
    fontSize: 12,
    letterSpacing: 0.6,
  },
  accountCred: {
    ...sans,
    color: "rgba(243, 238, 228, 0.9)",
    marginTop: 4,
    fontSize: 13,
  },
  accountNote: {
    ...sans,
    color: "rgba(243, 238, 228, 0.55)",
    marginTop: 2,
    fontSize: 12,
  },
  registerNote: {
    ...sans,
    color: "rgba(243, 238, 228, 0.75)",
    marginTop: 28,
    fontSize: 14,
    lineHeight: 21,
    maxWidth: 300,
  },
  form: {
    backgroundColor: colors.paper,
    paddingHorizontal: 28,
    paddingVertical: 32,
  },
  formNarrow: {
    paddingTop: 22,
    paddingBottom: 22,
  },
  formWide: {
    flex: 0.95,
    justifyContent: "center",
  },
  switch: {
    flexDirection: "row",
    backgroundColor: colors.cream,
    borderRadius: 999,
    padding: 4,
    alignSelf: "flex-start",
    marginBottom: 22,
  },
  switchItem: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
  },
  switchOn: {
    backgroundColor: colors.forest,
  },
  switchText: {
    ...sans,
    color: colors.muted,
    fontSize: 13,
    fontWeight: "600",
  },
  switchTextOn: {
    color: colors.cream,
  },
  formTitle: {
    ...serif,
    fontSize: 32,
    lineHeight: 36,
    color: colors.ink,
  },
  formHint: {
    ...sans,
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 8,
    marginBottom: 22,
  },
  label: {
    ...sans,
    fontSize: 12,
    letterSpacing: 1.1,
    textTransform: "uppercase",
    color: colors.muted,
    marginBottom: 6,
  },
  input: {
    ...sans,
    ...fieldReset,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: "#FBF9F4",
    borderRadius: radius.sm,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 16,
    color: colors.ink,
    marginBottom: 14,
  },
  error: {
    ...sans,
    color: colors.danger,
    backgroundColor: colors.dangerSoft,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
    overflow: "hidden",
    fontSize: 14,
  },
  button: {
    backgroundColor: colors.forest,
    borderRadius: 12,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  buttonPressed: {
    opacity: 0.85,
  },
  buttonText: {
    ...sans,
    color: colors.cream,
    fontSize: 16,
    fontWeight: "600",
  },
});
