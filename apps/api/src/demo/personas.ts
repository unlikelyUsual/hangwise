export const DEV_USER_HEADER = "X-Hangwise-Dev-User";
export const DEV_SECRET_HEADER = "X-Hangwise-Dev-Secret";
export const EXAMPLE_DEV_SECRET = "hangwise-dev-secret";

export const personas = [
  { id: "11111111-1111-4111-8111-111111111111", label: "Alex Demo", role: "customer" },
  { id: "11111111-1111-4111-8111-111111111112", label: "Priya Demo", role: "customer" },
  { id: "22222222-2222-4222-8222-222222222221", label: "Maya Srisai", role: "companion" },
  { id: "22222222-2222-4222-8222-222222222222", label: "Arun Desai", role: "companion" },
  { id: "22222222-2222-4222-8222-222222222223", label: "Lena Moretti", role: "companion" },
  { id: "22222222-2222-4222-8222-222222222224", label: "Kenji Aoki", role: "companion" },
  { id: "33333333-3333-4333-8333-333333333333", label: "Admin Demo", role: "admin" },
] as const;

export type DemoPersona = (typeof personas)[number];

export function personaByLabel(label: string): DemoPersona {
  const found = personas.find((persona) => persona.label === label);
  if (!found) throw new Error(`Unknown demo persona ${label}`);
  return found;
}

export const DemoUserIds = {
  alex: personaByLabel("Alex Demo").id,
  priya: personaByLabel("Priya Demo").id,
  maya: personaByLabel("Maya Srisai").id,
  arun: personaByLabel("Arun Desai").id,
  lena: personaByLabel("Lena Moretti").id,
  kenji: personaByLabel("Kenji Aoki").id,
  admin: personaByLabel("Admin Demo").id,
} as const;
