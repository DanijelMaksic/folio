import { authClient, useSession } from '@/lib/auth-client';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const COOLDOWN_SECONDS = 60;

export default function VerifyOtp() {
   const [code, setCode] = useState('');
   const [error, setError] = useState<string | null>(null);
   const [cooldown, setCooldown] = useState(0);
   const [sending, setSending] = useState(false);
   const navigate = useNavigate();
   const { data: session, isPending } = useSession();

   useEffect(() => {
      if (!isPending && session) {
         navigate('/');
      }
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

   // Send OTP on mount
   useEffect(() => {
      sendOtp();
   }, []);

   // Cooldown timer
   useEffect(() => {
      if (cooldown <= 0) return;
      const timer = setInterval(() => {
         setCooldown((c) => c - 1);
      }, 1000);
      return () => clearInterval(timer);
   }, [cooldown]);

   const handleSubmit = async (e: React.SubmitEvent<HTMLFormElement>) => {
      e.preventDefault();
      const { error } = await authClient.twoFactor.verifyOtp({ code });
      if (error) {
         setError(error.message ?? 'Invalid code');
      } else {
         navigate('/');
      }
   };

   return (
      <form onSubmit={handleSubmit}>
         <h1>Check yout email</h1>
         <p>We sent a 6-digit code to your email address.</p>
         {error && <p style={{ color: 'red' }}>{error}</p>}
         <input
            type="text"
            inputMode="numeric"
            maxLength={6}
            placeholder="000000"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            required
         />
         <button type="submit">Verify</button>
         <button
            type="button"
            onClick={sendOtp}
            disabled={cooldown > 0 || sending}
         >
            {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend code'}
         </button>
      </form>
   );
}
