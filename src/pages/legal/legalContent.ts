// Legal copy. DRAFT: have a Nigerian lawyer review before launch and fill in
// the company details marked with [brackets].

export const COMPANY = {
  name: '[Company name] Ltd',
  rc: '[RC number]',
  address: '[Registered address], Lagos, Nigeria',
  email: '[support@yourdomain]',
  dpo: '[privacy@yourdomain]',
}

export interface LegalDoc {
  title: string
  updated: string
  sections: { heading: string; body: string[] }[]
}

export const LEGAL: Record<'terms' | 'refunds' | 'privacy', LegalDoc> = {
  terms: {
    title: 'Terms of use',
    updated: '24 September 2026',
    sections: [
      {
        heading: 'Who we are',
        body: [
          `Ariya is operated by ${COMPANY.name} (${COMPANY.rc}), ${COMPANY.address}. By using Ariya you agree to these terms.`,
          'Ariya is a platform. Events, contests and aso-ebi are organised and sold by independent organisers (“sellers”). The organiser, not Ariya, is responsible for the event itself.',
        ],
      },
      {
        heading: 'Buying tickets and votes',
        body: [
          'Prices are set by the organiser and shown in naira before you pay. Where the organiser chooses, a payment fee is added and shown separately at checkout.',
          'Payments are processed by Paystack. Your payment is split at the moment you pay: the organiser’s share settles to the organiser’s bank account and Ariya’s commission to Ariya. Ariya does not hold organisers’ funds.',
          'A ticket admits one person (a table ticket admits the number of guests shown) and can be used once. Keep your QR code private; anyone holding it can use it first.',
          'Votes you buy are final once counted, except where a contest is cancelled.',
        ],
      },
      {
        heading: 'Organisers',
        body: [
          'Organisers must give accurate event details, hold every licence and permit their event needs, and honour refunds under our refund policy.',
          'Organisers running paid voting contests confirm they hold any promotional-competition permit required by the state where the contest runs (for example, from the Lagos State Lotteries and Gaming Authority) and that prizes and rules are published to participants.',
          'We verify organisers’ bank accounts before approval and may suspend any organiser who misleads buyers, fails to refund, or breaks the law.',
        ],
      },
      {
        heading: 'Acceptable use',
        body: [
          'Do not resell tickets above face value through Ariya, create fake accounts to vote, copy or forge QR codes, or interfere with the service. We may cancel tickets or votes obtained this way.',
        ],
      },
      {
        heading: 'Liability',
        body: [
          'To the extent the law allows, Ariya is not liable for the conduct of organisers or for anything that happens at an event. Nothing in these terms limits rights you have under the Federal Competition and Consumer Protection Act 2018.',
        ],
      },
      {
        heading: 'Contact',
        body: [`Questions or complaints: ${COMPANY.email}. These terms are governed by the laws of the Federal Republic of Nigeria.`],
      },
    ],
  },
  refunds: {
    title: 'Refund policy',
    updated: '24 September 2026',
    sections: [
      {
        heading: 'Cancelled events',
        body: [
          'If an organiser cancels an event, every paid order is refunded in full, including any payment fee, back to the card or account you paid with. You do not need to ask.',
          'Refunds usually reach you within 5–10 working days of the cancellation, depending on your bank.',
        ],
      },
      {
        heading: 'Postponed events',
        body: [
          'Your ticket stays valid for the new date. If you cannot attend, you can request a full refund from My tickets until the new date, as long as no ticket in the order has been used.',
        ],
      },
      {
        heading: 'Everything else',
        body: [
          'Otherwise tickets are non-refundable unless the organiser chooses to refund you. Organisers can refund any order from their dashboard.',
          'Aso-ebi is refunded if the event is cancelled before you collect it. Once collected, contact the organiser.',
          'Paid votes are refunded only if the contest or event is cancelled.',
        ],
      },
      {
        heading: 'Problems with a payment',
        body: [`If you were charged but did not receive tickets, email ${COMPANY.email} with your order reference (it starts with ARY-). We check every flagged payment.`],
      },
    ],
  },
  privacy: {
    title: 'Privacy policy',
    updated: '24 September 2026',
    sections: [
      {
        heading: 'Our commitment',
        body: [
          `${COMPANY.name} is the data controller for Ariya. We process personal data in line with the Nigeria Data Protection Act 2023 and guidance from the Nigeria Data Protection Commission. Contact our data protection officer at ${COMPANY.dpo}.`,
        ],
      },
      {
        heading: 'What we collect and why',
        body: [
          'Account: your email and name, to sign you in and put your name on tickets (performance of a contract).',
          'Phone number: only if you verify it, to limit free votes to one per person (legitimate interest in fair contests). It is never shown publicly.',
          'Orders: what you bought, answers to the organiser’s checkout questions, and payment references, to deliver tickets and handle refunds (contract; legal obligations for financial records).',
          'Organisers: business and bank details, verified through Paystack, to pay you (contract; fraud prevention).',
          'Planner data you save on your device stays on your device unless you choose to share an event.',
        ],
      },
      {
        heading: 'Who we share it with',
        body: [
          'The organiser of an event you buy for receives your name, email, phone (if given) and your answers, so they can run the event.',
          'Paystack processes payments; Supabase hosts our database. Both act under agreements that protect your data. Some processing may happen outside Nigeria with safeguards required by the NDPA.',
          'We never sell your data.',
        ],
      },
      {
        heading: 'How long we keep it',
        body: ['Order and payment records are kept for as long as financial regulations require. Other data is deleted or anonymised when no longer needed or when you close your account.'],
      },
      {
        heading: 'Your rights',
        body: [
          `You can ask to access, correct, delete or move your data, object to processing, or withdraw consent, by emailing ${COMPANY.dpo}. You may also complain to the Nigeria Data Protection Commission.`,
        ],
      },
    ],
  },
}
