import { Link } from '@tanstack/react-router'
import type { DocumentType } from '@/lib/constants'

/** Typed link to a document's detail page, whichever type it is. */
export function DocLink({
  id,
  type,
  edit = false,
  className,
  children,
}: {
  id: string
  type: DocumentType
  edit?: boolean
  className?: string
  children: React.ReactNode
}) {
  if (type === 'estimate') {
    return edit ? (
      <Link
        to="/estimates/$estimateId/edit"
        params={{ estimateId: id }}
        className={className}
      >
        {children}
      </Link>
    ) : (
      <Link
        to="/estimates/$estimateId"
        params={{ estimateId: id }}
        className={className}
      >
        {children}
      </Link>
    )
  }
  return edit ? (
    <Link
      to="/invoices/$invoiceId/edit"
      params={{ invoiceId: id }}
      className={className}
    >
      {children}
    </Link>
  ) : (
    <Link
      to="/invoices/$invoiceId"
      params={{ invoiceId: id }}
      className={className}
    >
      {children}
    </Link>
  )
}

export function docPath(id: string, type: DocumentType, edit = false) {
  const base = type === 'estimate' ? `/estimates/${id}` : `/invoices/${id}`
  return edit ? `${base}/edit` : base
}
