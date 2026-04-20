import { NextRequest, NextResponse } from 'next/server';
import { subscriptions } from '@/lib/subscriptionStore';

export async function POST(req: NextRequest) {
  const sub: PushSubscriptionJSON = await req.json();
  if (!sub.endpoint) {
    return NextResponse.json({ error: 'No endpoint' }, { status: 400 });
  }
  subscriptions.set(sub.endpoint, sub);
  return NextResponse.json({ ok: true });
}
