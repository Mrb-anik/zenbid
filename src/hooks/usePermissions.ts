import { useOrganization } from '../providers/OrganizationProvider';

export type PermissionKey = 
  | 'estimates.create'
  | 'estimates.edit'
  | 'estimates.delete'
  | 'billing.manage'
  | 'team.manage'
  | 'settings.manage'
  | 'pricebook.manage'
  | 'templates.manage'
  | 'crm.manage'
  | 'analytics.view'
  | 'automation.manage'
  | 'all';

export function usePermissions() {
  const { activeProfile: profile, memberContext, role } = useOrganization();

  const isSuperAdmin = profile?.role === 'super_admin' || profile?.role === 'platform_owner';
  const isAdminPortalAccess = isSuperAdmin || profile?.role === 'agency_admin' || profile?.is_admin === true;

  const can = (action: PermissionKey): boolean => {
    // Super Admins bypass everything
    if (isSuperAdmin) return true;

    // Organization Owners bypass everything in their org
    if (role === 'organization_owner') return true;
    if (role === 'agency_admin') return true;

    // Missing context implies no permissions
    if (!memberContext) return false;

    // Check specific custom permissions if any
    if (memberContext.permissions?.['all'] === true) return true;
    
    // Check specific action
    if (memberContext.permissions?.[action] === true) return true;

    // Role-based fallbacks
    switch (role) {
      case 'manager':
        return ['estimates.create', 'estimates.edit', 'pricebook.manage', 'templates.manage', 'crm.manage', 'team.manage'].includes(action);
      case 'estimator':
        return ['estimates.create', 'estimates.edit', 'pricebook.manage'].includes(action);
      case 'sales_rep':
        return ['crm.manage'].includes(action);
      case 'viewer':
        return false;
      default:
        return false;
    }
  };

  return { can, isSuperAdmin, isAdminPortalAccess, role };
}
