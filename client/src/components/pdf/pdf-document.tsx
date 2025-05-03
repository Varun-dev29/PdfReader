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
  const [isRateMenuOpen, setIsRateMenuOpen] = useState(false);
  const [speechRate, setSpeechRate] = useState<number>(1);
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
    setPageNumber(pageNumber + 1 <= (numPages || 1) ? pageNumber + 1 : (numPages || 1));
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

    // Get all span elements and sort them by position (top to bottom, left to right)
    const textSpans = Array.from(textLayer.querySelectorAll('span')).sort((a, b) => {
      const aTop = parseInt(a.style.top);
      const bTop = parseInt(b.style.top);
      const aLeft = parseInt(a.style.left);
      const bLeft = parseInt(b.style.left);

      // If they're roughly on the same line (within 15px), sort by left position
      if (Math.abs(aTop - bTop) < 15) {
        return aLeft - bLeft;
      }

      // Otherwise sort by top position
      return aTop - bTop;
    });

    let extractedText = '';
    let lastTop = -1;

    textSpans.forEach(span => {
      const text = span.textContent || '';
      if (text.trim()) {
        const currentTop = parseInt(span.style.top);

        // If we've moved to a new line, add a space or newline
        if (lastTop !== -1 && Math.abs(currentTop - lastTop) > 15) {
          extractedText += '\n';
        } else if (extractedText && !extractedText.endsWith(' ') && !extractedText.endsWith('\n')) {
          extractedText += ' ';
        }

        extractedText += text;
        lastTop = currentTop;
      }
    });

    return extractedText.trim();
  };

  // Define an interface for word context
  interface WordWithContext {
    word: string;
    cleanWord: string;
    context: string;
  }

  // Get all words from the page text with context (sentence or paragraph)
  const getPageWordsWithContext = (): WordWithContext[] => {
    const allText = extractAllTextFromPage();
    if (!allText) return [];

    // Split by paragraphs, preserving line breaks
    const paragraphs = allText.split(/\n+/);

    const wordsWithContext: WordWithContext[] = [];

    paragraphs.forEach(paragraph => {
      // Split paragraph into sentences, considering proper line breaks
      const sentences = paragraph
        .split(/(?<=[.!?])\s+/)
        .map(s => s.trim())
        .filter(s => s.length > 0);

      sentences.forEach(sentence => {
        // Clean the sentence of special characters while preserving structure
        const cleanSentence = sentence
          .replace(/[^\w\s.,!?]|_/g, '') // Keep basic punctuation
          .replace(/\s+/g, ' ') // Normalize spaces
          .trim();

        if (cleanSentence) {
          wordsWithContext.push({
            word: cleanSentence, // Cleaned sentence for reading
            cleanWord: cleanSentence, // Same sentence for highlighting
            context: sentence // Original sentence for context
          });
        }
      });
    });

    return wordsWithContext;
  };

  // Function to stop speech
  const stop = () => {
    stopSpeaking();
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
      // Main function that reads the current page and then moves to the next page
      const readCurrentPage = () => {
        const wordsWithContext = getPageWordsWithContext();

        if (wordsWithContext.length > 0) {
          let currentIndex = 0;

          const speakNextSentence = () => {
            // If there are more words on this page and we haven't paused
            if (currentIndex < wordsWithContext.length && !window.speechSynthesis.paused) {
              const { word, cleanWord } = wordsWithContext[currentIndex];

              // First highlight the word, then speak it
              const highlightSuccess = highlightTextInPdf(cleanWord, true);

              // Note: Only continue to the next word after the current one finishes speaking
              speak(word, { 
                rate: speechRate,
                onEnd: () => {
                  // Small delay to make reading feel more natural
                  setTimeout(() => {
                    // Move to the next sentence
                    currentIndex++;

                    // If we're still actively playing (not manually stopped)
                    if (!window.speechSynthesis.paused) {
                      speakNextSentence();
                    }
                  }, 500); // Half second delay between sentences
                }
              });
            } 
            // If we've reached the end of the words on this page
            else if (currentIndex >= wordsWithContext.length) {
              // Check if there's a next page available
              if (pageNumber < (numPages || 1)) {
                // We use a timeout to allow a brief pause between pages
                setTimeout(() => {
                  // Only proceed if we're still actively playing
                  if (!window.speechSynthesis.paused) {
                    // Navigate to the next page
                    goToNextPage();

                    // Wait a moment for the page to fully load before reading
                    setTimeout(() => {
                      if (!window.speechSynthesis.paused) {
                        // Recursively call readCurrentPage to read the next page
                        readCurrentPage();
                      }
                    }, 500); // Half-second delay to ensure the page is loaded
                  }
                }, 200); // Brief pause between pages
              } else {
                // We've reached the end of the document
                toast({
                  title: "Finished reading",
                  description: "Completed reading the entire document",
                });
              }
            }
          };

          // Start the reading process on this page
          speakNextSentence();
        } else {
          // If no text could be extracted, try moving to the next page
          if (pageNumber < (numPages || 1)) {
            goToNextPage();

            // Wait for the next page to load
            setTimeout(() => {
              if (!window.speechSynthesis.paused) {
                readCurrentPage(); // Try reading the next page
              }
            }, 500);
          } else {
            // If we can't find text on the last page
            toast({
              title: "No text found",
              description: "Could not extract text from the document.",
              variant: "destructive",
            });
          }
        }
      };

      // Start the reading process
      readCurrentPage();
    }
  };

  // Handle speech recognition for word finding
  const handleSpeechRecognition = () => {
    if (isListening) return;

    startListening((text) => {
      setSearchText(text);
      if (text.trim()) {
        // Clean the recognized text first (remove excessive punctuation but keep spaces)
        const cleanText = text.trim().replace(/[^a-zA-Z0-9\s]/g, '');

        toast({
          title: "Text recognized",
          description: `Searching for: "${cleanText}"`,
        });

        // First, try to find the exact phrase/sentence
        let found = highlightTextInPdf(cleanText, false);

        // If full phrase not found and it contains multiple words, try subsequences
        if (!found && cleanText.split(/\s+/).length > 1) {
          // Try to find the largest subsequence that matches
          const words = cleanText.split(/\s+/);

          // Try different subsequences of the phrase (in descending size)
          for (let windowSize = words.length - 1; windowSize > 0; windowSize--) {
            for (let startIdx = 0; startIdx <= words.length - windowSize; startIdx++) {
              const subPhrase = words.slice(startIdx, startIdx + windowSize).join(' ');
              if (subPhrase.length > 3) { // Only search for meaningful phrases
                const phraseFound = highlightTextInPdf(subPhrase, false);
                if (phraseFound) {
                  found = true;
                  break;
                }
              }
            }
            if (found) break;
          }
        }

        // If still not found, try individual words
        if (!found) {
          const words = cleanText.split(/\s+/);

          // First try with individual words
          for (const word of words) {
            if (word.length > 2) { // Only search for words longer than 2 characters
              const wordFound = highlightTextInPdf(word, false);
              if (wordFound) {
                found = true;
                break;
              }
            }
          }

          // If still not found, try with partial matches of individual words
          if (!found) {
            for (const word of words) {
              if (word.length > 3) { // Only try partial matching for words longer than 3 characters
                const partialMatch = highlightTextInPdf(word, false, true);
                if (partialMatch) {
                  found = true;
                  break;
                }
              }
            }
          }

          // If still not found even with partial matching of words,
          // use a more lenient search approach with the original query
          if (!found && cleanText.length > 3) {
            // Try to match part of the original query
            const partialText = cleanText.substring(0, Math.ceil(cleanText.length * 0.7));
            highlightTextInPdf(partialText, false, true);
          }
        }
      }
    });
  };

  // Function to highlight text in PDF
  const highlightTextInPdf = (searchText: string, isSpeechReading = false, forcePartialMatch = false): boolean => {
    if (!searchText.trim() || !containerRef.current) return false;

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
    if (!textLayer) return false;

    const spans = textLayer.querySelectorAll('span');
    const searchTermLower = searchText.toLowerCase();

    let matchFound = false;

    // For exact word matching during speech reading
    if (isSpeechReading) {
      // Search for exact word matches (words should match whole or be surrounded by spaces/punctuation)
      spans.forEach(span => {
        const text = span.textContent || '';

        // Check if the span contains the exact word (with word boundaries)
        const wordRegex = new RegExp(`\\b${searchText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');

        if (wordRegex.test(text)) {
          matchFound = true;

          // Replace text with highlighted version
          const parts = text.split(new RegExp(`(\\b${searchText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b)`, 'i'));
          span.textContent = '';

          parts.forEach(part => {
            if (wordRegex.test(part)) {
              const highlight = document.createElement('span');
              highlight.textContent = part;
              highlight.className = 'search-highlight';

              // Scroll the highlight into view with a slight offset for better visibility
              setTimeout(() => {
                highlight.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }, 50);

              span.appendChild(highlight);
            } else if (part) {
              span.appendChild(document.createTextNode(part));
            }
          });
        }
      });
    } else {
      // Standard partial text search for user-initiated searches
      spans.forEach(span => {
        const text = span.textContent || '';

        // For force partial match, we'll check if the text contains any part of the search term
        let isMatch = false;
        let matchRegex: RegExp | null = null;

        if (forcePartialMatch) {
          // Check if any part of the search text is found in the content
          isMatch = text.toLowerCase().includes(searchTermLower.substring(0, Math.ceil(searchTermLower.length * 0.7)));
          if (isMatch) {
            // Create a regex that will find the closest match to our search term
            const escapedSearchTerm = searchText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            // This regex will match the most similar substring to our search term
            matchRegex = new RegExp(`(${escapedSearchTerm.substring(0, Math.ceil(escapedSearchTerm.length * 0.7))})`, 'i');
          }
        } else {
          // Standard exact match
          isMatch = text.toLowerCase().includes(searchTermLower);
          matchRegex = new RegExp(`(${searchText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'i');
        }

        if (isMatch && matchRegex) {
          matchFound = true;

          // Replace text with highlighted version
          const parts = text.split(matchRegex);
          span.textContent = '';

          parts.forEach(part => {
            // Check if this part matches our regex
            if (matchRegex && matchRegex.test(part)) {
              const highlight = document.createElement('span');
              highlight.textContent = part;
              highlight.className = 'search-highlight';

              // Scroll the highlight into view
              setTimeout(() => {
                highlight.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }, 50);

              span.appendChild(highlight);
            } else if (part) {
              span.appendChild(document.createTextNode(part));
            }
          });
        }
      });
    }

    if (matchFound) {
      if (!isSpeechReading) {
        setHighlightedMatches(prev => [...prev, searchText]);
        toast({
          title: "Match found",
          description: `Highlighted "${searchText}" in document`,
        });
      }
    } else if (!isSpeechReading) {
      toast({
        title: "No match found",
        description: `Could not find "${searchText}" in current page`,
        variant: "destructive"
      });
    }

    return matchFound;
  };

  // Handle zoom controls
  const zoomIn = () => setScale(scale + 0.2);
  const zoomOut = () => setScale(scale - 0.2 > 0.5 ? scale - 0.2 : 0.5);
  const resetZoom = () => setScale(1);

  // Handle speech rate change
  const handleRateChange = (rate: number) => {
    setSpeechRate(rate);
    setIsRateMenuOpen(false);
    toast({
      title: "Speech rate changed",
      description: `Reading speed set to ${rate}x`,
    });
  };

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
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10H7" />
                  </svg>
                </Button>
                <Button 
                  onClick={resetZoom} 
                  variant="outline"
                  size="sm"
                  title="Reset zoom"
                >
                  <span className="text-xs font-medium">{Math.round(scale * 100)}%</span>
                </Button>
                <Button 
                  onClick={zoomIn} 
                  variant="outline"
                  size="sm"
                  title="Zoom in"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10H7M10 7v6" />
                  </svg>
                </Button>
              </div>

              {/* Read options and speech controls */}
              <div className="flex space-x-2 w-full md:w-auto justify-center">
                <div className="relative">
                  <Button
                    onClick={() => setIsRateMenuOpen(!isRateMenuOpen)}
                    variant="outline"
                    size="sm"
                    className="flex items-center"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    {speechRate}x
                  </Button>

                  {isRateMenuOpen && (
                    <div className="absolute z-10 mt-1 bg-white rounded-md shadow-lg py-1 w-20">
                      {[0.5, 0.75, 1, 1.25, 1.5, 1.75, 2].map((rate) => (
                        <button
                          key={rate}
                          className={`block w-full text-left px-4 py-1 text-sm ${
                            rate === speechRate ? 'bg-primary text-white' : 'hover:bg-gray-100'
                          }`}
                          onClick={() => handleRateChange(rate)}
                        >
                          {rate}x
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <Button
                  onClick={readSelectedText}
                  disabled={isPlaying && !isTextSelected}
                  variant={isPlaying ? "destructive" : "outline"}
                  size="sm"
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
                      Read Aloud
                    </>
                  )}
                </Button>

                <Button
                  onClick={handleSpeechRecognition}
                  disabled={isListening}
                  variant={isListening ? "outline" : "outline"}
                  size="sm"
                >
                  {isListening ? (
                    <>
                      <Spinner className="h-4 w-4 mr-1" />
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