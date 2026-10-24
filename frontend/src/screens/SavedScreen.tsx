import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { fetchSaved, unsaveBook } from "../api/saved";
import BookCover from "../components/BookCover";
import TopBar, { type LibraryTab } from "../components/TopBar";
import { colors, sans } from "../theme";
import type { Book } from "../types/book";

type Props = {
  onOpenBook: (id: string) => void;
  onTab: (tab: LibraryTab) => void;
  onLogout: () => void;
};

export default function SavedScreen({ onOpenBook, onTab, onLogout }: Props) {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    setBooks(await fetchSaved());
  }, []);

  useEffect(() => {
    setLoading(true);
    load()
      .catch((err) => {
        if (err instanceof Error && err.message === "session expired") {
          onLogout();
          return;
        }
        setError(err instanceof Error ? err.message : "could not load your list");
      })
      .finally(() => setLoading(false));
  }, [load, onLogout]);

  async function remove(book: Book) {
    setError(null);
    try {
      await unsaveBook(book.id);
      setBooks((prev) => prev.filter((item) => item.id !== book.id));
    } catch (err) {
      if (err instanceof Error && err.message === "session expired") {
        onLogout();
        return;
      }
      setError(err instanceof Error ? err.message : "could not remove");
    }
  }

  return (
    <View style={styles.page}>
      <TopBar tab="saved" onTab={onTab} onLogout={onLogout} />
      <View style={styles.column}>
        <ScrollView contentContainerStyle={styles.body}>
          <Text style={styles.heading}>saved</Text>
          <Text style={styles.note}>titles you want to remember. saving does not borrow a copy.</Text>
          {error ? <Text style={styles.error}>{error}</Text> : null}
          {loading ? <ActivityIndicator color={colors.forest} /> : null}
          {!loading && books.length === 0 ? (
            <Text style={styles.empty}>your list is empty.</Text>
          ) : null}
          {books.map((book) => (
            <View key={book.id} style={styles.card}>
              <BookCover title={book.title} />
              <View style={styles.cardBody}>
                <Pressable onPress={() => onOpenBook(book.id)}>
                  <Text style={styles.title}>{book.title}</Text>
                  <Text style={styles.author}>{book.author}</Text>
                </Pressable>
                <Pressable onPress={() => remove(book)} hitSlop={6}>
                  <Text style={styles.remove}>remove</Text>
                </Pressable>
              </View>
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
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.paper,
    borderRadius: 0,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    paddingVertical: 14,
    paddingHorizontal: 2,
  },
  cardBody: {
    flex: 1,
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
  remove: {
    ...sans,
    marginTop: 8,
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
