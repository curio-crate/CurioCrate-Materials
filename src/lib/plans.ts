export type PlanId = "teacher" | "school" | "district";

export const PLANS: { id: PlanId; name: string; priceYear: number; who: string; includes: string[]; featured?: boolean; priceEnv: string }[] = [
  {
    id: "teacher",
    name: "Teacher",
    priceYear: 79,
    who: "One teacher, any school.",
    includes: ["Every kit's online materials", "All teacher training", "New content as it ships", "Curie.AI for your classes"],
    priceEnv: "STRIPE_PRICE_TEACHER_YEARLY",
  },
  {
    id: "school",
    name: "School",
    priceYear: 690,
    who: "Every teacher at one school.",
    includes: ["Everything in Teacher, for the whole school", "School-wide Curie.AI", "Priority support"],
    featured: true,
    priceEnv: "STRIPE_PRICE_SCHOOL_YEARLY",
  },
  {
    id: "district",
    name: "District",
    priceYear: 4900,
    who: "Every school in a district.",
    includes: ["Everything in School, for every school", "District dashboard and usage reports", "Data privacy agreement", "Purchase orders accepted"],
    priceEnv: "STRIPE_PRICE_DISTRICT_YEARLY",
  },
];

export function planById(id: string) {
  return PLANS.find((p) => p.id === id) ?? null;
}
