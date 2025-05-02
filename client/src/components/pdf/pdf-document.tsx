import { useState, useEffect, useRef } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { useUsageTracking, useTTS, useSpeechRecognition } from "@/lib/hooks";
import { Spinner } from "@/components/ui/spinner";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";

// Set worker - Use a local copy of the worker for better reliability
pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';

// Set version check to false to prevent version mismatch errors
// This is not ideal for production but prevents errors during development
(pdfjs as any).disableWorkerBuildInCheck = true;

interface PDFDocumentProps {
  file: {
    url: string;
    name: string;
  };
  onLoadSuccess?: (numPages: number) => void;
}

export default function PDFDocument({ file, onLoadSuccess }: PDFDocumentProps) {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [scale, setScale] = useState<number>(1);
  const [isTextSelected, setIsTextSelected] = useState<boolean>(false);
  const [selectedText, setSelectedText] = useState<string>("");
  const [searchText, setSearchText] = useState<string>("");
  const [highlightedMatches, setHighlightedMatches] = useState<string[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const { startTracking, stopTracking } = useUsageTracking();
  const { speak, stop: stopSpeaking, isPlaying } = useTTS();
  const { startListening, isListening } = useSpeechRecognition();
  const { toast } = useToast();

  // Start tracking usage time when PDF is loaded - use empty dependency array to run only once
  useEffect(() => {
    if (startTracking) {
      startTracking();
    }
    return () => {
      if (stopTracking) {
        stopTracking();
      }
    };
  }, []);

  // Handle document load success
  const handleDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    if (onLoadSuccess) {
      onLoadSuccess(numPages);
    }
  };

  // Handle page navigation
  const goToPrevPage = () => {
    setPageNumber(pageNumber - 1 > 0 ? pageNumber - 1 : 1);
  };

  const goToNextPage = () => {
    setPageNumber(pageNumber + 1 <= numPages! ? pageNumber + 1 : numPages!);
  };

  // Handle text selection
  const handleTextSelection = () => {
    const selection = window.getSelection();
    if (selection && selection.toString().trim().length > 0) {
      setIsTextSelected(true);
      setSelectedText(selection.toString());
    } else {
      setIsTextSelected(false);
      setSelectedText("");
    }
  };

  // Extract and read all text from the current page
  const extractAllTextFromPage = () => {
    if (!containerRef.current) return '';
    
    const textLayer = containerRef.current.querySelector('.react-pdf__Page__textContent');
    if (!textLayer) return '';
    
    const textSpans = textLayer.querySelectorAll('span');
    let extractedText = '';
    
    textSpans.forEach(span => {
      const text = span.textContent || '';
      if (text.trim()) {
        extractedText += text + ' ';
      }
    });
    
    return extractedText.trim();
  };
  
  // Handle text-to-speech for selected or all text
  const readSelectedText = () => {
    // If already playing, stop
    if (isPlaying) {
      stop();
      return;
    }
    
    // If text is selected, read that; otherwise read the whole page
    if (selectedText) {
      speak(selectedText, { rate: speechRate });
    } else {
      const allText = extractAllTextFromPage();
      if (allText) {
        // Split by words to show highlighting for each word as they're spoken
        const words = allText.split(/\s+/);
        let currentIndex = 0;
        
        const speakNextWord = () => {
          if (currentIndex < words.length) {
            const word = words[currentIndex];
            highlightTextInPdf(word);
            speak(word, { 
              rate: speechRate,
              onEnd: () => {
                setTimeout(() => {
                  currentIndex++;
                  speakNextWord();
                }, 100); // Small delay between words
              }
            });
          } else {
            toast({
              title: "Finished reading",
              description: "Completed reading the current page",
            });
          }
        };
        
        speakNextWord();
      } else {
        toast({
          title: "No text found",
          description: "Could not extract text from the current page.",
          variant: "destructive",
        });
      }
    }
  };
  
  // Speech rate options
  const [isRateMenuOpen, setIsRateMenuOpen] = useState(false);

  // Speech rate for TTS
  const [speechRate, setSpeechRate] = useState<number>(1);
  
  // Handle speech recognition for word finding
  const handleSpeechRecognition = () => {
    if (isListening) return;

    startListening((text) => {
      setSearchText(text);
      if (text.trim()) {
        toast({
          title: "Word recognized",
          description: `Searching for: "${text}"`,
        });
        
        // Highlight words in text layer
        highlightTextInPdf(text);
      }
    });
  };
  
  // Function to highlight text in PDF
  const highlightTextInPdf = (searchText: string) => {
    if (!searchText.trim() || !containerRef.current) return;
    
    // Clear previous highlights
    const previousHighlights = containerRef.current.querySelectorAll('.search-highlight');
    previousHighlights.forEach(el => {
      const parent = el.parentNode;
      if (parent) {
        const text = el.textContent || '';
        const textNode = document.createTextNode(text);
        parent.replaceChild(textNode, el);
      }
    });
    
    // Find text in the text layer
    const textLayer = containerRef.current.querySelector('.react-pdf__Page__textContent');
    if (!textLayer) return;
    
    const spans = textLayer.querySelectorAll('span');
    const searchTermLower = searchText.toLowerCase();
    
    let matchFound = false;
    
    spans.forEach(span => {
      const text = span.textContent || '';
      if (text.toLowerCase().includes(searchTermLower)) {
        matchFound = true;
        
        // Replace text with highlighted version
        const parts = text.split(new RegExp(`(${searchText})`, 'i'));
        span.textContent = '';
        
        parts.forEach(part => {
          if (part.toLowerCase() === searchTermLower) {
            const highlight = document.createElement('span');
            highlight.textContent = part;
            highlight.className = 'search-highlight';
            span.appendChild(highlight);
          } else if (part) {
            span.appendChild(document.createTextNode(part));
          }
        });
      }
    });
    
    if (matchFound) {
      setHighlightedMatches(prev => [...prev, searchText]);
      toast({
        title: "Match found",
        description: `Highlighted "${searchText}" in document`,
      });
    } else {
      toast({
        title: "No match found",
        description: `Could not find "${searchText}" in current page`,
        variant: "destructive"
      });
    }
  };

  // Handle zoom controls
  const zoomIn = () => setScale(scale + 0.2);
  const zoomOut = () => setScale(scale - 0.2 > 0.5 ? scale - 0.2 : 0.5);
  const resetZoom = () => setScale(1);

  return (
    <div className="pdf-container" ref={containerRef} onMouseUp={handleTextSelection}>
      <div className="flex justify-center p-2 md:p-6 bg-gray-200 min-h-screen">
        <div className="w-full max-w-4xl">
          <Document
            file={file.url}
            onLoadSuccess={handleDocumentLoadSuccess}
            loading={
              <div className="flex items-center justify-center h-[842px] bg-white shadow-sm rounded-lg">
                <div className="text-center">
                  <Spinner className="w-10 h-10 mb-4" />
                  <p>Loading PDF...</p>
                </div>
              </div>
            }
            error={
              <div className="flex items-center justify-center h-[842px] bg-white shadow-sm rounded-lg">
                <div className="text-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 mx-auto text-red-500 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <p className="text-red-700 font-medium">Failed to load PDF</p>
                  <p className="text-sm text-gray-600 mt-1">Please check if the file is a valid PDF document</p>
                </div>
              </div>
            }
          >
            <Page
              pageNumber={pageNumber}
              scale={scale}
              renderTextLayer={true}
              className="pdf-page shadow-sm bg-white mx-auto"
              renderAnnotationLayer={true}
            />
            
            {/* Page navigation and controls */}
            <div className="flex flex-col md:flex-row items-center gap-3 mt-4 bg-white rounded-lg shadow-sm p-4 pdf-controls">
              <div className="flex space-x-2 w-full md:w-auto justify-center">
                <Button 
                  onClick={goToPrevPage} 
                  disabled={pageNumber <= 1}
                  variant="outline"
                  size="sm"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                  </svg>
                </Button>
                <div className="text-sm font-medium flex items-center">
                  Page {pageNumber} of {numPages}
                </div>
                <Button 
                  onClick={goToNextPage} 
                  disabled={pageNumber >= (numPages || 1)}
                  variant="outline"
                  size="sm"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                  </svg>
                </Button>
              </div>
              
              {/* Zoom controls */}
              <div className="flex space-x-2 w-full md:w-auto justify-center">
                <Button 
                  onClick={zoomOut} 
                  variant="outline"
                  size="sm"
                  title="Zoom out"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 12H4" />
                  </svg>
                </Button>
                <Button 
                  onClick={resetZoom}
                  variant="outline"
                  size="sm"
                  title="Reset zoom"
                >
                  {Math.round(scale * 100)}%
                </Button>
                <Button 
                  onClick={zoomIn}
                  variant="outline"
                  size="sm"
                  title="Zoom in"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                  </svg>
                </Button>
              </div>
              
              {/* Read and Search controls */}
              <div className="flex space-x-2 w-full md:w-auto justify-center">
                <div className="relative">
                  <div className="flex gap-1">
                    <Button
                      onClick={readSelectedText}
                      disabled={isPlaying && !isTextSelected}
                      variant={isPlaying ? "destructive" : "outline"}
                      size="sm"
                      title={isPlaying ? "Stop reading" : isTextSelected ? "Read selected text" : "Read page"}
                      className="flex items-center"
                    >
                      {isPlaying ? (
                        <>
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
                          </svg>
                          Stop
                        </>
                      ) : (
                        <>
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                          </svg>
                          Read
                        </>
                      )}
                    </Button>
                    
                    <Button
                      onClick={() => setIsRateMenuOpen(!isRateMenuOpen)}
                      variant="outline"
                      size="sm"
                      className="px-2"
                      title="Speech rate"
                    >
                      {speechRate}x <span className="ml-1">▼</span>
                    </Button>
                  </div>
                  
                  {/* Speech rate dropdown */}
                  {isRateMenuOpen && (
                    <div className="absolute right-0 mt-1 w-40 bg-white rounded-md shadow-lg z-10 border border-gray-200 text-xs">
                      <div className="flex justify-between items-center p-2 border-b">
                        <span className="font-medium">Speech Rate</span>
                        <span className="bg-primary/10 text-primary rounded px-1">{speechRate}x</span>
                      </div>
                      <div className="max-h-48 overflow-auto">
                        {[0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2].map((rate) => (
                          <button
                            key={rate}
                            onClick={() => {
                              setSpeechRate(rate);
                              setIsRateMenuOpen(false);
                            }}
                            className={`w-full text-left px-4 py-2 hover:bg-gray-100 ${speechRate === rate ? 'bg-primary/10 text-primary' : ''}`}
                          >
                            {rate}x {rate === 1 && "(Normal)"}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                
                <Button
                  onClick={handleSpeechRecognition}
                  variant={isListening ? "destructive" : "outline"}
                  size="sm"
                  title={isListening ? "Listening..." : "Find word by voice"}
                >
                  {isListening ? (
                    <>
                      <svg className="animate-pulse h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                      </svg>
                      Listening...
                    </>
                  ) : (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                      Find by voice
                    </>
                  )}
                </Button>
              </div>
            </div>
          </Document>
        </div>
      </div>
    </div>
  );
}
