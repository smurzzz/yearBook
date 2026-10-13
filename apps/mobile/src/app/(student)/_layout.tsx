import React from "react";
import { Tabs } from "expo-router";
import { TabBar, type TabKey } from "@/components/TabBar";

const ROUTE: Record<TabKey, string> = {
  home: "home",
  upload: "upload",
  myPhotos: "my-photos",
  review: "review",
  events: "events",
};

const KEY_BY_ROUTE: Record<string, TabKey> = {
  home: "home",
  upload: "upload",
  "my-photos": "myPhotos",
  review: "review",
  events: "events",
};

export default function StudentLayout() {
  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={({ state, navigation }) => (
        <TabBar
          current={KEY_BY_ROUTE[state.routeNames[state.index]] ?? "home"}
          role="student"
          navigate={(key) => navigation.navigate(ROUTE[key])}
        />
      )}
    >
      <Tabs.Screen name="home" />
      <Tabs.Screen name="upload" />
      <Tabs.Screen name="my-photos" />
    </Tabs>
  );
}
