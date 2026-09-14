import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

export async function GET(
  _request: Request,
  {
    params,
  }: {
    params: Promise<{ id: string }>
  },
) {
  const { id } = await params
  const supabase = await createClient()

  const { data: claimsData } =
    await supabase.auth.getClaims()

  if (!claimsData?.claims?.sub) {
    return NextResponse.json(
      { error: 'Authentication required.' },
      { status: 401 },
    )
  }

  const { data: portalAllowed } = await supabase.rpc(
    'has_permission',
    {
      requested_permission_code: 'nominee.portal',
      requested_scope_type: null,
      requested_scope_id: null,
    },
  )

  if (portalAllowed !== true) {
    return NextResponse.json(
      { error: 'Nominee Portal access required.' },
      { status: 403 },
    )
  }

  // This query is deliberately performed with the user's RLS-bound
  // client first. If the resource is not published for the nominee's
  // linked edition, no row is returned.
  const { data: resource, error } = await supabase
    .from('nominee_resources')
    .select(
      'id,storage_bucket,storage_path,original_filename',
    )
    .eq('id', id)
    .maybeSingle()

  if (error || !resource) {
    return NextResponse.json(
      { error: 'Resource not found.' },
      { status: 404 },
    )
  }

  const admin = createAdminClient()

  const { data: signed, error: signedError } =
    await admin.storage
      .from(resource.storage_bucket)
      .createSignedUrl(resource.storage_path, 60, {
        download:
          resource.original_filename || 'nominee-resource',
      })

  if (signedError || !signed?.signedUrl) {
    console.error(
      'nominee resource signed URL',
      signedError,
    )

    return NextResponse.json(
      { error: 'Unable to prepare download.' },
      { status: 500 },
    )
  }

  return NextResponse.redirect(signed.signedUrl, {
    status: 302,
  })
}
