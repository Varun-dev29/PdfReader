import { useAuth, useCredits } from "@/lib/hooks";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { useState } from "react";

export default function Header() {
  const { user, isAuthenticated, login } = useAuth();
  const { credits } = useCredits();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button 
            id="menuToggle" 
            className="md:hidden p-1 rounded-full hover:bg-gray-100"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <Link href="/">
            <div className="flex items-center cursor-pointer">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h1 className="text-xl font-semibold ml-2">PDF Reader</h1>
            </div>
          </Link>
        </div>
        
        {/* Guest/Login Status */}
        <div className="flex items-center space-x-4">
          <div className="items-center md:flex hidden">
            <div className="flex items-center bg-gray-100 rounded-full px-3 py-1">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="ml-1 font-medium text-sm">{credits} Credits</span>
            </div>
          </div>
          
          {!isAuthenticated ? (
            <Button 
              onClick={() => {
                // Import loginWithGoogle directly
                const { loginWithGoogle } = require('@/lib/firebase');
                if (loginWithGoogle) loginWithGoogle();
              }}
              className="flex items-center rounded-full px-4 py-2 bg-primary text-white"
            >
              <span className="text-sm font-medium">Login</span>
            </Button>
          ) : (
            <div className="flex items-center">
              <Link href="/profile">
                <img 
                  src={user?.photoURL || 'https://via.placeholder.com/40'} 
                  className="h-8 w-8 rounded-full border-2 border-primary cursor-pointer" 
                  alt="User avatar" 
                />
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
