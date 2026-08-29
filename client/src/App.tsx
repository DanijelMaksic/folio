import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { useSession } from './lib/auth-client';
import Register from './pages/Register';
import Login from './pages/Login';
import VerifyOtp from '@/pages/VerifyOtp';
import Documents from '@/pages/Documents';
import DocumentDetail from '@/pages/DocumentDetail';
import UploadDocument from '@/pages/UploadDocument';
import ReviewQueue from '@/pages/ReviewQueue';
import Layout from '@/components/Layout';
import Account from './pages/Account';
import Home from '@/pages/Home';

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
            <Route element={<Layout />}>
               <Route path="/" element={<Home />} />
               <Route path="/register" element={<Register />} />
               <Route path="/login" element={<Login />} />
               <Route path="/verify-otp" element={<VerifyOtp />} />
               <Route path="/documents" element={<Documents />} />
               <Route
                  path="/documents/upload"
                  element={
                     <ProtectedRoute>
                        <UploadDocument />
                     </ProtectedRoute>
                  }
               />
               <Route
                  path="/review"
                  element={
                     <ProtectedRoute>
                        <ReviewQueue />
                     </ProtectedRoute>
                  }
               />
               <Route path="/documents/:id" element={<DocumentDetail />} />
               <Route
                  path="/account"
                  element={
                     <ProtectedRoute>
                        <Account />
                     </ProtectedRoute>
                  }
               />
            </Route>
         </Routes>
      </BrowserRouter>
   );
}
