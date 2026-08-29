import Footer from '@/components/Footer';
import Header from '@/components/Header';
import { Outlet } from 'react-router-dom';

function Layout() {
   return (
      <div className="flex flex-col min-h-screen">
         <Header />
         <main className="flex-1">
            <Outlet />
         </main>

         <Footer />
      </div>
   );
}

export default Layout;
