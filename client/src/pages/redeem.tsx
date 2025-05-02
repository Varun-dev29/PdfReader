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
import { useAuth, useCredits } from "@/lib/hooks";
import { useToast } from "@/hooks/use-toast";
import { db, collection, query, where, getDocs, orderBy } from "@/lib/firebase";
import { RedemptionRequest } from "@/lib/types";

export default function Redeem() {
  const { user, isAuthenticated } = useAuth();
  const { credits, redeemCredits } = useCredits();
  const [upiId, setUpiId] = useState("");
  const [creditAmount, setCreditAmount] = useState(100);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [redemptionHistory, setRedemptionHistory] = useState<RedemptionRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [, navigate] = useLocation();
  const { toast } = useToast();

  // Redirect if not logged in
  useEffect(() => {
    if (!isAuthenticated) {
      toast({
        title: "Login Required",
        description: "Please login to redeem credits",
        variant: "destructive",
      });
      navigate("/");
    }
  }, [isAuthenticated, navigate, toast]);

  // Load redemption history
  useEffect(() => {
    const loadRedemptionHistory = async () => {
      if (!user) return;

      setIsLoading(true);
      try {
        const requestsRef = collection(db, "redemptionRequests");
        const q = query(
          requestsRef,
          where("userId", "==", user.uid),
          orderBy("createdAt", "desc")
        );
        const querySnapshot = await getDocs(q);

        const requests: RedemptionRequest[] = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          requests.push({
            id: doc.id,
            userId: data.userId,
            upiId: data.upiId,
            amount: data.amount,
            credits: data.credits,
            status: data.status,
            createdAt: data.createdAt?.toDate() || new Date(),
            updatedAt: data.updatedAt?.toDate(),
          });
        });

        setRedemptionHistory(requests);
      } catch (error) {
        console.error("Error loading redemption history:", error);
        toast({
          title: "Error",
          description: "Failed to load redemption history",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    if (isAuthenticated && user) {
      loadRedemptionHistory();
    }
  }, [isAuthenticated, user, toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isAuthenticated) {
      toast({
        title: "Login Required",
        description: "Please login to redeem credits",
        variant: "destructive",
      });
      return;
    }

    if (!upiId) {
      toast({
        title: "UPI ID Required",
        description: "Please enter a valid UPI ID",
        variant: "destructive",
      });
      return;
    }

    if (creditAmount < 100) {
      toast({
        title: "Invalid Amount",
        description: "Minimum redemption is 100 credits (₹50)",
        variant: "destructive",
      });
      return;
    }

    if (credits < creditAmount) {
      toast({
        title: "Insufficient Credits",
        description: `You need ${creditAmount} credits, but you only have ${credits}`,
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const success = await redeemCredits(upiId, creditAmount);
      if (success) {
        toast({
          title: "Redemption Successful",
          description: `Your redemption request for ₹${creditAmount / 2} has been submitted`,
        });
        
        // Reload redemption history
        const requestsRef = collection(db, "redemptionRequests");
        const q = query(
          requestsRef,
          where("userId", "==", user!.uid),
          orderBy("createdAt", "desc")
        );
        const querySnapshot = await getDocs(q);

        const requests: RedemptionRequest[] = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          requests.push({
            id: doc.id,
            userId: data.userId,
            upiId: data.upiId,
            amount: data.amount,
            credits: data.credits,
            status: data.status,
            createdAt: data.createdAt?.toDate() || new Date(),
            updatedAt: data.updatedAt?.toDate(),
          });
        });

        setRedemptionHistory(requests);
        setUpiId("");
        setCreditAmount(100);
      } else {
        toast({
          title: "Redemption Failed",
          description: "Please try again later",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error redeeming credits:", error);
      toast({
        title: "Redemption Failed",
        description: "An error occurred while processing your request",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(date);
  };

  if (!isAuthenticated) {
    return null;
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
          <h2 className="text-xl font-bold text-gray-900">Redeem Credits</h2>
        </div>

        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6 text-yellow-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <h3 className="ml-2 text-lg font-semibold">Your Credits</h3>
              </div>
              <span className="text-2xl font-bold text-gray-900">{credits}</span>
            </div>

            <div className="border-t border-gray-200 pt-4 pb-2">
              <p className="text-sm text-gray-600 mb-4">
                You can redeem your credits for money. 100 credits = ₹50. Enter
                your UPI ID below to receive payment.
              </p>

              <form className="space-y-4" onSubmit={handleSubmit}>
                <div>
                  <label
                    htmlFor="upiId"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    UPI ID
                  </label>
                  <Input
                    type="text"
                    id="upiId"
                    name="upiId"
                    placeholder="yourname@upi"
                    value={upiId}
                    onChange={(e) => setUpiId(e.target.value)}
                    className="w-full"
                  />
                </div>

                <div>
                  <label
                    htmlFor="creditAmount"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Credits to Redeem
                  </label>
                  <div className="flex items-center">
                    <Input
                      type="number"
                      id="creditAmount"
                      name="creditAmount"
                      value={creditAmount}
                      min="100"
                      step="100"
                      onChange={(e) => setCreditAmount(parseInt(e.target.value))}
                      className="w-full"
                    />
                    <span className="ml-2 text-sm text-gray-500">
                      = ₹{creditAmount / 2}
                    </span>
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={isSubmitting || credits < creditAmount}
                >
                  {isSubmitting ? (
                    <div className="flex items-center">
                      <svg
                        className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      Processing...
                    </div>
                  ) : (
                    "Redeem Now"
                  )}
                </Button>
              </form>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Redemption History</CardTitle>
            <CardDescription>
              Track the status of your previous redemption requests
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-4">
                <svg
                  className="animate-spin h-6 w-6 mx-auto text-primary"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                <p className="mt-2 text-sm text-gray-500">Loading history...</p>
              </div>
            ) : redemptionHistory.length === 0 ? (
              <div className="text-center py-4">
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
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                <p className="text-gray-500">
                  No redemption history yet. Redeem your credits to see
                  transactions here.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Credits</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>UPI ID</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {redemptionHistory.map((request) => (
                      <TableRow key={request.id}>
                        <TableCell>{formatDate(request.createdAt)}</TableCell>
                        <TableCell>{request.credits}</TableCell>
                        <TableCell>₹{request.amount}</TableCell>
                        <TableCell>{request.upiId}</TableCell>
                        <TableCell>
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              request.status === "Paid"
                                ? "bg-green-100 text-green-800"
                                : request.status === "Failed"
                                ? "bg-red-100 text-red-800"
                                : "bg-yellow-100 text-yellow-800"
                            }`}
                          >
                            {request.status}
                          </span>
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
