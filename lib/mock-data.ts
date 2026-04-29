/* ==========================================================================
   Mock Data — Used when Firebase is not configured or for development
   Provides realistic demo data matching Firestore schema
   ========================================================================== */

import type { Resource, Course, Subject } from "@/types";
import { Timestamp } from "firebase/firestore";

const now = Timestamp.now();

// ---------------------------------------------------------------------------
// Courses
// ---------------------------------------------------------------------------
export const MOCK_COURSES: Course[] = [
  {
    id: "bpharm",
    name: "B.Pharm",
    code: "bpharm",
    description: "Bachelor of Pharmacy — 4-year undergraduate program covering pharmaceutical sciences, drug formulation, and clinical pharmacy.",
    order: 1,
    isActive: true,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "mpharm",
    name: "M.Pharm",
    code: "mpharm",
    description: "Master of Pharmacy — 2-year postgraduate program with specializations in Pharmacology, Pharmaceutics, and more.",
    order: 2,
    isActive: true,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "dpharm",
    name: "D.Pharm",
    code: "dpharm",
    description: "Diploma in Pharmacy — 2-year diploma for pharmacy practice and dispensing fundamentals.",
    order: 3,
    isActive: true,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "pharmd",
    name: "Pharm.D",
    code: "pharmd",
    description: "Doctor of Pharmacy — 6-year clinical pharmacy program integrating patient care and advanced therapeutics.",
    order: 4,
    isActive: true,
    createdAt: now,
    updatedAt: now,
  },
];

// Semesters removed - Subjects now belong directly to Course with an optional semester number.

export const MOCK_SUBJECTS: Subject[] = [
  // B.Pharm subjects
  { id: "sub-pharma-chem-1", courseId: "bpharm", semesterNumber: 1, name: "Pharmaceutical Chemistry I", description: "Inorganic pharmaceutical chemistry, acids, bases, and buffers.", isPremium: false, resourceCount: 12, createdAt: now, updatedAt: now },
  { id: "sub-pharma-analysis", courseId: "bpharm", semesterNumber: 1, name: "Pharmaceutical Analysis I", description: "Qualitative and quantitative analysis methods used in pharmacy.", isPremium: false, resourceCount: 8, createdAt: now, updatedAt: now },
  { id: "sub-pharmaceutics-1", courseId: "bpharm", semesterNumber: 1, name: "Pharmaceutics I", description: "Introduction to dosage forms, formulation principles, and drug delivery.", isPremium: true, resourceCount: 15, createdAt: now, updatedAt: now },
  { id: "sub-anatomy", courseId: "bpharm", semesterNumber: 1, name: "Human Anatomy & Physiology I", description: "Structure and function of the human body systems.", isPremium: false, resourceCount: 10, createdAt: now, updatedAt: now },
  { id: "sub-pharma-chem-2", courseId: "bpharm", semesterNumber: 2, name: "Pharmaceutical Chemistry II", description: "Organic chemistry fundamentals for pharmaceutical applications.", isPremium: false, resourceCount: 11, createdAt: now, updatedAt: now },
  { id: "sub-biochemistry", courseId: "bpharm", semesterNumber: 2, name: "Biochemistry", description: "Enzymes, metabolism, and molecular biology of pharmaceutical relevance.", isPremium: true, resourceCount: 9, createdAt: now, updatedAt: now },
  { id: "sub-pharmacology-1", courseId: "bpharm", semesterNumber: 3, name: "Pharmacology I", description: "General pharmacology, drug receptors, and pharmacokinetics.", isPremium: false, resourceCount: 18, createdAt: now, updatedAt: now },
];

// Generate generic subjects for other semesters
export function getMockSubjects(courseId: string): Subject[] {
  return MOCK_SUBJECTS.filter(s => s.courseId === courseId);
}

// ---------------------------------------------------------------------------
// Resources (for a subject)
// ---------------------------------------------------------------------------
export function getMockResources(subjectId: string): Resource[] {
  const resources: Resource[] = [
    {
      id: `${subjectId}-pyq-2024`,
      title: "PYQ 2024 — Complete Question Paper",
      type: "pyq",
      courseId: "bpharm",
      subjectId,
      url: "https://drive.google.com/file/d/example/preview",
      isPremium: false,
      tags: ["last-5-years"],
      year: 2024,
      createdAt: now,
      updatedAt: now,
      isDeleted: false,
    },
    {
      id: `${subjectId}-pyq-2023`,
      title: "PYQ 2023 — Complete Question Paper",
      type: "pyq",
      courseId: "bpharm",
      subjectId,
      url: "https://drive.google.com/file/d/example/preview",
      isPremium: false,
      tags: ["last-5-years"],
      year: 2023,
      createdAt: now,
      updatedAt: now,
      isDeleted: false,
    },
    {
      id: `${subjectId}-pyq-2022`,
      title: "PYQ 2022 — Complete Question Paper",
      type: "pyq",
      courseId: "bpharm",
      semesterId: "bpharm-sem-1",
      subjectId,
      url: "https://drive.google.com/file/d/example/preview",
      isPremium: true,
      tags: ["last-5-years", "most-asked"],
      year: 2022,
      createdAt: now,
      updatedAt: now,
      isDeleted: false,
    },
    {
      id: `${subjectId}-pdf-notes`,
      title: "Comprehensive Study Notes — Full Syllabus",
      type: "pdf",
      courseId: "bpharm",
      semesterId: "bpharm-sem-1",
      subjectId,
      url: "https://drive.google.com/file/d/example/preview",
      isPremium: false,
      tags: [],
      createdAt: now,
      updatedAt: now,
      isDeleted: false,
    },
    {
      id: `${subjectId}-pdf-revision`,
      title: "Quick Revision Notes — Exam Ready",
      type: "pdf",
      courseId: "bpharm",
      semesterId: "bpharm-sem-1",
      subjectId,
      url: "https://drive.google.com/file/d/example/preview",
      isPremium: true,
      tags: ["exam-booster"],
      createdAt: now,
      updatedAt: now,
      isDeleted: false,
    },
    {
      id: `${subjectId}-video-intro`,
      title: "Introduction to the Subject — Video Lecture",
      type: "video",
      courseId: "bpharm",
      semesterId: "bpharm-sem-1",
      subjectId,
      url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      isPremium: false,
      tags: ["new"],
      createdAt: now,
      updatedAt: now,
      isDeleted: false,
    },
    {
      id: `${subjectId}-video-advanced`,
      title: "Advanced Concepts — Deep Dive Video",
      type: "video",
      courseId: "bpharm",
      semesterId: "bpharm-sem-1",
      subjectId,
      url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      isPremium: true,
      tags: ["exam-booster"],
      createdAt: now,
      updatedAt: now,
      isDeleted: false,
    },
    {
      id: `${subjectId}-imp-1`,
      title: "Most Important Questions for Exam",
      type: "important",
      courseId: "bpharm",
      semesterId: "bpharm-sem-1",
      subjectId,
      url: "",
      isPremium: true,
      tags: ["most-asked", "exam-booster"],
      createdAt: now,
      updatedAt: now,
      isDeleted: false,
    },
    {
      id: `${subjectId}-practice-1`,
      title: "Practice Set 1 — 20 Questions",
      type: "practice",
      courseId: "bpharm",
      semesterId: "bpharm-sem-1",
      subjectId,
      url: "",
      isPremium: false,
      tags: [],
      createdAt: now,
      updatedAt: now,
      isDeleted: false,
    },
  ];
  return resources;
}

// ---------------------------------------------------------------------------
// Practice Questions
// ---------------------------------------------------------------------------
export const MOCK_PRACTICE_QUESTIONS = [
  { question: "What is the Henderson-Hasselbalch equation and how is it used in pharmaceutical buffer preparation?", answer: "The Henderson-Hasselbalch equation (pH = pKa + log[A⁻]/[HA]) relates the pH of a buffer solution to the pKa of the acid and the ratio of conjugate base to weak acid concentrations. In pharmacy, it's used to calculate buffer pH, select appropriate buffer systems for drug formulations, and predict drug ionization at physiological pH." },
  { question: "Explain the mechanism of action of β-lactam antibiotics.", answer: "β-lactam antibiotics (penicillins, cephalosporins) inhibit bacterial cell wall synthesis by binding to penicillin-binding proteins (PBPs). They prevent cross-linking of peptidoglycan chains by inhibiting transpeptidase enzyme. This weakens the cell wall, leading to osmotic lysis and bacterial death. They are bactericidal and most effective against actively growing bacteria." },
  { question: "What is the difference between first-order and zero-order drug elimination kinetics?", answer: "In first-order kinetics, the rate of drug elimination is proportional to the drug concentration (constant fraction eliminated per unit time). Half-life is constant. Most drugs follow this. In zero-order kinetics, the rate is constant regardless of concentration (constant amount eliminated per unit time). Seen with alcohol metabolism and high-dose aspirin." },
  { question: "Describe the BCS (Biopharmaceutics Classification System) and its four classes.", answer: "BCS classifies drugs based on solubility and permeability: Class I (high solubility, high permeability), Class II (low solubility, high permeability), Class III (high solubility, low permeability), Class IV (low solubility, low permeability). It helps predict oral drug absorption and guides formulation strategies. Class I drugs are well-absorbed; Class IV drugs have poor bioavailability." },
  { question: "What are the major phases of drug metabolism?", answer: "Phase I (Functionalization): Introduces or exposes functional groups through oxidation, reduction, or hydrolysis. Main enzymes: Cytochrome P450 (CYP450). Makes drugs more polar. Phase II (Conjugation): Attaches polar molecules (glucuronic acid, sulfate, glutathione, etc.) to Phase I metabolites. Makes drugs water-soluble for renal/biliary excretion. Some drugs undergo Phase II directly." },
  { question: "Explain the concept of bioavailability and factors affecting it.", answer: "Bioavailability (F) is the fraction of administered drug that reaches systemic circulation unchanged. For IV: F = 100%. Factors affecting it: (1) Drug factors — solubility, stability, particle size. (2) Dosage form — disintegration, dissolution rate. (3) Physiological — GI pH, blood flow, first-pass metabolism. (4) Drug interactions — enzyme induction/inhibition, p-glycoprotein efflux." },
  { question: "What is the role of surfactants in pharmaceutical formulations?", answer: "Surfactants reduce surface tension at interfaces. In pharmacy: (1) Emulsifying agents — stabilize oil/water emulsions. (2) Solubilizing agents — increase drug solubility via micelle formation. (3) Wetting agents — improve tablet disintegration. (4) Preservatives — some have antimicrobial properties. Types: anionic (SLS), cationic (cetrimide), non-ionic (Tweens/Spans), amphoteric." },
  { question: "Describe the principles of UV-Visible Spectrophotometry in pharmaceutical analysis.", answer: "UV-Vis spectrophotometry measures absorption of UV (200-400nm) or visible (400-800nm) light by molecules. Based on Beer-Lambert law: A = εbc. Used for quantitative drug analysis, purity testing, and dissolution rate studies. Chromophores absorb UV light; the wavelength of maximum absorption (λmax) is characteristic of the compound. Commonly used for assay of drug substances and formulations." },
];

// ---------------------------------------------------------------------------
// Admin metrics (mock)
// ---------------------------------------------------------------------------
export const MOCK_ADMIN_METRICS = {
  totalUsers: 4823,
  premiumUsers: 512,
  mrr: 20480,
  totalResources: 348,
  totalSubjects: 52,
  dauToday: 287,
  mauThisMonth: 1956,
  topSubjects: [
    { name: "Pharmacology I", views: 2340 },
    { name: "Pharmaceutical Chemistry I", views: 1890 },
    { name: "Pharmaceutics I", views: 1650 },
    { name: "Human Anatomy & Physiology I", views: 1420 },
    { name: "Biochemistry", views: 1180 },
  ],
  recentPayments: [
    { id: "pay-1", email: "priya@email.com", amount: 4000, date: "2025-04-19" },
    { id: "pay-2", email: "rahul@email.com", amount: 4000, date: "2025-04-19" },
    { id: "pay-3", email: "anjali@email.com", amount: 4000, date: "2025-04-18" },
    { id: "pay-4", email: "vikram@email.com", amount: 4000, date: "2025-04-18" },
    { id: "pay-5", email: "sneha@email.com", amount: 4000, date: "2025-04-17" },
  ],
};
