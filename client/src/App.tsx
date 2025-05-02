import { Switch, Route, useLocation } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import PdfViewer from "@/pages/pdf-viewer";
import Redeem from "@/pages/redeem";
import Refer from "@/pages/refer";
import Header from "@/components/layout/header";
import Sidebar from "@/components/layout/sidebar";
import MobileNavigation from "@/components/layout/mobile-navigation";
import { useEffect } from "react";
import { useAuth } from "./lib/hooks";

function App() {
  const { handleRedirect } = useAuth();
  const [location] = useLocation();

  useEffect(() => {
    // Handle Firebase auth redirect
    handleRedirect();
  }, [handleRedirect]);

  return (
    <TooltipProvider>
      <div className="flex flex-col h-screen">
        <Header />
        <div className="flex flex-1 overflow-hidden">
          <Sidebar />
          <main className="flex-1 overflow-y-auto overflow-x-hidden bg-gray-50 pb-16 md:pb-0">
            <Switch>
              <Route path="/" component={Home} />
              <Route path="/pdf/:id" component={PdfViewer} />
              <Route path="/redeem" component={Redeem} />
              <Route path="/refer" component={Refer} />
              <Route path="/recent" component={() => <NotFound title="Recent Files" message="Recent files page is coming soon" />} />
              <Route path="/bookmarks" component={() => <NotFound title="Bookmarks" message="Bookmarks page is coming soon" />} />
              <Route path="/settings" component={() => <NotFound title="Settings" message="Settings page is coming soon" />} />
              <Route component={NotFound} />
            </Switch>
          </main>
        </div>
        {!location.startsWith("/pdf/") && <MobileNavigation />}
        <Toaster />
      </div>
    </TooltipProvider>
  );
}

export default App;
