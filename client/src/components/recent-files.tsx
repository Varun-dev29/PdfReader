import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { formatFileSize, formatDate, storage } from "@/lib/utils";
import { useAuth } from "@/lib/hooks";
import { db, collection, query, orderBy, limit, getDocs } from "@/lib/firebase";
import { PDFFile } from "@/lib/types";

export default function RecentFiles() {
  const { isAuthenticated, user } = useAuth();
  const [location, navigate] = useLocation();
  const [recentFiles, setRecentFiles] = useState<PDFFile[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadRecentFiles = async () => {
      setIsLoading(true);
      
      try {
        if (isAuthenticated && user) {
          // Get files from Firestore for authenticated user
          const filesRef = collection(db, "users", user.uid, "files");
          const q = query(filesRef, orderBy("lastOpenedAt", "desc"), limit(3));
          const querySnapshot = await getDocs(q);
          
          const files: PDFFile[] = [];
          querySnapshot.forEach((doc) => {
            const data = doc.data();
            files.push({
              id: doc.id,
              name: data.name,
              url: data.url,
              pageCount: data.pageCount || 0,
              size: data.size,
              createdAt: data.createdAt?.toDate() || new Date(),
              lastOpenedAt: data.lastOpenedAt?.toDate() || new Date(),
            });
          });
          
          setRecentFiles(files);
        } else {
          // Get files from localStorage for guest user
          const localFiles = storage.getRecentFiles();
          setRecentFiles(localFiles.slice(0, 3));
        }
      } catch (error) {
        console.error('Error loading recent files:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadRecentFiles();
  }, [isAuthenticated, user]);

  if (isLoading) {
    return (
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Recent Files</h3>
          <div 
            onClick={() => navigate('/recent')}
            className="text-sm font-medium text-primary cursor-pointer"
          >
            View All
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white rounded-lg shadow-sm overflow-hidden border border-gray-200 animate-pulse">
              <div className="h-32 bg-gray-200"></div>
              <div className="p-4">
                <div className="h-4 bg-gray-200 rounded mb-2 w-3/4"></div>
                <div className="h-3 bg-gray-100 rounded mb-3 w-1/2"></div>
                <div className="flex items-center justify-between">
                  <div className="h-3 bg-gray-100 rounded w-1/4"></div>
                  <div className="flex items-center space-x-2">
                    <div className="h-4 w-4 bg-gray-200 rounded-full"></div>
                    <div className="h-4 w-4 bg-gray-200 rounded-full"></div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (recentFiles.length === 0) {
    return (
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Recent Files</h3>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm p-6 text-center border border-gray-200">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
          <h4 className="text-gray-700 font-medium mb-2">No recent files</h4>
          <p className="text-gray-500 text-sm mb-4">Upload a PDF to get started with your reading</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Recent Files</h3>
        <div 
          onClick={() => navigate('/recent')}
          className="text-sm font-medium text-primary cursor-pointer"
        >
          View All
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {recentFiles.map((file) => (
          <div 
            key={file.id}
            onClick={() => navigate(`/pdf/${file.id}`)}
            className="bg-white rounded-lg shadow-sm overflow-hidden border border-gray-200 hover:shadow-md transition cursor-pointer"
          >
            <div className="h-32 bg-gray-100 p-4 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-primary/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div className="p-4">
              <h4 className="font-medium text-gray-900 truncate">{file.name}</h4>
              <p className="text-sm text-gray-500 mt-1">Last opened: {formatDate(file.lastOpenedAt)}</p>
              <div className="flex items-center justify-between mt-3">
                <span className="text-xs text-gray-500">{file.pageCount ? `${file.pageCount} pages` : formatFileSize(file.size)}</span>
                <div className="flex items-center space-x-2">
                  <button 
                    className="p-1 rounded-full hover:bg-gray-100"
                    onClick={(e) => {
                      e.stopPropagation();
                      // Add bookmark functionality
                    }}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                    </svg>
                  </button>
                  <button 
                    className="p-1 rounded-full hover:bg-gray-100"
                    onClick={(e) => {
                      e.stopPropagation();
                      // Show options menu
                    }}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
