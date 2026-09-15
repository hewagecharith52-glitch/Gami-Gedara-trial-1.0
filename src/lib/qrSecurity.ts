import crypto from "crypto";

const SECRET_KEY = process.env.QR_SECRET_KEY || "restaurant_super_secure_salt_key";

// Generates a 10-character HMAC token for a given table number
export function generateTableToken(tableNo: string): string {
    return crypto
        .createHmac("sha256", SECRET_KEY)
        .update(`table_secret_${tableNo}`)
        .digest("hex")
        .substring(0, 10);
}

// Validates whether the provided token matches the expected table token
export function verifyTableToken(tableNo: string, token: string): boolean {
    if (!tableNo || !token) return false;
    const expectedToken = generateTableToken(tableNo);
    return expectedToken.toLowerCase() === token.toLowerCase();
}