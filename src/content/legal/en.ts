import type { LegalContent } from './types'

/** English legal copy. Mirrors ./es.ts section for section. */
export const legalEn: LegalContent = {
  privacy: {
    title: 'Privacy Policy',
    updated: 'October 5, 2026',
    intro:
      'Factura Fácil (facturafacilapp.com) is a tool for creating invoices and estimates and sharing them over WhatsApp or SMS. This policy explains what data we collect, what we use it for and what rights you have. Questions? Write to {email}.',
    sections: [
      {
        heading: 'What we collect',
        body: [
          'Account data: your name, email address and password. The password is stored as a salted hash, never in plain text.',
          'Business data: the name, phone, address, logo, time zone, currency and payment instructions you enter.',
          'Your customers’ data: the name, phone, email and company you record so you can send them invoices. You are responsible for having permission to use that information.',
          'Documents: invoices, estimates, line items, amounts, notes and their history (created, sent, viewed, paid).',
          'Technical data: IP address, browser type, pages visited and error logs. We use these for security and to keep the service running.',
        ],
      },
      {
        heading: 'How we use your data',
        body: [
          'To provide the service: generate your invoices and PDFs, show the invoice to your customer through the link you share, send SMS when you ask us to, and show you what is still unpaid.',
          'To communicate with you: welcome emails, password resets and important notices about the service. We do not send third-party advertising.',
          'To protect the service: detect abuse, prevent fraud and fix errors.',
        ],
      },
      {
        heading: 'Public invoice links',
        body: [
          'When you share an invoice or estimate we generate a unique, hard-to-guess link. Anyone who has that link can view the document and download the PDF. We ask search engines not to index those pages. Share the link only with your customer.',
        ],
      },
      {
        heading: 'AI assistant',
        body: [
          'If you use the assistant, your questions and the data needed to answer them (for example invoices or customers) are sent to OpenAI to generate the reply. Under its API policy, OpenAI does not use that data to train its models. Chat history is stored in your account and you can delete it at any time.',
        ],
      },
      {
        heading: 'Who we share data with',
        body: [
          'We do not sell your data. We share it only with the providers we need to run the service: Cloudflare (hosting, logo storage, PDF generation and email delivery), Neon (database), OpenAI (AI assistant) and Twilio (SMS delivery when you choose that option).',
          'We may also share data when the law requires it or to protect the security of the service and other users.',
        ],
      },
      {
        heading: 'Cookies and local storage',
        body: [
          'We use a session cookie to keep you signed in and the browser’s local storage to remember preferences such as your language. We do not use advertising cookies or third-party trackers.',
        ],
      },
      {
        heading: 'How long we keep data',
        body: [
          'We keep your data while your account is active. If you ask us to delete your account, we remove your data from our systems within 30 days, except what we must keep for legal or accounting obligations.',
        ],
      },
      {
        heading: 'Security',
        body: [
          'All traffic is encrypted (HTTPS). Passwords are hashed and access to data is restricted to your account. No system is 100% secure: use a unique password and tell us at {email} if you notice anything unusual.',
        ],
      },
      {
        heading: 'Your rights',
        body: [
          'You can view and correct your data in Settings. You can request a copy of your data or deletion of your account by writing to {email}. We respond within 30 days.',
          'If you live in California or another region with specific privacy laws, those rights apply to you as well. We do not sell or share personal data for advertising purposes.',
        ],
      },
      {
        heading: 'Children',
        body: [
          'The service is intended for businesses and people aged 18 or older. We do not knowingly collect data from minors.',
        ],
      },
      {
        heading: 'Where data is processed',
        body: [
          'We operate from the United States and our providers may process data there and in other countries. By using the service you agree to that processing.',
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
    updated: 'October 5, 2026',
    intro:
      'These terms govern your use of Factura Fácil (facturafacilapp.com). By creating an account you agree to these terms and to our Privacy Policy. If you do not agree, do not use the service.',
    sections: [
      {
        heading: 'Who can use the service',
        body: [
          'You must be at least 18 years old and use the service for a business or professional activity. You are responsible for the information you enter and for keeping your password secret. Tell us immediately if you believe someone used your account without permission.',
        ],
      },
      {
        heading: 'What Factura Fácil is',
        body: [
          'Factura Fácil lets you create invoices and estimates, share them over WhatsApp, SMS or a link, and keep track of what has been paid.',
          'We do not process payments or move money. Payment instructions (Zelle, Cash App, cash, check or others) are yours, and payment happens outside the platform, directly between you and your customer.',
        ],
      },
      {
        heading: 'Your responsibility for your documents',
        body: [
          'You are responsible for the content of your invoices and estimates: amounts, taxes, descriptions and customer details. Factura Fácil does not provide tax, accounting or legal advice. Make sure your documents comply with the laws that apply to you.',
        ],
      },
      {
        heading: 'Messaging your customers',
        body: [
          'When you share over WhatsApp, the message is sent from your own WhatsApp. When you choose SMS, the message is sent through our provider on your behalf.',
          'Only message customers who expect to hear from you and who gave you their number for that purpose. Using the service to send spam or unsolicited messages is prohibited. You must follow WhatsApp’s rules and messaging laws such as the TCPA in the United States.',
        ],
      },
      {
        heading: 'Acceptable use',
        body: [
          'Do not use the service for illegal activity, to issue false or misleading documents, to impersonate other people or businesses, or to try to access other users’ data or interfere with the platform.',
        ],
      },
      {
        heading: 'Your content',
        body: [
          'Your data and documents belong to you. You give us permission to store, process and display them only to provide the service, for example to generate the PDF or show the invoice to your customer through the link you share.',
        ],
      },
      {
        heading: 'AI assistant',
        body: [
          'The assistant generates automatic answers from your data and can be wrong. Always review the information before making decisions based on it.',
        ],
      },
      {
        heading: 'Price',
        body: [
          'The service is currently offered at no cost. If we introduce paid plans in the future we will tell you in advance and you can decide whether to continue.',
        ],
      },
      {
        heading: 'Availability and warranties',
        body: [
          'We work to keep the service available, but it is provided "as is" without warranties of any kind. There may be interruptions for maintenance or causes outside our control. We recommend downloading the PDF of your important documents.',
        ],
      },
      {
        heading: 'Limitation of liability',
        body: [
          'To the extent permitted by law, Factura Fácil is not liable for lost revenue, data or profits, or for indirect damages arising from use of the service, including payments your customers fail to make. Our total liability is limited to what you paid for the service in the last 12 months.',
        ],
      },
      {
        heading: 'Termination',
        body: [
          'You can stop using the service and request deletion of your account at any time by writing to {email}. We may suspend or close accounts that violate these terms or put the service at risk.',
        ],
      },
      {
        heading: 'Changes to these terms',
        body: [
          'We may update these terms. If a change is material we will notify you by email or inside the app. Continuing to use the service after the notice means you accept the new version.',
        ],
      },
      {
        heading: 'Governing law',
        body: [
          'These terms are governed by the laws of the United States and of the state where Factura Fácil operates. Any dispute will be resolved in the courts of that jurisdiction.',
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
