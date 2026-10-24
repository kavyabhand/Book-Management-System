import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { fetchBook } from "../api/books";
import { borrowBook, returnLoan } from "../api/loans";
import { saveBook, unsaveBook } from "../api/saved";
import BookCover from "../components/BookCover";
import TopBar, { type LibraryTab } from "../components/TopBar";
import { shortDate } from "../format";
import { getRole } from "../storage/session";
import { colors, sans, serif } from "../theme";
import type { Book } from "../types/book";

type Props = {
  bookId: string;
  onBack: () => void;
  onTab: (tab: LibraryTab) => void;
  onLogout: () => void;
};

export default function BookScreen({ bookId, onBack, onTab, onLogout }: Props) {
  const isLibrarian = getRole() === "admin";
  const [book, setBook] = useState<Book | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    const next = await fetchBook(bookId);
    setBook(next);
  }, [bookId]);

  useEffect(() => {
    load().catch((err) => {
      if (err instanceof Error && err.message === "session expired") {
        onLogout();
        return;
      }
      setError(err instanceof Error ? err.message : "could not open this title");
    });
  }, [load, onLogout]);

  async function run(action: () => Promise<unknown>) {
    setBusy(true);
    setError(null);
    try {
      await action();
      await load();
    } catch (err) {
      if (err instanceof Error && err.message === "session expired") {
        onLogout();
        return;
      }
      setError(err instanceof Error ? err.message : "something went wrong");
    } finally {
      setBusy(false);
    }
  }

  const stock =
    !book
      ? ""
      : book.available <= 0
        ? "out"
        : book.copies > 1
          ? `${book.available} of ${book.copies} copies in`
          : "one copy in";

  return (
    <View style={styles.page}>
      <TopBar tab="catalog" onTab={onTab} onLogout={onLogout} />
      <View style={styles.column}>
        <ScrollView contentContainerStyle={styles.body}>
          <Pressable onPress={onBack} hitSlop={8}>
            <Text style={styles.back}>back to the catalog</Text>
          </Pressable>

          {!book && !error ? (
            <ActivityIndicator color={colors.forest} style={styles.spinner} />
          ) : null}

          {book ? (
            <View style={styles.card}>
              <View style={styles.head}>
                <BookCover title={book.title} />
                <View style={styles.headText}>
                  <Text style={styles.genre}>{book.genre}</Text>
                  <Text style={styles.title}>{book.title}</Text>
                  <Text style={styles.author}>
                    {book.author}
                    {book.year ? `  ·  ${book.year}` : ""}
                  </Text>
                </View>
              </View>

              {book.description ? <Text style={styles.description}>{book.description}</Text> : null}

              <Text style={styles.fact}>{stock}</Text>
              {book.isbn ? <Text style={styles.fact}>isbn {book.isbn}</Text> : null}
              {book.my_loan ? (
                <Text style={[styles.fact, book.my_loan.late && styles.late]}>
                  due {shortDate(book.my_loan.due_at)}
                  {book.my_loan.late ? "  ·  late" : ""}
                </Text>
              ) : null}

              {error ? <Text style={styles.error}>{error}</Text> : null}

              {isLibrarian && !book.my_loan ? (
                <Text style={styles.deskNote}>
                  readers check this out. the out tab lists who still has a copy.
                </Text>
              ) : (
                <View style={styles.actions}>
                  {book.my_loan ? (
                    <Pressable
                      style={styles.primary}
                      disabled={busy}
                      onPress={() => run(() => returnLoan(book.my_loan!.id))}
                    >
                      <Text style={styles.primaryText}>{busy ? "saving…" : "return"}</Text>
                    </Pressable>
                  ) : (
                    <Pressable
                      style={[styles.primary, book.available <= 0 && styles.off]}
                      disabled={busy || book.available <= 0}
                      onPress={() => run(() => borrowBook(book.id))}
                    >
                      <Text style={styles.primaryText}>
                        {book.available <= 0 ? "none in" : busy ? "saving…" : "borrow"}
                      </Text>
                    </Pressable>
                  )}
                  {isLibrarian ? null : (
                    <Pressable
                      style={styles.ghost}
                      disabled={busy}
                      onPress={() => run(() => (book.saved ? unsaveBook(book.id) : saveBook(book.id)))}
                    >
                      <Text style={styles.ghostText}>{book.saved ? "saved" : "save for later"}</Text>
                    </Pressable>
                  )}
                </View>
              )}
            </View>
          ) : null}

          {!book && error ? <Text style={styles.error}>{error}</Text> : null}
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
  back: {
    ...sans,
    color: colors.forestMid,
    fontWeight: "600",
    marginTop: 8,
    marginBottom: 16,
  },
  spinner: {
    marginTop: 40,
  },
  card: {
    backgroundColor: colors.paper,
    borderRadius: 0,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 18,
  },
  deskNote: {
    ...sans,
    marginTop: 18,
    color: colors.muted,
    lineHeight: 20,
  },
  head: {
    flexDirection: "row",
    alignItems: "center",
  },
  headText: {
    flex: 1,
  },
  genre: {
    ...sans,
    color: colors.gold,
    fontSize: 12,
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  title: {
    ...sans,
    fontSize: 28,
    lineHeight: 32,
    fontWeight: "700",
    color: colors.ink,
    marginTop: 4,
  },
  author: {
    ...sans,
    marginTop: 6,
    color: colors.muted,
    fontSize: 15,
  },
  description: {
    ...serif,
    marginTop: 18,
    fontSize: 17,
    lineHeight: 26,
    color: colors.ink,
  },
  fact: {
    ...sans,
    marginTop: 10,
    color: colors.forestMid,
    fontSize: 14,
  },
  late: {
    color: colors.danger,
  },
  actions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 18,
  },
  primary: {
    flex: 1,
    backgroundColor: colors.forest,
    borderRadius: 0,
    minHeight: 46,
    alignItems: "center",
    justifyContent: "center",
  },
  off: {
    backgroundColor: "#DDD6CA",
  },
  primaryText: {
    ...sans,
    color: colors.cream,
    fontWeight: "600",
  },
  ghost: {
    borderRadius: 0,
    borderWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  ghostText: {
    ...sans,
    color: colors.forest,
    fontWeight: "600",
  },
  error: {
    ...sans,
    color: colors.danger,
    marginTop: 12,
  },
});
