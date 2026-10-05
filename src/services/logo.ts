// Business logo storage in R2 (binding STORAGE). One object per owner.
//
// Uploads are normalized on the way in: the client already downsizes large
// photos (see components/settings/logo-uploader.tsx) and the Worker runs the
// result through Cloudflare Images (binding IMAGES) so what lands in R2 is a
// small WebP no wider than 512px. If the Images binding is unavailable (local
// dev without it) the original bytes are stored unchanged.

const LOGO_KEY = (userId: string) => `logos/${userId}`
/** Server-side ceiling after the client resize; 5 MB leaves room for huge PNG logos. */
export const LOGO_MAX_BYTES = 5 * 1024 * 1024
export const LOGO_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp'])
const LOGO_MAX_SIDE = 512

export async function putLogo(
  bucket: R2Bucket,
  userId: string,
  file: File,
  images?: ImagesBinding,
) {
  let bytes: ArrayBuffer = await file.arrayBuffer()
  let contentType = file.type

  if (images) {
    try {
      const result = await images
        .input(new Blob([bytes]).stream())
        .transform({
          width: LOGO_MAX_SIDE,
          height: LOGO_MAX_SIDE,
          fit: 'scale-down',
        })
        .output({ format: 'image/webp', quality: 85 })
      bytes = await result.response().arrayBuffer()
      contentType = result.contentType()
    } catch (err) {
      console.warn(
        JSON.stringify({
          level: 'warn',
          msg: 'logo transform skipped',
          error: err instanceof Error ? err.message : String(err),
        }),
      )
    }
  }

  await bucket.put(LOGO_KEY(userId), bytes, {
    httpMetadata: {
      contentType,
      cacheControl: 'public, max-age=3600',
    },
  })
  return `/api/logo/${userId}?v=${Date.now()}`
}

export async function deleteLogo(bucket: R2Bucket, userId: string) {
  await bucket.delete(LOGO_KEY(userId))
}

export async function getLogo(bucket: R2Bucket, userId: string) {
  return bucket.get(LOGO_KEY(userId))
}

/** Inline the logo for the PDF renderer, which can't reach a dev server URL. */
export async function getLogoDataUrl(
  bucket: R2Bucket,
  userId: string,
): Promise<string | null> {
  const obj = await getLogo(bucket, userId)
  if (!obj) return null
  const bytes = new Uint8Array(await obj.arrayBuffer())
  let binary = ''
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  }
  const type = obj.httpMetadata?.contentType ?? 'image/png'
  return `data:${type};base64,${btoa(binary)}`
}
