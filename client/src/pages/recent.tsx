import React, { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/lib/hooks';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';

interface RecentFile {
  id: number;
  name: string;
  url: string;
  thumbnailUrl?: string;
  createdAt: string;
  lastOpened: string;
}

export default function RecentFilesPage() {
  const [, navigate] = useLocation();
  const { isAuthenticated, user } = useAuth();
  const [files, setFiles] = useState<RecentFile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load recent files from localStorage for guest users or from API for authenticated users
    const loadRecentFiles = async () => {
      setLoading(true);
      
      try {
        if (isAuthenticated && user) {
          // For authenticated users, fetch from API
          const response = await fetch(`/api/users/${user.uid}/files`);
          if (response.ok) {
            const data = await response.json();
            setFiles(data);
          }
        } else {
          // For guest users, get from localStorage
          const storedFiles = localStorage.getItem('pdfReader_recentFiles');
          if (storedFiles) {
            setFiles(JSON.parse(storedFiles));
          }
        }
      } catch (error) {
        console.error('Error loading recent files:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadRecentFiles();
  }, [isAuthenticated, user]);
  
  const handleOpenFile = (fileId: number, fileUrl: string) => {
    navigate(`/pdf?id=${fileId}&url=${encodeURIComponent(fileUrl)}`);
  };
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Recent Files</h1>
        <Button onClick={() => navigate('/')} variant="outline">
          Upload New PDF
        </Button>
      </div>
      
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <Spinner className="w-10 h-10" />
        </div>
      ) : files.length === 0 ? (
        <div className="bg-gray-50 rounded-lg p-8 text-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
          <h3 className="text-lg font-medium text-gray-900">No recent files</h3>
          <p className="mt-2 text-sm text-gray-500">
            You haven't opened any PDFs yet. Upload your first PDF file to get started.
          </p>
          <Button className="mt-4" onClick={() => navigate('/')}>
            Upload PDF
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {files.map((file) => (
            <div key={file.id} className="bg-white rounded-lg shadow hover:shadow-md transition-shadow duration-200">
              <div 
                className="h-40 bg-gray-100 rounded-t-lg flex items-center justify-center cursor-pointer"
                onClick={() => handleOpenFile(file.id, file.url)}
              >
                {file.thumbnailUrl ? (
                  <img 
                    src={file.thumbnailUrl} 
                    alt={file.name} 
                    className="h-full w-full object-cover rounded-t-lg"
                  />
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                )}
              </div>
              <div className="p-4">
                <h3 
                  className="text-lg font-medium text-gray-900 truncate cursor-pointer hover:text-primary"
                  onClick={() => handleOpenFile(file.id, file.url)}
                >
                  {file.name}
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  Last opened: {formatDate(file.lastOpened)}
                </p>
                <div className="flex mt-4 space-x-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="flex-1"
                    onClick={() => handleOpenFile(file.id, file.url)}
                  >
                    Open
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    className="flex-none"
                    title="Delete file"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}