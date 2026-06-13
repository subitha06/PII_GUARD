// Email
const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-z]{2,}/;

// Phone (India)
const phoneRegex = /(\+91[-\s]?)?[6-9]\d{9}/;

// Aadhaar (basic)
const aadhaarRegex = /\d{4}\s\d{4}\s\d{4}/;

export function containsPII(text) {
  return (
    emailRegex.test(text) ||
    phoneRegex.test(text) ||
    aadhaarRegex.test(text)
  );
}