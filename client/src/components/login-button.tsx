import { useState } from "react";
import { signInWithRedirect, GoogleAuthProvider, getAuth } from "firebase/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { db, doc, getDoc } from "@/lib/firebase";

interface LoginButtonProps {
  variant?: 'default' | 'link' | 'sidebar';
  className?: string;
}

export default function LoginButton({ variant = 'default', className = '' }: LoginButtonProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [referralCode, setReferralCode] = useState("");
  const [referralError, setReferralError] = useState("");
  const [isCheckingCode, setIsCheckingCode] = useState(false);
  
  const handleLogin = async () => {
    const auth = getAuth();
    const provider = new GoogleAuthProvider();
    
    // Get the current domain
    const currentDomain = window.location.hostname;
    
    // If there's a referral code, add it to the provider
    if (referralCode.trim()) {
      try {
        setIsCheckingCode(true);
        setReferralError("");
        
        // Validate the referral code
        const referralQuery = await getDoc(doc(db, "referrals", referralCode.trim().toUpperCase()));
        
        if (!referralQuery.exists()) {
          setReferralError("Invalid referral code. Please check and try again.");
          setIsCheckingCode(false);
          return;
        }
        
        // Store the referral code in localStorage to retrieve it after redirect
        localStorage.setItem("pdfReader_referralCode", referralCode.trim().toUpperCase());
        setIsCheckingCode(false);
        
      } catch (error) {
        console.error("Error checking referral code:", error);
        setReferralError("Error checking referral code. Please try again.");
        setIsCheckingCode(false);
        return;
      }
    }
    
    try {
      signInWithRedirect(auth, provider)
        .then(() => {
          console.log("Redirect initiated");
          setIsDialogOpen(false);
        })
        .catch((error) => {
          if (error.code === "auth/unauthorized-domain") {
            alert(`Please add this domain (${currentDomain}) to the authorized domains list in your Firebase console. \n\nGo to: Firebase Console > Authentication > Settings > Authorized domains`);
          }
          console.error("Login error:", error);
        });
    } catch (error) {
      console.error("Login error:", error);
    }
  };
  
  // Validate referral code format
  const isValidReferralFormat = (code: string) => {
    // Referral codes should be alphanumeric and 7 characters long (4 letters + 3 digits)
    return /^[A-Z0-9]{7}$/.test(code);
  };
  
  // Handle referral code change
  const handleReferralCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const code = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').substring(0, 7);
    setReferralCode(code);
    
    if (code && !isValidReferralFormat(code) && code.length === 7) {
      setReferralError("Invalid format. Referral code should be 7 characters (letters and numbers).");
    } else {
      setReferralError("");
    }
  };
  
  if (variant === 'link') {
    return (
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogTrigger asChild>
          <button 
            className={`text-xs text-primary hover:underline ${className}`}
          >
            Sign in to sync data
          </button>
        </DialogTrigger>
        <LoginDialogContent 
          referralCode={referralCode}
          referralError={referralError}
          isCheckingCode={isCheckingCode}
          handleReferralCodeChange={handleReferralCodeChange}
          handleLogin={handleLogin}
        />
      </Dialog>
    );
  }
  
  if (variant === 'sidebar') {
    return (
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogTrigger asChild>
          <button 
            className={`text-xs text-primary hover:underline ${className}`}
          >
            Sign in to sync data
          </button>
        </DialogTrigger>
        <LoginDialogContent 
          referralCode={referralCode}
          referralError={referralError}
          isCheckingCode={isCheckingCode}
          handleReferralCodeChange={handleReferralCodeChange}
          handleLogin={handleLogin}
        />
      </Dialog>
    );
  }
  
  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>
        <Button 
          className={`flex items-center rounded-full px-4 py-2 bg-primary text-white ${className}`}
        >
          <span className="text-sm font-medium">Login with Google</span>
        </Button>
      </DialogTrigger>
      <LoginDialogContent 
        referralCode={referralCode}
        referralError={referralError}
        isCheckingCode={isCheckingCode}
        handleReferralCodeChange={handleReferralCodeChange}
        handleLogin={handleLogin}
      />
    </Dialog>
  );
}

// Login Dialog Component
interface LoginDialogContentProps {
  referralCode: string;
  referralError: string;
  isCheckingCode: boolean;
  handleReferralCodeChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleLogin: () => void;
}

function LoginDialogContent({
  referralCode,
  referralError,
  isCheckingCode,
  handleReferralCodeChange,
  handleLogin
}: LoginDialogContentProps) {
  return (
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle className="text-center">Sign in with Google</DialogTitle>
      </DialogHeader>
      <div className="space-y-4 py-4">
        <div className="space-y-2">
          <Label htmlFor="referralCode">Referral Code (Optional)</Label>
          <Input
            id="referralCode"
            placeholder="Enter referral code"
            value={referralCode}
            onChange={handleReferralCodeChange}
            disabled={isCheckingCode}
            className="w-full"
          />
          {referralError && (
            <p className="text-xs text-red-500">{referralError}</p>
          )}
          <p className="text-xs text-muted-foreground">
            Have a friend's referral code? Enter it here to get ₹50 after using the app for 4 days.
          </p>
        </div>
        <Button 
          onClick={handleLogin} 
          disabled={isCheckingCode || (referralCode.length > 0 && referralError.length > 0)}
          className="w-full"
        >
          {isCheckingCode ? "Checking code..." : "Continue with Google"}
        </Button>
      </div>
    </DialogContent>
  );
}