import { useState } from "react";
import { StyleSheet, View } from "react-native";

import BookScreen from "./src/screens/BookScreen";
import HomeScreen from "./src/screens/HomeScreen";
import LoansScreen from "./src/screens/LoansScreen";
import LoginScreen from "./src/screens/LoginScreen";
import SavedScreen from "./src/screens/SavedScreen";
import type { LibraryTab } from "./src/components/TopBar";
import { getAccessToken } from "./src/storage/session";
import { colors } from "./src/theme";

type Page = LibraryTab | "book";

export default function App() {
  const [authed, setAuthed] = useState(() => Boolean(getAccessToken()));
  const [page, setPage] = useState<Page>("catalog");
  const [bookId, setBookId] = useState<string | null>(null);

  function logout() {
    setPage("catalog");
    setBookId(null);
    setAuthed(false);
  }

  function openBook(id: string) {
    setBookId(id);
    setPage("book");
  }

  function go(tab: LibraryTab) {
    setPage(tab);
  }

  let screen = (
    <HomeScreen onLogout={logout} onOpenBook={openBook} onTab={go} />
  );
  if (page === "loans") {
    screen = <LoansScreen onLogout={logout} onOpenBook={openBook} onTab={go} />;
  } else if (page === "saved") {
    screen = <SavedScreen onLogout={logout} onOpenBook={openBook} onTab={go} />;
  } else if (page === "book" && bookId) {
    screen = (
      <BookScreen
        bookId={bookId}
        onBack={() => setPage("catalog")}
        onTab={go}
        onLogout={logout}
      />
    );
  }

  return (
    <View style={styles.root}>
      {authed ? screen : <LoginScreen onSuccess={() => setAuthed(true)} />}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },
});
