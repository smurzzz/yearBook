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

export default function AdminLayout() {
  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={({ state, navigation }) => (
        <TabBar
          current={KEY_BY_ROUTE[state.routeNames[state.index]] ?? "review"}
          role="admin"
          navigate={(key) => navigation.navigate(ROUTE[key])}
        />
      )}
    >
      <Tabs.Screen name="review" />
      <Tabs.Screen name="events" />
    </Tabs>
  );
}
