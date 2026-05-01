/* ==========================================================================
   Cubepharm — Constants
   ========================================================================== */

// --- Navigation ---
export const NAV_LINKS = [
  { label: "Home", href: "/" },
  { label: "Courses", href: "/courses" },
  { label: "Donate", href: "/donate" },
] as const;

export const ADMIN_NAV_LINKS = [
  { label: "Dashboard", href: "/admin", icon: "BarChart3" },
  { label: "Content", href: "/admin/content", icon: "BookOpen" },
  { label: "Users", href: "/admin/users", icon: "Users" },
] as const;

// --- Pricing ---
export const PREMIUM_PRICE_PAISE = 4000; // ₹40
export const PREMIUM_PRICE_DISPLAY = "₹40";
export const PREMIUM_DURATION_DAYS = 30;

// --- Donation presets ---
export const DONATION_PRESETS = [
  { amount: 1100, label: "₹11" },
  { amount: 2100, label: "₹21" },
  { amount: 5100, label: "₹51" },
  { amount: 10100, label: "₹101" },
] as const;

// --- Pagination ---
export const PAGE_SIZE = 20;

// --- Streak milestones ---
export const STREAK_MILESTONES = [7, 30, 100] as const;

// --- Content tags ---
export const CONTENT_TAGS = [
  { value: "most-asked", label: "Most Asked", color: "rose" },
  { value: "last-5-years", label: "Last 5 Years", color: "peach" },
  { value: "exam-booster", label: "Exam Booster", color: "mint" },
  { value: "new", label: "New", color: "lavender" },
] as const;

// --- Resource types ---
export const RESOURCE_TYPES = [
  { value: "pyq", label: "PYQ" },
  { value: "pdf", label: "PDF" },
  { value: "video", label: "Video" },
  { value: "important", label: "Important" },
  { value: "practice", label: "Practice" },
] as const;

// --- Courses (initial set from PRD §4.1.1) ---
export const COURSE_CODES = [
  { code: "bpharm", name: "B.Pharm", description: "Bachelor of Pharmacy" },
  { code: "mpharm", name: "M.Pharm", description: "Master of Pharmacy" },
  { code: "dpharm", name: "D.Pharm", description: "Diploma in Pharmacy" },
  { code: "pharmd", name: "Pharm.D", description: "Doctor of Pharmacy" },
] as const;

// --- Firestore collection names ---
export const COLLECTIONS = {
  COURSES: "courses",
  SUBJECTS: "subjects",
  RESOURCES: "resources",
  USERS: "users",
  PAYMENTS: "payments",
  DAILY_QUESTIONS: "dailyQuestions",
  USER_PROGRESS: "userProgress",
  ANALYTICS: "analytics",
  REFERRALS: "referrals",
  DONATIONS: "donations",
} as const;
