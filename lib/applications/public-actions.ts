'use server'

import {
  randomBytes,
  randomUUID,
} from 'node:crypto'
import { redirect } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'

function text(
  formData: FormData,
  key: string,
  max = 2000,
) {
  return String(formData.get(key) ?? '')
    .trim()
    .slice(0, max)
}

function nullable(value: string) {
  return value || null
}

const photoMimeTypes = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
])

const supportingMimeTypes = new Set([
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/webp',
])

function extensionForFile(file: File) {
  const match = file.name
    .toLowerCase()
    .match(/\.([a-z0-9]{1,8})$/)

  return match?.[1] ?? 'bin'
}

function usableFile(
  value: FormDataEntryValue | null,
) {
  return value instanceof File && value.size > 0
    ? value
    : null
}

function applicationCode(year: number) {
  return `APP-${year}-${randomBytes(5)
    .toString('hex')
    .toUpperCase()}`
}

async function cleanupFiles(
  admin: ReturnType<typeof createAdminClient>,
  paths: string[],
) {
  if (!paths.length) return

  const { error } = await admin.storage
    .from('nomination-applications')
    .remove(paths)

  if (error) {
    console.error(
      'public application file cleanup',
      error,
    )
  }
}

export async function submitPublicNominationApplication(
  formData: FormData,
) {
  const honeypot = text(
    formData,
    'company_website',
    200,
  )

  if (honeypot) {
    redirect('/apply?submitted=1')
  }

  const applicationType = text(
    formData,
    'application_type',
    20,
  )
  const categoryId = text(
    formData,
    'category_id',
    80,
  )
  const fullName = text(
    formData,
    'full_name',
    160,
  )
  const institution = text(
    formData,
    'institution',
    220,
  )
  const nomineeEmail = text(
    formData,
    'nominee_email',
    180,
  ).toLowerCase()
  const nomineePhone = text(
    formData,
    'nominee_phone',
    50,
  )
  const bio = text(
    formData,
    'bio',
    5000,
  )

  const nominatorName = text(
    formData,
    'nominator_name',
    160,
  )
  const nominatorRelationship = text(
    formData,
    'nominator_relationship',
    160,
  )
  const nominatorEmail = text(
    formData,
    'nominator_email',
    180,
  ).toLowerCase()
  const nominatorPhone = text(
    formData,
    'nominator_phone',
    50,
  )

  const referenceName = text(
    formData,
    'reference_name',
    160,
  )
  const referenceContact = text(
    formData,
    'reference_contact',
    220,
  )

  const declarationAccepted =
    formData.get('declaration') === 'on'

  if (
    !['self', 'nomination'].includes(
      applicationType,
    ) ||
    !categoryId ||
    fullName.length < 2 ||
    bio.length < 30 ||
    !declarationAccepted
  ) {
    redirect('/apply?error=invalid_form')
  }

  if (
    applicationType === 'self' &&
    !nomineeEmail &&
    !nomineePhone
  ) {
    redirect('/apply?error=nominee_contact_required')
  }

  if (
    applicationType === 'nomination' &&
    (
      !nominatorName ||
      (!nominatorEmail && !nominatorPhone)
    )
  ) {
    redirect('/apply?error=nominator_contact_required')
  }

  const photo = usableFile(
    formData.get('photo'),
  )
  const supporting = usableFile(
    formData.get('supporting_document'),
  )

  if (
    photo &&
    (
      photo.size > 5 * 1024 * 1024 ||
      !photoMimeTypes.has(photo.type)
    )
  ) {
    redirect('/apply?error=invalid_photo')
  }

  if (
    supporting &&
    (
      supporting.size > 10 * 1024 * 1024 ||
      !supportingMimeTypes.has(
        supporting.type,
      )
    )
  ) {
    redirect(
      '/apply?error=invalid_supporting_document',
    )
  }

  const admin = createAdminClient()

  const { data: category, error: categoryError } =
    await admin
      .from('award_categories')
      .select(
        'id,award_edition_id,name,is_active,is_public',
      )
      .eq('id', categoryId)
      .maybeSingle()

  if (
    categoryError ||
    !category ||
    category.is_active !== true ||
    category.is_public !== true
  ) {
    redirect('/apply?error=category_unavailable')
  }

  const { data: edition, error: editionError } =
    await admin
      .from('award_editions')
      .select(
        'id,year,status,is_public',
      )
      .eq('id', category.award_edition_id)
      .maybeSingle()

  if (
    editionError ||
    !edition ||
    edition.status !== 'nominations_open' ||
    edition.is_public !== true
  ) {
    redirect('/apply?error=nominations_closed')
  }

  const nomineeId = randomUUID()
  const code = applicationCode(edition.year)
  const uploadedPaths: string[] = []

  let photoPath: string | null = null
  let supportingPath: string | null = null

  try {
    if (photo) {
      photoPath =
        `${edition.id}/${nomineeId}/photo-${randomUUID()}.${extensionForFile(photo)}`

      const { error: uploadError } =
        await admin.storage
          .from('nomination-applications')
          .upload(
            photoPath,
            Buffer.from(
              await photo.arrayBuffer(),
            ),
            {
              contentType: photo.type,
              upsert: false,
            },
          )

      if (uploadError) {
        console.error(
          'public application photo upload',
          uploadError,
        )
        redirect('/apply?error=upload_failed')
      }

      uploadedPaths.push(photoPath)
    }

    if (supporting) {
      supportingPath =
        `${edition.id}/${nomineeId}/support-${randomUUID()}.${extensionForFile(supporting)}`

      const { error: uploadError } =
        await admin.storage
          .from('nomination-applications')
          .upload(
            supportingPath,
            Buffer.from(
              await supporting.arrayBuffer(),
            ),
            {
              contentType: supporting.type,
              upsert: false,
            },
          )

      if (uploadError) {
        console.error(
          'public application supporting upload',
          uploadError,
        )
        await cleanupFiles(
          admin,
          uploadedPaths,
        )
        redirect('/apply?error=upload_failed')
      }

      uploadedPaths.push(supportingPath)
    }

    const { data: nominee, error: nomineeError } =
      await admin
        .from('nominees')
        .insert({
          id: nomineeId,
          award_edition_id: edition.id,
          category_id: category.id,
          nominee_code: code,
          full_name: fullName,
          institution:
            nullable(institution),
          bio,
          photo_url: null,
          status: 'submitted',
          is_public: false,
          created_by: null,
        })
        .select(
          'id,nominee_code,award_edition_id',
        )
        .single()

    if (nomineeError || !nominee) {
      console.error(
        'public nominee application create',
        nomineeError,
      )
      await cleanupFiles(
        admin,
        uploadedPaths,
      )
      redirect('/apply?error=submission_failed')
    }

    const { error: detailError } =
      await admin
        .from('nominee_application_details')
        .insert({
          nominee_id: nominee.id,
          application_type:
            applicationType,
          nominee_email:
            nullable(nomineeEmail),
          nominee_phone:
            nullable(nomineePhone),
          nominator_name:
            applicationType === 'nomination'
              ? nullable(nominatorName)
              : null,
          nominator_relationship:
            applicationType === 'nomination'
              ? nullable(
                  nominatorRelationship,
                )
              : null,
          nominator_email:
            applicationType === 'nomination'
              ? nullable(nominatorEmail)
              : null,
          nominator_phone:
            applicationType === 'nomination'
              ? nullable(nominatorPhone)
              : null,
          reference_name:
            nullable(referenceName),
          reference_contact:
            nullable(referenceContact),
          declaration_accepted: true,
          photo_storage_path:
            photoPath,
          photo_original_filename:
            photo?.name ?? null,
          photo_mime_type:
            photo?.type ?? null,
          photo_file_size_bytes:
            photo?.size ?? null,
          supporting_storage_path:
            supportingPath,
          supporting_original_filename:
            supporting?.name ?? null,
          supporting_mime_type:
            supporting?.type ?? null,
          supporting_file_size_bytes:
            supporting?.size ?? null,
          submission_source:
            'public_web',
        })

    if (detailError) {
      console.error(
        'public nominee application details',
        detailError,
      )

      await admin
        .from('nominees')
        .delete()
        .eq('id', nominee.id)

      await cleanupFiles(
        admin,
        uploadedPaths,
      )

      redirect('/apply?error=submission_failed')
    }

    const { error: historyError } =
      await admin
        .from('nominee_application_reviews')
        .insert({
          nominee_id: nominee.id,
          award_edition_id:
            nominee.award_edition_id,
          from_status: 'draft',
          to_status: 'submitted',
          note: 'Public application submitted.',
          reviewer_user_id: null,
        })

    if (historyError) {
      console.error(
        'public application history',
        historyError,
      )
    }

    redirect(
      `/apply?submitted=1&reference=${encodeURIComponent(
        nominee.nominee_code,
      )}`,
    )
  } catch (error) {
    if (
      error &&
      typeof error === 'object' &&
      'digest' in error
    ) {
      throw error
    }

    console.error(
      'submitPublicNominationApplication',
      error,
    )

    await cleanupFiles(
      admin,
      uploadedPaths,
    )

    redirect('/apply?error=submission_failed')
  }
}
