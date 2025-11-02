// Server page wrapper for client-side OAuth callback logic.
export const dynamic = 'force-dynamic';

import ClientCallback from './ClientCallback';

export default function Page() {
  return <ClientCallback />;
}
