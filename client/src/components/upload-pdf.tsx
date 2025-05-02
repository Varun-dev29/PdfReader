import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/hooks";
import { formatFileSize, generateUniqueId, storage } from "@/lib/utils";
import { storage as firebaseStorage, ref, uploadBytes, getDownloadURL, db, collection, addDoc, serverTimestamp } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

export default function UploadPDF() {
  const { isAuthenticated, user } = useAuth();
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const [, navigate] = useLocation();

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Check if file is a PDF
    if (file.type !== 'application/pdf') {
      toast({
        title: 'Invalid file type',
        description: 'Please upload a PDF file.',
        variant: 'destructive',
      });
      return;
    }
    
    // Check file size (max 10MB for demo)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      toast({
        title: 'File too large',
        description: 'Please upload a PDF file smaller than 10MB.',
        variant: 'destructive',
      });
      return;
    }
    
    try {
      setIsUploading(true);
      setProgress(0);
      
      let fileData;
      
      if (isAuthenticated && user) {
        // Upload to Firebase Storage for authenticated users
        const storageRef = ref(firebaseStorage, `pdfs/${user.uid}/${file.name}`);
        const uploadTask = uploadBytes(storageRef, file);
        
        // Track progress (simplified)
        const simulateProgress = setInterval(() => {
          setProgress(prev => {
            if (prev >= 90) {
              clearInterval(simulateProgress);
              return 90;
            }
            return prev + 10;
          });
        }, 300);
        
        await uploadTask;
        clearInterval(simulateProgress);
        setProgress(100);
        
        // Get download URL
        const downloadURL = await getDownloadURL(storageRef);
        
        // Save file metadata to Firestore
        const fileRef = collection(db, "users", user.uid, "files");
        const fileDoc = await addDoc(fileRef, {
          name: file.name,
          size: file.size,
          type: file.type,
          url: downloadURL,
          createdAt: serverTimestamp(),
          lastOpenedAt: serverTimestamp(),
        });
        
        fileData = {
          id: fileDoc.id,
          name: file.name,
          size: file.size,
          url: downloadURL,
          createdAt: new Date(),
          lastOpenedAt: new Date(),
        };
        
      } else {
        // Store in localStorage for guest users
        // Create a local URL for the file
        const fileURL = URL.createObjectURL(file);
        const fileId = generateUniqueId();
        
        fileData = {
          id: fileId,
          name: file.name,
          size: file.size,
          url: fileURL,
          createdAt: new Date(),
          lastOpenedAt: new Date(),
        };
        
        // Simulate upload progress
        const simulateProgress = setInterval(() => {
          setProgress(prev => {
            if (prev >= 100) {
              clearInterval(simulateProgress);
              return 100;
            }
            return prev + 10;
          });
        }, 100);
        
        // Add to recent files in localStorage
        storage.addRecentFile(fileData);
        
        setTimeout(() => {
          clearInterval(simulateProgress);
          setProgress(100);
        }, 1000);
      }
      
      toast({
        title: 'Upload successful',
        description: `${file.name} has been uploaded.`,
      });
      
      // Navigate to the PDF viewer
      navigate(`/pdf/${fileData.id}`);
      
    } catch (error) {
      console.error('Error uploading file:', error);
      toast({
        title: 'Upload failed',
        description: 'There was an error uploading your file. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
      setProgress(0);
      
      // Reset the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div>
      <input
        type="file"
        accept=".pdf"
        onChange={handleUpload}
        ref={fileInputRef}
        className="hidden"
        id="pdf-upload"
      />
      
      <Button 
        onClick={() => fileInputRef.current?.click()}
        disabled={isUploading}
        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
      >
        {isUploading ? (
          <>
            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Uploading {progress}%
          </>
        ) : (
          <>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            Upload PDF
          </>
        )}
      </Button>
    </div>
  );
}
