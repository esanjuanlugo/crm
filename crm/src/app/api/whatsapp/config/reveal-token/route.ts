import { NextResponse } from 'next/server'
import { createClient as createPlainClient } from '@supabase/supabase-js'
import { requireRole, toErrorResponse } from '@/lib/auth/account'
import { checkRateLimit, rateLimitResponse } from '@/lib/rate-limit'
import { decrypt } from '@/lib/whatsapp/encryption'

/**
 * POST /api/whatsapp/config/reveal-token
 *
 * Devuelve el token de acceso o el App Secret guardado (campo field:
 * 'access_token' por defecto, o 'app_secret'), descifrado, SOLO si el
 * usuario confirma su contrasena. Solo owner/admin. Maximo 5 intentos cada
 * 10 minutos por usuario para frenar fuerza bruta.
 *
 * La contrasena se comprueba con un cliente aparte que no guarda sesion,
 * asi no se tocan las cookies ni la sesion actual del usuario.
 */
export async function POST(request: Request) {
  try {
    const { supabase, accountId, userId } = await requireRole('admin')

    const limit = checkRateLimit('wa-reveal-token:' + userId, {
      limit: 5,
      windowMs: 10 * 60 * 1000,
    })
    if (!limit.success) return rateLimitResponse(limit)

    const body = await request.json().catch(() => null)
    const password = typeof body?.password === 'string' ? body.password : ''
    const field: 'access_token' | 'app_secret' =
      body?.field === 'app_secret' ? 'app_secret' : 'access_token'
    if (!password) {
      return NextResponse.json({ error: 'Password is required' }, { status: 400 })
    }

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user?.email) {
      return NextResponse.json(
        { error: 'Tu cuenta no tiene contrasena configurada.' },
        { status: 400 },
      )
    }

    const verifier = createPlainClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
        },
      },
    )
    const { error: pwError } = await verifier.auth.signInWithPassword({
      email: user.email,
      password,
    })
    if (pwError) {
      return NextResponse.json({ error: 'Invalid password' }, { status: 401 })
    }

    const { data: config } = await supabase
      .from('whatsapp_config')
      .select('access_token, app_secret')
      .eq('account_id', accountId)
      .maybeSingle()

    const stored = config?.[field]
    if (!stored) {
      return NextResponse.json(
        { error: 'No hay valor guardado.' },
        { status: 404 },
      )
    }

    let value: string
    try {
      value = decrypt(stored)
    } catch {
      return NextResponse.json(
        {
          error:
            'El valor guardado no se puede descifrar (ENCRYPTION_KEY distinta). Escribelo de nuevo.',
        },
        { status: 409 },
      )
    }

    return NextResponse.json(
      field === 'app_secret'
        ? { app_secret: value }
        : { access_token: value },
      { headers: { 'Cache-Control': 'no-store' } },
    )
  } catch (err) {
    return toErrorResponse(err)
  }
}
