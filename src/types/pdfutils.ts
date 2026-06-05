import type { PageSize, TextElement } from './types'

export const getScaleForPageCount = (count: number): number => {
  if (count <= 4) return 1.2
  if (count <= 8) return 1.0
  if (count <= 16) return 0.8
  return 0.65
}

export const getPageSizeDimensions = (
  size: PageSize, 
  originalPointsWidth?: number, 
  originalPointsHeight?: number
): [number, number] => {
  const sizes: Record<Exclude<PageSize, 'original'>, [number, number]> = {
    a4: [210, 297],
    '8x11': [203.2, 279.4],
    '8x13': [203.2, 330.2],
    '8x14': [203.2, 355.6],
  };

  if (size === 'original' && originalPointsWidth && originalPointsHeight) {
    // Convert PDF points to millimeters (1 point = 0.352778 mm)
    const mmWidth = originalPointsWidth * 0.352778;
    const mmHeight = originalPointsHeight * 0.352778;
    return [mmWidth, mmHeight];
  }

  // Fallback to standard Letter size if 'original' is picked but dimensions aren't provided
  return sizes[size === 'original' ? '8x11' : size];
};

export function renderTextOverlayOnCanvas(ctx: CanvasRenderingContext2D, texts: any[]) {
  texts.forEach((el) => {
    // 1. Your existing font configuration setup
    const fontWeight = el.bold ? 'bold' : 'normal';
    ctx.font = `${fontWeight} ${el.fontSize}px Arial`; // (Or whatever font family you use)
    ctx.fillStyle = 'black';
    ctx.textBaseline = 'top'; // Essential for calculating underline position accurately

    // 2. Your existing code that draws the text string
    ctx.fillText(el.text, el.x, el.y);

    // 3. ADD THE UNDERLINE LOGIC HERE 👇
    if (el.underline) {
      // Calculate how wide the typed text actually is on the canvas
      const textWidth = ctx.measureText(el.text).width;
      
      // Position the line slightly below the text
      // Since baseline is 'top', text ends roughly at (el.y + el.fontSize)
      const underlineY = el.y + el.fontSize + 2; 

      ctx.beginPath();
      ctx.strokeStyle = 'black';                  // Matches your text color
      ctx.lineWidth = Math.max(1, el.fontSize * 0.08); // Thickness scales with font size
      ctx.moveTo(el.x, underlineY);               // Start line at left of text
      ctx.lineTo(el.x + textWidth, underlineY);   // End line at right of text
      ctx.stroke();
    }
  });
}