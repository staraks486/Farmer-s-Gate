/**
 * FarmersGate SaaS License Verification Utility
 * Mathematical, pattern-based offline & online validatable license keys.
 */

export interface LicenseInfo {
  key: string;
  licensee: string;
  plan: 'Standard' | 'Premium' | 'Enterprise';
  expires: string; // YYYY-MM-DD or 'Lifetime'
  activatedAt: string;
  status: 'active' | 'expired' | 'unlicensed';
}

/**
 * Calculates a secure mathematical checksum of a string
 */
export function calculateLicenseChecksum(str: string): string {
  let sum = 0;
  // Multiplicative hashing with prime 31
  for (let i = 0; i < str.length; i++) {
    sum = (sum * 31 + str.charCodeAt(i)) % 65535;
  }
  return sum.toString(16).toUpperCase().padStart(4, '0');
}

/**
 * Clean licensee name for key encoding
 */
export function encodeLicenseeName(name: string): string {
  const clean = name.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  return clean.substring(0, 10) || 'CLIENT';
}

/**
 * Generate a valid SaaS license key
 */
export function generateLicenseKey(
  licenseeName: string,
  plan: 'Standard' | 'Premium' | 'Enterprise',
  expires: string // YYYY-MM-DD or 'Lifetime'
): string {
  const planCode = plan === 'Standard' ? 'STD' : plan === 'Premium' ? 'PRM' : 'ENT';
  const cleanExpiry = expires === 'Lifetime' ? 'LIFETIME' : expires.replace(/[^0-9]/g, ''); // YYYYMMDD
  const cleanName = encodeLicenseeName(licenseeName);

  const basePart = `FG-${planCode}-${cleanExpiry}-${cleanName}`;
  const checksum = calculateLicenseChecksum(basePart);

  return `${basePart}-${checksum}`;
}

/**
 * Validates any SaaS license key and extracts its embedded metadata
 */
export function validateLicenseKey(key: string): {
  isValid: boolean;
  plan?: 'Standard' | 'Premium' | 'Enterprise';
  expires?: string;
  licensee?: string;
  error?: string;
} {
  if (!key) {
    return { isValid: false, error: 'No key provided' };
  }

  const cleanKey = key.trim().toUpperCase();
  const parts = cleanKey.split('-');

  if (parts.length !== 5 || parts[0] !== 'FG') {
    return { isValid: false, error: 'Invalid license key format' };
  }

  const [, planCode, expiryCode, nameCode, checksum] = parts;

  // Rebuild the base string to verify the checksum
  const basePart = `FG-${planCode}-${expiryCode}-${nameCode}`;
  const computedChecksum = calculateLicenseChecksum(basePart);

  if (computedChecksum !== checksum) {
    return { isValid: false, error: 'License key integrity check failed (invalid checksum)' };
  }

  // Parse Plan
  let plan: 'Standard' | 'Premium' | 'Enterprise' = 'Standard';
  if (planCode === 'PRM') plan = 'Premium';
  if (planCode === 'ENT') plan = 'Enterprise';

  // Parse Expiry
  let expires = 'Lifetime';
  if (expiryCode !== 'LIFETIME') {
    if (expiryCode.length === 8) {
      const year = expiryCode.substring(0, 4);
      const month = expiryCode.substring(4, 6);
      const day = expiryCode.substring(6, 8);
      expires = `${year}-${month}-${day}`;

      // Check date expiry
      const expiryDate = new Date(`${year}-${month}-${day}T23:59:59`);
      const now = new Date();
      if (isNaN(expiryDate.getTime())) {
        return { isValid: false, error: 'Invalid expiry date encoded in key' };
      }
      if (expiryDate < now) {
        return { isValid: false, error: `License expired on ${expires}` };
      }
    } else {
      return { isValid: false, error: 'Invalid expiry date encoding format' };
    }
  }

  return {
    isValid: true,
    plan,
    expires,
    licensee: nameCode
  };
}

/**
 * Returns the currently active license stored in LocalStorage
 */
export function getSavedLicense(): LicenseInfo {
  try {
    let raw = localStorage.getItem('fg_license_info');

    // Check global synced settings as the primary cross-device source of truth!
    const syncedSettingsRaw = localStorage.getItem('farmersgate_cpanel_settings');
    if (syncedSettingsRaw) {
      try {
        const settings = JSON.parse(syncedSettingsRaw);
        if (settings && settings.licenseInfo) {
          raw = JSON.stringify(settings.licenseInfo);
        }
      } catch (e) {}
    }

    if (raw) {
      const parsed = JSON.parse(raw) as LicenseInfo;
      // Re-validate the key dynamically in case system time changed or localStorage was tampered with
      const validation = validateLicenseKey(parsed.key);
      if (validation.isValid) {
        return {
          ...parsed,
          status: 'active'
        };
      } else {
        return {
          key: parsed.key,
          licensee: parsed.licensee,
          plan: parsed.plan,
          expires: parsed.expires,
          activatedAt: parsed.activatedAt,
          status: 'expired'
        };
      }
    }
  } catch (err) {
    console.error('Error parsing license from localStorage:', err);
  }

  return {
    key: '',
    licensee: 'Unregistered Store',
    plan: 'Standard',
    expires: 'Lifetime',
    activatedAt: '',
    status: 'unlicensed'
  };
}

/**
 * Calculates how many days are left until the license expires.
 * Returns null if Lifetime, or a number of days.
 */
export function getLicenseExpiryDaysLeft(expires: string): number | null {
  if (!expires || expires === 'Lifetime') return null;
  try {
    const expiryDate = new Date(`${expires}T23:59:59`);
    const now = new Date();
    const diffTime = expiryDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  } catch (err) {
    console.error('Error calculating license expiry days:', err);
    return null;
  }
}

/**
 * Checks if a hard-lock activation wall is turned on in settings
 */
export function isLicenseWallEnforced(): boolean {
  try {
    const raw = localStorage.getItem('farmersgate_cpanel_settings');
    if (raw) {
      const settings = JSON.parse(raw);
      return settings.enforceLicenseWall === true;
    }
  } catch (err) {}
  return false; // Default to false so people don't get locked out initially, but they can turn it on
}
