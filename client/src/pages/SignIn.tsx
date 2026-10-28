import { signIn, useSession } from '@/lib/auth-client';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@/lib/zod-resolver';
import { SignInInput, signInSchema } from '@shared';

export default function SignIn() {
   const [error, setError] = useState<string | null>(null);
   const [loading, setLoading] = useState(false);
   const navigate = useNavigate();

   const {
      register,
      handleSubmit,
      formState: { errors },
   } = useForm<SignInInput>({
      resolver: zodResolver(signInSchema),
   });

   const { refetch } = useSession();

   const onSignIn = async (values: SignInInput) => {
      setLoading(true);
      setError(null);

      const { data, error } = await signIn.email({
         email: values.email,
         password: values.password,
      });

      setLoading(false);

      if (error) {
         setError(error.message ?? 'Sign in failed');
      } else if (data && !('twoFactorRedirect' in data)) {
         await refetch();

         navigate(
            data.user.globalRole === 'viewer' ? '/documents' : '/dashboard',
            {
               replace: true,
            },
         );
      }
   };

   return (
      <div className="min-h-screen flex items-center justify-center">
         <Card className="w-full max-w-sm shadow-2xl">
            <CardHeader>
               <CardTitle className="text-2xl">Sign in</CardTitle>
            </CardHeader>
            <CardContent>
               <form
                  noValidate
                  onSubmit={handleSubmit(onSignIn)}
                  className="space-y-4"
               >
                  <div className="space-y-2">
                     <Label htmlFor="email">Email</Label>
                     <Input
                        id="email"
                        type="email"
                        aria-invalid={!!errors.email}
                        {...register('email')}
                        placeholder="you@example.com"
                        required
                     />
                     {errors.email && (
                        <p className="text-sm text-destructive">
                           {errors.email.message}
                        </p>
                     )}
                  </div>
                  <div className="space-y-2">
                     <Label htmlFor="password">Password</Label>
                     <Input
                        id="password"
                        aria-invalid={!!errors.password}
                        type="password"
                        {...register('password')}
                        placeholder="••••••••"
                        required
                     />
                  </div>
                  {errors.password && (
                     <p className="text-sm text-destructive">
                        {errors.password.message}
                     </p>
                  )}
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
