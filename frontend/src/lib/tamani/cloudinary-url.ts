// Cloudinary serves resized copies from the same URL with a transformation
// inserted after /image/upload/ (spec §6.6): the popup asks for 600 px, a
// link preview for a light 1200 × 630 JPEG.
export const POPUP_PHOTO = 'f_auto,q_auto,w_600';
export const OG_PHOTO = 'c_fill,g_auto,w_1200,h_630,f_jpg,q_auto';

const UPLOAD = /^(https:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\/)(.+)$/;

/** The URL with `transformation` applied; any other URL comes back unchanged. */
export function cloudinaryVariant(url: string, transformation: string): string {
  const m = UPLOAD.exec(url);
  return m ? `${m[1]}${transformation}/${m[2]}` : url;
}
