import { DictionaryData } from "./types";

let cachedData: DictionaryData | null = null;

export async function getDictionary(): Promise<DictionaryData> {
  if (cachedData) return cachedData;
  const res = await fetch("/dictionary.json");
  cachedData = await res.json();
  return cachedData!;
}
