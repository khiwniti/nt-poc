export type DownloadBlobOptions = {
  filename: string;
};

export function downloadBlob(blob: Blob, { filename }: DownloadBlobOptions): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function downloadText(
  content: string,
  { filename, mimeType }: { filename: string; mimeType: string }
): void {
  downloadBlob(new Blob([content], { type: mimeType }), { filename });
}
