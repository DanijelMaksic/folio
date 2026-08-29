import Nav from '@/components/Nav';

function Header() {
   return (
      <div className="flex items-center justify-between gap-3 px-6 py-3 bg-gray-100">
         <p>FOLIO</p>
         <Nav />
      </div>
   );
}

export default Header;
