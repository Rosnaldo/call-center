export function toSlug(text: string): string {
  return text
    .normalize("NFD")                // separa acentos
    .replace(/[\u0300-\u036f]/g, "") // remove acentos
    .replace(/[^a-zA-Z0-9\s-]/g, "") // remove caracteres estranhos
    .trim()                           // remove espaços nas extremidades
    .replace(/\s+/g, "-")             // substitui espaços por traço
    .replace(/-+/g, "-")              // múltiplos traços viram 1
    .toLowerCase();                   // minúsculas
};
