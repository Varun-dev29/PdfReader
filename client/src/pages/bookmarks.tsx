
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/hooks";
import { storage } from "@/lib/utils";
import { useLocation } from "wouter";

export default function Bookmarks() {
  const [bookmarks, setBookmarks] = useState<any[]>([]);
  const { isAuthenticated, user } = useAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    const loadBookmarks = async () => {
      if (isAuthenticated && user) {
        // Load from Firebase (to be implemented)
      } else {
        // Load from localStorage
        setBookmarks(storage.getBookmarks());
      }
    };
    
    loadBookmarks();
  }, [isAuthenticated, user]);

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Bookmarks</h1>
      {bookmarks.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-500">No bookmarks yet</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {bookmarks.map((bookmark) => (
            <div
              key={bookmark.id}
              className="bg-white p-4 rounded-lg shadow hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => navigate(`/pdf/${bookmark.fileId}`)}
            >
              <h3 className="font-medium">{bookmark.fileName}</h3>
              <p className="text-sm text-gray-500">Page {bookmark.pageNumber}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
