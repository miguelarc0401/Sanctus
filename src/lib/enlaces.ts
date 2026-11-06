// Lo que el coordinador pega: si le falta el «https://», se le pone.
export function normalizarEnlace(valor: string) {
  const limpio = valor.trim()
  if (!limpio) return null
  return /^https?:\/\//i.test(limpio) ? limpio : `https://${limpio}`
}
