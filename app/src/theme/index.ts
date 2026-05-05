export { colors } from "./colors";

export const spacing = {
  1: "4px",
  2: "8px",
  3: "12px",
  4: "16px",
  5: "20px",
  6: "24px",
  8: "32px",
  10: "40px",
  12: "48px",
  16: "64px",
} as const;

export const radius = {
  sm: "6px",
  md: "10px",
  lg: "14px",
  xl: "20px",
  full: "9999px",
} as const;

export const shadow = {
  sm: "0 1px 3px rgba(0,0,0,0.06)",
  md: "0 4px 14px rgba(0,0,0,0.08)",
  lg: "0 10px 30px rgba(0,0,0,0.1)",
} as const;

export const COST_PER_VIEW = 0.05;
