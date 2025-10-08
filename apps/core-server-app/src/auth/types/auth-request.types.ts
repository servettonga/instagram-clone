import { Request } from 'express';

import { UserWithProfileAndAccount } from '../../users/payloads';

export interface AuthenticatedRequest extends Request {
  user?: UserWithProfileAndAccount;
}
