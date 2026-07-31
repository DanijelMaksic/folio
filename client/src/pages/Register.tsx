import { signUp } from '@/lib/auth-client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function Register() {
   const [error, setError] = useState<string | null>(null);
   const [success, setSuccess] = useState(false);
   const [isPending, setIsPending] = useState(false);

   const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      setIsPending(true);
      setError(null);
      const form = new FormData(e.currentTarget);

      const { error } = await signUp.email({
         email: form.get('email') as string,
         password: form.get('password') as string,
         name: form.get('name') as string,
         username: form.get('username') as string,
         callbackURL: `${import.meta.env.VITE_CLIENT_URL}/`,
      });

      setIsPending(false);

      if (error) {
         setError(error.message ?? 'Registration failed');
      } else {
         setSuccess(true);
      }
   };

   if (success) {
      return (
         <div className="min-h-screen flex items-center justify-center">
            <Card className="w-full max-w-sm">
               <CardContent className="pt-6">
                  <p className="text-center text-muted-foreground">
                     Check your email to verify your account.
                  </p>
               </CardContent>
            </Card>
         </div>
      );
   }

   return (
      <div className="min-h-screen flex items-center justify-center">
         <Card className="w-full max-w-sm shadow-2xl">
            <CardHeader>
               <CardTitle className="text-2xl">Register</CardTitle>
            </CardHeader>
            <CardContent>
               <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                     <Label htmlFor="name">Full name</Label>
                     <Input
                        id="name"
                        name="name"
                        placeholder="John Doe"
                        required
                        disabled={isPending}
                     />
                  </div>
                  <div className="space-y-2">
                     <Label htmlFor="username">Username</Label>
                     <Input
                        id="username"
                        name="username"
                        placeholder="johndoe"
                        required
                        disabled={isPending}
                     />
                  </div>
                  <div className="space-y-2">
                     <Label htmlFor="email">Email</Label>
                     <Input
                        id="email"
                        name="email"
                        type="email"
                        placeholder="you@example.com"
                        required
                        disabled={isPending}
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
                        disabled={isPending}
                     />
                  </div>
                  {error && <p className="text-sm text-destructive">{error}</p>}
                  <Button type="submit" className="w-full" disabled={isPending}>
                     {isPending ? 'Creating account...' : 'Register'}
                  </Button>
               </form>
            </CardContent>
         </Card>
      </div>
   );
}
