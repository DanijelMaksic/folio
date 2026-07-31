import { signIn } from '@/lib/auth-client';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function Login() {
   const [error, setError] = useState<string | null>(null);
   const [loading, setLoading] = useState(false);
   const navigate = useNavigate();

   const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      setLoading(true);
      setError(null);
      const form = new FormData(e.currentTarget);

      const { data, error } = await signIn.email({
         email: form.get('email') as string,
         password: form.get('password') as string,
      });

      setLoading(false);

      if (error) {
         setError(error.message ?? 'Login failed');
      } else if (data && !('twoFactorRedirect' in data)) {
         navigate('/');
      }
   };

   return (
      <div className="min-h-screen flex items-center justify-center">
         <Card className="w-full max-w-sm shadow-2xl">
            <CardHeader>
               <CardTitle className="text-2xl">Login</CardTitle>
            </CardHeader>
            <CardContent>
               <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                     <Label htmlFor="email">Email</Label>
                     <Input
                        id="email"
                        name="email"
                        type="email"
                        placeholder="you@example.com"
                        required
                     />
                  </div>
                  <div className="space-y-2">
                     <Label htmlFor="password">Password</Label>
                     <Input
                        id="password"
                        name="password"
                        type="password"
                        placeholder="••••••••"
                        required
                     />
                  </div>
                  {error && <p className="text-sm text-destructive">{error}</p>}
                  <Button type="submit" className="w-full" disabled={loading}>
                     {loading ? 'Signing in...' : 'Sign in'}
                  </Button>
               </form>
            </CardContent>
         </Card>
      </div>
   );
}
