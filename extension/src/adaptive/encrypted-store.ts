/**
 * Encrypted Local Feedback & Preferences Storage.
 * Uses WebCrypto AES-256-GCM for encrypted at-rest persistence.
 * Protects user feedback, false-positive reports, and per-site memory.
 */

export interface FeedbackRecord {
  id: string;
  domainHash: string;
  timestamp: number;
  userAction: "false_positive" | "false_negative" | "always_trust" | "block";
  trustScore: number;
  calibratedProbability: number;
  features?: number[];
}

export class EncryptedStore {
  private key: CryptoKey | null = null;
  private readonly STORAGE_KEY = "trustlens_encrypted_feedback_store";

  /**
   * Initializes or derives a persistent AES-256-GCM key from local storage.
   */
  public async init(): Promise<void> {
    if (this.key) return;

    // Check if raw key bytes exist in local storage
    let rawKeyHex: string | null = null;
    if (typeof localStorage !== "undefined") {
      rawKeyHex = localStorage.getItem("trustlens_local_master_key");
    }

    if (!rawKeyHex) {
      // Generate fresh 256-bit key
      const newKey = await crypto.subtle.generateKey(
        { name: "AES-GCM", length: 256 },
        true,
        ["encrypt", "decrypt"]
      );
      const exported = await crypto.subtle.exportKey("raw", newKey);
      rawKeyHex = Array.from(new Uint8Array(exported))
        .map(b => b.toString(16).padStart(2, "0"))
        .join("");
      if (typeof localStorage !== "undefined") {
        localStorage.setItem("trustlens_local_master_key", rawKeyHex);
      }
      this.key = newKey;
    } else {
      // Import existing key
      const keyBytes = new Uint8Array(
        rawKeyHex.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16))
      );
      this.key = await crypto.subtle.importKey(
        "raw",
        keyBytes,
        { name: "AES-GCM", length: 256 },
        false,
        ["encrypt", "decrypt"]
      );
    }
  }

  /**
   * Encrypts and stores a new feedback record.
   */
  public async saveFeedback(record: FeedbackRecord): Promise<void> {
    await this.init();
    const existing = await this.getAllFeedback();
    existing.push(record);

    const plaintext = JSON.stringify(existing);
    const enc = new TextEncoder();
    const data = enc.encode(plaintext);

    // 12-byte random IV
    const iv = crypto.getRandomValues(new Uint8Array(12));

    const ciphertext = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      this.key!,
      data
    );

    // Pack iv + ciphertext as hex
    const packed = {
      iv: Array.from(iv).map(b => b.toString(16).padStart(2, "0")).join(""),
      data: Array.from(new Uint8Array(ciphertext)).map(b => b.toString(16).padStart(2, "0")).join("")
    };

    if (typeof localStorage !== "undefined") {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(packed));
    }
  }

  /**
   * Decrypts and retrieves all local feedback records.
   */
  public async getAllFeedback(): Promise<FeedbackRecord[]> {
    await this.init();
    if (typeof localStorage === "undefined") return [];

    const item = localStorage.getItem(this.STORAGE_KEY);
    if (!item) return [];

    try {
      const packed = JSON.parse(item);
      const iv = new Uint8Array(packed.iv.match(/.{1,2}/g)!.map((b: string) => parseInt(b, 16)));
      const data = new Uint8Array(packed.data.match(/.{1,2}/g)!.map((b: string) => parseInt(b, 16)));

      const decrypted = await crypto.subtle.decrypt(
        { name: "AES-GCM", iv },
        this.key!,
        data
      );

      const dec = new TextDecoder();
      return JSON.parse(dec.decode(decrypted));
    } catch {
      return [];
    }
  }

  /**
   * Clears all encrypted feedback.
   */
  public clear(): void {
    if (typeof localStorage !== "undefined") {
      localStorage.removeItem(this.STORAGE_KEY);
    }
  }
}
