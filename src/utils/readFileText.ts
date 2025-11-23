/**
 * Robust file reader utility for reading File/Blob objects as text
 * Handles different environments (browser, Node, Jest) gracefully
 * 
 * @param file - File or Blob object to read
 * @returns Promise resolving to text content
 */
export async function readFileText(file: any): Promise<string> {
  if (!file) return '';
  
  // Modern browsers and polyfilled environments
  if (typeof file.text === 'function') {
    return await file.text();
  }
  
  // Fallback using arrayBuffer (more universally supported)
  if (typeof file.arrayBuffer === 'function') {
    const buf = await file.arrayBuffer();
    return new TextDecoder().decode(buf);
  }
  
  // Final fallback to FileReader for older environments
  return await new Promise<string>((resolve, reject) => {
    try {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = (e) => reject(e);
      reader.readAsText(file);
    } catch (err) {
      reject(err);
    }
  });
}
