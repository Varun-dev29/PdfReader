import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle, Construction } from "lucide-react";

interface NotFoundProps {
  title?: string;
  message?: string;
  // Add route params from wouter
  params?: any;
}

export default function NotFound({ 
  title = "404 Page Not Found", 
  message = "Did you forget to add the page to the router?" 
}: NotFoundProps) {
  const isComingSoon = message.includes("coming soon");
  
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md mx-4">
        <CardContent className="pt-6">
          <div className="flex mb-4 gap-2">
            {isComingSoon ? (
              <Construction className="h-8 w-8 text-amber-500" />
            ) : (
              <AlertCircle className="h-8 w-8 text-red-500" />
            )}
            <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
          </div>

          <p className="mt-4 text-sm text-gray-600">
            {message}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
