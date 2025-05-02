import { 
  users, users as usersTable,
  files, files as filesTable,
  bookmarks, bookmarks as bookmarksTable,
  creditTransactions, creditTransactions as creditTransactionsTable,
  redemptionRequests, redemptionRequests as redemptionRequestsTable,
  referrals, referrals as referralsTable,
  usageTime, usageTime as usageTimeTable,
  type User, type InsertUser,
  type File, type InsertFile,
  type Bookmark, type InsertBookmark,
  type CreditTransaction, type InsertCreditTransaction,
  type RedemptionRequest, type InsertRedemptionRequest,
  type Referral, type InsertReferral,
  type UsageTime, type InsertUsageTime
} from "@shared/schema";

// Storage interface for all CRUD operations
export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByFirebaseUID(firebaseUID: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, data: Partial<User>): Promise<User | undefined>;
  
  // File operations
  getFile(id: number): Promise<File | undefined>;
  getFilesByUserId(userId: number): Promise<File[]>;
  createFile(file: InsertFile): Promise<File>;
  updateFile(id: number, data: Partial<File>): Promise<File | undefined>;
  deleteFile(id: number): Promise<boolean>;
  
  // Bookmark operations
  getBookmark(id: number): Promise<Bookmark | undefined>;
  getBookmarksByUserId(userId: number): Promise<Bookmark[]>;
  getBookmarksByFileId(fileId: number): Promise<Bookmark[]>;
  createBookmark(bookmark: InsertBookmark): Promise<Bookmark>;
  deleteBookmark(id: number): Promise<boolean>;
  
  // Credit transaction operations
  getCreditTransaction(id: number): Promise<CreditTransaction | undefined>;
  getCreditTransactionsByUserId(userId: number): Promise<CreditTransaction[]>;
  createCreditTransaction(transaction: InsertCreditTransaction): Promise<CreditTransaction>;
  
  // Redemption request operations
  getRedemptionRequest(id: number): Promise<RedemptionRequest | undefined>;
  getRedemptionRequestsByUserId(userId: number): Promise<RedemptionRequest[]>;
  createRedemptionRequest(request: InsertRedemptionRequest): Promise<RedemptionRequest>;
  updateRedemptionRequest(id: number, data: Partial<RedemptionRequest>): Promise<RedemptionRequest | undefined>;
  
  // Referral operations
  getReferral(id: number): Promise<Referral | undefined>;
  getReferralsByReferrerId(referrerId: number): Promise<Referral[]>;
  getReferralByCode(code: string): Promise<Referral | undefined>;
  createReferral(referral: InsertReferral): Promise<Referral>;
  updateReferral(id: number, data: Partial<Referral>): Promise<Referral | undefined>;
  
  // Usage time operations
  getUsageTime(id: number): Promise<UsageTime | undefined>;
  getUsageTimeByUserAndDate(userId: number, date: Date): Promise<UsageTime | undefined>;
  createUsageTime(usageTime: InsertUsageTime): Promise<UsageTime>;
  updateUsageTime(id: number, data: Partial<UsageTime>): Promise<UsageTime | undefined>;
}

// In-memory storage implementation
export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private files: Map<number, File>;
  private bookmarks: Map<number, Bookmark>;
  private creditTransactions: Map<number, CreditTransaction>;
  private redemptionRequests: Map<number, RedemptionRequest>;
  private referrals: Map<number, Referral>;
  private usageTimes: Map<number, UsageTime>;
  
  private userIdCounter: number;
  private fileIdCounter: number;
  private bookmarkIdCounter: number;
  private transactionIdCounter: number;
  private redemptionIdCounter: number;
  private referralIdCounter: number;
  private usageTimeIdCounter: number;

  constructor() {
    this.users = new Map();
    this.files = new Map();
    this.bookmarks = new Map();
    this.creditTransactions = new Map();
    this.redemptionRequests = new Map();
    this.referrals = new Map();
    this.usageTimes = new Map();
    
    this.userIdCounter = 1;
    this.fileIdCounter = 1;
    this.bookmarkIdCounter = 1;
    this.transactionIdCounter = 1;
    this.redemptionIdCounter = 1;
    this.referralIdCounter = 1;
    this.usageTimeIdCounter = 1;
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }
  
  async getUserByFirebaseUID(firebaseUID: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.firebaseUID === firebaseUID,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userIdCounter++;
    const now = new Date();
    const user: User = { 
      ...insertUser, 
      id, 
      credits: 0,
      createdAt: now, 
      lastLoginAt: now 
    };
    this.users.set(id, user);
    return user;
  }
  
  async updateUser(id: number, data: Partial<User>): Promise<User | undefined> {
    const user = await this.getUser(id);
    if (!user) return undefined;
    
    const updatedUser = { ...user, ...data };
    this.users.set(id, updatedUser);
    return updatedUser;
  }
  
  // File operations
  async getFile(id: number): Promise<File | undefined> {
    return this.files.get(id);
  }
  
  async getFilesByUserId(userId: number): Promise<File[]> {
    return Array.from(this.files.values()).filter(
      (file) => file.userId === userId,
    );
  }
  
  async createFile(insertFile: InsertFile): Promise<File> {
    const id = this.fileIdCounter++;
    const now = new Date();
    const file: File = { 
      ...insertFile, 
      id, 
      createdAt: now, 
      lastOpenedAt: now,
      pageCount: 0 
    };
    this.files.set(id, file);
    return file;
  }
  
  async updateFile(id: number, data: Partial<File>): Promise<File | undefined> {
    const file = await this.getFile(id);
    if (!file) return undefined;
    
    const updatedFile = { ...file, ...data };
    this.files.set(id, updatedFile);
    return updatedFile;
  }
  
  async deleteFile(id: number): Promise<boolean> {
    return this.files.delete(id);
  }
  
  // Bookmark operations
  async getBookmark(id: number): Promise<Bookmark | undefined> {
    return this.bookmarks.get(id);
  }
  
  async getBookmarksByUserId(userId: number): Promise<Bookmark[]> {
    return Array.from(this.bookmarks.values()).filter(
      (bookmark) => bookmark.userId === userId,
    );
  }
  
  async getBookmarksByFileId(fileId: number): Promise<Bookmark[]> {
    return Array.from(this.bookmarks.values()).filter(
      (bookmark) => bookmark.fileId === fileId,
    );
  }
  
  async createBookmark(insertBookmark: InsertBookmark): Promise<Bookmark> {
    const id = this.bookmarkIdCounter++;
    const bookmark: Bookmark = { 
      ...insertBookmark, 
      id, 
      createdAt: new Date() 
    };
    this.bookmarks.set(id, bookmark);
    return bookmark;
  }
  
  async deleteBookmark(id: number): Promise<boolean> {
    return this.bookmarks.delete(id);
  }
  
  // Credit transaction operations
  async getCreditTransaction(id: number): Promise<CreditTransaction | undefined> {
    return this.creditTransactions.get(id);
  }
  
  async getCreditTransactionsByUserId(userId: number): Promise<CreditTransaction[]> {
    return Array.from(this.creditTransactions.values()).filter(
      (transaction) => transaction.userId === userId,
    );
  }
  
  async createCreditTransaction(insertTransaction: InsertCreditTransaction): Promise<CreditTransaction> {
    const id = this.transactionIdCounter++;
    const transaction: CreditTransaction = { 
      ...insertTransaction, 
      id, 
      createdAt: new Date() 
    };
    this.creditTransactions.set(id, transaction);
    
    // Update user's credits
    const user = await this.getUser(insertTransaction.userId);
    if (user) {
      await this.updateUser(user.id, { 
        credits: user.credits + insertTransaction.amount 
      });
    }
    
    return transaction;
  }
  
  // Redemption request operations
  async getRedemptionRequest(id: number): Promise<RedemptionRequest | undefined> {
    return this.redemptionRequests.get(id);
  }
  
  async getRedemptionRequestsByUserId(userId: number): Promise<RedemptionRequest[]> {
    return Array.from(this.redemptionRequests.values()).filter(
      (request) => request.userId === userId,
    );
  }
  
  async createRedemptionRequest(insertRequest: InsertRedemptionRequest): Promise<RedemptionRequest> {
    const id = this.redemptionIdCounter++;
    const request: RedemptionRequest = { 
      ...insertRequest, 
      id, 
      status: "Pending",
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.redemptionRequests.set(id, request);
    
    // Deduct credits from user
    const user = await this.getUser(insertRequest.userId);
    if (user) {
      await this.updateUser(user.id, { 
        credits: user.credits - insertRequest.credits 
      });
      
      // Create a credit transaction for the redemption
      await this.createCreditTransaction({
        userId: user.id,
        amount: -insertRequest.credits,
        type: "redemption",
        referenceId: id.toString()
      });
    }
    
    return request;
  }
  
  async updateRedemptionRequest(id: number, data: Partial<RedemptionRequest>): Promise<RedemptionRequest | undefined> {
    const request = await this.getRedemptionRequest(id);
    if (!request) return undefined;
    
    const updatedRequest = { 
      ...request, 
      ...data, 
      updatedAt: new Date() 
    };
    this.redemptionRequests.set(id, updatedRequest);
    return updatedRequest;
  }
  
  // Referral operations
  async getReferral(id: number): Promise<Referral | undefined> {
    return this.referrals.get(id);
  }
  
  async getReferralsByReferrerId(referrerId: number): Promise<Referral[]> {
    return Array.from(this.referrals.values()).filter(
      (referral) => referral.referrerId === referrerId,
    );
  }
  
  async getReferralByCode(code: string): Promise<Referral | undefined> {
    return Array.from(this.referrals.values()).find(
      (referral) => referral.code === code,
    );
  }
  
  async createReferral(insertReferral: InsertReferral): Promise<Referral> {
    const id = this.referralIdCounter++;
    const referral: Referral = { 
      ...insertReferral, 
      id, 
      daysUsed: 0,
      completed: false,
      rewarded: false,
      createdAt: new Date() 
    };
    this.referrals.set(id, referral);
    return referral;
  }
  
  async updateReferral(id: number, data: Partial<Referral>): Promise<Referral | undefined> {
    const referral = await this.getReferral(id);
    if (!referral) return undefined;
    
    const updatedReferral = { ...referral, ...data };
    
    // If marked as completed and not previously rewarded, give credits to referrer
    if (data.completed === true && data.rewarded === true && !referral.rewarded) {
      const referrer = await this.getUser(referral.referrerId);
      if (referrer) {
        // Add 100 credits (₹50) to referrer
        await this.updateUser(referrer.id, { 
          credits: referrer.credits + 100 
        });
        
        // Create a credit transaction for the referral reward
        await this.createCreditTransaction({
          userId: referrer.id,
          amount: 100,
          type: "referral",
          referenceId: id.toString()
        });
      }
    }
    
    this.referrals.set(id, updatedReferral);
    return updatedReferral;
  }
  
  // Usage time operations
  async getUsageTime(id: number): Promise<UsageTime | undefined> {
    return this.usageTimes.get(id);
  }
  
  async getUsageTimeByUserAndDate(userId: number, date: Date): Promise<UsageTime | undefined> {
    // Normalize the date to start of day for comparison
    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);
    
    return Array.from(this.usageTimes.values()).find(
      (usage) => {
        const usageDate = new Date(usage.date);
        usageDate.setHours(0, 0, 0, 0);
        return usage.userId === userId && usageDate.getTime() === targetDate.getTime();
      }
    );
  }
  
  async createUsageTime(insertUsageTime: InsertUsageTime): Promise<UsageTime> {
    const id = this.usageTimeIdCounter++;
    const usageTime: UsageTime = { 
      ...insertUsageTime, 
      id
    };
    this.usageTimes.set(id, usageTime);
    return usageTime;
  }
  
  async updateUsageTime(id: number, data: Partial<UsageTime>): Promise<UsageTime | undefined> {
    const usageTime = await this.getUsageTime(id);
    if (!usageTime) return undefined;
    
    // Calculate new credits based on hours used, max 8 per day
    const oldHours = Math.floor(usageTime.seconds / 3600);
    const newSeconds = (data.seconds !== undefined) ? data.seconds : usageTime.seconds;
    const newHours = Math.floor(newSeconds / 3600);
    const maxHours = 8;
    
    // Calculate credits to add if hours increased
    const creditsToAdd = Math.max(0, Math.min(newHours, maxHours) - oldHours);
    
    const updatedUsageTime = { 
      ...usageTime, 
      ...data,
      credits: Math.min(maxHours, newHours)
    };
    this.usageTimes.set(id, updatedUsageTime);
    
    // Add credits to user if hours increased
    if (creditsToAdd > 0) {
      const user = await this.getUser(usageTime.userId);
      if (user) {
        await this.updateUser(user.id, { 
          credits: user.credits + creditsToAdd 
        });
        
        // Create a credit transaction for usage credits
        await this.createCreditTransaction({
          userId: user.id,
          amount: creditsToAdd,
          type: "usage",
          referenceId: id.toString()
        });
      }
    }
    
    return updatedUsageTime;
  }
}

export const storage = new MemStorage();
