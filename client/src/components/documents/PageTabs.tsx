import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import TranscribeTab from '@/components/documents/TranscribeTab';
import RevisionHistoryTab from '@/components/documents/RevisionHistoryTab';
import OverviewTab from '@/components/documents/OverviewTab';
import { ReactElement } from 'react';
import GuidelinesTab from '@/components/documents/GuidelinesTab';
import { Transcription } from '@shared';
import VersionsTab from '@/components/documents/VersionsTab';

function PageTabs({
   children,
   tab,
   onTabChange,
   transcription,
   focusMode,
   pageTitle,
}: {
   children: ReactElement;
   tab: string;
   onTabChange: (tab: string) => void;
   transcription?: Transcription;
   focusMode: boolean;
   pageTitle: string;
}) {
   return (
      <Tabs
         value={tab}
         onValueChange={(value) => onTabChange(String(value))}
         className={focusMode ? 'flex h-full min-h-0 flex-col' : undefined}
      >
         <div className="flex justify-between items-center gap-3 mt-1 mb-2">
            {!focusMode ? (
               <TabsList>
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="versions" data-testid="versions-tab-btn">
                     Versions
                  </TabsTrigger>

                  <TabsTrigger
                     value="transcribe"
                     data-testid="transcribe-tab-btn"
                     className={`relative ${transcription?.status === 'rejected' ? 'text-destructive' : ''}`}
                  >
                     Transcribe
                     {transcription?.status === 'rejected' && (
                        <span
                           role="img"
                           aria-label="Transcription rejected"
                           className="absolute -top-1 -right-1 flex size-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold leading-none text-white z-10"
                        >
                           !
                        </span>
                     )}
                  </TabsTrigger>

                  <TabsTrigger
                     value="revision-history"
                     data-testid="revision-tab-btn"
                  >
                     My Revisions
                  </TabsTrigger>
                  <TabsTrigger
                     value="guidelines"
                     data-testid="guidelines-tab-btn"
                  >
                     Guidelines
                  </TabsTrigger>
               </TabsList>
            ) : (
               <h1 className="text-2xl font-semibold">
                  {' '}
                  {pageTitle.length > 80
                     ? `${pageTitle.slice(0, 80)}...`
                     : pageTitle}
               </h1>
            )}

            {children}
         </div>

         <TabsContent
            value="overview"
            className={focusMode ? 'min-h-0 flex-1' : undefined}
         >
            <OverviewTab />
         </TabsContent>
         <TabsContent value="versions">
            <VersionsTab />
         </TabsContent>
         <TabsContent
            value="transcribe"
            className={focusMode ? 'min-h-0 flex-1' : undefined}
         >
            <TranscribeTab />
         </TabsContent>
         <TabsContent value="revision-history">
            <RevisionHistoryTab />
         </TabsContent>
         <TabsContent value="guidelines">
            <GuidelinesTab />
         </TabsContent>
      </Tabs>
   );
}

export default PageTabs;
