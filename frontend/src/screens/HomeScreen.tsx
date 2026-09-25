import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { createBook, fetchBooks } from "../api/books";
import type { Book } from "../types/book";

export default function HomeScreen() {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [saving, setSaving] = useState(false);

  const loadBooks = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      setBooks(await fetchBooks());
    } catch {
      setError("could not reach api — is the backend running?");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBooks();
  }, [loadBooks]);

  async function handleAdd() {
    const trimmedTitle = title.trim();
    const trimmedAuthor = author.trim();
    if (!trimmedTitle || !trimmedAuthor) {
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await createBook({ title: trimmedTitle, author: trimmedAuthor });
      setTitle("");
      setAuthor("");
      await loadBooks();
    } catch {
      setError("failed to add book");
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>book management</Text>

      <View style={styles.form}>
        <TextInput
          style={styles.input}
          placeholder="title"
          value={title}
          onChangeText={setTitle}
        />
        <TextInput
          style={styles.input}
          placeholder="author"
          value={author}
          onChangeText={setAuthor}
        />
        <Pressable
          style={[styles.button, saving && styles.buttonDisabled]}
          onPress={handleAdd}
          disabled={saving}
        >
          <Text style={styles.buttonText}>{saving ? "adding…" : "add book"}</Text>
        </Pressable>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {loading ? (
        <ActivityIndicator style={styles.loader} />
      ) : (
        <FlatList
          data={books}
          keyExtractor={(item) => String(item.id)}
          ListEmptyComponent={
            <Text style={styles.empty}>no books yet — add one above</Text>
          }
          renderItem={({ item }) => (
            <View style={styles.row}>
              <Text style={styles.bookTitle}>{item.title}</Text>
              <Text style={styles.bookAuthor}>{item.author}</Text>
            </View>
          )}
        />
      )}

      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    paddingTop: 64,
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "600",
    marginBottom: 16,
  },
  form: {
    gap: 8,
    marginBottom: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  button: {
    backgroundColor: "#111",
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: "center",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  error: {
    color: "#c00",
    marginBottom: 8,
  },
  loader: {
    marginTop: 24,
  },
  empty: {
    color: "#666",
    marginTop: 16,
  },
  row: {
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    paddingVertical: 12,
  },
  bookTitle: {
    fontSize: 17,
    fontWeight: "500",
  },
  bookAuthor: {
    fontSize: 15,
    color: "#666",
    marginTop: 2,
  },
});
