import type { CenterRole, Membership } from './types';

export const PRIMARY_CARE_ROLES: CenterRole[] = ['tens', 'nurse', 'doctor'];
export const REFERRAL_ROLES: CenterRole[] = ['general_surgeon', 'vascular_surgeon', 'vascular_nurse', 'traumatologist', 'physiatrist'];

export function hasRole(membership: Membership, roles: CenterRole[]) {
  return membership.roles.some((role) => roles.includes(role));
}

export function isReferralProfile(membership: Membership) {
  return hasRole(membership, REFERRAL_ROLES) && !hasRole(membership, PRIMARY_CARE_ROLES);
}

export function canViewCommittee(membership: Membership) {
  return hasRole(membership, ['nurse', 'doctor', ...REFERRAL_ROLES]);
}

export function canUploadClinicalDocuments(membership: Membership) {
  return hasRole(membership, ['nurse', 'doctor', 'general_surgeon', 'vascular_surgeon', 'vascular_nurse', 'traumatologist']);
}
