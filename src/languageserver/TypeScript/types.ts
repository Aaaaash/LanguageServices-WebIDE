export interface TypescriptRequest {
  command: string;
  data?: any;
  onSuccess(value: any): void;
  onError(err: any): void;
  startTime?: number;
  endTime?: number;
}
