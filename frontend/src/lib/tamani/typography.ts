// French typesetting for the big handwritten titles: "là ?" must not leave
// its "?" alone on the next line.

const NBSP = String.fromCharCode(0xa0);

/** Replaces the space before ? ! : ; with a no-break space. */
export function frenchSpacing(text: string): string {
  return text.replace(/ ([?!:;])/g, `${NBSP}$1`);
}
