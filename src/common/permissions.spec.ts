import { canActOnPendingCr, canApprovePolicy } from './permissions';
import { users } from '../api/fixtures';

describe('permissions', () => {
	it('treats any approve-scope policy as sufficient', () => {
		expect(canApprovePolicy(users.approver)).toBe(true);
		expect(canApprovePolicy(users.viewer)).toBe(false);
	});

	it('allows action only when status is PENDING_APPROVAL and the user may approve', () => {
		expect(canActOnPendingCr(users.approver, 'PENDING_APPROVAL')).toBe(true);
		expect(canActOnPendingCr(users.viewer, 'PENDING_APPROVAL')).toBe(false);
		expect(canActOnPendingCr(users.approver, 'APPLIED')).toBe(false);
		expect(canActOnPendingCr(users.approver, 'DRAFT')).toBe(false);
		expect(canActOnPendingCr(users.approver, undefined)).toBe(false);
	});
});
