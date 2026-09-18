import { Link } from 'react-router-dom';

function Footer() {
   return (
      <div className="bg-gray-100 px-12 pt-6 pb-12 align-bottom">
         <div>
            <Link to="/">FOLIO</Link>
         </div>
         <span className="text-sm">
            © 2026. Project for portfolio purposes.
         </span>
      </div>
   );
}

export default Footer;
