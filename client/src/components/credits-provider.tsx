import { createContext, useState, useEffect, ReactNode } from "react";
import { useAuth } from "@/lib/hooks";
import { db, doc, getDoc, updateDoc, collection, addDoc, serverTimestamp } from "@/lib/firebase";
import { storage } from "@/lib/utils";

interface CreditsContextType {
  credits: number;
  todayUsage: number;
  maxDailyCredits: number;
  addCredits: (amount: number) => Promise<void>;
  useCredits: (amount: number) => Promise<boolean>;
  redeemCredits: (upiId: string, creditAmount: number) => Promise<boolean>;
}

// Create a default context value
const defaultCreditsContext: CreditsContextType = {
  credits: 0,
  todayUsage: 0,
  maxDailyCredits: 8,
  addCredits: async () => {},
  useCredits: async () => false,
  redeemCredits: async () => false,
};

export const CreditsContext = createContext<CreditsContextType>(defaultCreditsContext);

interface CreditsProviderProps {
  children: ReactNode;
}

export const CreditsProvider = ({ children }: CreditsProviderProps) => {
  const { user, isAuthenticated } = useAuth();
  const [credits, setCredits] = useState<number>(0);
  const [todayUsage, setTodayUsage] = useState<number>(0);
  const maxDailyCredits = 8;

  // Initialize credits
  useEffect(() => {
    const loadCredits = async () => {
      if (isAuthenticated && user) {
        // Get credits from Firestore
        const userRef = doc(db, "users", user.uid);
        const userDoc = await getDoc(userRef);
        
        if (userDoc.exists()) {
          setCredits(userDoc.data().credits || 0);
        }
      } else {
        // Get credits from localStorage for guest users
        setCredits(storage.getCredits());
      }
    };

    loadCredits();
  }, [isAuthenticated, user]);

  // Initialize today's usage
  useEffect(() => {
    const loadTodayUsage = async () => {
      if (isAuthenticated && user) {
        // Get today's usage from Firestore
        const today = new Date().toLocaleDateString();
        const usageRef = doc(db, "users", user.uid, "usage", today);
        const usageDoc = await getDoc(usageRef);
        
        if (usageDoc.exists()) {
          setTodayUsage(usageDoc.data().seconds || 0);
        } else {
          setTodayUsage(0);
        }
      } else {
        // Get today's usage from localStorage for guest users
        setTodayUsage(storage.getTodayUsageTime());
      }
    };

    loadTodayUsage();
  }, [isAuthenticated, user]);

  // Add credits
  const addCredits = async (amount: number) => {
    if (amount <= 0) return;

    if (isAuthenticated && user) {
      // Update credits in Firestore
      const userRef = doc(db, "users", user.uid);
      const userDoc = await getDoc(userRef);
      
      if (userDoc.exists()) {
        const newCredits = (userDoc.data().credits || 0) + amount;
        await updateDoc(userRef, { credits: newCredits });
        setCredits(newCredits);
        
        // Log credit transaction
        const transactionRef = collection(db, "creditTransactions");
        await addDoc(transactionRef, {
          userId: user.uid,
          amount,
          type: 'usage',
          createdAt: serverTimestamp(),
        });
      }
    } else {
      // Update credits in localStorage for guest users
      const newCredits = storage.addCredits(amount);
      setCredits(newCredits);
    }
  };

  // Use credits
  const useCredits = async (amount: number): Promise<boolean> => {
    if (amount <= 0) return true;
    if (credits < amount) return false;

    if (isAuthenticated && user) {
      // Update credits in Firestore
      const userRef = doc(db, "users", user.uid);
      const userDoc = await getDoc(userRef);
      
      if (userDoc.exists()) {
        const currentCredits = userDoc.data().credits || 0;
        
        if (currentCredits < amount) return false;
        
        const newCredits = currentCredits - amount;
        await updateDoc(userRef, { credits: newCredits });
        setCredits(newCredits);
        
        // Log credit transaction
        const transactionRef = collection(db, "creditTransactions");
        await addDoc(transactionRef, {
          userId: user.uid,
          amount: -amount,
          type: 'redemption',
          createdAt: serverTimestamp(),
        });
        
        return true;
      }
      
      return false;
    } else {
      // Update credits in localStorage for guest users
      const currentCredits = storage.getCredits();
      
      if (currentCredits < amount) return false;
      
      const newCredits = storage.addCredits(-amount);
      setCredits(newCredits);
      
      return true;
    }
  };

  // Redeem credits for money
  const redeemCredits = async (upiId: string, creditAmount: number): Promise<boolean> => {
    if (!isAuthenticated || !user) return false;
    if (creditAmount < 100) return false; // Minimum 100 credits (₹50)
    
    const success = await useCredits(creditAmount);
    
    if (success) {
      // Create redemption request
      const requestRef = collection(db, "redemptionRequests");
      await addDoc(requestRef, {
        userId: user.uid,
        upiId,
        credits: creditAmount,
        amount: creditAmount / 2, // ₹50 for 100 credits
        status: 'Pending',
        createdAt: serverTimestamp(),
      });
      
      return true;
    }
    
    return false;
  };

  const value = {
    credits,
    todayUsage,
    maxDailyCredits,
    addCredits,
    useCredits,
    redeemCredits
  };

  return (
    <CreditsContext.Provider value={value}>
      {children}
    </CreditsContext.Provider>
  );
};
