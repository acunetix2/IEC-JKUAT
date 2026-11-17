export function validatePersonName(value: string, label = 'Name'): string | undefined {
  const name = value.trim();
  if (name.length < 2) return `${label} must be at least 2 characters.`;
  if (name.length > 120) return `${label} must be 120 characters or fewer.`;
  if (!/^[A-Za-zÀ-ÖØ-öø-ÿ][A-Za-zÀ-ÖØ-öø-ÿ\s.'’-]*$/u.test(name)) {
    return `${label} can only contain letters, spaces, apostrophes, periods, and hyphens.`;
  }
  return undefined;
}

export function validateEmail(value: string): string | undefined {
  const email = value.trim();
  if (!email) return 'Email is required.';
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    return 'Enter a valid email address.';
  }
  return undefined;
}

export function normalizeKenyanPhone(value: string): string | null {
  const phone = value.replace(/[\s()-]/g, '');
  if (!/^(?:\+?254|0)(?:7|1)\d{8}$/.test(phone)) return null;
  if (phone.startsWith('+254')) return phone;
  if (phone.startsWith('254')) return `+${phone}`;
  return `+254${phone.slice(1)}`;
}

export function validateKenyanPhone(value: string): string | undefined {
  if (!value.trim()) return 'Phone number is required.';
  if (!normalizeKenyanPhone(value)) return 'Enter a valid Kenyan mobile number, such as 0712345678.';
  return undefined;
}

export function validateRegistrationNumber(value: string): string | undefined {
  const regNumber = value.trim();
  if (!regNumber) return 'Registration number is required.';
  if (regNumber.length > 50 || !/^[A-Za-z0-9][A-Za-z0-9/-]{3,49}$/.test(regNumber)) {
    return 'Enter a valid registration number without spaces.';
  }
  return undefined;
}

export function validateRequiredText(value: string, label: string, minLength: number, maxLength: number): string | undefined {
  const text = value.trim();
  if (text.length < minLength) return `${label} must be at least ${minLength} characters.`;
  if (text.length > maxLength) return `${label} must be ${maxLength} characters or fewer.`;
  return undefined;
}
