import { Button } from '@/components/ui/button';
import {
   NavigationMenu,
   NavigationMenuItem,
   NavigationMenuLink,
   NavigationMenuList,
} from '@/components/ui/navigation-menu';
import { signOut, useSession } from '@/lib/auth-client';
import { Link, useNavigate } from 'react-router-dom';

function Nav() {
   const { data: session } = useSession();
   const user = session?.user;
   const navigate = useNavigate();

   return (
      <NavigationMenu>
         <NavigationMenuList className="gap-3">
            <NavigationMenuItem>
               <NavigationMenuLink
                  render={<Link to="/documents">Documents</Link>}
               />
            </NavigationMenuItem>
            {!user ? (
               <>
                  <NavigationMenuItem>
                     <NavigationMenuLink
                        render={<Link to="/login">Log In</Link>}
                     />
                  </NavigationMenuItem>
                  <NavigationMenuItem>
                     <NavigationMenuLink
                        render={<Link to="/register">Register</Link>}
                     />
                  </NavigationMenuItem>{' '}
               </>
            ) : (
               <>
                  <NavigationMenuItem>
                     <NavigationMenuLink
                        render={<Link to="/account">Account</Link>}
                     />
                  </NavigationMenuItem>
                  <Button
                     variant="outline"
                     onClick={() => signOut().then(() => navigate('/'))}
                  >
                     Sign Out
                  </Button>
               </>
            )}
         </NavigationMenuList>
      </NavigationMenu>
   );
}

function ListItem({
   title,
   children,
   href,
   ...props
}: React.ComponentPropsWithoutRef<'li'> & { href: string }) {
   return (
      <li {...props}>
         <NavigationMenuLink
            render={
               <Link href={href}>
                  <div className="flex flex-col gap-1 text-sm">
                     <div className="leading-none font-medium">{title}</div>
                     <div className="line-clamp-2 text-muted-foreground">
                        {children}
                     </div>
                  </div>
               </Link>
            }
         />
      </li>
   );
}

export default Nav;
