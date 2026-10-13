import type { CountdownInfo } from "./types";

const DAY = 86_400_000;

/** Countdown chip copy. "Under 3 days" gets the urgent treatment, past
 *  deadlines read "Closed" — never a color on its own. */
export const countdown = (deadlineIso: string): CountdownInfo => {
  const ms = new Date(deadlineIso).getTime() - Date.now();
  if (ms <= 0) {
    return { days: 0, closed: true, urgent: false, label: "Closed", short: "Closed" };
  }
  const days = Math.floor(ms / DAY);
  const urgent = days < 3;
  const label =
    days === 0
      ? "Closes in under a day"
      : `${days} day${days === 1 ? "" : "s"} left`;
  return { days, closed: false, urgent, label, short: days === 0 ? "<1d left" : `${days}d left` };
};

export const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

export const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

export const formatShortDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });

export const relativeTime = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 0) return "just now";
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Yesterday";
  if (days < 30) return `${days} days ago`;
  return formatDate(iso);
};

export const initials = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

export const plural = (count: number, word: string) =>
  `${count} ${word}${count === 1 ? "" : "s"}`;
