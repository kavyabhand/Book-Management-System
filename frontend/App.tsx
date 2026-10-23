import { useState } from "react";
import { StyleSheet, View } from "react-native";

import HomeScreen from "./src/screens/HomeScreen";
import LoginScreen from "./src/screens/LoginScreen";
import { getAccessToken } from "./src/storage/session";
import { colors } from "./src/theme";

export default function App() {
  const [authed, setAuthed] = useState(() => Boolean(getAccessToken()));

  return (
    <View style={styles.root}>
      {authed ? (
        <HomeScreen onLogout={() => setAuthed(false)} />
      ) : (
        <LoginScreen onSuccess={() => setAuthed(true)} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },
});
