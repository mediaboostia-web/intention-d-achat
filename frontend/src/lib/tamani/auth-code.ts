/** Email codes are 8 Crockford characters; phones often add spaces or lowercase. */
export const normalizeCode = (raw: string) => raw.replace(/\s/g, '').toUpperCase().slice(0, 8);
