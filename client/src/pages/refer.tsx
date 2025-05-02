import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/hooks';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

interface Referral {
  id: number;
  code: string;
  referrerId: string;
  refereeId: string;
  status: 'pending' | 'completed';
  createdAt: string;
  completedAt?: string;
}

export default function ReferPage() {
  const { isAuthenticated, user } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  
  const [referralCode, setReferralCode] = useState('');
  const [referralLink, setReferralLink] = useState('');
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [loading, setLoading] = useState(true);
  const [copyText, setCopyText] = useState('Copy');
  
  // Load user's referral code and referral history
  useEffect(() => {
    if (isAuthenticated && user) {
      // Generate a referral code based on user's display name if not already generated
      const generateCode = () => {
        if (user.displayName) {
          const namePrefix = user.displayName.replace(/[^a-zA-Z0-9]/g, "").substring(0, 4).toUpperCase();
          const randomSuffix = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
          return `${namePrefix}${randomSuffix}`;
        }
        
        // Fallback if no display name
        return `USER${Math.floor(10000 + Math.random() * 90000)}`;
      };
      
      const loadReferralInfo = async () => {
        try {
          setLoading(true);
          
          // Fetch user's referral code
          const userResponse = await fetch(`/api/users/${user.uid}`);
          if (userResponse.ok) {
            const userData = await userResponse.json();
            if (userData.referralCode) {
              setReferralCode(userData.referralCode);
            } else {
              // If user doesn't have a referral code, generate one
              const code = generateCode();
              setReferralCode(code);
              
              // Save the generated code to the server
              await fetch(`/api/users/${user.uid}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ referralCode: code }),
              });
            }
          }
          
          // Generate referral link
          const baseUrl = window.location.origin;
          setReferralLink(`${baseUrl}/?ref=${referralCode}`);
          
          // Fetch user's referrals
          const referralsResponse = await fetch(`/api/users/${user.uid}/referrals`);
          if (referralsResponse.ok) {
            const referralsData = await referralsResponse.json();
            setReferrals(referralsData);
          }
        } catch (error) {
          console.error('Error loading referral information:', error);
        } finally {
          setLoading(false);
        }
      };
      
      loadReferralInfo();
    }
  }, [isAuthenticated, user, referralCode]);
  
  const handleCopyLink = () => {
    if (navigator.clipboard && referralLink) {
      navigator.clipboard.writeText(referralLink)
        .then(() => {
          setCopyText('Copied!');
          toast({
            title: "Copied to clipboard",
            description: "Referral link copied to clipboard",
          });
          
          setTimeout(() => {
            setCopyText('Copy');
          }, 2000);
        })
        .catch((error) => {
          console.error('Error copying to clipboard:', error);
          toast({
            title: "Failed to copy",
            description: "Could not copy to clipboard",
            variant: "destructive",
          });
        });
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
  
  // Calculate total earnings
  const completedReferrals = referrals.filter(r => r.status === 'completed').length;
  const totalEarnings = completedReferrals * 50; // ₹50 per completed referral
  
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Refer & Earn</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Share Your Referral Link</CardTitle>
              <CardDescription>
                Invite friends to use the PDF Reader app and earn ₹50 for each friend who uses the app for at least 4 days
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <h3 className="text-sm font-medium text-gray-700 mb-2">Your referral code</h3>
                <div className="bg-gray-50 p-3 rounded-lg text-center">
                  <span className="text-lg font-bold tracking-wider">{isAuthenticated ? (loading ? 'Loading...' : referralCode) : 'Login to get your code'}</span>
                </div>
              </div>
              
              <div className="mb-4">
                <h3 className="text-sm font-medium text-gray-700 mb-2">Your referral link</h3>
                <div className="flex">
                  <Input
                    value={isAuthenticated ? (loading ? 'Loading...' : referralLink) : 'Login to get your referral link'}
                    readOnly
                    className="rounded-r-none"
                  />
                  <Button 
                    onClick={handleCopyLink}
                    disabled={!isAuthenticated || loading}
                    className="rounded-l-none"
                  >
                    {copyText}
                  </Button>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex-col items-start">
              <h3 className="text-sm font-medium text-gray-700 mb-2">How it works</h3>
              <ol className="text-sm text-gray-600 list-decimal pl-5 space-y-2">
                <li>Share your referral link with friends</li>
                <li>Your friend signs up using your referral link</li>
                <li>Your friend uses the app for at least 4 days</li>
                <li>You earn ₹50 in your wallet</li>
              </ol>
            </CardFooter>
          </Card>
          
          <div className="mt-6">
            <h2 className="text-xl font-bold mb-4">Your Referrals</h2>
            
            {loading ? (
              <div className="bg-white p-8 rounded-lg shadow text-center">
                <p>Loading referrals...</p>
              </div>
            ) : referrals.length === 0 ? (
              <div className="bg-white p-8 rounded-lg shadow text-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
                <h3 className="text-lg font-medium text-gray-900">No referrals yet</h3>
                <p className="mt-2 text-sm text-gray-500">
                  Start sharing your referral link with friends to earn rewards
                </p>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <table className="min-w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Referred User
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Reward
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {referrals.map((referral) => (
                      <tr key={referral.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatDate(referral.createdAt)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {/* In a real app, you'd fetch the user's name */}
                          User#{referral.refereeId.substring(0, 6)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                            ${referral.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                            {referral.status === 'completed' ? 'Completed' : 'Pending'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          {referral.status === 'completed' ? '₹50' : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
        
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Your Earnings</CardTitle>
              <CardDescription>
                Track your total referral earnings
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-4">
                <span className="text-3xl font-bold text-primary">₹{totalEarnings}</span>
                <p className="text-sm text-gray-500 mt-1">Total earnings</p>
              </div>
              
              <div className="bg-gray-50 rounded-lg p-4 mt-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium">Total Referrals</span>
                  <span className="font-bold">{referrals.length}</span>
                </div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium">Completed</span>
                  <span className="font-bold text-green-600">{completedReferrals}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Pending</span>
                  <span className="font-bold text-yellow-600">{referrals.length - completedReferrals}</span>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button 
                onClick={() => navigate('/redeem')} 
                className="w-full"
                disabled={totalEarnings === 0}
              >
                Redeem Earnings
              </Button>
            </CardFooter>
          </Card>
          
          <div className="bg-white rounded-lg shadow p-6 mt-6">
            <h3 className="font-medium mb-3">Referral Program Rules</h3>
            <ul className="text-sm text-gray-600 space-y-2">
              <li className="flex items-start">
                <span className="text-green-500 mr-2">•</span>
                Earn ₹50 for each successful referral
              </li>
              <li className="flex items-start">
                <span className="text-green-500 mr-2">•</span>
                Your friend must use the app for at least 4 days
              </li>
              <li className="flex items-start">
                <span className="text-green-500 mr-2">•</span>
                Earnings are added to your credits
              </li>
              <li className="flex items-start">
                <span className="text-green-500 mr-2">•</span>
                Redeem credits for real money via UPI
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}