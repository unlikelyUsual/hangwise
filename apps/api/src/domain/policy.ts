export const publicDatePolicy = {
  demo: true,
  emergencyMonitoring: false,
  identityVerification: false,
  sexualServices: "prohibited",
  romanceEntitlement: "none",
  statements: [
    "Hangwise is a marketplace for paid time on a public date.",
    "A booking is not a sexual service, not a romance, and not consent to sexual contact.",
    "Either person can end the meeting.",
    "This demo does not verify identity and does not monitor emergencies.",
    "Payments are disabled. A hold does not charge a card.",
  ],
} as const;

export const COMPANION_BOUNDARIES =
  "Public places only. Paid time for a platonic hangout. No sexual contact, no romance as an entitlement, and either person can end the meeting.";
