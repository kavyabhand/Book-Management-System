import { Platform, type TextStyle, type ViewStyle } from "react-native";

export const colors = {
  bg: "#F3F4F6",
  paper: "#FFFFFF",
  ink: "#111111",
  muted: "#5F6670",
  line: "#D5D8DE",
  forest: "#111111",
  forestMid: "#2A2E35",
  gold: "#D61F26",
  goldSoft: "#111111",
  sage: "#EEF0F3",
  danger: "#D61F26",
  dangerSoft: "#FDECEC",
  cream: "#FFFFFF",
  wood: "#111111",
};

export const spacing = {
  xs: 6,
  sm: 10,
  md: 16,
  lg: 24,
  xl: 36,
};

export const radius = {
  sm: 0,
  md: 0,
  lg: 0,
};

export const serif: TextStyle = Platform.OS === "web"
  ? {
      fontFamily:
        'ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      letterSpacing: -0.4,
    }
  : { letterSpacing: -0.4 };

export const sans: TextStyle = Platform.OS === "web"
  ? {
      fontFamily:
        'ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    }
  : {};

export const fieldReset: TextStyle = Platform.OS === "web"
  ? ({ outlineStyle: "none", outlineWidth: 0 } as unknown as TextStyle)
  : {};

export const cardShadow: ViewStyle = {};

export const liftShadow: ViewStyle = {};
