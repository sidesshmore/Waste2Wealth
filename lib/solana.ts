import { Connection, PublicKey, LAMPORTS_PER_SOL, Keypair } from '@solana/web3.js';
import * as SecureStore from 'expo-secure-store';

export const connection = new Connection('https://api.devnet.solana.com', 'confirmed');

export async function getBalance(walletAddress: string): Promise<number> {
  const lamports = await connection.getBalance(new PublicKey(walletAddress));
  return lamports / LAMPORTS_PER_SOL;
}

export async function loadKeypair(): Promise<Keypair | null> {
  const b64 = await SecureStore.getItemAsync('solana_secret_key');
  if (!b64) return null;
  return Keypair.fromSecretKey(Buffer.from(b64, 'base64'));
}
