import { CoreUser } from '../services/coreServiceClient.js';

// To fix TypeScript error: Property 'user' does not exist on type 'Request'
declare global {
  namespace Express {
    type User = CoreUser;
  }
}
