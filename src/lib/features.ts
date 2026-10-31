// Which roadmap phase has shipped. Navigation and entry points for later phases stay hidden until then.
// Phase 1: MVP · Phase 2: labs, student class codes, Clever/ClassLink · Phase 3: Curie.AI, subscriptions, districts, LMS.
export const SHIPPED_PHASE = 3 as 1 | 2 | 3;

export const features = {
  labs: SHIPPED_PHASE >= 2,
  classes: SHIPPED_PHASE >= 2,
  sso: SHIPPED_PHASE >= 2,
  curie: SHIPPED_PHASE >= 3,
  subscriptions: SHIPPED_PHASE >= 3,
  districts: SHIPPED_PHASE >= 3,
  lms: SHIPPED_PHASE >= 3,
};
export type Features = typeof features;
