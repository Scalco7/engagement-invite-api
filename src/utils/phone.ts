/**
 * Sanitizes a phone number string by removing all non-numeric characters
 * and prefixing it with the Brazilian country code '+55' if not already present.
 * 
 * @param phone Raw phone number string
 * @returns Sanitized and formatted phone number string with '+55' DDI
 */
export const sanitizeAndFormatPhone = (phone: string): string => {
  // Remove all non-digit characters
  let digits = phone.replace(/\D/g, '');
  
  // If it already starts with the country code '55', prefix with '+'
  if (digits.startsWith('55')) {
    return '+' + digits;
  } else {
    // Otherwise, prefix with '+55'
    return '+55' + digits;
  }
};
