import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function normalizeUsername(username: string): string {
  return username.toLowerCase().trim()
}

export function normalizeEmail(email: string): string {
  return email.toLowerCase().trim()
}
