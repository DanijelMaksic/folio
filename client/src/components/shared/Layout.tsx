import Footer from '@/components/shared/Footer';
import Header from '@/components/shared/Header';
import { useViewerStore } from '@/store/useViewerStore';
import { Outlet } from 'react-router-dom';

function Layout() {
   const focusMode = useViewerStore((s) => s.focusMode);

   return (
      <div
         className={
            focusMode
               ? 'flex h-dvh flex-col overflow-hidden'
               : 'flex flex-col min-h-screen'
         }
      >
         {!focusMode && <Header />}
         <main className={focusMode ? 'min-h-0 flex-1' : 'flex-1'}>
            <Outlet />
         </main>
         {!focusMode && <Footer />}
      </div>
   );
}

export default Layout;
