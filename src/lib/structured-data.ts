import {
  PRO_MONTHLY_PRICE,
  PRO_YEARLY_PRICE,
  SITE_URL,
  SUPPORT_EMAIL,
  pageUrl,
} from './constants'
import { es } from './i18n/es'
import { FREE_LIMITS } from './plan'

/**
 * JSON-LD for the landing page.
 *
 * Written in Spanish on purpose: Spanish-speaking tradespeople in the US are
 * the market, and this is what Google's AI answers and the knowledge panel
 * read. Without it, searches for "factura facil" get answered with the
 * Mexican CFDI/SAT and Peruvian SUNAT products of nearly the same name, so
 * `alternateName` and `disambiguatingDescription` exist to pull those apart.
 *
 * Copy is pulled from the Spanish dictionary and the pricing constants so the
 * markup cannot drift away from what the page actually says.
 */
export function landingJsonLd(): string {
  const l = es.landing
  const appId = `${SITE_URL}/#app`
  const orgId = `${SITE_URL}/#organization`

  const offer = (
    name: string,
    price: number,
    unitCode: 'MON' | 'ANN' | null,
    description: string,
  ) => ({
    '@type': 'Offer',
    name,
    price: price.toFixed(2),
    priceCurrency: 'USD',
    description,
    availability: 'https://schema.org/InStock',
    url: `${SITE_URL}/#precios`,
    ...(unitCode
      ? {
          priceSpecification: {
            '@type': 'UnitPriceSpecification',
            price: price.toFixed(2),
            priceCurrency: 'USD',
            unitCode,
          },
        }
      : {}),
  })

  const graph = [
    {
      '@type': 'SoftwareApplication',
      '@id': appId,
      name: 'Factura Fácil',
      // People type the brand without the accent far more often than with it.
      alternateName: ['Factura Facil', 'Factura Fácil App', 'facturafacilapp'],
      url: `${SITE_URL}/`,
      applicationCategory: 'BusinessApplication',
      applicationSubCategory: 'Facturación y presupuestos',
      operatingSystem: 'Web (Android, iPhone, computadora)',
      browserRequirements: 'Funciona en el navegador. No hay nada que instalar.',
      inLanguage: ['es', 'en'],
      isAccessibleForFree: true,
      description: `${l.heroTitle} ${l.heroBody}`,
      disambiguatingDescription:
        'Aplicación independiente para hacer facturas y presupuestos en español y enviarlos por WhatsApp, pensada para negocios de servicio en Estados Unidos. No emite CFDI ni factura electrónica ante el SAT de México, la SUNAT de Perú ni la DGI de Panamá, y no tiene relación con otras empresas de nombre parecido.',
      featureList: [
        'Asistente de IA que crea el cliente, la factura y el presupuesto a partir de un mensaje escrito con tus palabras',
        'Preguntas en español sobre tu negocio: quién te debe, cuánto cobraste este mes, qué facturas están vencidas',
        'Envío por WhatsApp y Messenger, enlace o PDF, sin que el cliente instale nada',
        'Presupuestos que se convierten en factura con un toque',
        'Cobros por Zelle, Cash App, Venmo, efectivo o cheque, sin comisiones de la app',
        'Tu logo, tus impuestos y tus datos en cada documento',
        'Facturas en español o en inglés según el cliente, desde la misma cuenta',
      ],
      audience: {
        '@type': 'BusinessAudience',
        audienceType: l.forWho,
        name: 'Negocios de servicio hispanohablantes en Estados Unidos',
      },
      areaServed: [
        { '@type': 'Country', name: 'Estados Unidos' },
        { '@type': 'Country', name: 'México' },
      ],
      offers: [
        offer(
          'Gratis',
          0,
          null,
          `${FREE_LIMITS.documentsPerMonth} facturas y ${FREE_LIMITS.documentsPerMonth} presupuestos al mes y ${FREE_LIMITS.aiQuestionsPerMonth} preguntas al asistente de IA. Sin tarjeta y sin vencimiento.`,
        ),
        offer(
          'Pro mensual',
          PRO_MONTHLY_PRICE,
          'MON',
          'Facturas, presupuestos y asistente de IA ilimitados. 14 días de prueba gratis.',
        ),
        offer(
          'Pro anual',
          PRO_YEARLY_PRICE,
          'ANN',
          'Facturas, presupuestos y asistente de IA ilimitados, pagando el año completo.',
        ),
      ],
      publisher: { '@id': orgId },
    },
    {
      '@type': 'Organization',
      '@id': orgId,
      name: 'Factura Fácil',
      alternateName: 'Factura Facil',
      url: `${SITE_URL}/`,
      logo: `${SITE_URL}/email-mark.png`,
      email: SUPPORT_EMAIL,
      description:
        'Factura Fácil hace facturas y presupuestos con inteligencia artificial para jardineros, limpieza, mecánicos, construcción y otros negocios de servicio que trabajan en español.',
      contactPoint: {
        '@type': 'ContactPoint',
        contactType: 'customer support',
        email: SUPPORT_EMAIL,
        availableLanguage: ['Spanish', 'English'],
      },
    },
    {
      '@type': 'FAQPage',
      '@id': `${SITE_URL}/#preguntas`,
      mainEntity: l.faq.map((item) => ({
        '@type': 'Question',
        name: item.q,
        acceptedAnswer: { '@type': 'Answer', text: item.a },
      })),
    },
    {
      '@type': 'WebSite',
      '@id': `${SITE_URL}/#website`,
      url: `${SITE_URL}/`,
      name: 'Factura Fácil',
      inLanguage: 'es',
      publisher: { '@id': orgId },
    },
    {
      '@type': 'WebPage',
      '@id': pageUrl('/'),
      url: pageUrl('/'),
      name: l.heroTitle,
      inLanguage: 'es',
      isPartOf: { '@id': `${SITE_URL}/#website` },
      about: { '@id': appId },
    },
  ]

  return JSON.stringify({ '@context': 'https://schema.org', '@graph': graph })
}
