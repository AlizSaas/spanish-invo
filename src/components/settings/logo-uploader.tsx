import { useRef, useState } from 'react'
import { ImagePlus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { useT } from '@/lib/i18n'
import { cn } from '@/lib/utils'

/** Anything above this is rejected before we even try to resize it. */
const MAX_INPUT_BYTES = 10 * 1024 * 1024
/** Longest side after the client-side resize; the server shrinks further to 512px. */
const MAX_SIDE = 1024

/**
 * Downscale in the browser so a 6 MB phone photo becomes a ~100 KB WebP
 * before upload. Falls back to the original file if anything fails or if
 * the re-encoded result would not be smaller.
 */
async function downscale(file: File): Promise<File> {
  try {
    const bitmap = await createImageBitmap(file)
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height))
    const width = Math.max(1, Math.round(bitmap.width * scale))
    const height = Math.max(1, Math.round(bitmap.height * scale))
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) return file
    ctx.drawImage(bitmap, 0, 0, width, height)
    bitmap.close()
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/webp', 0.9),
    )
    if (!blob || blob.size >= file.size) return file
    return new File([blob], file.name.replace(/\.\w+$/, '') + '.webp', {
      type: 'image/webp',
    })
  } catch {
    return file
  }
}

/**
 * Uploads to /api/settings/logo (R2) and reports the served URL back.
 * Works standalone in onboarding and inside the settings form.
 */
export function LogoUploader({
  value,
  onChange,
  className,
}: {
  value: string | null | undefined
  onChange: (url: string | null) => void
  className?: string
}) {
  const t = useT()
  const inputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)

  const upload = async (file: File) => {
    if (file.size > MAX_INPUT_BYTES) return toast.error(t.settings.logoTooLarge)
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      return toast.error(t.settings.logoBadType)
    }
    setBusy(true)
    try {
      const body = new FormData()
      body.append('file', await downscale(file))
      const res = await fetch('/api/settings/logo', { method: 'POST', body })
      if (!res.ok) throw new Error(await res.text())
      const data = await res.json<{ logoUrl: string }>()
      onChange(data.logoUrl)
      toast.success(t.settings.logoUploaded)
    } catch {
      toast.error(t.auth.errors.generic)
    } finally {
      setBusy(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  const remove = async () => {
    setBusy(true)
    try {
      await fetch('/api/settings/logo', { method: 'DELETE' })
      onChange(null)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className={cn('flex items-center gap-4', className)}>
      <div className="bg-muted flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border">
        {busy ? (
          <Spinner className="size-5" />
        ) : value ? (
          <img src={value} alt="" className="size-full object-contain p-1" />
        ) : (
          <ImagePlus className="text-muted-foreground size-6" />
        )}
      </div>
      <div className="flex flex-col gap-2">
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="sr-only"
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) void upload(f)
          }}
        />
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={busy}
            onClick={() => inputRef.current?.click()}
          >
            {value ? t.onboarding.changeLogo : t.onboarding.uploadLogo}
          </Button>
          {value && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={busy}
              onClick={remove}
            >
              <Trash2 className="size-4" />
              {t.onboarding.removeLogo}
            </Button>
          )}
        </div>
        <p className="text-muted-foreground text-xs">{t.onboarding.logoHelp}</p>
      </div>
    </div>
  )
}
