/** Central env access with production defaults. */

export function hostOf(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url.replace(/^https?:\/\//, "").replace(/\/.*$/, "");
  }
}

export const MENU_URL = process.env.MENU_DOMAIN || "https://menu.elsa3dcafe.com";
export const ADMIN_URL = process.env.ADMIN_DOMAIN || "https://adminmenueg.elsa3dcafe.com";
export const MENU_HOST = hostOf(MENU_URL);
export const ADMIN_HOST = hostOf(ADMIN_URL);

export const ADMIN_USERNAME = process.env.ADMIN_USERNAME || "admin";

export function isProd(): boolean {
  return process.env.NODE_ENV === "production";
}
