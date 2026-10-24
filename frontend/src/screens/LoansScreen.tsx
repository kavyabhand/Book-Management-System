import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { fetchAllLoans, fetchMyLoans, returnLoan } from "../api/loans";
import TopBar, { type LibraryTab } from "../components/TopBar";
import { shortDate } from "../format";
import { getRole } from "../storage/session";
import { colors, sans } from "../theme";
import type { Loan } from "../types/loan";

type Props = {
  onOpenBook: (id: string) => void;
  onTab: (tab: LibraryTab) => void;
  onLogout: () => void;
};

export default function LoansScreen({ onOpenBook, onTab, onLogout }: Props) {
  const isAdmin = getRole() === "admin";
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    const rows = isAdmin ? await fetchAllLoans() : await fetchMyLoans();
    setLoans(rows);
  }, [isAdmin]);

  useEffect(() => {
    setLoading(true);
    load()
      .catch((err) => {
        if (err instanceof Error && err.message === "session expired") {
          onLogout();
          return;
        }
        setError(err instanceof Error ? err.message : "could not load loans");
      })
      .finally(() => setLoading(false));
  }, [load, onLogout]);

  async function giveBack(loan: Loan) {
    setError(null);
    try {
      await returnLoan(loan.id);
      await load();
    } catch (err) {
      if (err instanceof Error && err.message === "session expired") {
        onLogout();
        return;
      }
      setError(err instanceof Error ? err.message : "could not return");
    }
  }

  return (
    <View style={styles.page}>
      <TopBar tab="loans" onTab={onTab} onLogout={onLogout} />
      <View style={styles.column}>
        <ScrollView contentContainerStyle={styles.body}>
          <Text style={styles.heading}>{isAdmin ? "out on loan" : "my loans"}</Text>
          <Text style={styles.note}>
            {isAdmin
              ? "every copy that is still out, and who has it. a loan is due in 14 days."
              : "titles you have borrowed. they are due 14 days after you take them."}
          </Text>
          {error ? <Text style={styles.error}>{error}</Text> : null}
          {loading ? <ActivityIndicator color={colors.forest} /> : null}
          {!loading && loans.length === 0 ? (
            <Text style={styles.empty}>nothing is out.</Text>
          ) : null}
          {loans.map((loan) => (
            <View key={loan.id} style={styles.card}>
              <Pressable onPress={() => onOpenBook(loan.book_id)}>
                <Text style={styles.title}>{loan.title}</Text>
                <Text style={styles.author}>{loan.author}</Text>
              </Pressable>
              {loan.username ? <Text style={styles.who}>with {loan.username}</Text> : null}
              <Text style={[styles.due, loan.late && styles.late]}>
                due {shortDate(loan.due_at)}
                {loan.late ? "  ·  late" : ""}
              </Text>
              <Pressable onPress={() => giveBack(loan)} hitSlop={6}>
                <Text style={styles.action}>return</Text>
              </Pressable>
            </View>
          ))}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: "center",
  },
  column: {
    flex: 1,
    width: "100%",
    maxWidth: 760,
    backgroundColor: colors.paper,
  },
  body: {
    paddingHorizontal: 22,
    paddingBottom: 40,
  },
  heading: {
    ...sans,
    fontWeight: "700",
    fontSize: 28,
    color: colors.ink,
    marginTop: 8,
  },
  note: {
    ...sans,
    color: colors.muted,
    marginTop: 6,
    marginBottom: 16,
    lineHeight: 20,
  },
  card: {
    backgroundColor: colors.paper,
    borderRadius: 0,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    paddingVertical: 14,
    paddingHorizontal: 2,
  },
  title: {
    ...sans,
    fontWeight: "700",
    fontSize: 18,
    color: colors.ink,
  },
  author: {
    ...sans,
    color: colors.muted,
    marginTop: 2,
  },
  who: {
    ...sans,
    marginTop: 8,
    color: colors.forest,
    fontWeight: "600",
  },
  due: {
    ...sans,
    marginTop: 6,
    color: colors.forestMid,
  },
  late: {
    color: colors.danger,
  },
  action: {
    ...sans,
    marginTop: 10,
    color: colors.danger,
    fontWeight: "600",
  },
  empty: {
    ...sans,
    color: colors.muted,
  },
  error: {
    ...sans,
    color: colors.danger,
    marginBottom: 10,
  },
});
