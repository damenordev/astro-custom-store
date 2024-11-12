export const $ = function <T = HTMLDivElement>(selectors: string) {
  return document.querySelector(selectors) as T
}
export const $$ = function <T = HTMLDivElement>(selectors: string) {
  return document.querySelector(selectors) as T
}
