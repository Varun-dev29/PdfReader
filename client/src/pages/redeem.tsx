import React, { useState, useEffect } from 'react';
import { useAuth, useCredits } from '@/lib/hooks';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface RedemptionRequest {
  id: number;
  userId: string;
  upiId: string;
  creditAmount: number;
  status: 'pending' | 'completed' | 'rejected';
  createdAt: string;
  completedAt?: string;
}

export default function RedeemPage() {
  const { isAuthenticated, user } = useAuth();
  const { credits, redeemCredits } = useCredits();
  const { toast } = useToast();
  
  const [upiId, setUpiId] = useState('');
  const [amount, setAmount] = useState(500);
  const [submitting, setSubmitting] = useState(false);
  const [redemptionHistory, setRedemptionHistory] = useState<RedemptionRequest[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Load redemption history
  useEffect(() => {
    if (isAuthenticated && user) {
      const loadRedemptionHistory = async () => {
        try {
          setLoading(true);
          const response = await fetch(`/api/users/${user.uid}/redemptions`);
          if (response.ok) {
            const data = await response.json();
            setRedemptionHistory(data);
          }
        } catch (error) {
          console.error('Error loading redemption history:', error);
        } finally {
          setLoading(false);
        }
      };
      
      loadRedemptionHistory();
    }
  }, [isAuthenticated, user]);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isAuthenticated) {
      toast({
        title: "Login Required",
        description: "Please login to redeem your credits",
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
    
    if (amount < 500) {
      toast({
        title: "Minimum Redemption",
        description: "Minimum redemption amount is 500 credits (₹50)",
        variant: "destructive",
      });
      return;
    }
    
    if (credits < amount) {
      toast({
        title: "Insufficient Credits",
        description: `You have ${credits} credits, but redemption requires ${amount} credits`,
        variant: "destructive",
      });
      return;
    }
    
    try {
      setSubmitting(true);
      const success = await redeemCredits(upiId, amount);
      
      if (success) {
        toast({
          title: "Redemption Successful",
          description: `Your redemption request for ₹${amount / 10} has been submitted successfully`,
        });
        
        // Add the new redemption to history
        setRedemptionHistory(prev => [{
          id: Date.now(),
          userId: user!.uid,
          upiId,
          creditAmount: amount,
          status: 'pending',
          createdAt: new Date().toISOString(),
        }, ...prev]);
        
        // Reset form
        setUpiId('');
        setAmount(500);
      }
    } catch (error) {
      toast({
        title: "Redemption Failed",
        description: "Something went wrong. Please try again later.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(date);
  };
  
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Redeem Credits</h1>
      
      <Tabs defaultValue="redeem">
        <TabsList className="mb-6">
          <TabsTrigger value="redeem">Redeem</TabsTrigger>
          <TabsTrigger value="history">Redemption History</TabsTrigger>
        </TabsList>
        
        <TabsContent value="redeem">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="col-span-2">
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-medium mb-4">Redeem Your Credits</h2>
                
                <form onSubmit={handleSubmit}>
                  <div className="mb-4">
                    <Label htmlFor="upiId">UPI ID</Label>
                    <Input
                      id="upiId"
                      placeholder="example@upi"
                      value={upiId}
                      onChange={(e) => setUpiId(e.target.value)}
                      required
                    />
                    <p className="text-xs text-gray-500 mt-1">Enter your UPI ID to receive payment</p>
                  </div>
                  
                  <div className="mb-6">
                    <Label htmlFor="amount">Amount (in credits)</Label>
                    <Input
                      id="amount"
                      type="number"
                      min={500}
                      step={100}
                      value={amount}
                      onChange={(e) => setAmount(parseInt(e.target.value))}
                      required
                    />
                    <p className="text-xs text-gray-500 mt-1">Minimum redemption: 500 credits (₹50)</p>
                    <p className="text-sm font-medium text-primary mt-2">
                      You will receive: ₹{(amount / 10).toFixed(2)}
                    </p>
                  </div>
                  
                  <Button
                    type="submit"
                    disabled={submitting || credits < amount || !isAuthenticated}
                    className="w-full"
                  >
                    {submitting ? 'Processing...' : 'Redeem Now'}
                  </Button>
                  
                  {!isAuthenticated && (
                    <p className="text-xs text-red-500 mt-2">
                      Please login to redeem your credits
                    </p>
                  )}
                </form>
              </div>
            </div>
            
            <div>
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-medium mb-4">Your Balance</h2>
                
                <div className="bg-gray-50 rounded-lg p-4 mb-4">
                  <div className="flex items-center space-x-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-2xl font-bold">{credits}</span>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">Available credits</p>
                </div>
                
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-medium mb-2">Redemption Rules</h3>
                  <ul className="text-sm text-gray-600 space-y-2">
                    <li className="flex items-start">
                      <span className="text-green-500 mr-2">•</span>
                      Minimum redemption: 500 credits (₹50)
                    </li>
                    <li className="flex items-start">
                      <span className="text-green-500 mr-2">•</span>
                      10 credits = ₹1
                    </li>
                    <li className="flex items-start">
                      <span className="text-green-500 mr-2">•</span>
                      Processing time: 1-3 business days
                    </li>
                    <li className="flex items-start">
                      <span className="text-green-500 mr-2">•</span>
                      Payment sent to your UPI ID
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="history">
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    UPI ID
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {redemptionHistory.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-4 text-center text-sm text-gray-500">
                      No redemption history found
                    </td>
                  </tr>
                ) : (
                  redemptionHistory.map((redemption) => (
                    <tr key={redemption.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDate(redemption.createdAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {redemption.upiId}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        {redemption.creditAmount} credits (₹{redemption.creditAmount / 10})
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                          ${redemption.status === 'completed' ? 'bg-green-100 text-green-800' : 
                            redemption.status === 'rejected' ? 'bg-red-100 text-red-800' : 
                            'bg-yellow-100 text-yellow-800'}`}>
                          {redemption.status.charAt(0).toUpperCase() + redemption.status.slice(1)}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}