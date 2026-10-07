import type { LegalContent } from './types'

/** English legal copy. Mirrors ./es.ts section for section. */
export const legalEn: LegalContent = {
  privacy: {
    title: 'Privacy Policy',
    updated: 'October 7, 2026',
    intro:
      'Factura Fácil (facturafacilapp.com) is a tool for creating invoices and estimates and sharing them over WhatsApp, Messenger or SMS, with a free plan and a paid Pro plan. This policy explains what data we collect, what we use it for, who we share it with and what rights you have. Questions? Write to {email}.',
    sections: [
      {
        heading: 'What we collect',
        body: [
          'Account data: your name, email address and password. The password is stored as a salted hash, never in plain text. If you sign in with Google, we receive your name, email address and profile photo from Google; we do not receive your Google password.',
          'Business data: the name, phone, address, logo, time zone, currency and payment instructions you enter.',
          'Your customers’ data: the name, phone, email and company you record so you can send them invoices. You are responsible for having permission to use that information.',
          'Documents: invoices, estimates, line items, amounts, notes and their history (created, sent, viewed, paid).',
          'Billing data: if you subscribe to Pro, we store your plan, subscription status, trial and renewal dates and the customer ID Stripe assigns to you. Your card details are entered on Stripe’s page and go straight to Stripe: we never see or store your full card number. If tax applies, Stripe may collect your billing address.',
          'Usage data: how many documents you create each month and how many messages you send to the AI assistant, so we can apply your plan’s limits.',
          'Technical and security data: IP address, browser type, pages visited, error logs and the signals that Cloudflare’s bot protection (Turnstile) reads in your browser when you sign in, sign up or reset your password. We use these for security and to keep the service running.',
        ],
      },
      {
        heading: 'How we use your data',
        body: [
          'To provide the service: generate your invoices and PDFs, show the invoice to your customer through the link you share, send SMS when you ask us to, and show you what is still unpaid.',
          'To bill you: start and renew your Pro subscription, apply your free trial, show you your plan and apply the Free plan’s limits.',
          'To communicate with you: the welcome email and a setup reminder, password resets, subscription confirmations and important notices about the service or these policies. These are service emails and are not optional while your account is open. We do not send third-party advertising.',
          'To protect the service: detect bots and abuse, limit repeated attempts, prevent fraud and fix errors.',
          'We do not use your data or your customers’ data to train artificial intelligence models, and we do not sell it.',
        ],
      },
      {
        heading: 'Public invoice links',
        body: [
          'When you share an invoice or estimate we generate a unique, hard-to-guess link. Anyone who has that link can view the document and download the PDF. We ask search engines not to index those pages. Share the link only with your customer.',
          'If you share the link over Messenger, Meta loads the page to show a preview in the chat with your business name, the document number, the total and the due date.',
        ],
      },
      {
        heading: 'AI assistant',
        body: [
          'If you use the assistant, your questions and the data needed to answer them (for example invoices or customers) are sent to OpenAI to generate the reply. Under its API policy, OpenAI does not use that data to train its models. Chat history is stored in your account and you can delete it at any time. We keep a count of the messages you send, without their content, to apply your plan’s limits.',
        ],
      },
      {
        heading: 'Payments',
        body: [
          'Pro subscriptions are processed by Stripe, Inc. Stripe receives your card details, billing email and, where tax applies, your billing address, and uses them under its own privacy policy (stripe.com/privacy), including to prevent fraud. Stripe sends us your subscription status so we can turn Pro on or off.',
          'Factura Fácil does not process payments between you and your customers: those happen outside the platform.',
        ],
      },
      {
        heading: 'Who we share data with',
        body: [
          'We do not sell your data or share it for advertising. We share it only with the providers we need to run the service, who may use it only to provide their service to us:',
          'Cloudflare (hosting, logo storage, PDF generation, email delivery, bot protection and security); Neon (database); Stripe (payments, subscriptions and taxes); OpenAI (AI assistant); Twilio (SMS delivery when you choose that option); Google (only if you choose “Continue with Google”); and YouTube (only if you press play on the demo video).',
          'We may also share data when the law requires it, to protect the rights and security of the service and its users, or as part of a merger, acquisition or sale of the business. In that case the data stays protected by this policy and we will tell you before it is governed by a different one.',
        ],
      },
      {
        heading: 'Cookies and local storage',
        body: [
          'Necessary cookies: a session cookie to keep you signed in, a cookie that remembers your language, and the security cookies Cloudflare uses to tell people from bots. The browser’s local storage remembers preferences such as the sidebar.',
          'Third-party pages: Stripe’s checkout page and customer portal use their own cookies. The demo video loads from YouTube in privacy-enhanced mode only when you press play.',
          'We do not use advertising cookies, analytics trackers or tracking pixels. Because we do not sell or share data for advertising, there is nothing to opt out of, but we respect Global Privacy Control and Do Not Track signals anyway.',
        ],
      },
      {
        heading: 'How long we keep data',
        body: [
          'We keep your data while your account is open. If you ask us to delete your account, we remove your data from our systems within 30 days. Database backups are overwritten on a rolling basis and disappear within 30 days after that.',
          'Some data we must keep longer: billing records and invoices for your subscription (held mostly by Stripe) for as long as tax and accounting law requires, usually up to 7 years. Security and error logs are kept only for a short time, normally no more than 30 days.',
          'If you cancel Pro your account stays open on the Free plan and your data is not deleted.',
        ],
      },
      {
        heading: 'Security',
        body: [
          'All traffic is encrypted (HTTPS). Passwords are hashed, card numbers never reach our servers, access to data is restricted to your account, and sign-in forms are protected against bots and repeated attempts. No system is 100% secure: use a unique password and tell us at {email} if you notice anything unusual.',
          'If a security breach affects your personal data, we will notify you and the authorities as the law requires.',
        ],
      },
      {
        heading: 'Your rights',
        body: [
          'You can view and correct your data in Settings and download the PDF of any document at any time. You can ask us for a copy of your data, to correct it, or to delete your account by writing to {email}. We respond within 30 days, and we may ask you to confirm the request from your account email so nobody else can make it.',
          'If you live in California or another state with its own privacy law, you have the rights that law gives you, including to know what we collect, to delete it, to correct it and to not be treated differently for using those rights. You can use an authorized agent. If we deny a request, you can appeal by replying to our answer.',
          'If you live outside the United States, you can also object to processing or ask us to restrict it, and complain to your local data protection authority.',
        ],
      },
      {
        heading: 'Your customers’ data',
        body: [
          'We process the data of your customers on your behalf so you can send them documents. If one of your customers wants to see, correct or delete their data, they should contact you; we will help you respond. If they write to us directly, we will forward the request to you.',
        ],
      },
      {
        heading: 'Children',
        body: [
          'The service is intended for businesses and people aged 18 or older. We do not knowingly collect data from minors. If we learn that we have, we will delete it.',
        ],
      },
      {
        heading: 'Where data is processed',
        body: [
          'We operate from the United States and our providers may process data there and in other countries. When data leaves your country we rely on our providers’ contractual safeguards. By using the service you agree to that processing.',
        ],
      },
      {
        heading: 'Changes to this policy',
        body: [
          'If we make material changes we will notify you by email or inside the app before they take effect. The date above indicates the current version.',
        ],
      },
      {
        heading: 'Contact',
        body: ['Write to {email}.'],
      },
    ],
  },
  terms: {
    title: 'Terms of Service',
    updated: 'October 7, 2026',
    intro:
      'These terms govern your use of Factura Fácil (facturafacilapp.com), including the free plan and the paid Pro plan. By creating an account or subscribing you agree to these terms and to our Privacy Policy. If you do not agree, do not use the service.',
    sections: [
      {
        heading: 'Who can use the service',
        body: [
          'You must be at least 18 years old and use the service for a business or professional activity. One person or business per account: do not share your account or create several to get around the Free plan’s limits.',
          'You are responsible for the information you enter, for keeping your password secret and for everything done from your account. Tell us immediately at {email} if you believe someone used your account without permission.',
        ],
      },
      {
        heading: 'What Factura Fácil is',
        body: [
          'Factura Fácil lets you create invoices and estimates, share them over WhatsApp, Messenger, SMS or a link, and keep track of what has been paid.',
          'We do not process payments between you and your customers or move their money. Payment instructions (Zelle, Cash App, cash, check or others) are yours, and payment happens outside the platform, directly between you and your customer. The only payment that goes through the platform is your own Pro subscription, processed by Stripe.',
        ],
      },
      {
        heading: 'Plans',
        body: [
          'Free: 3 invoices and 3 estimates per calendar month (counted in your business’s time zone) and 10 AI assistant messages per month. Documents you create on the Free plan show a small “Made with Factura Fácil” badge.',
          'Pro: unlimited invoices and estimates, unlimited use of the AI assistant, no badge and priority support. “Unlimited” means there is no monthly cap. To protect the service, automatic limits on volume and speed still apply (for example, a maximum number of AI messages per hour) and the restrictions on SMS and abuse in these terms. Normal use of a business never reaches them.',
          'We may add, change or remove features. If a change takes away something important that you pay for, we will tell you in advance.',
        ],
      },
      {
        heading: 'Prices and taxes',
        body: [
          'Pro costs $19.99 USD per month or $199 USD per year, as shown on the pricing page and at checkout when you subscribe. Prices do not include taxes: sales tax or other applicable taxes are added where the law requires it.',
          'We may change prices. If we do, we will tell you at least 30 days in advance by email, and the new price will apply from your next renewal after that notice. If you do not want to pay the new price, cancel before that renewal.',
        ],
      },
      {
        heading: 'Free trial',
        body: [
          'Pro includes a 14-day free trial, once per account. You enter a payment method on Stripe’s page to start it, but we do not charge you anything during the trial.',
          'If you do not cancel before the trial ends, your subscription starts automatically and we charge the price of the plan you chose (monthly or yearly) on the day the trial ends. You can see the end date of your trial in Settings at any time.',
        ],
      },
      {
        heading: 'Automatic renewal',
        body: [
          'Your Pro subscription renews automatically at the end of each period (every month or every year, depending on the plan you chose) and we charge the current price to your payment method on file, until you cancel. By subscribing you authorize those recurring charges.',
          'If you are on the yearly plan, we will send you a reminder by email before each renewal.',
        ],
      },
      {
        heading: 'How to cancel',
        body: [
          'You can cancel at any time, online, without contacting us: Settings → Manage subscription. You can also write to {email} and we will cancel it for you.',
          'When you cancel, you keep Pro until the end of the period you already paid for (or until the end of the trial). After that, no further charges are made and your account goes back to the Free plan. Your data and documents are not deleted. Until the period ends you can turn the subscription back on from the same place.',
        ],
      },
      {
        heading: 'Refunds',
        body: [
          'Payments are not refundable and we do not refund partial periods: when you cancel, you keep Pro until the end of the period you paid for. This does not affect any right to a refund that the law gives you.',
          'If we charged you by mistake (for example, twice for the same period) or the service was unavailable for a significant part of your period because of a failure on our side, write to {email} within 30 days and we will refund the charge or the affected part.',
        ],
      },
      {
        heading: 'Failed payments',
        body: [
          'If a charge fails, Stripe will retry it over the following days and you keep Pro while it does. Update your card in Settings → Manage subscription. If the payment still cannot be collected, the subscription ends and your account goes back to the Free plan. Your data is not deleted.',
          'If you dispute a charge with your bank without contacting us first, we may suspend Pro while the dispute is resolved. Write to us first: it is usually faster.',
        ],
      },
      {
        heading: 'Changing or ending your plan',
        body: [
          'You can switch between the monthly and yearly plans from Settings → Manage subscription. Stripe shows you the amount before you confirm, including any credit for unused time.',
          'If your account goes back to the Free plan, all your documents remain accessible. The Free limits apply only to new documents and AI messages from that moment on, and new documents show the badge again.',
        ],
      },
      {
        heading: 'Promotional codes',
        body: [
          'We may offer discount codes. Each code has the conditions shown when you receive it, cannot be exchanged for cash and may expire. Codes obtained through fraud or resale are void.',
        ],
      },
      {
        heading: 'Your responsibility for your documents',
        body: [
          'You are responsible for the content of your invoices and estimates: amounts, taxes, descriptions and customer details. Factura Fácil does not provide tax, accounting or legal advice. Make sure your documents comply with the laws that apply to you, and keep your own copies of the documents you need for your records.',
        ],
      },
      {
        heading: 'Messaging your customers',
        body: [
          'When you share over WhatsApp or Messenger, the message is sent from your own account. When you choose SMS, the message is sent through our provider on your behalf.',
          'Only message customers who expect to hear from you and who gave you their number for that purpose. Using the service to send spam or unsolicited messages is prohibited. You must follow WhatsApp’s and Messenger’s rules and messaging laws such as the TCPA in the United States.',
        ],
      },
      {
        heading: 'Acceptable use',
        body: [
          'Do not use the service for illegal activity, to issue false or misleading documents, to impersonate other people or businesses, to send spam, or to try to access other users’ data.',
          'Do not interfere with the platform: no automated sign-ups, scraping, load testing, attempts to get around limits or bot protection, reverse engineering, or reselling the service without our written permission.',
        ],
      },
      {
        heading: 'Your content',
        body: [
          'Your data and documents belong to you. You give us permission to store, process and display them only to provide the service, for example to generate the PDF or show the invoice to your customer through the link you share.',
          'If you send us suggestions or ideas, we may use them to improve the service without any obligation to you.',
        ],
      },
      {
        heading: 'Our service and brand',
        body: [
          'The software, design, name and logo of Factura Fácil belong to us. We give you a personal, non-exclusive, non-transferable permission to use the service according to these terms. You may not copy it, modify it or use our brand without written permission.',
        ],
      },
      {
        heading: 'AI assistant',
        body: [
          'The assistant generates automatic answers from your data and can be wrong. It only creates or changes documents and clients when you approve the action. Always review the information before making decisions or sending a document.',
        ],
      },
      {
        heading: 'Third-party services',
        body: [
          'The service works with other companies’ services, such as WhatsApp, Messenger, Google, Stripe and your phone carrier. Their own terms apply to their use, and we are not responsible for their availability, their changes or how they treat your data.',
        ],
      },
      {
        heading: 'Availability and warranties',
        body: [
          'We work to keep the service available, but it is provided "as is" and "as available", without warranties of any kind, express or implied, including fitness for a particular purpose, to the extent permitted by law. There may be interruptions for maintenance or causes outside our control. We recommend downloading the PDF of your important documents.',
        ],
      },
      {
        heading: 'Limitation of liability',
        body: [
          'To the extent permitted by law, Factura Fácil is not liable for lost revenue, data or profits, or for indirect, incidental or consequential damages arising from use of the service, including payments your customers fail to make. Our total liability for any claim is limited to the greater of what you paid us for the service in the 12 months before the claim or $50 USD.',
        ],
      },
      {
        heading: 'Indemnification',
        body: [
          'If a third party makes a claim against us because of the content of your documents, the messages you send to your customers or your breach of these terms or of the law, you agree to cover the resulting costs, including reasonable attorneys’ fees.',
        ],
      },
      {
        heading: 'Suspension and closing your account',
        body: [
          'You can stop using the service at any time. To close your account, cancel your subscription and write to {email}; we delete your data as described in the Privacy Policy.',
          'We may suspend or close accounts that violate these terms, do not pay, or put the service or other users at risk. Except in cases of fraud, abuse or legal obligation, we will warn you first and give you time to download your documents. If we close the service entirely, we will tell you at least 30 days in advance and refund the unused part of any paid period.',
        ],
      },
      {
        heading: 'Changes to these terms',
        body: [
          'We may update these terms. If a change is material we will notify you by email or inside the app at least 15 days before it takes effect. Continuing to use the service after that date means you accept the new version; if you do not accept it, you can cancel before then.',
        ],
      },
      {
        heading: 'Disputes and governing law',
        body: [
          'If you have a problem, write to {email} first: most issues are resolved that way. If we cannot resolve it within 30 days, either of us can take it to court.',
          'These terms are governed by the laws of the Commonwealth of Kentucky and of the United States, without regard to conflict of law rules. Disputes will be resolved in the state or federal courts located in Kentucky, except that either of us may go to small claims court where the claim qualifies. This does not take away the protections that the consumer law of your place of residence gives you.',
        ],
      },
      {
        heading: 'General',
        body: [
          'These terms and the Privacy Policy are the whole agreement between you and Factura Fácil about the service. If a part of these terms cannot be enforced, the rest still applies. If we do not enforce a right at a given moment, we do not waive it. You may not transfer your account or these terms without our permission; we may transfer them as part of a sale or reorganization of the business.',
          'We are not responsible for delays or failures caused by events outside our reasonable control, such as outages of our providers, natural disasters or government actions.',
          'You agree to receive notices from us electronically, by email or inside the app. These terms are available in Spanish and English with the same meaning; if they conflict, the English version controls.',
        ],
      },
      {
        heading: 'Contact',
        body: ['Write to {email}.'],
      },
    ],
  },
  smsConsent: {
    title: 'SMS Messaging Consent',
    updated: 'October 5, 2026',
    intro:
      'Factura Fácil lets the businesses that use the platform send invoices and estimates to their customers by SMS. This page explains what messages are sent, how your consent is obtained and how to opt out.',
    sections: [
      {
        heading: 'Who sends the messages',
        body: [
          'Messages are sent on behalf of the business that serves you (for example your landscaper, cleaner or contractor) through the Factura Fácil platform, operated at facturafacilapp.com. Factura Fácil does not send its own advertising by SMS.',
        ],
      },
      {
        heading: 'How your consent is obtained',
        body: [
          'The business asks for your phone number when you hire a service and tells you it will be used to send your invoices or estimates. By providing your number for that purpose you agree to receive those messages. The business is responsible for only entering numbers of customers who have agreed.',
        ],
      },
      {
        heading: 'What messages you will receive',
        body: [
          'Transactional messages about your service: an invoice or estimate with a link to view it and download the PDF, and occasionally a payment reminder.',
          'Example: "Hi, here is invoice INV-0042 from Jardinería López for $350.00. You can view it and download the PDF here: https://facturafacilapp.com/i/… Due Oct 18. Thank you!"',
        ],
      },
      {
        heading: 'Message frequency',
        body: [
          'Frequency depends on the services you hire. Typically one message per invoice or estimate, plus an occasional reminder. There are no automatic recurring messages.',
        ],
      },
      {
        heading: 'Cost',
        body: [
          'Message and data rates may apply. Factura Fácil does not charge you for receiving messages.',
        ],
      },
      {
        heading: 'How to opt out',
        body: [
          'Reply STOP to any message to stop receiving SMS from that number. You will get a confirmation and no further messages will be sent. You can also ask the business to contact you another way.',
        ],
      },
      {
        heading: 'Help',
        body: ['Reply HELP for contact information, or write to {email}.'],
      },
      {
        heading: 'Privacy',
        body: [
          'Your phone number is used only to deliver these messages. We do not sell it or share it with third parties for marketing. See our Privacy Policy for details.',
        ],
      },
    ],
  },
}
