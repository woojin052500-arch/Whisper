import { NextRequest, NextResponse } from 'next/server'
import { getOrCreateTeacher } from '@/lib/auth'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { teacherEmail, itemName, quantity, totalAmount } = await request.json()

    if (!teacherEmail || !itemName || !quantity || !totalAmount) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Get or create teacher
    const teacher = await getOrCreateTeacher(teacherEmail)
    if (!teacher) {
      return NextResponse.json({ error: 'Teacher not found' }, { status: 404 })
    }

    // Create pending subscription
    const { data: subscription, error: subError } = await supabase
      .from('subscriptions')
      .insert([{
        teacher_id: teacher.id,
        subscription_id: `temp_${Date.now()}_${teacher.id}`,
        status: 'pending',
        amount: totalAmount,
        billing_cycle: 'monthly'
      }])
      .select()
      .single()

    if (subError || !subscription) {
      return NextResponse.json({ error: 'Failed to create subscription' }, { status: 500 })
    }

    // Create payment request for tracking
    const { error: paymentError } = await supabase
      .from('payment_requests')
      .insert([{
        teacher_id: teacher.id,
        amount: totalAmount,
        status: 'pending',
        subscription_id: subscription.id,
        is_subscription: true
      }])

    if (paymentError) {
      return NextResponse.json({ error: 'Failed to create payment request' }, { status: 500 })
    }

    // KakaoTalk Pay API call (mock implementation)
    // In production, you would integrate with actual KakaoTalk Pay API
    const kakaoPayResponse = {
      tid: `T${Date.now()}`, // Transaction ID
      next_redirect_app_url: `https://open.kakao.com/o/g3INItti`,
      next_redirect_mobile_url: `https://open.kakao.com/o/g3INItti`,
      next_redirect_pc_url: `https://open.kakao.com/o/g3INItti`,
      android_app_scheme: 'kakaotalk://kakaopay',
      ios_app_scheme: 'kakaotalk://kakaopay'
    }

    // Update subscription with KakaoTalk transaction ID
    await supabase
      .from('subscriptions')
      .update({
        subscription_id: kakaoPayResponse.tid,
        kakao_order_id: kakaoPayResponse.tid
      })
      .eq('id', subscription.id)

    return NextResponse.json({
      success: true,
      subscriptionId: subscription.id,
      kakaoPay: kakaoPayResponse
    })

  } catch (error) {
    console.error('KakaoPay API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
