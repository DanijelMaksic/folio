import { signUp } from '@/lib/auth-client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { zodResolver } from '@/lib/zod-resolver';
import { useForm } from 'react-hook-form';
import { SignUpInput, signUpSchema } from '@shared';

export default function SignUp() {
   const [error, setError] = useState<string | null>(null);
   const [success, setSuccess] = useState(false);
   const [isPending, setIsPending] = useState(false);

   const {
      register,
      handleSubmit,
      formState: { errors },
   } = useForm<SignUpInput>({
      resolver: zodResolver(signUpSchema),
   });

   const onSignUp = async (values: SignUpInput) => {
      setIsPending(true);
      setError(null);

      const { error } = await signUp.email({
         email: values.email,
         name: values.name,
         username: values.username,
         password: values.password,
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
                     Check your email (spam folder) to verify your account.
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
               <CardTitle className="text-2xl">Sign up</CardTitle>
            </CardHeader>
            <CardContent>
               <form
                  noValidate
                  onSubmit={handleSubmit(onSignUp)}
                  className="space-y-4"
               >
                  <div className="space-y-2">
                     <Label htmlFor="name">Full name</Label>
                     <Input
                        id="name"
                        aria-invalid={!!errors.name}
                        {...register('name')}
                        placeholder="John Doe"
                        {...register('name')}
                        required
                        disabled={isPending}
                     />
                     {errors.name && (
                        <p className="text-sm text-destructive">
                           {errors.name.message}
                        </p>
                     )}
                  </div>
                  <div className="space-y-2">
                     <Label htmlFor="username">Username</Label>
                     <Input
                        id="username"
                        aria-invalid={!!errors.username}
                        {...register('username')}
                        placeholder="johndoe"
                        {...register('username')}
                        required
                        disabled={isPending}
                     />
                     {errors.username && (
                        <p className="text-sm text-destructive">
                           {errors.username.message}
                        </p>
                     )}
                  </div>
                  <div className="space-y-2">
                     <Label htmlFor="email">Email</Label>
                     <Input
                        id="email"
                        type="email"
                        aria-invalid={!!errors.email}
                        {...register('email')}
                        placeholder="you@example.com"
                        {...register('email')}
                        required
                        disabled={isPending}
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
                        placeholder="••••••••"
                        required
                        {...register('password')}
                        disabled={isPending}
                     />
                     {errors.password && (
                        <p className="text-sm text-destructive">
                           {errors.password.message}
                        </p>
                     )}
                  </div>
                  {error && <p className="text-sm text-destructive">{error}</p>}
                  <Button type="submit" className="w-full" disabled={isPending}>
                     {isPending ? 'Creating account...' : 'Sign up'}
                  </Button>
               </form>
            </CardContent>
         </Card>
      </div>
   );
}
