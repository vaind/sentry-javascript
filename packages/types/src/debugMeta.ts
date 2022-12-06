/**
 * Holds meta information to customize the behavior of Sentry's server-side event processing.
 **/
export interface DebugMeta {
  images?: Array<DebugImage>;
  // Temporary home for corrent 'mechanism.handled` value, until relay will accept another field
  caughtByUser?: boolean;
}

/**
 * Possible choices for debug images.
 */
export type DebugImageType = 'wasm' | 'macho' | 'elf' | 'pe';

/**
 * References to debug images.
 */
export interface DebugImage {
  type: DebugImageType;
  debug_id: string;
  code_id?: string | null;
  code_file: string;
  debug_file?: string | null;
}
