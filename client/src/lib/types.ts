export interface User {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  referralCode: string;
  credits: number;
  settings?: UserSettings;
  createdAt: any; // Firestore timestamp
}

export interface UserSettings {
  theme?: string;
  fontSize?: number;
  speechRate?: number;
  speechPitch?: number;
  speechVolume?: number;
}

export interface PDFFile {
  id: string;
  name: string;
  url: string;
  pageCount: number;
  lastOpenedAt: Date;
  createdAt: Date;
  size: number;
}

export interface Bookmark {
  id: string;
  fileId: string;
  fileName: string;
  pageNumber: number;
  createdAt: Date;
  note?: string;
}

export interface RedemptionRequest {
  id: string;
  userId: string;
  upiId: string;
  amount: number;
  credits: number;
  status: 'Pending' | 'Paid' | 'Failed';
  createdAt: Date;
  updatedAt?: Date;
}

export interface Referral {
  id: string;
  referrerId: string;
  refereeId: string;
  refereeEmail: string;
  refereeDisplayName: string;
  createdAt: Date;
  daysUsed: number;
  completed: boolean;
  rewarded: boolean;
}

export interface CreditTransaction {
  id: string;
  userId: string;
  amount: number;
  type: 'usage' | 'referral' | 'redemption';
  createdAt: Date;
  referenceId?: string;
}
