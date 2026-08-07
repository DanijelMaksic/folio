import { authClient, useSession } from '@/lib/auth-client';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const COOLDOWN_SECONDS = 60;

export default function VerifyOtp() {
   const [code, setCode] = useState('');
   const [error, setError] = useState<string | null>(null);
   const [cooldown, setCooldown] = useState(0);
   const [sending, setSending] = useState(false);
   const navigate = useNavigate();
   const { data: session, isPending, refetch } = useSession();

   useEffect(() => {
      if (!isPending && session) navigate('/');
   }, [session, isPending]);

   const sendOtp = async () => {
      setSending(true);
      const { error } = await authClient.twoFactor.sendOtp();
      setSending(false);
      if (error) {
         setError(error.message ?? 'Failed to send code');
      } else {
         setCooldown(COOLDOWN_SECONDS);
      }
   };

   useEffect(() => {
      sendOtp();
   }, []);

   useEffect(() => {
      if (cooldown <= 0) return;
      const timer = setInterval(() => setCooldown((c) => c - 1), 1000);
      return () => clearInterval(timer);
   }, [cooldown]);

   const handleSubmit = async (e: React.SubmitEvent<HTMLFormElement>) => {
      e.preventDefault();
      const { error } = await authClient.twoFactor.verifyOtp({ code });
      if (error) {
         setError(error.message ?? 'Invalid code');
      } else {
         await refetch();
         navigate('/');
      }
   };

   return (
      <div className="min-h-screen flex items-center justify-center">
         <Card className="w-full max-w-sm shadow-2xl">
            <CardHeader>
               <CardTitle className="text-2xl">Check your email</CardTitle>
            </CardHeader>
            <CardContent>
               <form onSubmit={handleSubmit} className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                     We sent a 6-digit code to your email address.
                  </p>
                  <Input
                     type="text"
                     inputMode="numeric"
                     maxLength={6}
                     placeholder="000000"
                     value={code}
                     onChange={(e) => setCode(e.target.value)}
                     required
                  />
                  {error && <p className="text-sm text-destructive">{error}</p>}
                  <Button type="submit" className="w-full">
                     Verify
                  </Button>
                  <Button
                     type="button"
                     variant="outline"
                     className="w-full"
                     onClick={sendOtp}
                     disabled={cooldown > 0 || sending}
                  >
                     {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend code'}
                  </Button>
               </form>
            </CardContent>
         </Card>
      </div>
   );
}
