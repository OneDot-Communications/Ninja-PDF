import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function isPasswordError(error: any): boolean {
  if (!error) return false;
  const errStr = (String(error?.name || "") + String(error?.message || "") + String(error)).toLowerCase();
  return errStr.includes('password') || errStr.includes('protected') || errStr.includes('encrypted');
}
