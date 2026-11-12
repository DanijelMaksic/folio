import { Button } from '@/components/ui/button';
import {
   NavigationMenu,
   NavigationMenuItem,
   NavigationMenuLink,
   NavigationMenuList,
} from '@/components/ui/navigation-menu';
import {
   DropdownMenu,
   DropdownMenuContent,
   DropdownMenuGroup,
   DropdownMenuItem,
   DropdownMenuSeparator,
   DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { signOut, useSession } from '@/lib/auth-client';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';

function Nav() {
   const { data: session } = useSession();
   const user = session?.user;
   const navigate = useNavigate();

   return (
      <NavigationMenu>
         <NavigationMenuList className="gap-3">
            <NavigationMenuItem>
               <NavigationMenuLink render={<Link to="/">Home</Link>} />
            </NavigationMenuItem>

            <NavigationMenuItem>
               <NavigationMenuLink
                  render={<Link to="/documents">Documents</Link>}
               />
            </NavigationMenuItem>

            <NavigationMenuItem>
               <NavigationMenuLink
                  render={<Link to="/collections">Collections</Link>}
               />
            </NavigationMenuItem>

            {!user ? (
               <>
                  <NavigationMenuItem>
                     <NavigationMenuLink
                        render={<Link to="/sign-in">Sign In</Link>}
                     />
                  </NavigationMenuItem>
                  <NavigationMenuItem>
                     <NavigationMenuLink
                        render={<Link to="/sign-up">Sign up</Link>}
                     />
                  </NavigationMenuItem>{' '}
               </>
            ) : (
               <>
                  <NavigationMenuItem>
                     <NavigationMenuLink
                        render={<Link to="/dashboard">Dashboard</Link>}
                     />
                  </NavigationMenuItem>

                  <DropdownMenu modal={false}>
                     <DropdownMenuTrigger
                        render={
                           <button
                              type="button"
                              className="flex items-center gap-2 rounded-full border border-gray-300 py-1 pl-1 pr-3 hover:bg-muted transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none bg-gray-50"
                           >
                              {user.image ? (
                                 <img
                                    src={user.image}
                                    alt=""
                                    className="size-7 rounded-full object-cover border "
                                 />
                              ) : (
                                 <span className="flex size-8 items-center justify-center rounded-full bg-muted text-sm font-medium uppercase border">
                                    {user.username[0]}
                                 </span>
                              )}
                              <span className="text-sm font-medium max-w-32 truncate">
                                 {user.username}
                              </span>
                              <ChevronDown className="size-4 text-muted-foreground" />
                           </button>
                        }
                     />
                     <DropdownMenuContent>
                        <DropdownMenuGroup>
                           <DropdownMenuItem
                              onClick={() =>
                                 navigate(`/users/${user.username}`)
                              }
                           >
                              My profile
                           </DropdownMenuItem>
                           <DropdownMenuItem
                              onClick={() => navigate('/settings')}
                           >
                              Settings
                           </DropdownMenuItem>
                           <DropdownMenuSeparator />
                           <DropdownMenuItem
                              onClick={() =>
                                 signOut().then(() => navigate('/'))
                              }
                           >
                              Sign out
                           </DropdownMenuItem>
                        </DropdownMenuGroup>
                     </DropdownMenuContent>
                  </DropdownMenu>
               </>
            )}
         </NavigationMenuList>
      </NavigationMenu>
   );
}

export default Nav;
