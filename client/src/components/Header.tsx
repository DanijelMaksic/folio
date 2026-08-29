import Nav from '@/components/Nav';
import { Link } from 'react-router-dom';

function Header() {
   return (
      <div className="flex items-center justify-between gap-3 px-6 py-3 bg-gray-100">
         <Link to="/">FOLIO</Link>
         <Nav />
      </div>
   );
}

export default Header;
