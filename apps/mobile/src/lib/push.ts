/* Push registration — features/notifications.md, tasks T-092/T-095.

   The bell sheet asks for permission once; the token is then registered with
   the API (PUT /me/push-token) so the server can address this device, and
   removed again when the student signs out (DELETE /me/push-token) — a
   device token belongs to one session at a time.

   Everything degrades quietly: the web build has no push at all, and Expo Go
   on Android cannot receive FCM pushes, so the app must keep working without
   a token. A failure here is never fatal — the in-app notification list
   (GET /notifications) is the source of truth either way. */

import { Platform } from "react-native";
import Constants from "expo-constants";
import { api } from "../api";

export interface PushRegistration {
  token: string;
  platform: "android" | "ios";
}

let registered: PushRegistration | null = null;

/** The token the API knows about, if any. */
export const registeredPushToken = (): PushRegistration | null => registered;

/** True when this platform can deliver push at all. */
export const pushSupported = (): boolean => Platform.OS === "ios" || Platform.OS === "android";

/**
 * Ask for permission and hand the token to the API.
 * Returns the token when the server knows about it, null otherwise.
 */
export const registerPushToken = async (): Promise<string | null> => {
  if (!pushSupported()) return null;

  try {
    // Imported lazily: the web bundle must not carry the native module.
    const Notifications = await import("expo-notifications");
    const { status: existing } = await Notifications.getPermissionsAsync();
    const permission =
      existing === "granted"
        ? { status: existing, granted: true }
        : await Notifications.requestPermissionsAsync();
    if (permission.status !== "granted") return null;

    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      (Constants.expoConfig?.owner as { projectId?: string } | undefined)?.projectId;
    if (!projectId) {
      console.warn("[push] no EAS projectId — token not registered");
      return null;
    }

    const { data } = await Notifications.getExpoPushTokenAsync({ projectId });
    const platform = Platform.OS === "ios" ? "ios" : "android";
    await api.putPushToken({ expo_token: data, platform });
    registered = { token: data, platform };
    return data;
  } catch (error) {
    // Expo Go on Android, a device without Play services, a revoked
    // permission — none of these may break the app.
    console.warn("[push] registration failed", error);
    return null;
  }
};

/** Remove the device token from the API (sign-out, account deletion). */
export const unregisterPushToken = async (): Promise<void> => {
  const current = registered;
  registered = null;
  if (!current) return;
  try {
    await api.deletePushToken({ expo_token: current.token, platform: current.platform });
  } catch (error) {
    console.warn("[push] unregister failed", error);
  }
};
