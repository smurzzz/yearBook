import React from "react";
import { Redirect } from "expo-router";
import { useMockApp } from "@/prototype/store";

/** Entry redirect: sign-in gate first, then role home. */
export default function Index() {
  const { state } = useMockApp();

  const href = !state.signedIn
    ? "/(auth)/sign-in"
    : state.role === "admin"
      ? state.screen === "events"
        ? "/(admin)/events"
        : "/(admin)/review"
      : state.screen === "upload"
        ? "/(student)/upload"
        : state.screen === "myPhotos"
          ? "/(student)/my-photos"
          : "/(student)/home";

  return <Redirect href={href} />;
}
