import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/lib/hooks";
import { useToast } from "@/hooks/use-toast";
import { db, doc, getDoc, collection, query, where, getDocs, orderBy } from "@/lib/firebase";
import { Referral } from "@/lib/types";

export default function Refer() {
  const { user, isAuthenticated } = useAuth();
  const [referralCode, setReferralCode] = useState<string>("");
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCopied, setIsCopied] = useState(false);
  const [, navigate] = useLocation();
  const { toast } = useToast();

  // Load referral data
  useEffect(() => {
    const loadReferralData = async () => {
      if (!isAuthenticated || !user) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        // Get user's referral code
        const userRef = doc(db, "users", user.uid);
        const userDoc = await getDoc(userRef);
        
        if (userDoc.exists()) {
          setReferralCode(userDoc.data().referralCode || "");
        }

        // Get referrals
        const referralsRef = collection(db, "referrals");
        const q = query(
          referralsRef,
          where("referrerId", "==", user.uid),
          orderBy("createdAt", "desc")
        );
        const querySnapshot = await getDocs(q);

        const referralsList: Referral[] = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          referralsList.push({
            id: doc.id,
            referrerId: data.referrerId,
            refereeId: data.refereeId,
            refereeEmail: data.refereeEmail,
            refereeDisplayName: data.refereeDisplayName,
            createdAt: data.createdAt?.toDate() || new Date(),
            daysUsed: data.daysUsed || 0,
            completed: data.daysUsed >= 4,
            rewarded: data.rewarded || false,
          });
        });

        setReferrals(referralsList);
      } catch (error) {
        console.error("Error loading referral data:", error);
        toast({
          title: "Error",
          description: "Failed to load referral data",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadReferralData();
  }, [isAuthenticated, user, toast]);

  const copyToClipboard = () => {
    if (!referralCode) return;
    
    navigator.clipboard.writeText(referralCode).then(
      () => {
        setIsCopied(true);
        toast({
          title: "Copied to clipboard",
          description: "Share this code with your friends!",
        });
        
        // Reset copied state after 2 seconds
        setTimeout(() => setIsCopied(false), 2000);
      },
      (err) => {
        console.error("Could not copy text: ", err);
        toast({
          title: "Failed to copy",
          description: "Please try again",
          variant: "destructive",
        });
      }
    );
  };

  const shareViaWhatsApp = () => {
    const text = `Hey, check out this amazing PDF Reader app! Use my referral code ${referralCode} when you sign up. Use the app for 4 days and we both get ₹50! https://pdf-reader.app`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  };

  const shareViaTwitter = () => {
    const text = `I'm using this great PDF Reader app! Use my referral code ${referralCode} when you sign up. Use the app for 4 days and we both get ₹50! #PDFReader`;
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`, "_blank");
  };

  const shareViaFacebook = () => {
    const url = "https://pdf-reader.app";
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, "_blank");
  };

  const shareViaEmail = () => {
    const subject = "Check out this amazing PDF Reader app!";
    const body = `Hey,\n\nI've been using this great PDF Reader app and thought you might find it useful too.\n\nUse my referral code ${referralCode} when you sign up. If you use the app for 4 days, we both get ₹50!\n\nDownload it here: https://pdf-reader.app\n\nEnjoy!`;
    window.open(`mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`, "_blank");
  };

  if (!isAuthenticated) {
    return (
      <div className="p-4 md:p-6">
        <div className="max-w-3xl mx-auto">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-8">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-primary mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
                <h2 className="text-xl font-bold mb-2">Login to Access Referral Program</h2>
                <p className="text-gray-600 mb-4">Sign in to get your unique referral code and start earning rewards!</p>
                <Button onClick={() => navigate("/")}>
                  Go to Login
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center mb-6">
          <button
            className="p-2 rounded-full hover:bg-gray-100 mr-2"
            onClick={() => navigate("/")}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 text-gray-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
          </button>
          <h2 className="text-xl font-bold text-gray-900">Refer & Earn</h2>
        </div>

        <div className="bg-gradient-to-r from-primary/10 to-secondary/10 rounded-lg p-6 mb-6">
          <div className="md:flex items-center">
            <div className="md:flex-1">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Share with friends, earn rewards!
              </h3>
              <p className="text-gray-700 mb-4">
                Invite friends to use our PDF Reader. When they use the app for 4
                days, you'll earn ₹50.
              </p>

              {isLoading ? (
                <div className="flex items-center mb-4">
                  <div className="w-full h-10 bg-gray-200 animate-pulse rounded"></div>
                </div>
              ) : (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Your Unique Referral Code
                  </label>
                  <div className="flex">
                    <Input
                      type="text"
                      value={referralCode}
                      readOnly
                      className="flex-1 px-3 py-2 bg-white border border-gray-300 rounded-l-md text-gray-700 font-medium"
                    />
                    <Button
                      onClick={copyToClipboard}
                      className="bg-primary text-white px-4 py-2 rounded-r-md hover:bg-primary/90"
                    >
                      {isCopied ? "Copied!" : "Copy"}
                    </Button>
                  </div>
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={shareViaWhatsApp}
                  className="inline-flex items-center px-4 py-2 bg-[#25D366] text-white rounded-md hover:bg-opacity-90"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5 mr-1"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
                  </svg>
                  WhatsApp
                </Button>
                <Button
                  onClick={shareViaTwitter}
                  className="inline-flex items-center px-4 py-2 bg-[#1DA1F2] text-white rounded-md hover:bg-opacity-90"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5 mr-1"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z" />
                  </svg>
                  Twitter
                </Button>
                <Button
                  onClick={shareViaFacebook}
                  className="inline-flex items-center px-4 py-2 bg-[#4267B2] text-white rounded-md hover:bg-opacity-90"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5 mr-1"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M9 8h-3v4h3v12h5v-12h3.642l.358-4h-4v-1.667c0-.955.192-1.333 1.115-1.333h2.885v-5h-3.808c-3.596 0-5.192 1.583-5.192 4.615v3.385z" />
                  </svg>
                  Facebook
                </Button>
                <Button
                  onClick={shareViaEmail}
                  className="inline-flex items-center px-4 py-2 bg-gray-800 text-white rounded-md hover:bg-opacity-90"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5 mr-1"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                    />
                  </svg>
                  Email
                </Button>
              </div>
            </div>
            <div className="hidden md:block md:w-1/3 mt-6 md:mt-0 md:ml-4">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-48 w-48 text-primary/40"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="1"
                  d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122"
                />
              </svg>
            </div>
          </div>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>How It Works</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="flex">
                <div className="flex-shrink-0 h-10 w-10 rounded-full bg-primary flex items-center justify-center text-white font-bold">
                  1
                </div>
                <div className="ml-4">
                  <h4 className="text-base font-medium text-gray-900">
                    Share your unique code
                  </h4>
                  <p className="mt-1 text-sm text-gray-500">
                    Send your referral code to friends through WhatsApp, email,
                    or social media.
                  </p>
                </div>
              </div>

              <div className="flex">
                <div className="flex-shrink-0 h-10 w-10 rounded-full bg-primary flex items-center justify-center text-white font-bold">
                  2
                </div>
                <div className="ml-4">
                  <h4 className="text-base font-medium text-gray-900">
                    Friends use the app
                  </h4>
                  <p className="mt-1 text-sm text-gray-500">
                    Your friends sign up using your code and use the app for at
                    least 4 days.
                  </p>
                </div>
              </div>

              <div className="flex">
                <div className="flex-shrink-0 h-10 w-10 rounded-full bg-primary flex items-center justify-center text-white font-bold">
                  3
                </div>
                <div className="ml-4">
                  <h4 className="text-base font-medium text-gray-900">
                    You earn rewards
                  </h4>
                  <p className="mt-1 text-sm text-gray-500">
                    After your friend completes 4 days of usage, you
                    automatically earn ₹50.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Your Referrals</CardTitle>
            <CardDescription>
              Track the progress of friends you've referred
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[...Array(2)].map((_, i) => (
                  <div key={i} className="animate-pulse flex items-center">
                    <div className="h-10 w-10 rounded-full bg-gray-200"></div>
                    <div className="ml-3 flex-1">
                      <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/3"></div>
                    </div>
                    <div className="h-6 bg-gray-200 rounded w-24"></div>
                  </div>
                ))}
              </div>
            ) : referrals.length === 0 ? (
              <div className="text-center py-6">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-12 w-12 text-gray-400 mx-auto mb-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                  />
                </svg>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No referrals yet
                </h3>
                <p className="text-gray-500 max-w-sm mx-auto">
                  Share your referral code with friends to start earning rewards.
                  Each successful referral earns you ₹50!
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Joined</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Reward</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {referrals.map((referral) => (
                      <TableRow key={referral.id}>
                        <TableCell>
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-500">
                              {referral.refereeDisplayName
                                ? referral.refereeDisplayName.substring(0, 2).toUpperCase()
                                : "NA"}
                            </div>
                            <div className="ml-3">
                              <p className="text-sm font-medium text-gray-900">
                                {referral.refereeDisplayName}
                              </p>
                              <p className="text-xs text-gray-500">
                                {referral.refereeEmail}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-gray-700">
                          {new Date(referral.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              referral.completed
                                ? "bg-green-100 text-green-800"
                                : "bg-yellow-100 text-yellow-800"
                            }`}
                          >
                            {referral.completed
                              ? "Completed (4/4 days)"
                              : `In Progress (${referral.daysUsed}/4 days)`}
                          </span>
                        </TableCell>
                        <TableCell
                          className={
                            referral.rewarded
                              ? "text-sm font-medium text-green-600"
                              : "text-sm text-gray-500"
                          }
                        >
                          {referral.rewarded ? "₹50 Earned" : "Pending"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
