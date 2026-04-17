export interface Definition {
  meaning: string;
  examples: string[];
  notes: string;
}

export interface DictionaryEntry {
  id: string;
  headword: string;
  starred: boolean;
  pinyin: string;
  tonalNotation: string;
  ipa: string;
  section: string;
  originLanguages: string[];
  definitions: Definition[];
  rawText: string;
  images: string[];
  sourceFile: string;
  sourcePages: string;
  sourcePage?: number;
}

export interface DictionaryData {
  metadata: {
    title: string;
    totalEntries: number;
    sections: string[];
    originCounts: Record<string, number>;
    starredCount: number;
  };
  entries: DictionaryEntry[];
}

export const ORIGIN_LABELS: Record<string, string> = {
  arabic: "阿拉伯语",
  persian: "波斯语",
  mongolian: "蒙古语",
  turkic: "突厥语",
  uyghur: "维吾尔语",
  general: "方言",
};

export const ORIGIN_COLORS: Record<string, string> = {
  arabic: "bg-emerald-100 text-emerald-800",
  persian: "bg-blue-100 text-blue-800",
  mongolian: "bg-amber-100 text-amber-800",
  turkic: "bg-purple-100 text-purple-800",
  uyghur: "bg-rose-100 text-rose-800",
  general: "bg-gray-100 text-gray-700",
};
