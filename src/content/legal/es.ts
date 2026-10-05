import type { LegalContent } from './types'

/**
 * Spanish legal copy (canonical). Plain-language, written for owners of small
 * service businesses. Review with a lawyer before launch and keep the
 * `updated` date current whenever the text changes.
 */
export const legalEs: LegalContent = {
  privacy: {
    title: 'Política de privacidad',
    updated: '5 de octubre de 2026',
    intro:
      'Factura Fácil (facturafacilapp.com) es una herramienta para crear facturas y presupuestos y compartirlos por WhatsApp o SMS. Esta política explica qué datos recopilamos, para qué los usamos y qué derechos tienes. Si tienes dudas, escríbenos a {email}.',
    sections: [
      {
        heading: 'Qué datos recopilamos',
        body: [
          'Datos de tu cuenta: nombre, correo electrónico y contraseña. La contraseña se guarda cifrada con hash, nunca en texto plano.',
          'Datos de tu negocio: nombre, teléfono, dirección, logo, zona horaria, moneda e instrucciones de pago que tú escribes.',
          'Datos de tus clientes: nombre, teléfono, correo y empresa que tú registras para enviarles facturas. Tú eres responsable de tener permiso para usar esos datos.',
          'Documentos: facturas, presupuestos, conceptos, importes, notas y su historial (creada, enviada, vista, pagada).',
          'Datos técnicos: dirección IP, tipo de navegador, páginas visitadas y registros de errores. Los usamos para la seguridad y para mantener el servicio funcionando.',
        ],
      },
      {
        heading: 'Para qué usamos tus datos',
        body: [
          'Para prestarte el servicio: generar tus facturas y PDF, mostrar la factura a tu cliente mediante el enlace que compartes, enviar SMS cuando lo pides y recordarte lo que tienes pendiente de cobrar.',
          'Para comunicarnos contigo: correos de bienvenida, recuperación de contraseña y avisos importantes sobre el servicio. No enviamos publicidad de terceros.',
          'Para proteger el servicio: detectar abusos, prevenir fraudes y resolver errores.',
        ],
      },
      {
        heading: 'Enlaces públicos de facturas',
        body: [
          'Cuando compartes una factura o presupuesto generamos un enlace único y difícil de adivinar. Cualquier persona que tenga ese enlace puede ver el documento y descargar el PDF. Pedimos a los buscadores que no indexen esas páginas. Comparte el enlace solo con tu cliente.',
        ],
      },
      {
        heading: 'Asistente con inteligencia artificial',
        body: [
          'Si usas el asistente, tus preguntas y los datos necesarios para responderlas (por ejemplo, facturas o clientes) se envían a OpenAI para generar la respuesta. Según su política para la API, OpenAI no usa esos datos para entrenar sus modelos. El historial del chat se guarda en tu cuenta y puedes borrarlo cuando quieras.',
        ],
      },
      {
        heading: 'Con quién compartimos datos',
        body: [
          'No vendemos tus datos. Solo los compartimos con los proveedores que necesitamos para operar el servicio: Cloudflare (alojamiento, almacenamiento de logos, generación de PDF y envío de correos), Neon (base de datos), OpenAI (asistente de IA) y Twilio (envío de SMS cuando eliges esa opción).',
          'También podemos compartir datos si la ley lo exige o para proteger la seguridad del servicio y de otros usuarios.',
        ],
      },
      {
        heading: 'Cookies y almacenamiento local',
        body: [
          'Usamos una cookie de sesión para mantenerte conectado y el almacenamiento local del navegador para recordar preferencias como el idioma. No usamos cookies de publicidad ni rastreadores de terceros.',
        ],
      },
      {
        heading: 'Cuánto tiempo guardamos los datos',
        body: [
          'Guardamos tus datos mientras tu cuenta esté activa. Si pides que eliminemos tu cuenta, borramos tus datos de nuestros sistemas en un plazo de 30 días, salvo lo que debamos conservar por obligaciones legales o contables.',
        ],
      },
      {
        heading: 'Seguridad',
        body: [
          'Toda la comunicación va cifrada (HTTPS). Las contraseñas se guardan con hash y el acceso a los datos está restringido a tu cuenta. Ningún sistema es 100 % seguro: usa una contraseña única y avísanos a {email} si detectas algo raro.',
        ],
      },
      {
        heading: 'Tus derechos',
        body: [
          'Puedes ver y corregir tus datos desde Configuración. Puedes pedirnos una copia de tus datos o la eliminación de tu cuenta escribiendo a {email}. Respondemos en un máximo de 30 días.',
          'Si vives en California u otra región con leyes de privacidad específicas, esos derechos también te aplican. No vendemos ni compartimos datos personales con fines publicitarios.',
        ],
      },
      {
        heading: 'Menores de edad',
        body: [
          'El servicio está dirigido a negocios y a personas mayores de 18 años. No recopilamos datos de menores a sabiendas.',
        ],
      },
      {
        heading: 'Dónde se procesan los datos',
        body: [
          'Operamos desde Estados Unidos y nuestros proveedores pueden procesar datos allí y en otros países. Al usar el servicio aceptas ese tratamiento.',
        ],
      },
      {
        heading: 'Cambios a esta política',
        body: [
          'Si hacemos cambios importantes te avisaremos por correo o dentro de la app antes de que entren en vigor. La fecha de arriba indica la última versión.',
        ],
      },
      {
        heading: 'Contacto',
        body: ['Escríbenos a {email}.'],
      },
    ],
  },
  terms: {
    title: 'Términos de servicio',
    updated: '5 de octubre de 2026',
    intro:
      'Estos términos regulan el uso de Factura Fácil (facturafacilapp.com). Al crear una cuenta aceptas estos términos y nuestra Política de privacidad. Si no estás de acuerdo, no uses el servicio.',
    sections: [
      {
        heading: 'Quién puede usar el servicio',
        body: [
          'Debes tener al menos 18 años y usar el servicio para una actividad comercial o profesional. Eres responsable de la información que registras y de mantener tu contraseña en secreto. Avísanos de inmediato si crees que alguien usó tu cuenta sin permiso.',
        ],
      },
      {
        heading: 'Qué es Factura Fácil',
        body: [
          'Factura Fácil te permite crear facturas y presupuestos, compartirlos por WhatsApp, SMS o enlace, y llevar el control de lo cobrado.',
          'No procesamos pagos ni movemos dinero. Las instrucciones de pago (Zelle, Cash App, efectivo, cheque u otras) son tuyas y el pago ocurre fuera de la plataforma, directamente entre tú y tu cliente.',
        ],
      },
      {
        heading: 'Tu responsabilidad sobre tus documentos',
        body: [
          'Tú eres responsable del contenido de tus facturas y presupuestos: importes, impuestos, descripciones y datos del cliente. Factura Fácil no ofrece asesoría fiscal, contable ni legal. Verifica que tus documentos cumplan con las leyes que te aplican.',
        ],
      },
      {
        heading: 'Mensajes a tus clientes',
        body: [
          'Al compartir por WhatsApp, el mensaje sale desde tu propio WhatsApp. Al elegir SMS, el mensaje se envía a través de nuestro proveedor en tu nombre.',
          'Envía mensajes solo a clientes que esperan recibirlos y que te dieron su número para ese fin. Está prohibido usar el servicio para enviar spam o mensajes no solicitados. Debes cumplir las normas de WhatsApp y las leyes sobre mensajería, como la TCPA en Estados Unidos.',
        ],
      },
      {
        heading: 'Uso aceptable',
        body: [
          'No uses el servicio para actividades ilegales, para emitir documentos falsos o engañosos, para suplantar a otras personas o negocios, ni para intentar acceder a datos de otros usuarios o interferir con el funcionamiento de la plataforma.',
        ],
      },
      {
        heading: 'Tu contenido',
        body: [
          'Tus datos y documentos son tuyos. Nos das permiso para almacenarlos, procesarlos y mostrarlos únicamente para prestarte el servicio, por ejemplo para generar el PDF o mostrar la factura a tu cliente a través del enlace que compartes.',
        ],
      },
      {
        heading: 'Asistente de inteligencia artificial',
        body: [
          'El asistente genera respuestas automáticas a partir de tus datos y puede equivocarse. Revisa siempre la información antes de tomar decisiones basadas en ella.',
        ],
      },
      {
        heading: 'Precio',
        body: [
          'Actualmente el servicio se ofrece sin costo. Si en el futuro introducimos planes de pago te avisaremos con antelación y podrás decidir si continúas.',
        ],
      },
      {
        heading: 'Disponibilidad y garantías',
        body: [
          'Nos esforzamos por mantener el servicio disponible, pero se ofrece "tal cual", sin garantías de ningún tipo. Puede haber interrupciones por mantenimiento o por causas ajenas a nosotros. Te recomendamos descargar el PDF de tus documentos importantes.',
        ],
      },
      {
        heading: 'Limitación de responsabilidad',
        body: [
          'En la medida en que la ley lo permita, Factura Fácil no será responsable de pérdidas de ingresos, datos o beneficios, ni de daños indirectos derivados del uso del servicio, incluidos los pagos que tus clientes no realicen. Nuestra responsabilidad total se limita a lo que hayas pagado por el servicio en los últimos 12 meses.',
        ],
      },
      {
        heading: 'Cancelación',
        body: [
          'Puedes dejar de usar el servicio y pedir la eliminación de tu cuenta cuando quieras escribiendo a {email}. Podemos suspender o cerrar cuentas que incumplan estos términos o que pongan en riesgo el servicio.',
        ],
      },
      {
        heading: 'Cambios a estos términos',
        body: [
          'Podemos actualizar estos términos. Si el cambio es importante te avisaremos por correo o dentro de la app. Seguir usando el servicio después del aviso significa que aceptas la nueva versión.',
        ],
      },
      {
        heading: 'Ley aplicable',
        body: [
          'Estos términos se rigen por las leyes de Estados Unidos y del estado donde opera Factura Fácil. Cualquier disputa se resolverá en los tribunales de esa jurisdicción.',
        ],
      },
      {
        heading: 'Contacto',
        body: ['Escríbenos a {email}.'],
      },
    ],
  },
  smsConsent: {
    title: 'Consentimiento para mensajes SMS',
    updated: '5 de octubre de 2026',
    intro:
      'Factura Fácil permite a los negocios que usan la plataforma enviar facturas y presupuestos a sus clientes por SMS. Esta página explica qué mensajes se envían, cómo se obtiene tu consentimiento y cómo darte de baja.',
    sections: [
      {
        heading: 'Quién envía los mensajes',
        body: [
          'Los mensajes se envían en nombre del negocio que te atiende (por ejemplo, tu jardinero, limpiador o contratista) a través de la plataforma Factura Fácil, operada en facturafacilapp.com. Factura Fácil no envía publicidad propia por SMS.',
        ],
      },
      {
        heading: 'Cómo se obtiene tu consentimiento',
        body: [
          'El negocio te pide tu número de teléfono al contratar un servicio y te informa que lo usará para enviarte tus facturas o presupuestos. Al dar tu número con ese fin aceptas recibir esos mensajes. El negocio es responsable de registrar solo números de clientes que hayan aceptado.',
        ],
      },
      {
        heading: 'Qué mensajes recibirás',
        body: [
          'Mensajes transaccionales relacionados con tu servicio: una factura o presupuesto con un enlace para verlo y descargar el PDF y, ocasionalmente, un recordatorio de pago.',
          'Ejemplo: "Hola, le comparto la factura INV-0042 de Jardinería López por $350.00. Puede verla y descargar el PDF aquí: https://facturafacilapp.com/i/… Vence el 18 oct. ¡Gracias!"',
        ],
      },
      {
        heading: 'Frecuencia',
        body: [
          'Depende de los servicios que contrates. Normalmente es un mensaje por factura o presupuesto, más algún recordatorio. No hay envíos recurrentes automáticos.',
        ],
      },
      {
        heading: 'Costos',
        body: [
          'Pueden aplicarse tarifas de mensajes y datos de tu operador. Factura Fácil no te cobra por recibir mensajes.',
        ],
      },
      {
        heading: 'Cómo darte de baja',
        body: [
          'Responde STOP a cualquier mensaje para dejar de recibir SMS de ese número. Recibirás una confirmación y no te enviaremos más mensajes. También puedes pedirle al negocio que te contacte por otro medio.',
        ],
      },
      {
        heading: 'Ayuda',
        body: [
          'Responde HELP para recibir información de contacto, o escríbenos a {email}.',
        ],
      },
      {
        heading: 'Privacidad',
        body: [
          'Tu número de teléfono se usa únicamente para entregar estos mensajes. No lo vendemos ni lo compartimos con terceros con fines de marketing. Consulta nuestra Política de privacidad para más detalles.',
        ],
      },
    ],
  },
}
