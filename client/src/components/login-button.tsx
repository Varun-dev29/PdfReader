import { signInWithRedirect, GoogleAuthProvider, getAuth } from "firebase/auth";
import { Button } from "@/components/ui/button";

interface LoginButtonProps {
  variant?: 'default' | 'link' | 'sidebar';
  className?: string;
}

export default function LoginButton({ variant = 'default', className = '' }: LoginButtonProps) {
  const handleLogin = () => {
    const auth = getAuth();
    const provider = new GoogleAuthProvider();
    
    // Get the current domain
    const currentDomain = window.location.hostname;
    
    try {
      signInWithRedirect(auth, provider)
        .then(() => {
          console.log("Redirect initiated");
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
  
  if (variant === 'link') {
    return (
      <button 
        onClick={handleLogin}
        className={`text-xs text-primary hover:underline ${className}`}
      >
        Sign in to sync data
      </button>
    );
  }
  
  if (variant === 'sidebar') {
    return (
      <button 
        onClick={handleLogin}
        className={`text-xs text-primary hover:underline ${className}`}
      >
        Sign in to sync data
      </button>
    );
  }
  
  return (
    <Button 
      onClick={handleLogin}
      className={`flex items-center rounded-full px-4 py-2 bg-primary text-white ${className}`}
    >
      <span className="text-sm font-medium">Login with Google</span>
    </Button>
  );
}