import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { useSession } from './lib/auth-client';
import Register from './pages/Register';
import Login from './pages/Login';
import Home from './pages/Home';
import VerifyOtp from '@/pages/VerifyOtp';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
   const { data: session, isPending } = useSession();
   if (isPending) return <p>Loading...</p>;
   if (!session) return <Navigate to="/login" replace />;
   return <>{children}</>;
}

export default function App() {
   return (
      <BrowserRouter>
         <Routes>
            <Route path="/register" element={<Register />} />
            <Route path="/login" element={<Login />} />
            <Route path="/verify-otp" element={<VerifyOtp />} />
            <Route
               path="/"
               element={
                  <ProtectedRoute>
                     <Home />
                  </ProtectedRoute>
               }
            />
         </Routes>
      </BrowserRouter>
   );
}
