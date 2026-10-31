// Online content for every kit: lessons (instructions), PDFs, videos, labs and training.
// Seeded into the database by src/db/seed.ts; PDFs and stand-in videos are rendered from these
// definitions by scripts/generate-media.ts. Luminol content follows the real manual sections
// (A.0-A.5) published at curiocrate.org/kits/luminol.
import type { Block } from "@/db/schema";

export type Tier = "free" | "kit_owner" | "subscription";
export type ContentKind = "lab" | "instructions" | "video" | "pdf" | "training";

export type PdfSpec = {
  heading: string;
  subtitle: string;
  sections: { heading: string; lines: string[]; writeLines?: number }[];
};

export type ContentSeed = {
  slug: string;
  kit: string | null;
  type: ContentKind;
  title: string;
  summary: string;
  tier: Tier;
  sample?: boolean;
  minutes?: number;
  ngss?: string[];
  section?: string;
  parent?: string;
  body?: Block[];
  pdf?: PdfSpec;
  narration?: string[]; // video script; one caption cue per line
  labSlug?: string;
};

/** Seconds a caption cue stays on screen: deterministic so the DB, VTT and rendered video agree. */
export function cueSeconds(text: string) {
  const words = text.trim().split(/\s+/).length;
  return Math.max(3, Math.round((words / 2.6 + 0.8) * 10) / 10);
}

export function cuesFor(narration: string[]) {
  let t = 0;
  return narration.map((text) => {
    const start = Math.round(t * 10) / 10;
    t += cueSeconds(text);
    return { start, end: Math.round(t * 10) / 10, text };
  });
}

const LUM_SAFETY: Block = {
  type: "callout",
  tone: "safety",
  title: "Goggles and gloves",
  text: "Everyone wears goggles and gloves for every step with liquids. Liquids come pre-measured; nobody weighs powders. The teacher collects all waste in the labeled waste beaker.",
};

export const CONTENT: ContentSeed[] = [
  // =====================================================================================
  // LUMINOL FORENSICS KIT (grades 6-8)
  // =====================================================================================
  {
    slug: "luminol-a0-predict",
    kit: "luminol",
    type: "instructions",
    section: "A.0",
    title: "A.0 Predict: How faint can a glow get?",
    summary: "Open the case file, meet the museum break-in, and predict how far the glow test can see.",
    tier: "free",
    sample: true,
    minutes: 35,
    ngss: ["MS-PS1-2", "SEP-5"],
    body: [
      { type: "p", text: "Last night someone broke into the Cerritos Science Museum and mopped the floor of the gem gallery. The mop water looks perfectly clean. Your class is the forensic team, and your job is to find out what the mop was hiding." },
      { type: "h", text: "Learning goals" },
      { type: "list", items: ["Describe what a forensic scientist means by a test's limit of detection.", "Read a serial dilution: each tube is 10 times weaker than the one before.", "Make a written prediction you can check later with evidence."] },
      { type: "materials", items: ["Student manual pages 1-12", "Case file card", "Pencil", "Predict worksheet (PDF below)"] },
      { type: "h", text: "Steps" },
      { type: "steps", items: ["Read the case file aloud as a class (manual p. 6, The Scene).", "Look at the six numbered tubes. Tube 1 holds a 1 in 100 dilution. Every tube after it is 10 times weaker, down to 1 in 1,000,000 in tube 5. Tube 6 is water only.", "On your worksheet, predict the last tube that will still glow. Write one sentence explaining why.", "Share predictions with your group. Record the range of guesses on the board.", "Keep your worksheet. You will check your prediction in A.3."] },
      { type: "explain", prompt: "Why might a test that can only see big stains be a problem for a forensic team?" },
      { type: "callout", tone: "teacher", title: "Teacher note", text: "No liquids are used in A.0, so this section works as a stand-alone sample lesson. Expect most students to predict tube 2 or 3; the real answer surprises them." },
    ],
  },
  {
    slug: "luminol-a0-worksheet",
    kit: "luminol",
    type: "pdf",
    parent: "luminol-a0-predict",
    title: "Predict worksheet (A.0)",
    summary: "One-page prediction sheet with the dilution ladder.",
    tier: "free",
    sample: true,
    pdf: {
      heading: "A.0 Predict",
      subtitle: "Luminol Forensics Kit · Case LMN-2026",
      sections: [
        { heading: "The dilution ladder", lines: ["Tube 1: 1 in 100", "Tube 2: 1 in 1,000", "Tube 3: 1 in 10,000", "Tube 4: 1 in 100,000", "Tube 5: 1 in 1,000,000", "Tube 6: water only (control)"] },
        { heading: "My prediction", lines: ["The last tube that will still glow is tube ____ because:"], writeLines: 4 },
        { heading: "My group's range of predictions", lines: ["Lowest tube: ____    Highest tube: ____"] },
      ],
    },
  },
  {
    slug: "luminol-case-intro-video",
    kit: "luminol",
    type: "video",
    parent: "luminol-a0-predict",
    title: "Meet the case: the museum break-in",
    summary: "A two-minute introduction to Case LMN-2026 for the whole class.",
    tier: "free",
    sample: true,
    narration: [
      "Case L M N twenty twenty-six. The Cerritos Science Museum.",
      "Last night someone broke into the gem gallery.",
      "By morning, the floor had been mopped clean.",
      "Clean to our eyes. But not clean to chemistry.",
      "Luminol glows when it meets a tiny trace of blood.",
      "Your team will find out how tiny that trace can be.",
      "Then you will decide who fits the evidence.",
    ],
  },
  {
    slug: "luminol-a1-why-it-glows",
    kit: "luminol",
    type: "instructions",
    section: "A.1",
    title: "A.1 Why it glows",
    summary: "Electrons move, energy leaves as light. Catalysts, pH 10-12 and why the mix stays dark until the sample goes in.",
    tier: "kit_owner",
    minutes: 45,
    ngss: ["PS1.B", "SEP-6", "CCC-2", "CCC-3"],
    body: [
      { type: "p", text: "Luminol does not glow on its own. It needs an oxidizer, a basic solution, and a catalyst. The iron inside blood is the catalyst, which is why a mopped floor can still give a stain away." },
      { type: "h", text: "Learning goals" },
      { type: "list", items: ["Explain that in the reaction electrons move from one molecule to another and the extra energy leaves as light.", "Explain why a catalyst speeds a reaction up without being used up.", "Explain why the mix must be at pH 10 to 12."] },
      { type: "materials", items: ["Pre-measured solution A (luminol, basic)", "Pre-measured solution B (oxidizer)", "Tube 1 (positive) and tube 6 (water)", "Blackout sleeve", "Beaker, pipette, goggles, gloves"] },
      LUM_SAFETY,
      { type: "h", text: "Steps" },
      { type: "steps", items: ["Watch the video 'Why luminol glows' as a class.", "Mix solution A and solution B in the beaker. Observe it in the blackout sleeve: it stays dark.", "Add three drops from tube 6 (water). Observe: still dark.", "Add three drops from tube 1. Observe the blue glow inside the sleeve.", "Fill in the cause-and-effect table on manual p. 15."] },
      { type: "table", head: ["What we added", "What we saw", "Why"], rows: [["Nothing", "Dark", "No catalyst, no light"], ["Water (tube 6)", "Dark", "Water is not a catalyst"], ["Tube 1", "Blue glow", "The catalyst lets the reaction run fast enough to see"]] },
      { type: "explain", prompt: "Tube 5 holds a millionth of what tube 1 holds. Do you think it will be a millionth as bright? Explain your thinking." },
    ],
  },
  {
    slug: "luminol-why-it-glows-video",
    kit: "luminol",
    type: "video",
    parent: "luminol-a1-why-it-glows",
    title: "Why luminol glows",
    summary: "The chemistry behind the glow in under three minutes, with captions and a transcript.",
    tier: "kit_owner",
    narration: [
      "Why does luminol glow?",
      "In a basic solution, luminol is ready to react with an oxidizer.",
      "But on its own, the reaction is far too slow to see.",
      "Iron in blood acts as a catalyst. It speeds the reaction up without being used up.",
      "As electrons move from one molecule to another, the product is left with extra energy.",
      "That extra energy leaves as a particle of blue light.",
      "No catalyst, no light. Less catalyst, less light.",
      "That cause and effect is what your test will measure.",
    ],
  },
  {
    slug: "luminol-a1-notes",
    kit: "luminol",
    type: "pdf",
    parent: "luminol-a1-why-it-glows",
    title: "Why it glows: notes page (A.1)",
    summary: "Cause-and-effect table and explain box for A.1.",
    tier: "kit_owner",
    pdf: {
      heading: "A.1 Why it glows",
      subtitle: "Luminol Forensics Kit · Case LMN-2026",
      sections: [
        { heading: "Three things luminol needs", lines: ["1. A basic solution (pH 10 to 12)", "2. An oxidizer", "3. A catalyst (the iron in blood)"] },
        { heading: "Cause and effect", lines: ["Nothing added: ____________", "Water (tube 6): ____________", "Tube 1: ____________"], writeLines: 1 },
        { heading: "Explain", lines: ["In your own words, where does the light come from?"], writeLines: 5 },
      ],
    },
  },
  {
    slug: "luminol-a2-yes-or-no",
    kit: "luminol",
    type: "instructions",
    section: "A.2",
    title: "A.2 Yes or no",
    summary: "Run the test with a known positive and a water-only control. Is it a chemical reaction?",
    tier: "kit_owner",
    minutes: 40,
    ngss: ["MS-PS1-2", "SEP-3", "SEP-6", "CCC-2"],
    body: [
      { type: "p", text: "Before a forensic team trusts a test, it runs controls. A known-positive sample should glow. A water-only sample should not. If either control gives the wrong answer, nothing else the test says can be trusted." },
      LUM_SAFETY,
      { type: "steps", items: ["Label two beakers: POSITIVE and CONTROL.", "Add the same amount of mixed solution to each beaker.", "Add three drops of tube 1 to POSITIVE and three drops of tube 6 to CONTROL.", "Observe both in the blackout sleeve for 30 seconds each.", "Record yes or no for each in the evidence log."] },
      { type: "explain", prompt: "The mix stays clear and dark until the sample goes in, then it glows. What evidence tells you a chemical reaction happened?" },
    ],
  },
  {
    slug: "luminol-evidence-log",
    kit: "luminol",
    type: "pdf",
    parent: "luminol-a2-yes-or-no",
    title: "Evidence log",
    summary: "The group evidence log used in A.2 to A.4.",
    tier: "kit_owner",
    pdf: {
      heading: "Evidence log",
      subtitle: "Luminol Forensics Kit · Case LMN-2026",
      sections: [
        { heading: "Controls (A.2)", lines: ["POSITIVE (tube 1): glow?  YES / NO", "CONTROL (tube 6): glow?  YES / NO"] },
        { heading: "Dilution results (A.3)", lines: ["Tube 1: ____  Tube 2: ____  Tube 3: ____", "Tube 4: ____  Tube 5: ____  Tube 6: ____", "Brightness scale: 3 bright · 2 dim · 1 barely · 0 none"] },
        { heading: "Our limit of detection", lines: ["The last tube that glowed for our group: ____"], writeLines: 2 },
      ],
    },
  },
  {
    slug: "luminol-a3-find-your-limit",
    kit: "luminol",
    type: "instructions",
    section: "A.3",
    title: "A.3 Find your limit",
    summary: "Test the serial dilution tube by tube and find the faintest stain your test can see.",
    tier: "kit_owner",
    minutes: 50,
    ngss: ["MS-PS1-2", "SEP-3", "SEP-4", "SEP-5", "SEP-6", "CCC-1", "CCC-3"],
    body: [
      { type: "p", text: "Each tube is 10 times weaker than the one before, from 1 in 100 to 1 in 1,000,000. You will test them in order, with the same steps every time, and rate the glow." },
      LUM_SAFETY,
      { type: "steps", items: ["Start with fresh mixed solution for each tube.", "Add three drops from the tube, then observe in the blackout sleeve for 30 seconds.", "Rate the glow 0-3 and record it in the evidence log.", "Repeat for tubes 2 to 6, in order.", "Compare with your A.0 prediction."] },
      { type: "callout", tone: "tip", title: "Try it online first", text: "The Find Your Limit online lab runs the same dilution in the browser, so absent students can still collect data." },
      { type: "explain", prompt: "Was your prediction from A.0 correct? Use your data to explain why or why not." },
    ],
  },
  {
    slug: "luminol-limit-lab",
    kit: "luminol",
    type: "lab",
    title: "Find Your Limit: serial dilution lab",
    summary: "Run the luminol test on six tubes in the browser and find the limit of detection.",
    tier: "free",
    sample: true,
    minutes: 20,
    ngss: ["MS-PS1-2", "SEP-4", "SEP-5", "CCC-3"],
    labSlug: "luminol-limit",
  },
  {
    slug: "luminol-a4-whole-room",
    kit: "luminol",
    type: "instructions",
    section: "A.4",
    title: "A.4 The whole room",
    summary: "Pool every group's results on one chart and look for the pattern.",
    tier: "kit_owner",
    minutes: 40,
    ngss: ["SEP-4", "SEP-6", "SEP-7", "CCC-1"],
    body: [
      { type: "p", text: "One group's result can be a fluke. Thirty students' results make a pattern. Today the class becomes one big forensic lab." },
      { type: "steps", items: ["Each group adds its limit of detection to the class chart.", "Look at where results bunch up. Circle the most common last-glowing tube.", "Discuss any group whose result is far from the rest. What might have happened?", "Agree as a class on the limit you trust most."] },
      { type: "explain", prompt: "Groups got different answers. Which evidence do you trust, and why?" },
    ],
  },
  {
    slug: "luminol-a5-who-fits",
    kit: "luminol",
    type: "instructions",
    section: "A.5",
    title: "A.5 Who fits the evidence",
    summary: "Use the class limit of detection to decide which suspect's story the evidence supports.",
    tier: "kit_owner",
    minutes: 50,
    ngss: ["SEP-6", "SEP-7"],
    body: [
      { type: "p", text: "Three suspects were in the museum. Each tells a different story about when the floor was mopped and how much was spilled. Only one story fits what your test can and cannot see." },
      { type: "steps", items: ["Read the three suspect statements (manual p. 47-50).", "For each, decide whether a stain that size would be above or below the class limit.", "Write a claim, the evidence for it, and your reasoning.", "Present your verdict to another group and listen to theirs."] },
      { type: "explain", prompt: "Write your claim, evidence and reasoning. What would change your mind?" },
    ],
  },
  {
    slug: "luminol-teacher-guide",
    kit: "luminol",
    type: "pdf",
    title: "Teacher guide: Luminol Forensics Kit",
    summary: "Pacing, prep (none), safety, answer keys and the built-in assessment.",
    tier: "kit_owner",
    minutes: 15,
    pdf: {
      heading: "Teacher guide",
      subtitle: "Luminol Forensics Kit · Grades 6-8",
      sections: [
        { heading: "Pacing", lines: ["A.0 Predict: 35 min", "A.1 Why it glows: 45 min", "A.2 Yes or no: 40 min", "A.3 Find your limit: 50 min", "A.4 The whole room: 40 min", "A.5 Who fits the evidence: 50 min"] },
        { heading: "Prep", lines: ["None. All liquids arrive pre-measured.", "Charge the blackout sleeve lights the day before if using the LED version."] },
        { heading: "Safety and waste", lines: ["Goggles and gloves for every liquid step.", "The teacher collects all waste in the labeled waste beaker and follows the disposal card."] },
        { heading: "Assessment", lines: ["Explain boxes after each section are scored with the rubric on page 4.", "The A.5 verdict is the summative task."] },
      ],
    },
  },
  {
    slug: "luminol-training-walkthrough",
    kit: "luminol",
    type: "training",
    title: "Running the Luminol case: a teacher walkthrough",
    summary: "A 30-minute course: pacing, common misconceptions, and how to run A.4 discussions.",
    tier: "subscription",
    minutes: 30,
    body: [
      { type: "p", text: "This course walks you through the full case the way a first-year teacher would run it, with the moments where students most often get stuck." },
      { type: "h", text: "Module 1: The hook" },
      { type: "p", text: "Spend no more than ten minutes on the case file. The prediction is the hook; resist explaining the chemistry before A.1." },
      { type: "h", text: "Module 2: Misconceptions" },
      { type: "list", items: ["'The luminol is used up.' The catalyst is not; the luminol is.", "'Brighter means more luminol.' In this case brighter means more catalyst.", "'Tube 5 has no blood in it.' It does, just a millionth of tube 1."] },
      { type: "h", text: "Module 3: Running A.4" },
      { type: "p", text: "Put the class chart up before groups finish so the pattern builds in real time. Ask the outlier group to explain their steps before anyone else speaks." },
    ],
  },
  {
    slug: "luminol-training-video",
    kit: "luminol",
    type: "video",
    parent: "luminol-training-walkthrough",
    title: "Walkthrough: the first day of the case",
    summary: "Watch the first day of the Luminol case from the teacher's side.",
    tier: "subscription",
    narration: [
      "Welcome to the Luminol case walkthrough.",
      "On day one, students only need the case file and a pencil.",
      "Keep the hook short. The prediction carries the lesson.",
      "Write every prediction on the board. You will come back to it.",
      "In section A point three, students test their own prediction.",
      "That moment is the reason the case works.",
    ],
  },

  // =====================================================================================
  // CIRCUIT BUILDERS KIT (grades 4-5), in development
  // =====================================================================================
  {
    slug: "circuits-what-lights",
    kit: "circuits",
    type: "instructions",
    section: "1",
    title: "What makes a bulb light?",
    summary: "Students try to light a bulb with one battery and one wire, then draw the path that works.",
    tier: "free",
    sample: true,
    minutes: 40,
    ngss: ["4-PS3-2", "SEP-3", "CCC-2"],
    body: [
      { type: "p", text: "Give a student one battery, one bulb and one wire, and ask them to light it. Most will try three or four ways before it works. Every try that fails is evidence." },
      { type: "materials", items: ["1 battery pack", "1 bulb in holder", "2 snap wires", "Student journal page 2"] },
      { type: "steps", items: ["Try to light the bulb. Draw every way you try, including the ones that fail.", "Circle the drawings where the bulb lit.", "Trace the path from the battery, through the bulb, and back. What do the working drawings share?", "Write a rule: a bulb lights when ..."] },
      { type: "explain", prompt: "Why did some of your tries not light the bulb? Use the word 'path' in your answer." },
    ],
  },
  {
    slug: "circuits-intro-video",
    kit: "circuits",
    type: "video",
    parent: "circuits-what-lights",
    title: "One battery, one bulb, one wire",
    summary: "A short challenge video to start the unit.",
    tier: "free",
    sample: true,
    narration: [
      "Here is a challenge.",
      "One battery. One bulb. One wire.",
      "Can you make the bulb light?",
      "Draw every try, even the ones that fail.",
      "The failures are clues about the path electricity needs.",
    ],
  },
  {
    slug: "circuits-series-parallel",
    kit: "circuits",
    type: "instructions",
    section: "3",
    title: "Series or parallel?",
    summary: "Add a second bulb two different ways and compare brightness.",
    tier: "kit_owner",
    minutes: 45,
    ngss: ["4-PS3-2", "4-PS3-4", "SEP-3", "SEP-6", "CCC-5"],
    body: [
      { type: "p", text: "There are two ways to add a second bulb. In series, there is one path. In parallel, there are two." },
      { type: "steps", items: ["Build a circuit with two bulbs in a single loop (series). Rate brightness 0-3.", "Unscrew one bulb. What happens to the other?", "Build the parallel circuit on journal page 6. Rate brightness again.", "Unscrew one bulb. What happens now?"] },
      { type: "explain", prompt: "Which way would you wire the lights in a house? Use your evidence." },
    ],
  },
  {
    slug: "circuits-journal",
    kit: "circuits",
    type: "pdf",
    parent: "circuits-series-parallel",
    title: "Series and parallel journal pages",
    summary: "Brightness tables and drawing space.",
    tier: "kit_owner",
    pdf: {
      heading: "Series or parallel?",
      subtitle: "Circuit Builders Kit · Grades 4-5",
      sections: [
        { heading: "Series circuit", lines: ["Brightness with 2 bulbs (0-3): ____", "When I unscrew one bulb, the other: ____________"] },
        { heading: "Parallel circuit", lines: ["Brightness with 2 bulbs (0-3): ____", "When I unscrew one bulb, the other: ____________"] },
        { heading: "Draw both circuits", lines: [""], writeLines: 6 },
      ],
    },
  },
  {
    slug: "circuits-sandbox-lab",
    kit: "circuits",
    type: "lab",
    title: "Circuit Sandbox",
    summary: "Close switches, add bulbs and batteries, and see how energy moves through series and parallel circuits.",
    tier: "free",
    sample: true,
    minutes: 20,
    ngss: ["4-PS3-2", "SEP-3", "CCC-5"],
    labSlug: "circuit-sandbox",
  },
  {
    slug: "circuits-teacher-guide",
    kit: "circuits",
    type: "pdf",
    title: "Teacher guide: Circuit Builders Kit (preview)",
    summary: "Unit overview, pacing and answer key (preview edition).",
    tier: "kit_owner",
    pdf: {
      heading: "Teacher guide (preview)",
      subtitle: "Circuit Builders Kit · Grades 4-5",
      sections: [
        { heading: "Unit at a glance", lines: ["1. What makes a bulb light?", "2. Conductors and insulators", "3. Series or parallel?", "4. Design a night light"] },
        { heading: "Big idea", lines: ["Energy can be moved from place to place by electric currents (4-PS3-2)."] },
      ],
    },
  },
  {
    slug: "circuits-training",
    kit: "circuits",
    type: "training",
    title: "Teaching energy transfer in grade 4",
    summary: "How to keep 'electricity' concrete for nine-year-olds, with discussion moves that work.",
    tier: "subscription",
    minutes: 25,
    body: [
      { type: "p", text: "Fourth graders reason best from things they can see change. Keep every claim tied to a bulb that got brighter, dimmer or went out." },
      { type: "list", items: ["Ask 'what's your evidence?' before 'why?'", "Let failed circuits stay on the table as data.", "Use 'path' before 'current'."] },
    ],
  },

  // =====================================================================================
  // CLEAN WATER ENGINEERING KIT (grades 9-10), in development
  // =====================================================================================
  {
    slug: "water-where-it-goes",
    kit: "clean-water",
    type: "instructions",
    section: "1",
    title: "Where does dirty water go?",
    summary: "Map a local watershed and define the problem a filter has to solve.",
    tier: "free",
    sample: true,
    minutes: 45,
    ngss: ["HS-ESS3-4", "SEP-6", "CCC-4"],
    body: [
      { type: "p", text: "Before teams design anything, they need a precise problem. Today students trace where runoff from their own school goes, and what it carries with it." },
      { type: "steps", items: ["Find your school on the watershed map.", "Trace the path of runoff to the nearest creek or channel.", "List what the water could pick up on the way.", "Write a problem statement with at least two criteria and one constraint."] },
      { type: "explain", prompt: "Write your problem statement. Which criterion matters most to your community?" },
    ],
  },
  {
    slug: "water-design-a-filter",
    kit: "clean-water",
    type: "instructions",
    section: "2",
    title: "Design a filter",
    summary: "Choose layers, predict clarity and cost, then build and test.",
    tier: "kit_owner",
    minutes: 90,
    ngss: ["HS-ETS1-2", "HS-ETS1-3", "SEP-6", "SEP-7"],
    body: [
      { type: "p", text: "Each material removes something different. Gravel stops large particles, sand stops fine ones, charcoal grabs dissolved color and smell, and cotton holds it all in place." },
      { type: "steps", items: ["Sketch two designs with different layer orders.", "Predict clarity (NTU) and cost for each.", "Build your better design and pour one sample packet through.", "Measure turbidity with the turbidity card.", "Revise once and test again."] },
      { type: "explain", prompt: "Which trade-off did your team make, and would your community accept it?" },
    ],
  },
  {
    slug: "water-design-brief",
    kit: "clean-water",
    type: "pdf",
    parent: "water-design-a-filter",
    title: "Design brief and test log",
    summary: "Criteria, constraints, and the two-round test log.",
    tier: "kit_owner",
    pdf: {
      heading: "Design brief",
      subtitle: "Clean Water Engineering Kit · Grades 9-10",
      sections: [
        { heading: "Criteria", lines: ["Turbidity below 10 NTU", "Flow of at least 50 mL per minute"] },
        { heading: "Constraint", lines: ["Materials budget: $2.00 per filter"] },
        { heading: "Test log", lines: ["Round 1: NTU ____  Flow ____  Cost ____", "Round 2: NTU ____  Flow ____  Cost ____"], writeLines: 3 },
      ],
    },
  },
  {
    slug: "water-filter-video",
    kit: "clean-water",
    type: "video",
    parent: "water-design-a-filter",
    title: "How a layered filter works",
    summary: "What each layer removes, and why order matters.",
    tier: "kit_owner",
    narration: [
      "A layered filter works like a series of nets.",
      "Gravel stops the largest particles first.",
      "Sand catches the fine particles gravel lets through.",
      "Charcoal grabs dissolved color and smell.",
      "Change the order, and the filter clogs or leaks.",
      "Your job is to find the design that works for the lowest cost.",
    ],
  },
  {
    slug: "water-filter-lab",
    kit: "clean-water",
    type: "lab",
    title: "Filter Designer",
    summary: "Stack layers, run a sample, and trade off clarity, flow and cost.",
    tier: "free",
    sample: true,
    minutes: 25,
    ngss: ["HS-ETS1-2", "HS-ETS1-3", "CCC-4"],
    labSlug: "filter-designer",
  },
  {
    slug: "water-teacher-guide",
    kit: "clean-water",
    type: "pdf",
    title: "Teacher guide: Clean Water Engineering Kit (preview)",
    summary: "Unit overview, rubric and safety (preview edition).",
    tier: "kit_owner",
    pdf: {
      heading: "Teacher guide (preview)",
      subtitle: "Clean Water Engineering Kit · Grades 9-10",
      sections: [
        { heading: "Unit at a glance", lines: ["1. Where does dirty water go?", "2. Design a filter", "3. Test and revise", "4. Defend your design"] },
        { heading: "Safety", lines: ["Sample water packets are clay and food coloring only. Nobody drinks filtered water."] },
      ],
    },
  },
  {
    slug: "water-training",
    kit: "clean-water",
    type: "training",
    title: "Coaching engineering design teams",
    summary: "Keep teams iterating instead of polishing their first idea.",
    tier: "subscription",
    minutes: 25,
    body: [
      { type: "p", text: "The most common failure in design units is a team that falls in love with its first sketch. Build revision into the schedule so it is not optional." },
      { type: "list", items: ["Require two sketches before any build.", "Make round 2 mandatory, even for teams that 'passed' round 1.", "Grade the reasoning about trade-offs, not the NTU number."] },
    ],
  },

  // =====================================================================================
  // GENERAL TEACHER TRAINING (subscription)
  // =====================================================================================
  {
    slug: "training-curie-ai",
    kit: null,
    type: "training",
    title: "Teaching with Curie.AI",
    summary: "Turn Curie on for a class, set limits, and read conversations to find misconceptions.",
    tier: "subscription",
    minutes: 20,
    body: [
      { type: "p", text: "Curie is off until you turn it on for a class. When it is on, students reach it from the class page with no personal information." },
      { type: "list", items: ["Curie gives hints and questions, not answers.", "It stays on the lesson the class is working on.", "You can read every conversation from the class page.", "Set a daily message limit for the class."] },
      { type: "callout", tone: "teacher", title: "Use the transcripts", text: "Read five conversations after a lab. The questions students ask Curie are the fastest map of what the class still finds confusing." },
    ],
  },
  {
    slug: "training-accessible-labs",
    kit: null,
    type: "training",
    title: "Accessible science labs for every learner",
    summary: "Captions, keyboard-only labs, and hands-on roles that include every student.",
    tier: "subscription",
    minutes: 25,
    body: [
      { type: "p", text: "Every Curiocrate online lab works by keyboard alone and with a screen reader, and every video has captions and a transcript. This course shows how to use those features on purpose." },
      { type: "list", items: ["Assign rotating lab roles: reader, measurer, recorder, skeptic.", "Turn captions on by default when projecting videos.", "Offer the transcript as a reading scaffold before the video."] },
    ],
  },
];

export function contentBySlug(slug: string) {
  return CONTENT.find((c) => c.slug === slug);
}
