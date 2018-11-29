const removeBomBuffer = require('remove-bom-buffer');
const removeBomString = require('strip-bom');

export function removeBOMFromBuffer(buffer: Buffer): Buffer {
  return <Buffer>removeBomBuffer(buffer);
}

export function removeBOMFromString(line: string): string {
  return removeBomString(line.trim());
}
