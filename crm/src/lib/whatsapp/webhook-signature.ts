import crypto from 'node:crypto'

/**
 * Verify the HMAC-SHA256 signature Meta attaches to webhook POSTs.
 *
 * Meta signs the raw request body with your App Secret and sends the
 * result in the `x-hub-signature-256: sha256=<hex>` header. Without
 * verification, anyone who knows our webhook URL can POST fabricated
 * status updates and drift broadcast counts arbitrarily.
 *
 * Reference:
 *   https://developers.facebook.com/docs/graph-api/webhooks/getting-started#verify-payloads
 *
 * Contract:
 *   `META_APP_SECRET` is **required**. If it's missing we fail closed —
 *   every request is rejected until the operator configures the
 *   secret. A previous version fell open with a warning log, which is
 *   unsafe for a public template: anyone who forgets the env var would
 *   be running a fully spoofable webhook.
 */
export function verifyMetaWebhookSignature(
  rawBody: string,
  signatureHeader: string | null,
  extraSecrets: string[] = [],
): boolean {
  // Candidatos: el App Secret guardado en la conexion (cada dueno puede usar
  // su propia app de Meta) y, como respaldo, META_APP_SECRET del servidor.
  const candidates = [...extraSecrets, process.env.META_APP_SECRET].filter(
    (s): s is string => typeof s === 'string' && s.length > 0,
  )
  if (candidates.length === 0) {
    console.error(
      '[webhook] No App Secret available (not saved in the WhatsApp connection ' +
        'and META_APP_SECRET is not set) - rejecting request.',
    )
    return false
  }

  if (!signatureHeader) return false
  if (!signatureHeader.startsWith('sha256=')) return false

  const a = Buffer.from(signatureHeader)
  for (const secret of candidates) {
    const expected =
      'sha256=' +
      crypto.createHmac('sha256', secret).update(rawBody).digest('hex')
    const b = Buffer.from(expected)
    // Lengths must match - timingSafeEqual throws otherwise.
    if (a.length === b.length && crypto.timingSafeEqual(a, b)) return true
  }
  return false
}
