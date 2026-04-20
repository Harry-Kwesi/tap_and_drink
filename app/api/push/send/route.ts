import { NextRequest, NextResponse } from 'next/server';
import webPush from 'web-push';
import { getVapidKeys } from '@/lib/vapid';
import { subscriptions } from '@/lib/subscriptionStore';

export async function POST(req: NextRequest) {
  try {
    getVapidKeys(); // sets VAPID details on the webPush instance
  } catch {
    return NextResponse.json({ error: 'VAPID not configured' }, { status: 500 });
  }

  const { title, body } = (await req.json().catch(() => ({}))) as {
    title?: string;
    body?: string;
  };

  const payload = JSON.stringify({
    title: title ?? '💧 Time to hydrate!',
    body: body ?? 'You haven\'t logged water in a while. Tap the bottle!',
    icon: '/icons/icon-192.png',
  });

  const results = await Promise.allSettled(
    Array.from(subscriptions.values()).map((sub) =>
      webPush.sendNotification(sub as webPush.PushSubscription, payload)
    )
  );

  const sent = results.filter((r) => r.status === 'fulfilled').length;
  const failed = results.filter((r) => r.status === 'rejected').length;

  return NextResponse.json({ sent, failed });
}
