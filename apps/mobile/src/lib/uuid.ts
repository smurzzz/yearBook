/* RFC-4122 v4 identifiers — the API keys every upload intent by
   `client_id` (a uuid), and the retry of a failed photo has to reuse the
   same one so the server recognises it as the same upload. */

const hex = (): string => Math.floor(Math.random() * 0x10000).toString(16).padStart(4, "0");

export const randomUuid = (): string =>
  `${hex()}${hex()}-${hex()}-4${hex().slice(1)}-${((Math.random() * 4) & 0x3 | 0x8).toString(16)}${hex().slice(1)}-${hex()}${hex()}${hex()}`;
