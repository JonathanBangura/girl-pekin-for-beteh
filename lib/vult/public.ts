import { createPublicClient } from '@/lib/supabase/public'

export type PublicVultOrderKind = 'vote' | 'ticket'

export async function getPublicVultPaymentStatus(
  kind: PublicVultOrderKind,
  token: string,
) {
  const supabase = createPublicClient()

  const { data, error } = await supabase.rpc(
    'get_public_vult_payment_status',
    {
      p_order_kind: kind,
      p_public_token: token,
    },
  )

  if (error || !data?.length) return null
  return data[0]
}
