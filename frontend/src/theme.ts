import { Platform, type TextStyle, type ViewStyle } from "react-native";

export const colors = {
  bg: "#E6E0D4",
  paper: "#F7F4EE",
  ink: "#1A1814",
  muted: "#6F675C",
  line: "#E3DCD0",
  forest: "#1B332C",
  forestMid: "#2A4A40",
  gold: "#A68445",
  goldSoft: "#F3E7CF",
  sage: "#E4EFE7",
  danger: "#8E3A2F",
  dangerSoft: "#F8E7E3",
  cream: "#F3EEE4",
};

export const spacing = {
  xs: 6,
  sm: 10,
  md: 16,
  lg: 24,
  xl: 36,
};

export const radius = {
  sm: 10,
  md: 16,
  lg: 28,
};

export const serif: TextStyle = {
  fontFamily: Platform.select({
    web: 'Georgia, "Iowan Old Style", Palatino, "Palatino Linotype", serif',
    ios: "Georgia",
    default: "serif",
  }),
};

export const sans: TextStyle = Platform.OS === "web"
  ? {
      fontFamily:
        'ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    }
  : {};

export const fieldReset: TextStyle = Platform.OS === "web"
  ? ({ outlineStyle: "none", outlineWidth: 0 } as unknown as TextStyle)
  : {};

export const cardShadow: ViewStyle = Platform.OS === "web"
  ? { boxShadow: "0 10px 30px rgba(32, 28, 22, 0.06)" }
  : {
      shadowColor: "#201C16",
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.06,
      shadowRadius: 16,
      elevation: 2,
    };

export const liftShadow: ViewStyle = Platform.OS === "web"
  ? { boxShadow: "0 24px 60px rgba(27, 51, 44, 0.16)" }
  : {
      shadowColor: "#1B332C",
      shadowOffset: { width: 0, height: 16 },
      shadowOpacity: 0.16,
      shadowRadius: 28,
      elevation: 8,
    };
