'use client';

import { useCallback, useEffect, useRef } from 'react';
import type { AppSettings } from '@/lib/db';
import { getRecentLogs, getTodayDrinks } from '@/lib/db';
import { getNextReminderDelay } from '@/lib/ai/smartScheduler';

function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const arr = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) arr[i] = rawData.charCodeAt(i);
  return arr.buffer;
}

export function usePushReminder(settings: AppSettings | null) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastLogRef = useRef<number>(Date.now());

  /** Update last-log timestamp (call after every drink tap) */
  const recordActivity = useCallback(() => {
    lastLogRef.current = Date.now();
    scheduleNextReminder();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings?.reminderInterval, settings?.smartReminders]);

  async function scheduleNextReminder() {
    if (!settings) return;

    let delayMs: number;

    if (settings.smartReminders) {
      try {
        const [recentLogs, todayLogs] = await Promise.all([
          getRecentLogs(7),
          getTodayDrinks(),
        ]);
        const schedule = getNextReminderDelay(
          recentLogs,
          todayLogs,
          settings.reminderInterval
        );
        delayMs = schedule.nextReminderMs;
        console.log(`[Smart Reminder] ${schedule.reason} (${Math.round(delayMs / 60000)} min)`);
      } catch {
        // Fallback on error
        delayMs = settings.reminderInterval * 60 * 1000;
      }
    } else {
      delayMs = settings.reminderInterval * 60 * 1000;
    }

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => fireReminder(), delayMs);
  }

  async function fireReminder() {
    // 1. Try server-push first
    try {
      const res = await fetch('/api/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: '💧 Time to hydrate!',
          body: "You haven't logged water recently. Stay on track!",
        }),
      });
      if (res.ok) {
        // Re-schedule next reminder after push
        scheduleNextReminder();
        return;
      }
    } catch { /* fallback below */ }

    // 2. Fallback: browser Notification API (works when tab is open/backgrounded)
    if (Notification.permission === 'granted') {
      new Notification('💧 Time to hydrate!', {
        body: "You haven't logged water recently. Tap the bottle!",
        icon: '/icons/icon-192.png',
        tag: 'hydration-reminder',
      });
    }

    // Re-schedule next reminder
    scheduleNextReminder();
  }

  /** Subscribe to Web Push and post subscription to server */
  async function subscribeToPush() {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return;

    try {
      const reg = await navigator.serviceWorker.ready;
      let sub = await reg.pushManager.getSubscription();

      if (!sub) {
        // Fetch VAPID public key
        const keyRes = await fetch('/api/vapid-public-key');
        if (!keyRes.ok) return; // VAPID not configured – skip server push
        const { publicKey } = await keyRes.json();

        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey),
        });
      }

      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sub.toJSON()),
      });
    } catch (err) {
      console.warn('Push subscribe failed (VAPID may not be configured):', err);
    }
  }

  // Start the reminder timer whenever interval changes
  useEffect(() => {
    if (!settings) return;
    scheduleNextReminder();
    subscribeToPush();
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings?.reminderInterval, settings?.smartReminders]);

  return { recordActivity };
}
