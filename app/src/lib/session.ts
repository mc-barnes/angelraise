import { cookies } from "next/headers";

const COOKIE_NAME = "ar_anon";
const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const isUuid = (value: string): boolean => UUID_RE.test(value);

export const getAnonSession = async (): Promise<string | null> => {
  const store = await cookies();
  const value = store.get(COOKIE_NAME)?.value;
  if (!value || !isUuid(value)) return null;
  return value;
};

export const setAnonSession = async (
  id: string,
  options: { secure: boolean }
): Promise<void> => {
  const store = await cookies();
  store.set({
    name: COOKIE_NAME,
    value: id,
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: ONE_YEAR_SECONDS,
    secure: options.secure,
  });
};
