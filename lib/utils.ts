import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatRole(role?: string | null) {
  return role ? role.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()) : "";
}

export function formatEnum(value?: string | null) {
  return value ? value.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()) : "";
}
