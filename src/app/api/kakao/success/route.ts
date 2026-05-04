import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { pg_token, tid } = await request.json()

    if (!pg_token || !tid) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Find subscription by KakaoTalk transaction ID
    const { data: subscription, error: subError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('kakao_order_id', tid)
      .single()

    if (subError || !subscription) {
      return NextResponse.json({ error: 'Subscription not found' }, { status: 404 })
    }

    // Mock KakaoTalk Pay approval (in production, call actual KakaoTalk Pay API)
    const approvalResult = {
      tid: tid,
      status: 'success',
      amount: subscription.amount
    }

    if (approvalResult.status === 'success') {
      const now = new Date()
      const nextBilling = new Date(now)
      nextBilling.setMonth(nextBilling.getMonth() + 1) // Add 1 month

      // Update subscription to active
      const { error: updateError } = await supabase
        .from('subscriptions')
        .update({
          status: 'active',
          started_at: now.toISOString(),
          next_billing_at: nextBilling.toISOString(),
          kakao_payment_key: pg_token,
          kakao_approved_at: now.toISOString()
        })
        .eq('id', subscription.id)

      if (updateError) {
        return NextResponse.json({ error: 'Failed to update subscription' }, { status: 500 })
      }

      // Update teacher subscription status
      await supabase
        .from('teachers')
        .update({
          subscription_status: 'active',
          subscription_id: tid,
          subscription_started_at: now.toISOString(),
          subscription_next_billing_at: nextBilling.toISOString()
        })
        .eq('id', subscription.teacher_id)

      // Update payment request
      await supabase
        .from('payment_requests')
        .update({
          status: 'approved',
          approved_at: now.toISOString()
        })
        .eq('subscription_id', subscription.id)

      // Create subscription event
      await supabase
        .from('subscription_events')
        .insert([{
          subscription_id: subscription.id,
          event_type: 'activated',
          event_data: {
            kakao_tid: tid,
            amount: subscription.amount,
            next_billing: nextBilling.toISOString()
          }
        }])

      return NextResponse.json({
        success: true,
        subscriptionId: subscription.id,
        status: 'active',
        nextBilling: nextBilling.toISOString()
      })
    }

    return NextResponse.json({ error: 'Payment approval failed' }, { status: 400 })

  } catch (error) {
    console.error('KakaoPay success callback error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
