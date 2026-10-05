// Business logo storage in R2 (binding STORAGE). One object per owner.

const LOGO_KEY = (userId: string) => `logos/${userId}`
export const LOGO_MAX_BYTES = 2 * 1024 * 1024
export const LOGO_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp'])

export async function putLogo(bucket: R2Bucket, userId: string, file: File) {
  await bucket.put(LOGO_KEY(userId), await file.arrayBuffer(), {
    httpMetadata: {
      contentType: file.type,
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
