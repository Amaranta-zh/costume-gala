// POST /api/submissions
// Guest uploads their name + photo

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export const runtime = 'nodejs'
export const maxDuration = 30

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5 MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const name  = (formData.get('name') as string)?.trim()
    const photo = formData.get('photo') as File | null

    // ── Validation ──────────────────────────────────────────
    if (!name || name.length < 1 || name.length > 80) {
      return NextResponse.json({ error: 'Invalid name.' }, { status: 400 })
    }
    if (!photo) {
      return NextResponse.json({ error: 'Photo is required.' }, { status: 400 })
    }
    if (!ALLOWED_TYPES.includes(photo.type)) {
      return NextResponse.json({ error: 'Only JPG, PNG, or WebP allowed.' }, { status: 400 })
    }
    if (photo.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'Photo must be under 5 MB.' }, { status: 400 })
    }

    // ── Upload photo to Supabase Storage ────────────────────
    const ext      = photo.type.split('/')[1]
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
    const buffer   = Buffer.from(await photo.arrayBuffer())

    const { error: uploadError } = await supabaseAdmin.storage
      .from('photos')           // create bucket named "photos" in Supabase dashboard
      .upload(filename, buffer, { contentType: photo.type, upsert: false })

    if (uploadError) throw uploadError

    const { data: { publicUrl } } = supabaseAdmin.storage
      .from('photos')
      .getPublicUrl(filename)

    // ── Insert submission row ────────────────────────────────
    const { data, error: insertError } = await supabaseAdmin
      .from('submissions')
      .insert({ name, photo_url: publicUrl })
      .select('id, name, photo_url, created_at')
      .single()

    if (insertError) throw insertError

    return NextResponse.json({ ok: true, submission: data }, { status: 201 })

  } catch (err: any) {
    console.error('[POST /api/submissions]', err)
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
  }
}
