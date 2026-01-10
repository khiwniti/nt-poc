export async function elementToPngBlob(
  element: HTMLElement,
  { backgroundColor = '#ffffff', scale = 2 }: { backgroundColor?: string; scale?: number } = {}
): Promise<Blob> {
  const html2canvas = (await import('html2canvas')).default;
  const canvas = await html2canvas(element, { backgroundColor, scale });

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((result) => {
      if (!result) {
        reject(new Error('Failed to render PNG'));
        return;
      }
      resolve(result);
    }, 'image/png');
  });

  return blob;
}
