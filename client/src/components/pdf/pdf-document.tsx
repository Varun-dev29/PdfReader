import { useState, useEffect, useRef } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { useUsageTracking, useTTS, useSpeechRecognition } from "@/lib/hooks";
import { Spinner } from "@/components/ui/spinner";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";

// Set worker - Use a local copy of the worker for better reliability
pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.js";

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
  const [isPlaying, setIsPlaying] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false); // Added state for fullscreen
  const containerRef = useRef<HTMLDivElement>(null);

  const { startTracking, stopTracking } = useUsageTracking();
  const { speak, stop: stopSpeaking } = useTTS();
  const { startListening, stopListening, isListening } = useSpeechRecognition();
  const { toast } = useToast();

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

  const handleDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    if (onLoadSuccess) {
      onLoadSuccess(numPages);
    }
  };

  const goToPrevPage = () => {
    setPageNumber(pageNumber - 1 > 0 ? pageNumber - 1 : 1);
  };

  const goToNextPage = () => {
    setPageNumber(
      pageNumber + 1 <= (numPages || 1) ? pageNumber + 1 : numPages || 1,
    );
  };

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

  const extractAllTextFromPage = () => {
    if (!containerRef.current) return "";

    const textLayer = containerRef.current.querySelector(
      ".react-pdf__Page__textContent",
    );
    if (!textLayer) return "";

    const textSpans = Array.from(textLayer.querySelectorAll("span")).sort(
      (a, b) => {
        const aTop = parseInt(a.style.top);
        const bTop = parseInt(b.style.top);
        const aLeft = parseInt(a.style.left);
        const bLeft = parseInt(b.style.left);

        if (Math.abs(aTop - bTop) < 15) {
          return aLeft - bLeft;
        }

        return aTop - bTop;
      },
    );

    let extractedText = "";
    let lastTop = -1;

    const isValidWord = (word: string) => {
      // Filter out words that are too short or contain repeated characters
      if (word.length < 2) return false;
      if (/(.)\1{2,}/.test(word)) return false; // Filter words with 3+ repeated chars
      if (!/[aeiou]/i.test(word) && word.length > 3) return false; // Long words must have vowels
      if (/[0-9]{5,}/.test(word)) return false; // Filter long number sequences
      return true;
    };

    // Function to remove consecutive duplicate words and phrases
    const removeRepeatedWords = (text: string) => {
      // First pass: remove repeated single words
      let result = text.split(/\s+/).filter((word, index, arr) => word !== arr[index - 1]).join(' ');

      // Second pass: remove repeated phrases
      const words = result.split(/\s+/);
      const cleanedWords = [];

      for (let i = 0; i < words.length; i++) {
        let skipCount = 0;
        // Check for repeated phrases up to 4 words long
        for (let phraseLength = 2; phraseLength <= 4 && i + phraseLength * 2 <= words.length; phraseLength++) {
          const phrase1 = words.slice(i, i + phraseLength).join(' ');
          const phrase2 = words.slice(i + phraseLength, i + phraseLength * 2).join(' ');
          if (phrase1.toLowerCase() === phrase2.toLowerCase()) {
            skipCount = phraseLength * 2 - 1;
            break;
          }
        }
        if (skipCount === 0) {
          cleanedWords.push(words[i]);
        } else {
          // Use the minimal phrase length that matched
          const minPhraseLength = Math.min(4, words.length - i);
          cleanedWords.push(...words.slice(i, i + minPhraseLength));
          i += skipCount;
        }
      }

      return cleanedWords.join(' ');
    };

    textSpans.forEach((span) => {
      const rawText = (span.textContent || "")
        .toLowerCase()
        .replace(/[^\w\s]/g, ' ')
        .trim();

      // Filter words individually
      const validWords = rawText.split(/\s+/)
        .filter(word => word && isValidWord(word))
        .join(' ');

      if (validWords) {
        const currentTop = parseInt(span.style.top);

        if (lastTop !== -1 && Math.abs(currentTop - lastTop) > 15) {
          extractedText += "\n";
        } else if (
          extractedText &&
          !extractedText.endsWith(" ") &&
          !extractedText.endsWith("\n")
        ) {
          extractedText += " ";
        }

        extractedText += validWords + " ";
        lastTop = currentTop;
      }
    });

    // Clean up extra spaces and remove repeated words
    extractedText = removeRepeatedWords(extractedText.replace(/\s+/g, ' ').trim());

    return extractedText.trim();
  };

  interface WordWithContext {
    word: string;
    cleanWord: string;
    context: string;
  }

  const getPageWordsWithContext = (): WordWithContext[] => {
    const allText = extractAllTextFromPage();
    if (!allText) return [];

    const sentences = allText
      .split(/(?<=[.!?])\s+/)
      .map(s => s.trim())
      .filter(s => s.length > 0);

    const wordsWithContext: WordWithContext[] = [];

    sentences.forEach((sentence) => {
      const cleanSentence = sentence
        .replace(/[^\w\s.,!?-]|_/g, '')
        .replace(/\s+/g, ' ')
        .trim();

      if (cleanSentence) {
        wordsWithContext.push({
          word: cleanSentence,
          cleanWord: cleanSentence,
          context: sentence,
        });
      }
    });

    return wordsWithContext;
  };

  const stop = () => {
    window.speechSynthesis.cancel();
    setIsPlaying(false);
  };

  const readSelectedText = () => {
    if (isPlaying) {
      stop();
      setIsPlaying(false);
      return;
    }

    const textToRead = selectedText || extractAllTextFromPage();
    if (!textToRead) {
      toast({
        title: "No text found",
        description: "Could not find any text to read on this page.",
        variant: "destructive",
      });
      return;
    }

    try {
      if (!window.speechSynthesis) {
        throw new Error("Text-to-speech is not supported in this browser");
      }

      setIsPlaying(true);
      window.speechSynthesis.cancel();

      // Clean and split the text
      const words = textToRead
        .replace(/[^\w\s.,!?-]/g, ' ')
        .split(/\s+/)
        .filter(word => word.length > 0);

      if (words.length === 0) {
        throw new Error("No readable text found");
      }

      let currentIndex = 0;
      let isSpeaking = true;

      const readNextWord = () => {
        if (!isSpeaking || currentIndex >= words.length) {
          setIsPlaying(false);
          return;
        }

        try {
          // Ensure speech synthesis is available
          if (!window.speechSynthesis) {
            throw new Error("Speech synthesis not available");
          }

          // Cancel any ongoing speech
          window.speechSynthesis.cancel();

          // Process larger chunks for smoother reading
          const chunk = words.slice(currentIndex, currentIndex + 20).join(" ");
          const utterance = new SpeechSynthesisUtterance(chunk);
          utterance.rate = speechRate;
          utterance.pitch = 1;
          utterance.volume = 1;

          // Wait for voices to load if needed
          const voices = window.speechSynthesis.getVoices();
          if (voices.length > 0) {
            utterance.voice = voices[0];
          }

          utterance.onend = () => {
            if (isSpeaking) {
              currentIndex += 20;
              if (currentIndex < words.length) {
                readNextWord(); // Remove delay between chunks
              } else {
                setIsPlaying(false);
                isSpeaking = false;
              }
            }
          };

          utterance.onerror = (event) => {
            console.error('Speech synthesis error:', event);
            // Try to recover by moving to next chunk
            currentIndex += 5;
            if (currentIndex < words.length) {
              setTimeout(readNextWord, 500); // Longer delay after error
            } else {
              isSpeaking = false;
              setIsPlaying(false);
              toast({
                title: "Warning",
                description: "Some text could not be read. Please try again with a smaller selection.",
                variant: "destructive",
              });
            }
          };

          window.speechSynthesis.speak(utterance);
        } catch (error) {
          console.error('Speech synthesis error:', error);
          isSpeaking = false;
          setIsPlaying(false);
          toast({
            title: "Error",
            description: error instanceof Error ? error.message : "Failed to process text. Please try again.",
            variant: "destructive",
          });
        }
      };

      readNextWord();
    } catch (error) {
      console.error('Text-to-speech initialization error:', error);
      setIsPlaying(false);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to initialize text-to-speech",
        variant: "destructive",
      });
    }
  };

  const readCurrentPage = () => {
    const wordsWithContext = getPageWordsWithContext();

    if (wordsWithContext.length > 0) {
      let currentIndex = 0;

      const speakNextSentence = () => {
        if (currentIndex < wordsWithContext.length) {
          const { word, cleanWord } = wordsWithContext[currentIndex];

          const formattedText = cleanWord
            .replace(/[^\w\s.,!?-]/g, ' ')
            .replace(/\s+/g, ' ')
            .replace(/([A-Z])/g, (match) => ` ${match.toLowerCase()}`)
            .replace(/(\d+)/g, (match) => match.split('').join(' '))
            .trim();

          const highlightSuccess = highlightTextInPdf(cleanWord, true);

          const formattedForSpeech = formattedText
            .replace(/[^\w\s.,!?-]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();

          const textWithPauses = formattedForSpeech
            .replace(/([.!?])\s+/g, '$1... ')
            .replace(/,\s+/g, ', ');

          speak(textWithPauses, {
            rate: speechRate,
            pitch: 1,
            volume: 1,
            onEnd: () => {
              setTimeout(() => {
                currentIndex++;
                speakNextSentence();
              }, 500);
            },
          });
        } else {
          if (pageNumber < (numPages || 1)) {
            setTimeout(() => {
              goToNextPage();
              setTimeout(readCurrentPage, 500);
            }, 200);
          } else {
            toast({
              title: "Finished reading",
              description: "Completed reading the entire document",
            });
          }
        }
      };

      speakNextSentence();
    } else {
      if (pageNumber < (numPages || 1)) {
        goToNextPage();
        setTimeout(readCurrentPage, 500);
      } else {
        toast({
          title: "No text found",
          description: "Could not extract text from the document.",
          variant: "destructive",
        });
      }
    }
  };

  const handleSpeechRecognition = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening((text) => {
        setSearchText(text);
        if (text.trim()) {
          // Keep punctuation for better sentence matching
          const cleanText = text.trim().replace(/[^a-zA-Z0-9\s.,!?]/g, "");

          toast({
            title: "Voice search started",
            description: `Looking for: "${cleanText}"`,
          });

          // First try exact match
          let found = highlightTextInPdf(cleanText, false);

          // If no exact match and text has multiple words, try finding the longest matching phrase
          if (!found && cleanText.split(/\s+/).length > 1) {
            const words = cleanText.split(/\s+/);
            
            // Try finding complete sentences first
            const sentences = cleanText.split(/[.!?]+/).filter(s => s.trim());
            for (const sentence of sentences) {
              if (sentence.trim().length > 3) {
                found = highlightTextInPdf(sentence.trim(), false);
                if (found) break;
              }
            }

            // If no sentences found, try word combinations
            if (!found) {
              for (let windowSize = words.length - 1; windowSize > 0; windowSize--) {
                for (let startIdx = 0; startIdx <= words.length - windowSize; startIdx++) {
                  const phrase = words.slice(startIdx, startIdx + windowSize).join(" ");
                  if (phrase.length > 3) {
                    found = highlightTextInPdf(phrase, false);
                    if (found) {
                      toast({
                        title: "Partial match found",
                        description: `Found phrase: "${phrase}"`,
                      });
                      break;
                    }
                  }
                }
                if (found) break;
              }
            }
          }

          // If still not found, try individual words
          if (!found) {
            const words = cleanText.split(/\s+/);
            let foundWords = [];

            for (const word of words) {
              if (word.length > 2) {
                const wordFound = highlightTextInPdf(word, false);
                if (wordFound) {
                  foundWords.push(word);
                  found = true;
                }
              }
            }

            if (foundWords.length > 0) {
              toast({
                title: "Words found",
                description: `Found: ${foundWords.join(", ")}`,
              });
            } else {
              // Try fuzzy matching as last resort
              for (const word of words) {
                if (word.length > 3) {
                  const partialMatch = highlightTextInPdf(word, false, true);
                  if (partialMatch) {
                    foundWords.push(word);
                    found = true;
                  }
                }
              }

              if (foundWords.length > 0) {
                toast({
                  title: "Similar matches found",
                  description: `Found similar words to: ${foundWords.join(", ")}`,
                });
              } else {
                toast({
                  title: "No matches found",
                  description: "Try speaking more clearly or using different words",
                  variant: "destructive",
                });
              }
            }
          }
        }
      });
    }
  };

  const highlightTextInPdf = (
    searchText: string,
    isSpeechReading = false,
    forcePartialMatch = false,
  ): boolean => {
    if (!searchText.trim() || !containerRef.current) return false;

    const previousHighlights = containerRef.current.querySelectorAll(".search-highlight");
    previousHighlights.forEach((el) => {
      const parent = el.parentNode;
      if (parent) {
        const text = el.textContent || "";
        const textNode = document.createTextNode(text);
        parent.replaceChild(textNode, el);
      }
    });

    const textLayer = containerRef.current.querySelector(".react-pdf__Page__textContent");
    if (!textLayer) return false;

    const spans = textLayer.querySelectorAll("span");
    const searchTermLower = searchText.toLowerCase();

    let matchFound = false;

    if (isSpeechReading) {
      spans.forEach((span) => {
        const text = span.textContent || "";
        const wordRegex = new RegExp(`\\b${searchText.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");

        if (wordRegex.test(text)) {
          matchFound = true;
          const parts = text.split(new RegExp(`(\\b${searchText.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b)`, "i"));
          span.textContent = "";

          parts.forEach((part) => {
            if (wordRegex.test(part)) {
              const highlight = document.createElement("span");
              highlight.textContent = part;
              highlight.className = "search-highlight";
              setTimeout(() => {
                highlight.scrollIntoView({ behavior: "smooth", block: "center" });
              }, 50);
              span.appendChild(highlight);
            } else if (part) {
              span.appendChild(document.createTextNode(part));
            }
          });
        }
      });
    } else {
      spans.forEach((span) => {
        const text = span.textContent || "";
        let isMatch = false;
        let matchRegex: RegExp | null = null;

        if (forcePartialMatch) {
          isMatch = text.toLowerCase().includes(searchTermLower.substring(0, Math.ceil(searchTermLower.length * 0.7)));
          if (isMatch) {
            const escapedSearchTerm = searchText.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
            matchRegex = new RegExp(`(${escapedSearchTerm.substring(0, Math.ceil(escapedSearchTerm.length * 0.7))})`, "i");
          }
        } else {
          isMatch = text.toLowerCase().includes(searchTermLower);
          matchRegex = new RegExp(`(${searchText.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "i");
        }

        if (isMatch && matchRegex) {
          matchFound = true;
          const parts = text.split(matchRegex);
          span.textContent = "";

          parts.forEach((part) => {
            if (matchRegex && matchRegex.test(part)) {
              const highlight = document.createElement("span");
              highlight.textContent = part;
              highlight.className = "search-highlight";
              setTimeout(() => {
                highlight.scrollIntoView({ behavior: "smooth", block: "center" });
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
        setHighlightedMatches((prev) => [...prev, searchText]);
        toast({
          title: "Match found",
          description: `Highlighted "${searchText}" in document`,
        });
      }
    } else if (!isSpeechReading) {
      toast({
        title: "No match found",
        description: `Could not find "${searchText}" in current page`,
        variant: "destructive",
      });
    }

    return matchFound;
  };

  const zoomIn = () => setScale(scale + 0.2);
  const zoomOut = () => setScale(scale - 0.2 > 0.5 ? scale - 0.2 : 0.5);
  const resetZoom = () => setScale(1);

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
    if (isFullscreen) {
      document.exitFullscreen();
    } else {
      const element = document.documentElement;
      element.requestFullscreen();
    }
  };

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
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-10 w-10 mx-auto text-red-500 mb-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
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

            <div className="mt-4 bg-white rounded-lg shadow-sm p-4">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Extracted Text</h3>
              <div className="text-sm text-gray-600 whitespace-pre-wrap">
                {extractAllTextFromPage()}
              </div>
            </div>

            <div className="flex flex-col md:flex-row items-center gap-3 mt-4 bg-white rounded-lg shadow-sm p-4 pdf-controls">
              <div className="flex space-x-2 w-full md:w-auto justify-center">
                <Button onClick={goToPrevPage} disabled={pageNumber <= 1} variant="outline" size="sm">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                  </svg>
                </Button>
                <div className="text-sm font-medium flex items-center">
                  Page {pageNumber} of {numPages}
                </div>
                <Button onClick={goToNextPage} disabled={pageNumber >= (numPages || 1)} variant="outline" size="sm">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                  </svg>
                </Button>
              </div>

              <div className="flex space-x-2 w-full md:w-auto justify-center">
                <Button onClick={zoomOut} variant="outline" size="sm" title="Zoom out">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10H7" />
                  </svg>
                </Button>
                <Button onClick={resetZoom} variant="outline" size="sm" title="Reset zoom">
                  <span className="text-xs font-medium">{Math.round(scale * 100)}%</span>
                </Button>
                <Button onClick={toggleFullscreen} variant="outline" size="sm" title="Toggle fullscreen">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 8V4m0 0h4M4 4l5 5m11-5h-4m4 0v4m0 0l-5-5m5 17v-4m0 4h-4m4-4l-5 5M4 16v4m0 0h4m-4 0l5-5" />
                  </svg>
                </Button>
                <Button onClick={zoomIn} variant="outline" size="sm" title="Zoom in">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10H7M10 7v6" />
                  </svg>
                </Button>
              </div>

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
                            rate === speechRate ? "bg-primary text-white" : "hover:bg-gray-100"
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