"use client";

import { useEffect, useCallback } from "react";

/**
 * useReminder hook
 * Handles Web Notification permissions and daily streak reminders.
 */
export function useReminder(user: any, userProfile: any) {
  const requestPermission = useCallback(async () => {
    if (!("Notification" in window)) return;
    
    if (Notification.permission === "default") {
      try {
        await Notification.requestPermission();
      } catch (e) {
        console.error("[Reminder] Permission request failed:", e);
      }
    }
  }, []);

  const sendNotification = useCallback((title: string, body: string) => {
    if (!("Notification" in window) || Notification.permission !== "granted") return;
    
    try {
      new Notification(title, {
        body,
        icon: "/favicon.ico",
      });
    } catch (e) {
      console.error("[Reminder] Notification failed:", e);
    }
  }, []);

  useEffect(() => {
    if (!user || !userProfile) return;

    // 1. Request permission once per session if not decided
    requestPermission();

    // 2. Daily Reminder Logic
    // If the user hasn't been active today, and it's getting late (e.g., after 6 PM)
    // We send a nudge.
    const checkReminder = () => {
      const now = new Date();
      const hour = now.getHours();
      const today = now.toISOString().split("T")[0];
      
      const lastActive = userProfile.lastActiveDate;
      const isNotActiveToday = lastActive !== today;
      
      // If it's evening (after 7 PM) and they haven't been active today
      if (isNotActiveToday && hour >= 19) {
        const lastNudge = localStorage.getItem(`nudge_${today}`);
        if (!lastNudge) {
          sendNotification(
            "Don't lose your streak! 🔥",
            "Keep up your daily pharmacy study habit on Cubepharm."
          );
          localStorage.setItem(`nudge_${today}`, "sent");
        }
      }
    };

    // Check immediately and then every hour
    checkReminder();
    const interval = setInterval(checkReminder, 60 * 60 * 1000);

    return () => clearInterval(interval);
  }, [user, userProfile, requestPermission, sendNotification]);
}
