declare module "fpcalc" {
  interface FpcalcResult {
    duration: number;
    fingerprint: string;
  }

  type FpcalcCallback = (err: Error | null, result: FpcalcResult) => void;

  function fpcalc(filePath: string, callback: FpcalcCallback): void;
  function fpcalc(filePath: string, options: Record<string, unknown>, callback: FpcalcCallback): void;

  export default fpcalc;
}
