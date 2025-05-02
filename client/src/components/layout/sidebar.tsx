import { useAuth, useCredits } from "@/lib/hooks";
import { useLocation } from "wouter";
import { useState, useEffect } from "react";

export default function Sidebar() {
  const { user, isAuthenticated, logout } = useAuth();
  const { credits, todayUsage, maxDailyCredits } = useCredits();
  const [location, navigate] = useLocation();
  const [isVisible, setIsVisible] = useState(false);

  // Show sidebar on menu toggle
  useEffect(() => {
    const handleMenuToggle = () => {
      setIsVisible(false);
    };

    document.addEventListener('click', handleMenuToggle);
    return () => document.removeEventListener('click', handleMenuToggle);
  }, []);

  // Calculate usage percentage
  const usagePercentage = Math.min(100, (todayUsage / (maxDailyCredits * 3600)) * 100);

  return (
    <aside 
      id="sidebar" 
      className={`${isVisible ? 'block' : 'hidden'} md:block w-64 border-r border-gray-200 bg-white flex-shrink-0 overflow-y-auto`}
    >
      <div className="p-4">
        {isAuthenticated && user ? (
          <div className="flex items-center mb-6">
            <div className="relative w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <img 
                src={user.photoURL || 'https://via.placeholder.com/40'} 
                className="h-10 w-10 rounded-full" 
                alt="User avatar" 
              />
              <div className="absolute right-0 bottom-0 bg-green-500 w-3 h-3 rounded-full border-2 border-white"></div>
            </div>
            <div className="ml-3">
              <h3 className="font-medium text-sm text-gray-900">{user.displayName}</h3>
              <p className="text-xs text-gray-500">{user.email}</p>
            </div>
          </div>
        ) : (
          <div className="flex items-center mb-6">
            <div className="relative w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="font-medium text-sm text-gray-900">Guest User</h3>
              <button 
                onClick={() => setIsVisible(false)}
                className="text-xs text-primary hover:underline"
              >
                Sign in to sync data
              </button>
            </div>
          </div>
        )}
        
        <div className="bg-gray-100 rounded-lg p-3 mb-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="ml-2 font-medium text-sm">My Credits</span>
            </div>
            <span className="text-lg font-semibold text-gray-800">{credits}</span>
          </div>
          <div className="text-xs text-gray-500">Credit usage today: {Math.min(Math.floor(todayUsage / 3600), maxDailyCredits)}/{maxDailyCredits}</div>
          <div className="w-full bg-gray-300 rounded-full h-1.5 mt-2">
            <div 
              className="bg-primary h-1.5 rounded-full" 
              style={{ width: `${usagePercentage}%` }}
            ></div>
          </div>
        </div>
        
        <nav className="space-y-1">
          <div 
            onClick={() => navigate('/')}
            className={`flex items-center px-3 py-2 text-sm font-medium rounded-md cursor-pointer ${location === '/' ? 'bg-primary/10 text-primary' : 'text-gray-700 hover:bg-gray-100'}`}>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            Home
          </div>
          
          <div 
            onClick={() => navigate('/recent')}
            className={`flex items-center px-3 py-2 text-sm font-medium rounded-md cursor-pointer ${location === '/recent' ? 'bg-primary/10 text-primary' : 'text-gray-700 hover:bg-gray-100'}`}>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            Recent Files
          </div>
          
          <div 
            onClick={() => navigate('/bookmarks')}
            className={`flex items-center px-3 py-2 text-sm font-medium rounded-md cursor-pointer ${location === '/bookmarks' ? 'bg-primary/10 text-primary' : 'text-gray-700 hover:bg-gray-100'}`}>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
            </svg>
            Bookmarks
          </div>
          
          <div 
            onClick={() => navigate('/refer')}
            className={`flex items-center px-3 py-2 text-sm font-medium rounded-md cursor-pointer ${location === '/refer' ? 'bg-primary/10 text-primary' : 'text-gray-700 hover:bg-gray-100'}`}>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
            Refer & Earn
          </div>
          
          <div 
            onClick={() => navigate('/redeem')}
            className={`flex items-center px-3 py-2 text-sm font-medium rounded-md cursor-pointer ${location === '/redeem' ? 'bg-primary/10 text-primary' : 'text-gray-700 hover:bg-gray-100'}`}>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            Redeem
          </div>
          
          <div 
            onClick={() => navigate('/settings')}
            className={`flex items-center px-3 py-2 text-sm font-medium rounded-md cursor-pointer ${location === '/settings' ? 'bg-primary/10 text-primary' : 'text-gray-700 hover:bg-gray-100'}`}>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Settings
          </div>
        </nav>
        
        {isAuthenticated && (
          <div className="mt-8 pt-6 border-t border-gray-200">
            <button 
              onClick={logout}
              className="flex items-center px-3 py-2 w-full text-sm font-medium rounded-md text-gray-700 hover:bg-gray-100"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Sign Out
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
