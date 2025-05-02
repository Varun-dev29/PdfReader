import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email"),
  displayName: text("display_name"),
  photoURL: text("photo_url"),
  firebaseUID: text("firebase_uid").unique(),
  referralCode: text("referral_code").unique(),
  credits: integer("credits").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  lastLoginAt: timestamp("last_login_at")
});

// PDF files table
export const files = pgTable("files", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  name: text("name").notNull(),
  url: text("url").notNull(),
  size: integer("size").notNull(),
  pageCount: integer("page_count"),
  createdAt: timestamp("created_at").defaultNow(),
  lastOpenedAt: timestamp("last_opened_at").defaultNow(),
});

// Bookmarks table
export const bookmarks = pgTable("bookmarks", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  fileId: integer("file_id").references(() => files.id),
  pageNumber: integer("page_number").notNull(),
  note: text("note"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Credit transactions table
export const creditTransactions = pgTable("credit_transactions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  amount: integer("amount").notNull(),
  type: text("type").notNull(), // 'usage', 'referral', 'redemption'
  referenceId: text("reference_id"), // For linking to redemptions or referrals
  createdAt: timestamp("created_at").defaultNow(),
});

// Redemption requests table
export const redemptionRequests = pgTable("redemption_requests", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  upiId: text("upi_id").notNull(),
  credits: integer("credits").notNull(),
  amount: integer("amount").notNull(), // In INR
  status: text("status").default("Pending"), // 'Pending', 'Paid', 'Failed'
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at"),
});

// Referrals table
export const referrals = pgTable("referrals", {
  id: serial("id").primaryKey(),
  referrerId: integer("referrer_id").references(() => users.id),
  refereeId: integer("referee_id").references(() => users.id),
  code: text("code").notNull(),
  daysUsed: integer("days_used").default(0),
  completed: boolean("completed").default(false),
  rewarded: boolean("rewarded").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Usage time tracking table
export const usageTime = pgTable("usage_time", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  date: timestamp("date").notNull(),
  seconds: integer("seconds").default(0),
  credits: integer("credits").default(0),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  email: true,
  displayName: true,
  photoURL: true,
  firebaseUID: true,
  referralCode: true,
});

export const insertFileSchema = createInsertSchema(files).omit({
  id: true,
  createdAt: true,
  lastOpenedAt: true,
});

export const insertBookmarkSchema = createInsertSchema(bookmarks).omit({
  id: true,
  createdAt: true,
});

export const insertCreditTransactionSchema = createInsertSchema(creditTransactions).omit({
  id: true,
  createdAt: true,
});

export const insertRedemptionRequestSchema = createInsertSchema(redemptionRequests).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  status: true,
});

export const insertReferralSchema = createInsertSchema(referrals).omit({
  id: true,
  createdAt: true,
  completed: true,
  rewarded: true,
  daysUsed: true,
});

export const insertUsageTimeSchema = createInsertSchema(usageTime).omit({
  id: true,
});

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertFile = z.infer<typeof insertFileSchema>;
export type File = typeof files.$inferSelect;

export type InsertBookmark = z.infer<typeof insertBookmarkSchema>;
export type Bookmark = typeof bookmarks.$inferSelect;

export type InsertCreditTransaction = z.infer<typeof insertCreditTransactionSchema>;
export type CreditTransaction = typeof creditTransactions.$inferSelect;

export type InsertRedemptionRequest = z.infer<typeof insertRedemptionRequestSchema>;
export type RedemptionRequest = typeof redemptionRequests.$inferSelect;

export type InsertReferral = z.infer<typeof insertReferralSchema>;
export type Referral = typeof referrals.$inferSelect;

export type InsertUsageTime = z.infer<typeof insertUsageTimeSchema>;
export type UsageTime = typeof usageTime.$inferSelect;
