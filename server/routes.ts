import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertUserSchema, insertFileSchema, insertBookmarkSchema, insertCreditTransactionSchema, insertRedemptionRequestSchema, insertReferralSchema, insertUsageTimeSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // User authentication routes
  app.post("/api/auth/register", async (req: Request, res: Response) => {
    try {
      const data = insertUserSchema.parse(req.body);
      
      // Check if user already exists
      const existingUser = await storage.getUserByUsername(data.username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }
      
      const user = await storage.createUser(data);
      res.status(201).json({ 
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        email: user.email,
        referralCode: user.referralCode,
        credits: user.credits,
        createdAt: user.createdAt
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input data", errors: error.errors });
      }
      res.status(500).json({ message: "Server error" });
    }
  });
  
  app.post("/api/auth/firebase", async (req: Request, res: Response) => {
    try {
      const { firebaseUID, email, displayName, photoURL } = req.body;
      if (!firebaseUID) {
        return res.status(400).json({ message: "Firebase UID is required" });
      }
      
      // Check if user exists
      let user = await storage.getUserByFirebaseUID(firebaseUID);
      
      if (!user) {
        // Generate a unique username from the email or a random string
        const username = email ? email.split('@')[0] + Math.floor(Math.random() * 1000) : `user_${Math.random().toString(36).substring(2, 10)}`;
        // Generate a referral code
        const referralCode = (displayName ? displayName.substring(0, 4) : 'USER') + Math.floor(Math.random() * 10000).toString().padStart(4, '0');
        
        // Create new user
        user = await storage.createUser({
          username,
          password: Math.random().toString(36).substring(2), // Random password for Firebase users
          email: email || null,
          displayName: displayName || null,
          photoURL: photoURL || null,
          firebaseUID,
          referralCode
        });
      } else {
        // Update last login time
        await storage.updateUser(user.id, { lastLoginAt: new Date() });
      }
      
      res.status(200).json({ 
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        email: user.email,
        photoURL: user.photoURL,
        referralCode: user.referralCode,
        credits: user.credits,
        createdAt: user.createdAt
      });
    } catch (error) {
      console.error("Firebase auth error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });
  
  // File management routes
  app.post("/api/files", async (req: Request, res: Response) => {
    try {
      const data = insertFileSchema.parse(req.body);
      const file = await storage.createFile(data);
      res.status(201).json(file);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input data", errors: error.errors });
      }
      res.status(500).json({ message: "Server error" });
    }
  });
  
  app.get("/api/files/:id", async (req: Request, res: Response) => {
    try {
      const fileId = parseInt(req.params.id);
      const file = await storage.getFile(fileId);
      
      if (!file) {
        return res.status(404).json({ message: "File not found" });
      }
      
      res.status(200).json(file);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });
  
  app.get("/api/users/:userId/files", async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.userId);
      const files = await storage.getFilesByUserId(userId);
      res.status(200).json(files);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });
  
  app.patch("/api/files/:id", async (req: Request, res: Response) => {
    try {
      const fileId = parseInt(req.params.id);
      const file = await storage.getFile(fileId);
      
      if (!file) {
        return res.status(404).json({ message: "File not found" });
      }
      
      const updatedFile = await storage.updateFile(fileId, req.body);
      res.status(200).json(updatedFile);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });
  
  app.delete("/api/files/:id", async (req: Request, res: Response) => {
    try {
      const fileId = parseInt(req.params.id);
      const file = await storage.getFile(fileId);
      
      if (!file) {
        return res.status(404).json({ message: "File not found" });
      }
      
      await storage.deleteFile(fileId);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });
  
  // Bookmark routes
  app.post("/api/bookmarks", async (req: Request, res: Response) => {
    try {
      const data = insertBookmarkSchema.parse(req.body);
      const bookmark = await storage.createBookmark(data);
      res.status(201).json(bookmark);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input data", errors: error.errors });
      }
      res.status(500).json({ message: "Server error" });
    }
  });
  
  app.get("/api/users/:userId/bookmarks", async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.userId);
      const bookmarks = await storage.getBookmarksByUserId(userId);
      res.status(200).json(bookmarks);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });
  
  app.get("/api/files/:fileId/bookmarks", async (req: Request, res: Response) => {
    try {
      const fileId = parseInt(req.params.fileId);
      const bookmarks = await storage.getBookmarksByFileId(fileId);
      res.status(200).json(bookmarks);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });
  
  app.delete("/api/bookmarks/:id", async (req: Request, res: Response) => {
    try {
      const bookmarkId = parseInt(req.params.id);
      const bookmark = await storage.getBookmark(bookmarkId);
      
      if (!bookmark) {
        return res.status(404).json({ message: "Bookmark not found" });
      }
      
      await storage.deleteBookmark(bookmarkId);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });
  
  // Credit management routes
  app.post("/api/credits/transactions", async (req: Request, res: Response) => {
    try {
      const data = insertCreditTransactionSchema.parse(req.body);
      const transaction = await storage.createCreditTransaction(data);
      res.status(201).json(transaction);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input data", errors: error.errors });
      }
      res.status(500).json({ message: "Server error" });
    }
  });
  
  app.get("/api/users/:userId/credits/transactions", async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.userId);
      const transactions = await storage.getCreditTransactionsByUserId(userId);
      res.status(200).json(transactions);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });
  
  // Redemption request routes
  app.post("/api/redemptions", async (req: Request, res: Response) => {
    try {
      const data = insertRedemptionRequestSchema.parse(req.body);
      
      // Check if the user has enough credits
      const user = await storage.getUser(data.userId);
      if (!user || user.credits < data.credits) {
        return res.status(400).json({ message: "Insufficient credits" });
      }
      
      // Check minimum redemption amount (100 credits = ₹50)
      if (data.credits < 100) {
        return res.status(400).json({ message: "Minimum redemption is 100 credits" });
      }
      
      const redemption = await storage.createRedemptionRequest(data);
      res.status(201).json(redemption);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input data", errors: error.errors });
      }
      res.status(500).json({ message: "Server error" });
    }
  });
  
  app.get("/api/users/:userId/redemptions", async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.userId);
      const redemptions = await storage.getRedemptionRequestsByUserId(userId);
      res.status(200).json(redemptions);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });
  
  app.patch("/api/redemptions/:id", async (req: Request, res: Response) => {
    try {
      const redemptionId = parseInt(req.params.id);
      const redemption = await storage.getRedemptionRequest(redemptionId);
      
      if (!redemption) {
        return res.status(404).json({ message: "Redemption request not found" });
      }
      
      const updatedRedemption = await storage.updateRedemptionRequest(redemptionId, req.body);
      res.status(200).json(updatedRedemption);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });
  
  // Referral routes
  app.post("/api/referrals", async (req: Request, res: Response) => {
    try {
      const data = insertReferralSchema.parse(req.body);
      const referral = await storage.createReferral(data);
      res.status(201).json(referral);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input data", errors: error.errors });
      }
      res.status(500).json({ message: "Server error" });
    }
  });
  
  app.get("/api/users/:userId/referrals", async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.userId);
      const referrals = await storage.getReferralsByReferrerId(userId);
      res.status(200).json(referrals);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });
  
  app.get("/api/referrals/code/:code", async (req: Request, res: Response) => {
    try {
      const code = req.params.code;
      const referral = await storage.getReferralByCode(code);
      
      if (!referral) {
        return res.status(404).json({ message: "Referral code not found" });
      }
      
      res.status(200).json(referral);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });
  
  app.patch("/api/referrals/:id", async (req: Request, res: Response) => {
    try {
      const referralId = parseInt(req.params.id);
      const referral = await storage.getReferral(referralId);
      
      if (!referral) {
        return res.status(404).json({ message: "Referral not found" });
      }
      
      const updatedReferral = await storage.updateReferral(referralId, req.body);
      res.status(200).json(updatedReferral);
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });
  
  // Usage time tracking routes
  app.post("/api/usage", async (req: Request, res: Response) => {
    try {
      const data = insertUsageTimeSchema.parse(req.body);
      
      // Check if there's already a record for this user and date
      const date = new Date(data.date);
      const existingUsage = await storage.getUsageTimeByUserAndDate(data.userId, date);
      
      if (existingUsage) {
        // Update existing record
        const updatedUsage = await storage.updateUsageTime(existingUsage.id, {
          seconds: existingUsage.seconds + data.seconds
        });
        return res.status(200).json(updatedUsage);
      }
      
      // Create new record
      const usage = await storage.createUsageTime(data);
      res.status(201).json(usage);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid input data", errors: error.errors });
      }
      res.status(500).json({ message: "Server error" });
    }
  });
  
  app.get("/api/users/:userId/usage", async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.userId);
      const date = req.query.date ? new Date(req.query.date as string) : new Date();
      
      const usage = await storage.getUsageTimeByUserAndDate(userId, date);
      res.status(200).json(usage || { userId, date, seconds: 0, credits: 0 });
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
