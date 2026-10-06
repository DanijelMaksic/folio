import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signOut } from '@/lib/auth-client';
import { Button } from '@/components/ui/button';
import EditProfileModal from '@/components/profile/EditProfileModal';
import ChangePasswordModal from '@/components/profile/ChangePasswordModal';

interface ProfileSettingsProps {
   name: string;
   username: string;
}

interface SettingRowProps {
   title: string;
   description: string;
   children: React.ReactNode;
}

function SettingRow({ title, description, children }: SettingRowProps) {
   return (
      <div className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
         <div>
            <p className="font-medium">{title}</p>
            <p className="text-sm text-muted-foreground">{description}</p>
         </div>
         <div className="shrink-0">{children}</div>
      </div>
   );
}

function ProfileSettings({ name, username }: ProfileSettingsProps) {
   const navigate = useNavigate();
   const [editOpen, setEditOpen] = useState(false);
   const [passwordOpen, setPasswordOpen] = useState(false);
   const [signingOut, setSigningOut] = useState(false);

   async function handleSignOut() {
      setSigningOut(true);
      await signOut();
      navigate('/login');
   }

   return (
      <div className="space-y-10">
         <section>
            <h2 className="text-xl">Profile</h2>
            <div className="mt-2 divide-y border-y">
               <SettingRow
                  title="Profile"
                  description="Change your name and username."
               >
                  <Button variant="outline" onClick={() => setEditOpen(true)}>
                     Edit profile
                  </Button>
               </SettingRow>

               <SettingRow
                  title="Password"
                  description="Update the password you use to sign in."
               >
                  <Button
                     variant="outline"
                     onClick={() => setPasswordOpen(true)}
                  >
                     Change password
                  </Button>
               </SettingRow>

               <SettingRow
                  title="Sign out"
                  description="Sign out of Folio on this device."
               >
                  <Button
                     variant="outline"
                     onClick={handleSignOut}
                     disabled={signingOut}
                  >
                     {signingOut ? 'Signing out...' : 'Sign out'}
                  </Button>
               </SettingRow>
            </div>
         </section>

         <section>
            <h2 className="text-xl text-destructive">Danger zone</h2>
            <div className="mt-2 rounded-lg border border-destructive/40 px-4">
               <SettingRow
                  title="Delete account"
                  description="Permanently delete your account and the documents you uploaded. This cannot be undone."
               >
                  {/* Wired up when we build deletion later in the sprint */}
                  <Button variant="destructive" disabled>
                     Delete account
                  </Button>
               </SettingRow>
            </div>
         </section>

         <EditProfileModal
            open={editOpen}
            onOpenChange={setEditOpen}
            initialName={name}
            initialUsername={username}
         />
         <ChangePasswordModal
            open={passwordOpen}
            onOpenChange={setPasswordOpen}
         />
      </div>
   );
}

export default ProfileSettings;
