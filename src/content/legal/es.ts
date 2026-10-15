import type { LegalContent } from './types'

/**
 * Spanish legal copy (canonical). Plain-language, written for owners of small
 * service businesses. Review with a lawyer before launch and keep the
 * `updated` date current whenever the text changes.
 */
export const legalEs: LegalContent = {
  privacy: {
    title: 'Política de privacidad',
    updated: '8 de octubre de 2026',
    intro:
      'Factura Fácil (facturafacilapp.com) es una herramienta para crear facturas y presupuestos y compartirlos por WhatsApp, Messenger o SMS, con un plan gratis y un plan Pro de pago. Esta política explica qué datos recopilamos, para qué los usamos, con quién los compartimos y qué derechos tienes. Si tienes dudas, escríbenos a {email}.',
    sections: [
      {
        heading: 'Qué datos recopilamos',
        body: [
          'Datos de tu cuenta: nombre, correo electrónico y contraseña. La contraseña se guarda cifrada con hash, nunca en texto plano. Si entras con Google, Google nos envía tu nombre, tu correo y tu foto de perfil; nunca recibimos tu contraseña de Google.',
          'Datos de tu negocio: nombre, teléfono, dirección, logo, zona horaria, moneda e instrucciones de pago que tú escribes.',
          'Datos de tus clientes: nombre, teléfono, correo y empresa que tú registras para enviarles facturas. Tú eres responsable de tener permiso para usar esos datos.',
          'Documentos: facturas, presupuestos, conceptos, importes, notas y su historial (creada, enviada, vista, pagada).',
          'Datos de facturación: si te suscribes a Pro, guardamos tu plan, el estado de la suscripción, las fechas de prueba y renovación y el identificador de cliente que te asigna Stripe. Los datos de tu tarjeta se escriben en la página de Stripe y van directamente a Stripe: nunca vemos ni guardamos el número completo de tu tarjeta. Si aplican impuestos, Stripe puede pedirte tu dirección de facturación.',
          'Datos de uso: cuántos documentos creas cada mes y cuántos mensajes envías al asistente de IA, para aplicar los límites de tu plan.',
          'Datos técnicos y de seguridad: dirección IP, tipo de navegador, páginas visitadas, registros de errores y las señales que lee la protección contra bots de Cloudflare (Turnstile) en tu navegador cuando entras, creas una cuenta o recuperas tu contraseña. Los usamos para la seguridad y para mantener el servicio funcionando.',
        ],
      },
      {
        heading: 'Para qué usamos tus datos',
        body: [
          'Para prestarte el servicio: generar tus facturas y PDF, mostrar la factura a tu cliente mediante el enlace que compartes, enviar SMS cuando lo pides y mostrarte lo que tienes pendiente de cobrar.',
          'Para cobrarte: iniciar y renovar tu suscripción Pro, aplicar tu prueba gratis, mostrarte tu plan y aplicar los límites del plan Free.',
          'Para comunicarnos contigo: el correo de bienvenida y un recordatorio para terminar de configurar tu cuenta, la recuperación de contraseña, las confirmaciones de tu suscripción y avisos importantes sobre el servicio o estas políticas. Son correos del servicio y no se pueden desactivar mientras tu cuenta esté abierta. No enviamos publicidad de terceros.',
          'Para proteger el servicio: detectar bots y abusos, limitar intentos repetidos, prevenir fraudes y resolver errores.',
          'No usamos tus datos ni los de tus clientes para entrenar modelos de inteligencia artificial, y no los vendemos.',
        ],
      },
      {
        heading: 'Datos de usuario de Google',
        body: [
          'Qué datos obtenemos: si eliges “Continuar con Google”, le pedimos a Google solo los permisos básicos para iniciar sesión (openid, email y profile). Google nos envía tu nombre, tu correo, tu foto de perfil y un identificador único de tu cuenta de Google. No pedimos acceso a tu Gmail, Google Drive, Contactos, Calendario ni a ningún otro dato de Google.',
          'Para qué los usamos: solo para crear tu cuenta de Factura Fácil, iniciar tu sesión, mostrar tu nombre y tu foto dentro de la app y enviarte los correos del servicio descritos arriba. Google también emite tokens de inicio de sesión, que guardamos solo para mantener tu cuenta vinculada a Google; no los usamos para leer nada más de tu cuenta de Google.',
          'Cómo los guardamos y protegemos: se guardan en nuestra base de datos junto con el resto de tu cuenta, cifrados en tránsito (HTTPS) y accesibles solo para tu cuenta y para los proveedores que alojan el servicio (Cloudflare y Neon).',
          'Con quién los compartimos: no vendemos los datos de usuario de Google, no los usamos para publicidad y no los compartimos con nadie, salvo con los proveedores de alojamiento indicados en “Con quién compartimos datos” o cuando la ley lo exija. No los usamos para entrenar modelos de IA.',
          'Cuánto tiempo los guardamos y cómo borrarlos: los guardamos mientras tu cuenta esté abierta. Para borrar tu cuenta escríbenos a {email} y los eliminamos en un plazo de 30 días, como se explica en “Cuánto tiempo guardamos los datos”. También puedes quitarle el acceso a Factura Fácil cuando quieras en myaccount.google.com/permissions.',
          'El uso y la transferencia que hace Factura Fácil de la información recibida de las API de Google cumplen la Política de datos de usuario de los servicios de las API de Google (developers.google.com/terms/api-services-user-data-policy), incluidos los requisitos de Uso limitado.',
        ],
      },
      {
        heading: 'Enlaces públicos de facturas',
        body: [
          'Cuando compartes una factura o presupuesto generamos un enlace único y difícil de adivinar. Cualquier persona que tenga ese enlace puede ver el documento y descargar el PDF. Pedimos a los buscadores que no indexen esas páginas. Comparte el enlace solo con tu cliente.',
          'Si compartes el enlace por Messenger, Meta abre la página para mostrar una vista previa en el chat con el nombre de tu negocio, el número del documento, el total y la fecha de vencimiento.',
        ],
      },
      {
        heading: 'Asistente con inteligencia artificial',
        body: [
          'Si usas el asistente, tus preguntas y los datos necesarios para responderlas (por ejemplo, facturas o clientes) se envían a OpenAI para generar la respuesta. Según su política para la API, OpenAI no usa esos datos para entrenar sus modelos. El historial del chat se guarda en tu cuenta y puedes borrarlo cuando quieras. Llevamos la cuenta de cuántos mensajes envías, sin su contenido, para aplicar los límites de tu plan.',
        ],
      },
      {
        heading: 'Pagos',
        body: [
          'Las suscripciones Pro las procesa Stripe, Inc. Stripe recibe los datos de tu tarjeta, tu correo de facturación y, si aplican impuestos, tu dirección de facturación, y los usa según su propia política de privacidad (stripe.com/privacy), incluso para prevenir fraudes. Stripe nos informa del estado de tu suscripción para activar o desactivar Pro.',
          'Factura Fácil no procesa los pagos entre tú y tus clientes: esos ocurren fuera de la plataforma.',
        ],
      },
      {
        heading: 'Con quién compartimos datos',
        body: [
          'No vendemos tus datos ni los compartimos con fines publicitarios. Solo los compartimos con los proveedores que necesitamos para operar el servicio, que solo pueden usarlos para prestarnos su servicio:',
          'Cloudflare (alojamiento, almacenamiento de logos, generación de PDF, envío de correos, protección contra bots y seguridad); Neon (base de datos); Stripe (pagos, suscripciones e impuestos); OpenAI (asistente de IA); Twilio (envío de SMS cuando eliges esa opción); Google (solo si eliges “Continuar con Google”); y YouTube (solo si le das play al video de demostración).',
          'También podemos compartir datos si la ley lo exige, para proteger los derechos y la seguridad del servicio y de sus usuarios, o como parte de una fusión, adquisición o venta del negocio. En ese caso los datos siguen protegidos por esta política y te avisaremos antes de que pasen a regirse por otra.',
        ],
      },
      {
        heading: 'Cookies y almacenamiento local',
        body: [
          'Cookies necesarias: una cookie de sesión para mantenerte conectado, una cookie que recuerda tu idioma y las cookies de seguridad que usa Cloudflare para distinguir personas de bots. El almacenamiento local del navegador recuerda preferencias como la barra lateral.',
          'Páginas de terceros: la página de pago y el portal de cliente de Stripe usan sus propias cookies. El video de demostración se carga desde YouTube en modo de privacidad mejorada y solo cuando le das play.',
          'No usamos cookies de publicidad, rastreadores de analítica ni píxeles de seguimiento. Como no vendemos ni compartimos datos con fines publicitarios, no hay nada de lo que darte de baja, pero de todos modos respetamos las señales Global Privacy Control y Do Not Track.',
        ],
      },
      {
        heading: 'Cuánto tiempo guardamos los datos',
        body: [
          'Guardamos tus datos mientras tu cuenta esté abierta. Si pides que eliminemos tu cuenta, borramos tus datos de nuestros sistemas en un plazo de 30 días. Las copias de seguridad de la base de datos se sobrescriben de forma continua y desaparecen en los 30 días siguientes.',
          'Algunos datos debemos guardarlos más tiempo: los registros de cobro y las facturas de tu suscripción (que guarda sobre todo Stripe), durante el tiempo que exijan las leyes fiscales y contables, normalmente hasta 7 años. Los registros de seguridad y de errores se guardan solo por poco tiempo, normalmente no más de 30 días.',
          'Si cancelas Pro, tu cuenta sigue abierta en el plan Free y tus datos no se borran.',
        ],
      },
      {
        heading: 'Seguridad',
        body: [
          'Toda la comunicación va cifrada (HTTPS). Las contraseñas se guardan con hash, los números de tarjeta nunca llegan a nuestros servidores, el acceso a los datos está restringido a tu cuenta y los formularios de acceso están protegidos contra bots e intentos repetidos. Ningún sistema es 100 % seguro: usa una contraseña única y avísanos a {email} si detectas algo raro.',
          'Si un incidente de seguridad afecta a tus datos personales, te avisaremos a ti y a las autoridades según lo exija la ley.',
        ],
      },
      {
        heading: 'Tus derechos',
        body: [
          'Puedes ver y corregir tus datos desde Configuración y descargar el PDF de cualquier documento cuando quieras. Puedes pedirnos una copia de tus datos, que los corrijamos o que eliminemos tu cuenta escribiendo a {email}. Respondemos en un máximo de 30 días, y podemos pedirte que confirmes la solicitud desde el correo de tu cuenta para que nadie más pueda hacerla.',
          'Si vives en California u otro estado con su propia ley de privacidad, tienes los derechos que esa ley te da, incluidos saber qué datos recopilamos, borrarlos, corregirlos y no recibir un trato distinto por ejercer esos derechos. Puedes usar un representante autorizado. Si rechazamos una solicitud, puedes apelar respondiendo a nuestra respuesta.',
          'Si vives fuera de Estados Unidos, también puedes oponerte al tratamiento o pedirnos que lo limitemos, y presentar una queja ante la autoridad de protección de datos de tu país.',
        ],
      },
      {
        heading: 'Datos de tus clientes',
        body: [
          'Tratamos los datos de tus clientes en tu nombre para que puedas enviarles documentos. Si uno de tus clientes quiere ver, corregir o borrar sus datos, debe contactarte a ti; te ayudaremos a responder. Si nos escribe directamente, te pasaremos la solicitud.',
        ],
      },
      {
        heading: 'Menores de edad',
        body: [
          'El servicio está dirigido a negocios y a personas mayores de 18 años. No recopilamos datos de menores a sabiendas. Si nos enteramos de que lo hicimos, los borraremos.',
        ],
      },
      {
        heading: 'Dónde se procesan los datos',
        body: [
          'Operamos desde Estados Unidos y nuestros proveedores pueden procesar datos allí y en otros países. Cuando los datos salen de tu país nos apoyamos en las garantías contractuales de nuestros proveedores. Al usar el servicio aceptas ese tratamiento.',
        ],
      },
      {
        heading: 'Cambios a esta política',
        body: [
          'Si hacemos cambios importantes te avisaremos por correo o dentro de la app antes de que entren en vigor. La fecha de arriba indica la versión vigente.',
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
    updated: '15 de octubre de 2026',
    intro:
      'Estos términos regulan el uso de Factura Fácil (facturafacilapp.com), incluidos el plan gratis y el plan Pro de pago. Al crear una cuenta o suscribirte aceptas estos términos y nuestra Política de privacidad. Si no estás de acuerdo, no uses el servicio.',
    sections: [
      {
        heading: 'Quién puede usar el servicio',
        body: [
          'Debes tener al menos 18 años y usar el servicio para una actividad comercial o profesional. Una persona o negocio por cuenta: no compartas tu cuenta ni crees varias para saltarte los límites del plan Free.',
          'Eres responsable de la información que registras, de mantener tu contraseña en secreto y de todo lo que se haga desde tu cuenta. Avísanos de inmediato a {email} si crees que alguien usó tu cuenta sin permiso.',
        ],
      },
      {
        heading: 'Qué es Factura Fácil',
        body: [
          'Factura Fácil te permite crear facturas y presupuestos, compartirlos por WhatsApp, Messenger, SMS o enlace, y llevar el control de lo cobrado.',
          'No procesamos los pagos entre tú y tus clientes ni movemos su dinero. Las instrucciones de pago (Zelle, Cash App, efectivo, cheque u otras) son tuyas y el pago ocurre fuera de la plataforma, directamente entre tú y tu cliente. El único pago que pasa por la plataforma es tu propia suscripción Pro, que procesa Stripe.',
        ],
      },
      {
        heading: 'Planes',
        body: [
          'Free: 1 factura y 1 presupuesto por mes calendario (contados en la zona horaria de tu negocio) y 10 mensajes al asistente de IA por mes. Los documentos que creas en el plan Free muestran una pequeña marca “Hecho con Factura Fácil”.',
          'Pro: facturas y presupuestos ilimitados, uso ilimitado del asistente de IA, sin marca y soporte prioritario. “Ilimitado” significa que no hay un tope mensual. Para proteger el servicio siguen aplicando límites automáticos de volumen y velocidad (por ejemplo, un máximo de mensajes de IA por hora) y las restricciones sobre SMS y abusos de estos términos. El uso normal de un negocio nunca llega a ellos.',
          'Podemos añadir, cambiar o quitar funciones. Si un cambio te quita algo importante por lo que pagas, te avisaremos con antelación.',
        ],
      },
      {
        heading: 'Precios e impuestos',
        body: [
          'Pro cuesta $19.99 USD al mes o $199 USD al año, según se muestra en la página de precios y en la pantalla de pago al suscribirte. Los precios no incluyen impuestos: se añade el impuesto sobre las ventas u otros impuestos donde la ley lo exija.',
          'Podemos cambiar los precios. Si lo hacemos, te avisaremos por correo con al menos 30 días de antelación, y el nuevo precio se aplicará desde tu siguiente renovación después de ese aviso. Si no quieres pagar el nuevo precio, cancela antes de esa renovación.',
        ],
      },
      {
        heading: 'Prueba gratis',
        body: [
          'Pro incluye una prueba gratis de 14 días, una vez por cuenta. Para empezarla registras un método de pago en la página de Stripe, pero no te cobramos nada durante la prueba.',
          'Si no cancelas antes de que termine la prueba, tu suscripción empieza automáticamente y te cobramos el precio del plan que elegiste (mensual o anual) el día en que termina la prueba. Puedes ver la fecha de fin de tu prueba en Configuración en cualquier momento.',
        ],
      },
      {
        heading: 'Renovación automática',
        body: [
          'Tu suscripción Pro se renueva automáticamente al final de cada periodo (cada mes o cada año, según el plan que elegiste) y cobramos el precio vigente a tu método de pago registrado, hasta que canceles. Al suscribirte autorizas esos cobros recurrentes.',
          'Si tienes el plan anual, te enviaremos un recordatorio por correo antes de cada renovación.',
        ],
      },
      {
        heading: 'Cómo cancelar',
        body: [
          'Puedes cancelar cuando quieras, en línea y sin tener que contactarnos: Configuración → Administrar suscripción. También puedes escribirnos a {email} y la cancelamos por ti.',
          'Al cancelar conservas Pro hasta el final del periodo que ya pagaste (o hasta el final de la prueba). Después no se hacen más cobros y tu cuenta vuelve al plan Free. Tus datos y documentos no se borran. Hasta que termine el periodo puedes volver a activar la suscripción desde el mismo lugar.',
        ],
      },
      {
        heading: 'Reembolsos',
        body: [
          'Los pagos no son reembolsables y no devolvemos periodos parciales: al cancelar, conservas Pro hasta el final del periodo que pagaste. Esto no afecta a ningún derecho de reembolso que te dé la ley.',
          'Si te cobramos por error (por ejemplo, dos veces por el mismo periodo) o el servicio no estuvo disponible durante una parte importante de tu periodo por una falla nuestra, escríbenos a {email} en un plazo de 30 días y te devolveremos el cobro o la parte afectada.',
        ],
      },
      {
        heading: 'Pagos fallidos',
        body: [
          'Si un cobro falla, Stripe lo reintentará durante los días siguientes y mientras tanto conservas Pro. Actualiza tu tarjeta en Configuración → Administrar suscripción. Si aun así no se puede cobrar, la suscripción termina y tu cuenta vuelve al plan Free. Tus datos no se borran.',
          'Si disputas un cobro con tu banco sin contactarnos antes, podemos suspender Pro mientras se resuelve la disputa. Escríbenos primero: normalmente es más rápido.',
        ],
      },
      {
        heading: 'Cambiar o terminar tu plan',
        body: [
          'Puedes cambiar entre el plan mensual y el anual desde Configuración → Administrar suscripción. Stripe te muestra el importe antes de confirmar, incluido cualquier crédito por el tiempo no usado.',
          'Si tu cuenta vuelve al plan Free, todos tus documentos siguen disponibles. Los límites del plan Free solo aplican a los documentos y mensajes de IA nuevos desde ese momento, y los documentos nuevos vuelven a mostrar la marca.',
        ],
      },
      {
        heading: 'Códigos promocionales',
        body: [
          'Podemos ofrecer códigos de descuento. Cada código tiene las condiciones que se indican al recibirlo, no se puede canjear por dinero y puede caducar. Los códigos obtenidos con fraude o mediante reventa no son válidos.',
        ],
      },
      {
        heading: 'Tu responsabilidad sobre tus documentos',
        body: [
          'Tú eres responsable del contenido de tus facturas y presupuestos: importes, impuestos, descripciones y datos del cliente. Factura Fácil no ofrece asesoría fiscal, contable ni legal. Verifica que tus documentos cumplan con las leyes que te aplican y guarda tus propias copias de los documentos que necesites para tus registros.',
        ],
      },
      {
        heading: 'Mensajes a tus clientes',
        body: [
          'Al compartir por WhatsApp o Messenger, el mensaje sale desde tu propia cuenta. Al elegir SMS, el mensaje se envía a través de nuestro proveedor en tu nombre.',
          'Envía mensajes solo a clientes que esperan recibirlos y que te dieron su número para ese fin. Está prohibido usar el servicio para enviar spam o mensajes no solicitados. Debes cumplir las normas de WhatsApp y Messenger y las leyes sobre mensajería, como la TCPA en Estados Unidos.',
        ],
      },
      {
        heading: 'Uso aceptable',
        body: [
          'No uses el servicio para actividades ilegales, para emitir documentos falsos o engañosos, para suplantar a otras personas o negocios, para enviar spam ni para intentar acceder a datos de otros usuarios.',
          'No interfieras con la plataforma: nada de registros automáticos, extracción masiva de datos (scraping), pruebas de carga, intentos de saltarte los límites o la protección contra bots, ingeniería inversa ni reventa del servicio sin nuestro permiso por escrito.',
        ],
      },
      {
        heading: 'Tu contenido',
        body: [
          'Tus datos y documentos son tuyos. Nos das permiso para almacenarlos, procesarlos y mostrarlos únicamente para prestarte el servicio, por ejemplo para generar el PDF o mostrar la factura a tu cliente a través del enlace que compartes.',
          'Si nos envías sugerencias o ideas, podemos usarlas para mejorar el servicio sin ninguna obligación contigo.',
        ],
      },
      {
        heading: 'Nuestro servicio y nuestra marca',
        body: [
          'El software, el diseño, el nombre y el logo de Factura Fácil nos pertenecen. Te damos un permiso personal, no exclusivo e intransferible para usar el servicio según estos términos. No puedes copiarlo, modificarlo ni usar nuestra marca sin permiso por escrito.',
        ],
      },
      {
        heading: 'Asistente de inteligencia artificial',
        body: [
          'El asistente genera respuestas automáticas a partir de tus datos y puede equivocarse. Solo crea o cambia documentos y clientes cuando tú apruebas la acción. Revisa siempre la información antes de tomar decisiones o enviar un documento.',
        ],
      },
      {
        heading: 'Servicios de terceros',
        body: [
          'El servicio funciona con servicios de otras empresas, como WhatsApp, Messenger, Google, Stripe y tu compañía telefónica. Su uso se rige por sus propios términos, y no somos responsables de su disponibilidad, de sus cambios ni de cómo tratan tus datos.',
        ],
      },
      {
        heading: 'Disponibilidad y garantías',
        body: [
          'Nos esforzamos por mantener el servicio disponible, pero se ofrece "tal cual" y "según disponibilidad", sin garantías de ningún tipo, expresas o implícitas, incluida la idoneidad para un fin concreto, en la medida en que la ley lo permita. Puede haber interrupciones por mantenimiento o por causas ajenas a nosotros. Te recomendamos descargar el PDF de tus documentos importantes.',
        ],
      },
      {
        heading: 'Limitación de responsabilidad',
        body: [
          'En la medida en que la ley lo permita, Factura Fácil no será responsable de pérdidas de ingresos, datos o beneficios, ni de daños indirectos, incidentales o consecuentes derivados del uso del servicio, incluidos los pagos que tus clientes no realicen. Nuestra responsabilidad total por cualquier reclamación se limita a la cantidad mayor entre lo que nos hayas pagado por el servicio en los 12 meses anteriores a la reclamación y $50 USD.',
        ],
      },
      {
        heading: 'Indemnización',
        body: [
          'Si un tercero nos reclama por el contenido de tus documentos, por los mensajes que envías a tus clientes o porque incumpliste estos términos o la ley, aceptas cubrir los costos que resulten, incluidos honorarios razonables de abogados.',
        ],
      },
      {
        heading: 'Suspensión y cierre de la cuenta',
        body: [
          'Puedes dejar de usar el servicio cuando quieras. Para cerrar tu cuenta, cancela tu suscripción y escríbenos a {email}; borramos tus datos como se describe en la Política de privacidad.',
          'Podemos suspender o cerrar cuentas que incumplan estos términos, que no paguen o que pongan en riesgo el servicio o a otros usuarios. Salvo en casos de fraude, abuso u obligación legal, te avisaremos antes y te daremos tiempo para descargar tus documentos. Si cerramos el servicio por completo, te avisaremos con al menos 30 días de antelación y te devolveremos la parte no usada de cualquier periodo pagado.',
        ],
      },
      {
        heading: 'Cambios a estos términos',
        body: [
          'Podemos actualizar estos términos. Si el cambio es importante te avisaremos por correo o dentro de la app al menos 15 días antes de que entre en vigor. Seguir usando el servicio después de esa fecha significa que aceptas la nueva versión; si no la aceptas, puedes cancelar antes.',
        ],
      },
      {
        heading: 'Disputas y ley aplicable',
        body: [
          'Si tienes un problema, escríbenos primero a {email}: la mayoría se resuelven así. Si no lo resolvemos en 30 días, cualquiera de los dos puede acudir a los tribunales.',
          'Estos términos se rigen por las leyes del estado de Kentucky y de Estados Unidos, sin tener en cuenta sus normas sobre conflicto de leyes. Las disputas se resolverán en los tribunales estatales o federales ubicados en Kentucky, salvo que cualquiera de los dos puede acudir a un tribunal de reclamos menores cuando la reclamación califique. Esto no te quita las protecciones que te dé la ley de consumo del lugar donde vives.',
        ],
      },
      {
        heading: 'Disposiciones generales',
        body: [
          'Estos términos y la Política de privacidad son el acuerdo completo entre tú y Factura Fácil sobre el servicio. Si una parte de estos términos no se puede aplicar, el resto sigue vigente. Si no exigimos un derecho en un momento dado, no renunciamos a él. No puedes transferir tu cuenta ni estos términos sin nuestro permiso; nosotros podemos transferirlos como parte de una venta o reorganización del negocio.',
          'No somos responsables de retrasos o fallas causados por hechos fuera de nuestro control razonable, como caídas de nuestros proveedores, desastres naturales o actos de gobierno.',
          'Aceptas recibir nuestros avisos de forma electrónica, por correo o dentro de la app. Estos términos están disponibles en español e inglés con el mismo sentido; si hay diferencias, prevalece la versión en inglés.',
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
