import { eq, or } from 'drizzle-orm';
import { isEditor } from '@folio/shared';
import { documents } from '@/db/schema/documents.js';

type Viewer =
   | { id: string; globalRole: string | null | undefined }
   | null
   | undefined;

// Everyone sees ready documents. Owners also see their own processing/failed ones. Editors+ see everything (undefined = no restriction, and() drops it).
export function documentVisibility(viewer: Viewer) {
   if (!viewer) return eq(documents.status, 'ready');
   if (isEditor(viewer.globalRole)) return undefined;
   return or(
      eq(documents.status, 'ready'),
      eq(documents.uploadedBy, viewer.id),
   );
}
