export const CUSTOMER_PASSWORD_MIN_LENGTH = 8;

export function getCustomerPasswordError(password) {
  if (password.length < CUSTOMER_PASSWORD_MIN_LENGTH) {
    return "Password must be at least 8 characters long.";
  }
  if (!/[A-Za-z]/.test(password)) {
    return "Password must contain at least one letter.";
  }
  if (!/\d/.test(password)) {
    return "Password must contain at least one number.";
  }
  return "";
}

export function isValidCustomerPassword(password) {
  return !getCustomerPasswordError(password);
}
