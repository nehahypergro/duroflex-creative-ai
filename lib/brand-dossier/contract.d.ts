/** Provisional dossier boundary; not the broader research-agent contract. */
export interface ResearchCompleted {
  version: 1;
  event: 'research.completed';
  researchId: string;
  brandName: string;
  demo: boolean;
  completedAt: string; // ISO timestamp with timezone
  sources: Source[];
  assets: Asset[]; // Full inventory, not only selected presentation references
  findings: Finding[];
}
export interface Source {
  id: string;
  kind: 'site' | 'product' | 'guidelines' | 'asset' | 'social' | 'meta';
  label: string;
  reference: string; // Official URL, supplied document name/page, or Drive reference
  collectedAt: string; // Actual retrieval/check date, including failed attempts
  status: 'available' | 'partial' | 'unavailable';
  note?: string; // Required for partial/unavailable; describe access or conflicting evidence
  advertiserVerified?: boolean;
  advertiserId?: string; // Required alongside true verification for accessible Meta evidence
}
export interface Asset {
  id: string;
  kind: 'logo' | 'product' | 'screenshot' | 'creative' | 'ad' | 'reference';
  label: string;
  sourceIds: string[];
  imageData?: string; // Embedded PNG/JPEG; omission shows unavailable image explicitly
  /** Preserve only metadata actually supplied by the collector. No inferred performance. */
  metadata?: Record<string, unknown>;
}
export interface Finding {
  section: 'overview' | 'products' | 'identity' | 'tone' | 'creative' | 'ads' | 'opportunities' | 'conflicts';
  basis: 'evidence' | 'inference' | 'sample';
  title: string;
  text: string; // Succinct findings; authentic tone/copy excerpts only when supplied
  sourceIds: string[];
  assetIds?: string[];
  direction?: 'continuity' | 'exploration';
}
