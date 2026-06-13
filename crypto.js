import CryptoJS from "crypto-js";

// 🔐 ENCRYPT
export function encryptData(text, key) {
  return CryptoJS.AES.encrypt(text, key).toString();
}

// 🔓 DECRYPT
export function decryptData(cipher, key) {
  return CryptoJS.AES.decrypt(cipher, key).toString(CryptoJS.enc.Utf8);
}

// ⏳ STORE KEY WITH 20 MIN EXPIRY
export function storeKey(key) {
  const expiry = Date.now() + 20 * 60 * 1000;

  localStorage.setItem(
    "enc_key",
    JSON.stringify({ key, expiry })
  );
}

// ✅ GET VALID KEY
export function getValidKey() {
  const data = JSON.parse(localStorage.getItem("enc_key"));

  if (!data) return null;

  if (Date.now() > data.expiry) {
    localStorage.removeItem("enc_key");
    return null;
  }

  return data.key;
}