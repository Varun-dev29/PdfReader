import { useState, useEffect } from "react";
import { useRoute } from "wouter";
import PDFDocument from "@/components/pdf/pdf-document";
import PDFToolbar from "@/components/pdf/pdf-toolbar";
import { storage } from "@/lib/utils";
import { useAuth, useTTS, useSpeechRecognition } from "@/lib/hooks";
import { db, doc, getDoc, collection, updateDoc, serverTimestamp } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { Spinner } from "@/components/ui/spinner";

export default function PdfViewer() {
  const [, params] = useRoute<{ id: string }>("/pdf/:id");
  const [file, setFile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [pageNumber, setPageNumber] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const { isAuthenticated, user } = useAuth();
  const { speak, stop: stopSpeaking, isPlaying } = useTTS();
  const { startListening, isListening, stopListening } = useSpeechRecognition();
  const { toast } = useToast();

  // Load PDF file data
  useEffect(() => {
    const loadFile = async () => {
      if (!params?.id) return;
      
      setIsLoading(true);
      
      try {
        if (isAuthenticated && user) {
          // Get file from Firestore for authenticated user
          const fileRef = doc(db, "users", user.uid, "files", params.id);
          const fileDoc = await getDoc(fileRef);
          
          if (fileDoc.exists()) {
            const fileData = fileDoc.data();
            setFile({
              id: fileDoc.id,
              name: fileData.name,
              url: fileData.url,
              lastOpenedAt: fileData.lastOpenedAt?.toDate() || new Date(),
              pageCount: fileData.pageCount || 0,
            });
            
            // Update lastOpenedAt
            await updateDoc(fileRef, {
              lastOpenedAt: serverTimestamp(),
            });
            
            // Check if this page is bookmarked
            const bookmarkRef = doc(db, "users", user.uid, "bookmarks", `${params.id}_${pageNumber}`);
            const bookmarkDoc = await getDoc(bookmarkRef);
            setIsBookmarked(bookmarkDoc.exists() && !bookmarkDoc.data()?.deleted);
          } else {
            toast({
              title: "File not found",
              description: "The requested PDF file could not be found.",
              variant: "destructive",
            });
          }
        } else {
          // Get file from localStorage for guest user
          const localFiles = storage.getRecentFiles();
          const localFile = localFiles.find(f => f.id === params.id);
          
          if (localFile) {
            setFile(localFile);
            
            // Update lastOpenedAt
            storage.addRecentFile({
              ...localFile,
              lastOpenedAt: new Date(),
            });
            
            // Check if this page is bookmarked
            const bookmarks = storage.getBookmarks();
            setIsBookmarked(bookmarks.some(b => b.fileId === params.id && b.pageNumber === pageNumber));
          } else {
            toast({
              title: "File not found",
              description: "The requested PDF file could not be found.",
              variant: "destructive",
            });
          }
        }
      } catch (error) {
        console.error('Error loading file:', error);
        toast({
          title: "Error loading file",
          description: "There was an error loading the PDF. Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    loadFile();
  }, [params?.id, isAuthenticated, user, pageNumber, toast]);

  // Handle document loaded
  const handleDocumentLoadSuccess = (numPages: number) => {
    setTotalPages(numPages);
    
    // If logged in, update the page count in Firestore
    if (isAuthenticated && user && params?.id) {
      const fileRef = doc(db, "users", user.uid, "files", params.id);
      updateDoc(fileRef, { pageCount: numPages }).catch(console.error);
    }
  };

  // Handle page navigation
  const goToPrevPage = () => {
    if (pageNumber > 1) {
      setPageNumber(pageNumber - 1);
    }
  };

  const goToNextPage = () => {
    if (pageNumber < totalPages) {
      setPageNumber(pageNumber + 1);
    }
  };

  // Handle text-to-speech
  const handleReadAloud = () => {
    if (isPlaying) {
      stopSpeaking();
    } else {
      // In a real app, we would extract text from the current page
      // For this demo, we'll just read some placeholder text
      speak(`Reading content from ${file?.name || 'the PDF'}, page ${pageNumber} of ${totalPages}.`);
    }
  };

  // Handle speech recognition for word finding
  const handleFindWord = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening((text) => {
        toast({
          title: "Word recognized",
          description: `Searching for: "${text}"`,
        });
        // In a real app, we would find and highlight the word in the PDF
      });
    }
  };

  // Handle bookmark toggle
  const handleBookmarkToggle = () => {
    setIsBookmarked(!isBookmarked);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <Spinner className="h-12 w-12 mx-auto mb-4" />
          <p className="text-gray-600">Loading PDF...</p>
        </div>
      </div>
    );
  }

  if (!file) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center max-w-md mx-auto p-6 bg-white rounded-lg shadow-md">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-red-500 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <h2 className="text-xl font-semibold mb-2">File Not Found</h2>
          <p className="text-gray-600 mb-4">The PDF file you're looking for does not exist or has been removed.</p>
        </div>
      </div>
    );
  }

  return (
    <div id="pdfViewerScreen">
      {/* PDF Viewer Toolbar */}
      <PDFToolbar
        fileName={file.name}
        fileId={file.id}
        pageNumber={pageNumber}
        totalPages={totalPages}
        onPrevPage={goToPrevPage}
        onNextPage={goToNextPage}
        onBookmark={handleBookmarkToggle}
        onReadAloud={handleReadAloud}
        onFindWord={handleFindWord}
        isBookmarked={isBookmarked}
      />
      
      {/* PDF Content */}
      <PDFDocument
        file={file}
        onLoadSuccess={handleDocumentLoadSuccess}
      />
    </div>
  );
}
