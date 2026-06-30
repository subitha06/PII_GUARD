import CryptoJS from "crypto-js";

const ITERATIONS = 10000;
const KEY_SIZE = 256 / 32;

// Fixed marker used to verify the password was correct after decryption.
// We prepend this to the plaintext before encrypting, and check for it
// after decrypting. AES-CBC has NO built-in integrity check, so without
// this marker, a wrong password can sometimes still produce a byte
// sequence that "looks" like valid UTF-8 + valid PKCS7 padding by chance
// — which is exactly the "wrong password still decrypts" bug.
const INTEGRITY_TAG = "PIIGUARD_OK::";

// 🔑 DERIVE KEY FROM PASSWORD USING PBKDF2 (random salt per call)
function deriveKey(password, salt) {
  return CryptoJS.PBKDF2(password, salt, {
    keySize: KEY_SIZE,
    iterations: ITERATIONS,
  });
}

// 🔒 ENCRYPT — returns salt + iv + ciphertext combined as one string
export function encryptData(plainText, password) {
  const salt = CryptoJS.lib.WordArray.random(128 / 8);
  const iv = CryptoJS.lib.WordArray.random(128 / 8);
  const key = deriveKey(password, salt);

  // Prepend integrity marker so decrypt() can verify the password was correct
  const taggedText = INTEGRITY_TAG + plainText;

  const encrypted = CryptoJS.AES.encrypt(taggedText, key, {
    iv: iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  });

  // Combine salt + iv + ciphertext, base64 encoded, separated by ":"
  return (
    salt.toString() + ":" +
    iv.toString() + ":" +
    encrypted.toString()
  );
}

// 🔓 DECRYPT — returns null if password is wrong or data is corrupted
export function decryptData(cipherPayload, password) {
  try {
    const parts = cipherPayload.split(":");
    if (parts.length !== 3) return null;

    const [saltHex, ivHex, ciphertext] = parts;
    const salt = CryptoJS.enc.Hex.parse(saltHex);
    const iv = CryptoJS.enc.Hex.parse(ivHex);
    const key = deriveKey(password, salt);

    const decrypted = CryptoJS.AES.decrypt(ciphertext, key, {
      iv: iv,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7,
    });

    // This can throw on malformed UTF-8 (wrong key) — caught below.
    // But it can ALSO silently "succeed" with garbage on a wrong key,
    // which is why we still need the integrity check after this.
    const result = decrypted.toString(CryptoJS.enc.Utf8);

    if (!result) return null;

    // 🔐 INTEGRITY CHECK — this is the actual fix.
    // Only a decryption with the correct password will ever produce
    // our known marker at the start of the plaintext. Any wrong
    // password — even one that "accidentally" produced UTF-8-safe
    // garbage — gets rejected here.
    if (!result.startsWith(INTEGRITY_TAG)) {
      return null;
    }

    return result.slice(INTEGRITY_TAG.length);
  } catch {
    return null; // wrong password or corrupted data threw during decrypt/UTF-8 decode
  }
}

// 🔳 STORE PASSWORD WITH EXPIRY + ATTEMPT TRACKING (20 min expiry, 5 attempts)
const EXPIRY_MS = 20 * 60 * 1000;
const MAX_ATTEMPTS = 5;

export function storePassword(password) {
  const expiry = Date.now() + EXPIRY_MS;
  localStorage.setItem(
    "enc_password",
    JSON.stringify({ password, expiry, attempts: 0 })
  );
}

// ✅ GET VALID PASSWORD (does not consume an attempt — just checks expiry)
export function getValidPassword() {
  try {
    const data = JSON.parse(localStorage.getItem("enc_password"));
    if (!data) return null;
    if (Date.now() > data.expiry) {
      localStorage.removeItem("enc_password");
      return null;
    }
    return data.password;
  } catch {
    return null;
  }
}

// ❌ RECORD A FAILED ATTEMPT — returns remaining attempts, or -1 if locked out
export function recordFailedAttempt() {
  try {
    const raw = localStorage.getItem("enc_password");
    if (!raw) return -1;
    const data = JSON.parse(raw);

    if (Date.now() > data.expiry) {
      localStorage.removeItem("enc_password");
      return -1;
    }

    data.attempts = (data.attempts || 0) + 1;

    if (data.attempts >= MAX_ATTEMPTS) {
      localStorage.removeItem("enc_password");
      return -1; // locked out — caller should force re-entry / new password
    }

    localStorage.setItem("enc_password", JSON.stringify(data));
    return MAX_ATTEMPTS - data.attempts;
  } catch {
    localStorage.removeItem("enc_password");
    return -1;
  }
}

// 🔁 RESET ATTEMPT COUNTER ON SUCCESSFUL DECRYPT
export function resetAttempts() {
  try {
    const raw = localStorage.getItem("enc_password");
    if (!raw) return;
    const data = JSON.parse(raw);
    data.attempts = 0;
    localStorage.setItem("enc_password", JSON.stringify(data));
  } catch {
    /* no-op */
  }
}

// 🗑️ CLEAR PASSWORD
export function clearPassword() {
  localStorage.removeItem("enc_password");
}
