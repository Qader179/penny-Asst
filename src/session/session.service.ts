import { Injectable } from '@angular/core';
import { ReqUser } from '../models/cr.models';
import { users } from '../api/fixtures';

/**
 * Current demo user for org-scoped API calls and permission checks.
 * Defaults to a fixture user; AppComponent.switchUser mutates it; tests may override the provider.
 */
@Injectable({ providedIn: 'root' })
export class SessionService {
	user: ReqUser = users.approver;
}
