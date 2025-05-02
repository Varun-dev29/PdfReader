import { createContext, useState, useEffect, ReactNode } from "react";
import { auth, onAuthStateChanged, handleRedirectResult, loginWithGoogle, logout } from "@/lib/firebase";
import { User } from "@/lib/types";

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: () => void;
  logout: () => Promise<void>;
  handleRedirect: () => Promise<void>;
}

// Create a default context value
const defaultAuthContext: AuthContextType = {
  user: null,
  isAuthenticated: false,
  isLoading: false,
  login: () => {},
  logout: async () => {},
  handleRedirect: async () => {},
};

export const AuthContext = createContext<AuthContextType>(defaultAuthContext);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        // Transform Firebase user to our app's user model
        const appUser: User = {
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName,
          photoURL: firebaseUser.photoURL,
          referralCode: '', // Will be set from Firestore
          credits: 0, // Will be set from Firestore
          createdAt: new Date()
        };
        setUser(appUser);
      } else {
        setUser(null);
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleRedirect = async () => {
    try {
      setIsLoading(true);
      await handleRedirectResult();
    } catch (error) {
      console.error("Error handling redirect:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const value = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login: loginWithGoogle,
    logout: async () => {
      await logout();
      setUser(null);
    },
    handleRedirect
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
