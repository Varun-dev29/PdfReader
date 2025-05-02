import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  signInWithRedirect, 
  GoogleAuthProvider, 
  getRedirectResult, 
  onAuthStateChanged, 
  signOut,
  type User
} from "firebase/auth";
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  updateDoc, 
  query, 
  where, 
  addDoc,
  serverTimestamp,
  orderBy,
  limit
} from "firebase/firestore";
import { 
  getStorage, 
  ref, 
  uploadBytes, 
  getDownloadURL,
  deleteObject
} from "firebase/storage";

// Firebase configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: `${import.meta.env.VITE_FIREBASE_PROJECT_ID}.firebaseapp.com`,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: `${import.meta.env.VITE_FIREBASE_PROJECT_ID}.appspot.com`,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();
const db = getFirestore(app);
const storage = getStorage(app);

// Auth functions
const loginWithGoogle = () => signInWithRedirect(auth, provider);
const logout = () => signOut(auth);

// Handle redirect result
const handleRedirectResult = async () => {
  try {
    const result = await getRedirectResult(auth);
    if (result) {
      // User is signed in
      const user = result.user;
      
      // Check if user exists in database
      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);
      
      if (!userSnap.exists()) {
        // Create new user in database
        await setDoc(userRef, {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL,
          createdAt: serverTimestamp(),
          credits: 0,
          referralCode: generateReferralCode(user.displayName || "user"),
        });
      }
      
      // Migrate localStorage data if available
      migrateGuestData(user);
    }
  } catch (error) {
    console.error("Error during auth redirect:", error);
  }
};

// Generate a referral code based on user's name
const generateReferralCode = (name: string) => {
  const namePrefix = name.replace(/[^a-zA-Z0-9]/g, "").substring(0, 4).toUpperCase();
  const randomSuffix = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `${namePrefix}${randomSuffix}`;
};

// Migrate guest data to user account
const migrateGuestData = async (user: User) => {
  try {
    // Get guest data from localStorage
    const recentFiles = JSON.parse(localStorage.getItem('pdfReader_recentFiles') || '[]');
    const bookmarks = JSON.parse(localStorage.getItem('pdfReader_bookmarks') || '[]');
    const settings = JSON.parse(localStorage.getItem('pdfReader_settings') || '{}');
    const credits = parseInt(localStorage.getItem('pdfReader_credits') || '0');
    
    // If there's no data to migrate, return
    if (recentFiles.length === 0 && bookmarks.length === 0 && Object.keys(settings).length === 0 && credits === 0) {
      return;
    }
    
    const userRef = doc(db, "users", user.uid);
    
    // Migrate files
    for (const file of recentFiles) {
      const fileRef = collection(db, "users", user.uid, "files");
      await addDoc(fileRef, {
        ...file,
        createdAt: serverTimestamp(),
      });
    }
    
    // Migrate bookmarks
    for (const bookmark of bookmarks) {
      const bookmarkRef = collection(db, "users", user.uid, "bookmarks");
      await addDoc(bookmarkRef, {
        ...bookmark,
        createdAt: serverTimestamp(),
      });
    }
    
    // Migrate settings
    await updateDoc(userRef, { settings });
    
    // Migrate credits
    const userDoc = await getDoc(userRef);
    const currentCredits = userDoc.data()?.credits || 0;
    await updateDoc(userRef, { credits: currentCredits + credits });
    
    // Clear localStorage
    localStorage.removeItem('pdfReader_recentFiles');
    localStorage.removeItem('pdfReader_bookmarks');
    localStorage.removeItem('pdfReader_settings');
    localStorage.removeItem('pdfReader_credits');
  } catch (error) {
    console.error("Error migrating guest data:", error);
  }
};

export {
  app,
  auth,
  db,
  storage,
  loginWithGoogle,
  logout,
  handleRedirectResult,
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  query,
  where,
  addDoc,
  serverTimestamp,
  orderBy,
  limit,
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
  onAuthStateChanged
};
