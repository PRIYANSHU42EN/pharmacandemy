/* ==========================================================================
   Cubepharm — TypeScript Type Definitions
   Based on PRD §4 Feature Specs & §6 Firestore Collections Schema
   ========================================================================== */

import { Timestamp } from "firebase/firestore";

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export type CourseCode = "bpharm" | "mpharm" | "dpharm" | "pharmd";

export type ResourceType = "pyq" | "pdf" | "video" | "important" | "practice";

export type ContentTag = "most-asked" | "last-5-years" | "exam-booster" | "new";

export type AdminRole = "super-admin" | "content-admin" | "admin" | "viewer";

export type PaymentStatus = "created" | "captured" | "failed" | "refunded";

export type TicketStatus = "pending" | "quoted" | "paid" | "in_progress" | "delivered" | "completed" | "cancelled";

export type UrgencyLevel = "low" | "medium" | "high" | "emergency";

// ---------------------------------------------------------------------------
// PPT Marketplace Types
// ---------------------------------------------------------------------------

export interface PPTCategory {
  id: string;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
}

export interface CreatorProfile {
  id: string;
  user_id: string;
  display_name: string;
  bio?: string;
  avatar_url?: string;
  total_sales: number;
  rating: number;
  is_verified: boolean;
  social_links?: {
    twitter?: string;
    linkedin?: string;
    website?: string;
  };
  created_at: any;
}

export interface PPTListing {
  id: string;
  title: string;
  category_id: string;
  topic: string;
  creator_id?: string;
  price: number; // in paise
  description?: string;
  thumbnail_url?: string;
  preview_images: string[]; // screenshots/slides
  sample_file_url?: string; // free preview download
  full_file_url?: string; // locked until purchase
  download_count: number;
  rating: number;
  tags: string[];
  presentation_type: string;
  moderation_status: 'pending' | 'approved' | 'rejected';
  is_featured: boolean;
  is_active: boolean;
  created_at: any;
  updated_at: any;
  // Join fields (optional)
  creator?: CreatorProfile;
  category?: PPTCategory;
}

export interface PPTPurchase {
  id: string;
  user_id: string;
  ppt_id: string;
  amount: number;
  payment_id: string;
  created_at: any;
}

export interface PPTReview {
  id: string;
  pptId: string;
  userId: string;
  rating: number;
  comment?: string;
  createdAt: any;
}

// ---------------------------------------------------------------------------
// AI Urgent Work Types
// ---------------------------------------------------------------------------

export interface UrgentWorkTicket {
  id: string;
  userId: string;
  topic: string;
  subject: string;
  deadline: any;
  requirements: {
    pages?: number;
    slides?: number;
    formatting?: string;
    customNote?: string;
  };
  urgencyLevel: UrgencyLevel;
  budgetExpectation?: number;
  proposedPrice?: number;
  status: TicketStatus;
  adminNotes?: string;
  aiSummary?: string;
  complexityScore?: number; // 1-10
  urgencyScore?: number; // 1-10
  paymentId?: string;
  deliveryUrl?: string;
  createdAt: any;
  updatedAt: any;
}

export interface UrgentWorkMessage {
  id: string;
  ticketId: string;
  senderId: string | null; // null for AI
  message: string;
  isAi: boolean;
  attachments?: string[];
  createdAt: any;
}

// ---------------------------------------------------------------------------
// Firestore Document Types
// ---------------------------------------------------------------------------
export type ReferralStatus = "signed-up" | "premium" | "rewarded";

// ---------------------------------------------------------------------------
// Firestore Document Types
// ---------------------------------------------------------------------------

/** Top-level course (B.Pharm, M.Pharm, D.Pharm, Pharm.D) */
export interface Course {
  id: string;
  name: string;
  code: CourseCode;
  description?: string;
  order: number;
  isActive: boolean;
  createdAt: any;
  updatedAt: any;
}

/** Semester within a course (1st–8th) */
export interface Semester {
  id: string;
  courseId: string;
  number: number;
  name: string;
  isActive: boolean;
  createdAt: any;
  updatedAt: any;
}

/** Subject within a semester */
export interface Subject {
  id: string;
  courseId: string; // Direct link to Course
  semesterNumber?: number; // Optional semester for grouping (1-12)
  name: string;
  description?: string;
  coverImageUrl?: string;
  resourceCount: number;
  createdAt: any;
  updatedAt: any;
}

/** Resource — a piece of study content (PRD Table 11) */
export interface Resource {
  id: string;
  title: string;
  description?: string;
  type: ResourceType;
  courseId: string;
  subjectId: string;
  url: string; // Google Drive embed URL or YouTube URL
  previewImage?: string; // Optional thumbnail link
  tags: ContentTag[];
  year?: number; // PYQ year (2015–2024)
  createdAt: any;
  updatedAt: any;
  // Soft delete (PRD §4.6.3)
  isDeleted: boolean;
  deletedAt?: any;
  deletedBy?: string; // uid of admin who deleted
}

/** User profile document (PRD Table 13 — users collection) */
export interface UserProfile {
  uid: string;
  email: string;
  displayName?: string;
  username?: string;
  photoURL?: string;
  // Legacy fields kept for compatibility or removed if not needed
  razorpayPaymentId?: string;
  razorpayOrderId?: string;
  // Referral (PRD §4.10.2)
  referralCode: string;
  referredBy?: string; // uid of referrer
  referralCount?: number;
  // Engagement (PRD §4.9)
  streak: number;
  lastActiveDate: string | null;
  lastStreakDate: any | null;
  streakFreezeUsedThisMonth?: boolean;
  // Admin (PRD §4.6.1)
  role?: AdminRole;
  // Audit
  createdAt: any;
  updatedAt: any;
  isCreator?: boolean;
}

/** Payment record (PRD §4.5) — immutable once verified */
export interface Payment {
  id: string;
  userId: string;
  razorpayOrderId: string;
  razorpayPaymentId?: string;
  razorpaySignature?: string;
  amount: number; // in paise (4000 = ₹40)
  currency: string; // "INR"
  status: PaymentStatus;
  type: "subscription" | "donation";
  orderNotes?: Record<string, string>;
  createdAt: Timestamp;
  verifiedAt?: any;
}

/** Daily question (PRD §4.9.1) */
export interface DailyQuestion {
  id: string;
  questionId: string; // reference to source resource
  date: string; // "YYYY-MM-DD"
  subjectCluster: string;
  questionText: string;
  answer: string;
  createdAt: Timestamp;
}

/** User progress on a resource (PRD §4.2.2 auto-resume, §4.8 practice) */
export interface UserProgress {
  id: string; // composite: `${userId}_${resourceId}`
  userId: string;
  resourceId: string;
  lastWatchedTime?: number; // seconds — for video auto-resume
  isBookmarked: boolean;
  answeredAt?: Timestamp;
  createdAt: any;
  updatedAt: any;
}

/** Analytics event (PRD §4.11) — write-only from client */
export interface AnalyticsEvent {
  id: string;
  userId: string;
  event: string; // "page_view" | "resource_open" | "search" | "practice_start" | "share" | ...
  resourceId?: string;
  subjectId?: string;
  metadata?: Record<string, string | number>;
  timestamp: Timestamp;
}

/** Referral record (PRD §4.10.2) */
export interface Referral {
  id: string;
  referrerId: string;
  refereeId: string;
  status: ReferralStatus;
  rewardGranted: boolean;
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}

// ---------------------------------------------------------------------------
// UI / Component Props Types
// ---------------------------------------------------------------------------

/** Tag badge colour mapping derived from Design Doc §06 */
export type BadgeVariant = "rose" | "lavender" | "mint" | "peach" | "navy";

export const TAG_TO_BADGE: Record<ContentTag, BadgeVariant> = {
  "most-asked": "rose",
  "last-5-years": "peach",
  "exam-booster": "mint",
  "new": "lavender",
};

export const TAG_LABELS: Record<ContentTag, string> = {
  "most-asked": "Most Asked",
  "last-5-years": "Last 5 Years",
  "exam-booster": "Exam Booster",
  "new": "New",
};

export const RESOURCE_TYPE_LABELS: Record<ResourceType, string> = {
  pyq: "PYQ",
  pdf: "PDF",
  video: "Video",
  important: "Important",
  practice: "Practice",
};
