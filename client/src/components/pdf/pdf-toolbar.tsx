import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { storage } from "@/lib/utils";
import { useAuth } from "@/lib/hooks";
import { db, doc, updateDoc } from "@/lib/firebase";

interface PDFToolbarProps {
  fileName: string;
  fileId: string;
  pageNumber: number;
  totalPages: number;
  onPrevPage: () => void;
  onNextPage: () => void;
  onBookmark: () => void;
  onReadAloud: () => void;
  onFindWord: () => void;
  isBookmarked: boolean;
}

export default function PDFToolbar({
  fileName,
  fileId,
  pageNumber,
  totalPages,
  onPrevPage,
  onNextPage,
  onBookmark,
  onReadAloud,
  onFindWord,
  isBookmarked,
}: PDFToolbarProps) {
  const [, navigate] = useLocation();
  const { isAuthenticated, user } = useAuth();
  const [isBookmarkingPage, setIsBookmarkingPage] = useState(isBookmarked);

  const handleBookmark = async () => {
    setIsBookmarkingPage((prev) => !prev);
    
    try {
      if (isAuthenticated && user) {
        // Update in Firestore
        const bookmarkRef = doc(db, "users", user.uid, "bookmarks", `${fileId}_${pageNumber}`);
        
        if (!isBookmarkingPage) {
          // Add bookmark
          await updateDoc(bookmarkRef, {
            fileId,
            fileName,
            pageNumber,
            createdAt: new Date(),
          });
        } else {
          // Remove bookmark
          await updateDoc(bookmarkRef, {
            deleted: true,
          });
        }
      } else {
        // Update in localStorage
        if (!isBookmarkingPage) {
          storage.addBookmark({
            fileId,
            fileName,
            pageNumber,
          });
        } else {
          storage.removeBookmark(fileId, pageNumber);
        }
      }
      
      // Call parent handler
      onBookmark();
    } catch (error) {
      console.error('Error managing bookmark:', error);
      setIsBookmarkingPage(isBookmarked);
    }
  };

  return (
    <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
      <div className="flex items-center justify-between p-2 md:px-4">
        <div className="flex items-center space-x-2">
          <button 
            onClick={() => navigate('/')}
            className="p-2 rounded-full hover:bg-gray-100"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <h3 className="font-medium text-gray-800 truncate md:max-w-md">{fileName}</h3>
        </div>
        
        <div className="flex items-center space-x-1 md:space-x-2">
          <Button
            onClick={onReadAloud}
            variant="ghost"
            className="p-2 rounded-md hover:bg-gray-100 text-gray-700 flex items-center text-sm"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
            <span className="hidden md:inline ml-1">Read Aloud</span>
          </Button>
          <Button
            onClick={onFindWord}
            variant="ghost"
            className="p-2 rounded-md hover:bg-gray-100 text-gray-700 flex items-center text-sm"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <span className="hidden md:inline ml-1">Find Word</span>
          </Button>
          <Button
            onClick={handleBookmark}
            variant="ghost"
            className={`p-2 rounded-md hover:bg-gray-100 flex items-center text-sm ${isBookmarkingPage ? 'text-primary' : 'text-gray-700'}`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill={isBookmarkingPage ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
            </svg>
            <span className="hidden md:inline ml-1">Bookmark</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
