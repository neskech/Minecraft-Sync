import { None, Option, Some } from './Option'

export function tabulate<A>(n: number, fn: (i: number) => A): A[] {
  const a: A[] = []
  for (let i = 0; i < n; i++) {
    a.push(fn(i))
  }
  return a
}

export function pop<A>(a: A[]): Option<A> {
  return Option.fromNull(a.pop())
}

export function find<A>(a: A[], fn: (a: A, i?: number) => boolean): Option<A> {
  return Option.fromNull(a.find(fn))
}

export function indexOf<A>(a: A[], el: A, fromIndex?: number): Option<number> {
  const res = a.indexOf(el, fromIndex)
  if (res < 0) return None()
  return Some(res)
}

export function lastIndexOf<A>(a: A[], el: A, fromIndex?: number): Option<number> {
  const res = a.lastIndexOf(el, fromIndex)
  if (res < 0) return None()
  return Some(res)
}

export function zip<A, B>(a: A[], b: B[]): [A, B][] {
  const minLen = Math.min(a.length, b.length)
  const arr: [A, B][] = []
  for (let i = 0; i < minLen; i++) arr.push([a[i], b[i]])
  return arr
}

export function zipWith<A, B, C>(a: A[], b: B[], fn: (a: A, b: B) => C): C[] {
  const minLen = Math.min(a.length, b.length)
  const arr: C[] = []
  for (let i = 0; i < minLen; i++) arr.push(fn(a[i], b[i]))
  return arr
}

export function unzip<A, B>(arr: [A, B][]): [A[], B[]] {
  const a: A[] = []
  const b: B[] = []

  for (const [a_, b_] of arr) {
    a.push(a_)
    b.push(b_)
  }

  return [a, b]
}

export function take<A>(a: A[], n: number): A[] {
  const arr: A[] = []
  for (let j = 0; j < n; j++) arr.push(a[j])
  return arr
}

export function takeWhile<A>(a: A[], fn: (a: A) => boolean): A[] {
  let i = 0
  while (i < a.length && fn(a[i])) i++

  const arr: A[] = []
  for (let j = 0; j < i; j++) arr.push(a[j])
  return arr
}

export function drop<A>(a: A[], n: number): A[] {
  const arr: A[] = []
  for (let j = n; j < a.length; j++) arr.push(a[j])
  return arr
}

export function dropWhile<A>(a: A[], fn: (a: A) => boolean): A[] {
  let i = 0
  while (i < a.length && fn(a[i])) i++

  const arr: A[] = []
  for (let j = i; j < a.length; j++) arr.push(a[j])
  return arr
}
