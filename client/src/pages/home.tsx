import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import RecentFiles from "@/components/recent-files";
import UploadPDF from "@/components/upload-pdf";
import { useAuth } from "@/lib/hooks";

export default function Home() {
  const { isAuthenticated } = useAuth();

  return (
    <div id="homeScreen" className="p-4 md:p-6">
      <div className="max-w-6xl mx-auto">
        {/* Hero Section */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden mb-6">
          <div className="md:flex">
            <div className="md:flex-1 p-6 md:p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Upload a PDF to get started</h2>
              <p className="text-gray-600 mb-6">Read, annotate, and listen to your PDF documents. Our intelligent reader helps you interact with your content in new ways.</p>
              
              <div className="flex flex-wrap gap-3">
                <UploadPDF />
                
                <Link href="/refer">
                  <Button 
                    variant="outline"
                    className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                    </svg>
                    Refer & Earn ₹50
                  </Button>
                </Link>
              </div>
            </div>
            <div className="md:w-1/3 bg-primary/10 p-6 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-48 w-48 text-primary/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
          </div>
        </div>
        
        {/* Recent Files Section */}
        <RecentFiles />
        
        {/* Features Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <div className="flex items-start">
              <div className="flex-shrink-0 bg-secondary/10 rounded-lg p-3">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
              </div>
              <div className="ml-4">
                <h4 className="text-lg font-medium text-gray-900">Text-to-Speech</h4>
                <p className="mt-2 text-sm text-gray-600">Listen to your documents with our advanced text-to-speech feature. Great for multitasking or learning on the go.</p>
                <span 
                  onClick={() => window.location.href = "/features/tts"} 
                  className="mt-3 text-sm font-medium text-secondary cursor-pointer inline-block"
                >
                  Learn More
                </span>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <div className="flex items-start">
              <div className="flex-shrink-0 bg-primary/10 rounded-lg p-3">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              </div>
              <div className="ml-4">
                <h4 className="text-lg font-medium text-gray-900">Word Recognition</h4>
                <p className="mt-2 text-sm text-gray-600">Use voice to find and highlight specific words in your document. Perfect for research and studying.</p>
                <span 
                  onClick={() => window.location.href = "/features/word-recognition"} 
                  className="mt-3 text-sm font-medium text-primary cursor-pointer inline-block"
                >
                  Learn More
                </span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Rewards Section */}
        <div className="bg-gradient-to-r from-primary/10 to-secondary/10 rounded-lg p-6 mb-8">
          <div className="md:flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Refer Friends, Earn Rewards</h3>
              <p className="mt-2 text-gray-600 max-w-xl">Invite friends to try our PDF Reader and earn ₹50 when they use the app for 4 days. Share your unique referral code now!</p>
            </div>
            <div className="mt-4 md:mt-0">
              <Link href="/refer">
                <Button
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                  </svg>
                  Refer Now
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
