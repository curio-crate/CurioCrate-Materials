// Kit lines. Luminol is Curiocrate's real kit (details from curiocrate.org/kits/luminol).
// Circuits and Clean Water are placeholder kit lines (status "in_development") so the catalog
// demonstrates grades 4-10; see DECISIONS.md. Edit or remove them in this file and re-seed.

export type KitStatus = "available" | "in_development";
export type KitAccent = "lum" | "blue" | "gold";

export type KitSeed = {
  slug: string;
  name: string;
  shortName: string;
  code: string; // printed on box / used as redemption code prefix
  gradeBand: string;
  gradeMin: number;
  gradeMax: number;
  tagline: string;
  description: string;
  status: KitStatus;
  accent: KitAccent;
  version: string;
  versionNotes: string;
  inTheBox: string[];
  skills: string[];
  ngss: string[];
};

export const KITS: KitSeed[] = [
  {
    slug: "luminol",
    name: "Luminol Forensics Kit",
    shortName: "Luminol",
    code: "LMN",
    gradeBand: "Grades 6–8",
    gradeMin: 6,
    gradeMax: 8,
    tagline: "Real forensic chemistry. Zero prep for teachers.",
    description:
      "Middle schoolers solve a mock museum break-in using a real luminol test, real data and real reasoning. Six manual sections take students from a first prediction to an evidence-based verdict.",
    status: "available",
    accent: "lum",
    version: "2026.1",
    versionNotes: "First classroom edition. Matches the 60-page student manual.",
    inTheBox: [
      "Pre-measured liquids",
      "6 numbered sample tubes",
      "Beakers",
      "Pipette",
      "Gloves",
      "Blackout sleeve",
      "60-page student manual",
      "Teacher guide",
      "Built-in assessment",
    ],
    skills: [
      "Redox reactions",
      "Catalysts and enzymes",
      "pH",
      "Serial dilution",
      "Controls",
      "Limit of detection",
      "Evidence-based reasoning",
    ],
    ngss: ["MS-PS1-2", "PS1.B", "SEP-3", "SEP-4", "SEP-5", "SEP-6", "SEP-7", "CCC-1", "CCC-2", "CCC-3"],
  },
  {
    slug: "circuits",
    name: "Circuit Builders Kit",
    shortName: "Circuits",
    code: "CRC",
    gradeBand: "Grades 4–5",
    gradeMin: 4,
    gradeMax: 5,
    tagline: "Light a bulb, then figure out why it lights.",
    description:
      "Students build series and parallel circuits with batteries, bulbs and switches, then use what they find to explain how energy moves from place to place.",
    status: "in_development",
    accent: "gold",
    version: "2026.0-preview",
    versionNotes: "Preview materials while the physical kit is in development.",
    inTheBox: ["Battery packs", "Bulbs and holders", "Switches", "Snap wires", "Student journal", "Teacher guide"],
    skills: ["Closed circuits", "Series and parallel", "Conductors and insulators", "Energy transfer", "Fair tests"],
    ngss: ["4-PS3-2", "4-PS3-4", "SEP-3", "SEP-6", "CCC-2", "CCC-5"],
  },
  {
    slug: "clean-water",
    name: "Clean Water Engineering Kit",
    shortName: "Clean Water",
    code: "H2O",
    gradeBand: "Grades 9–10",
    gradeMin: 9,
    gradeMax: 10,
    tagline: "Design a filter. Test it. Defend your design.",
    description:
      "Teams design, build and test layered water filters against cost and clarity constraints, then argue for the design their community should use.",
    status: "in_development",
    accent: "blue",
    version: "2026.0-preview",
    versionNotes: "Preview materials while the physical kit is in development.",
    inTheBox: ["Filter columns", "Sand, gravel and charcoal", "Turbidity cards", "Sample water packets", "Engineering notebook", "Teacher guide"],
    skills: ["Engineering design", "Constraints and trade-offs", "Turbidity", "Iterative testing", "Argument from evidence"],
    ngss: ["HS-ETS1-2", "HS-ETS1-3", "HS-ESS3-4", "SEP-6", "SEP-7", "CCC-4"],
  },
];

export const NGSS_LABELS: Record<string, string> = {
  "MS-PS1-2": "Is it a chemical reaction?",
  "PS1.B": "Chemical reactions",
  "4-PS3-2": "Energy can be transferred by electric currents",
  "4-PS3-4": "Design a device that converts energy",
  "HS-ETS1-2": "Design a solution by breaking down a complex problem",
  "HS-ETS1-3": "Evaluate a solution against criteria and trade-offs",
  "HS-ESS3-4": "Reduce human impacts on natural systems",
  "SEP-3": "Planning and carrying out investigations",
  "SEP-4": "Analyzing and interpreting data",
  "SEP-5": "Using mathematics and computational thinking",
  "SEP-6": "Constructing explanations and designing solutions",
  "SEP-7": "Engaging in argument from evidence",
  "CCC-1": "Patterns",
  "CCC-2": "Cause and effect",
  "CCC-3": "Scale, proportion and quantity",
  "CCC-4": "Systems and system models",
  "CCC-5": "Energy and matter",
};

export function kitBySlug(slug: string) {
  return KITS.find((k) => k.slug === slug);
}
