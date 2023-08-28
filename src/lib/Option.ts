import { type Result, Ok, Err, type Unit, unit } from './Result'

type Some_<T> = { __type: 'Some'; value: T }
type None_ = { __type: 'None' }
type Option_<T> = Some_<T> | None_

function Some_<T>(t: T): Option_<T> {
  return { __type: 'Some', value: t }
}

function None_<T>(): Option_<T> {
  return { __type: 'None' }
}

function isSome_<T>(o: Option_<T>): o is Some_<T> {
  return o.__type === 'Some'
}

function isNone_<T>(o: Option_<T>): o is None_ {
  return o.__type === 'None'
}

export type NullToOption<T> = Option<NonNullable<T>>

export class Option<T> {
  data: Option_<T>

  constructor(o: Option_<T>) {
    this.data = o
  }

  isSome(): boolean {
    return isSome_(this.data)
  }

  isNone(): boolean {
    return isNone_(this.data)
  }

  static fromNull<T>(t: T): NullToOption<T> {
    if (t) return Some(t)
    return None()
  }

  static fromException<T>(fn: () => T): Option<T> {
    try {
      const val: T = fn()
      return Some(val)
    } catch (_) {
      return None()
    }
  }

  static fromError<T>(fn: () => T): Option<T> {
    try {
      const val: T = fn()
      return Some(val)
    } catch (_) {
      return None()
    }
  }

  static async promiseOptional<T>(p: Promise<T>): Promise<Option<T>> {
    return p.then((t) => Some(t)).catch(() => None())
  }

  static definePredicate<T, U extends T>(fn: (t: T) => t is U): (t: T) => Option<U> {
    return function (t: T): Option<U> {
      try {
        return fn(t) ? Some(t) : None()
      } catch (_) {
        return None()
      }
    }
  }

  toNull(): T | undefined {
    if (isSome_(this.data)) return this.data.value
    return undefined
  }

  unwrap(): T {
    if (isSome_(this.data)) return this.data.value
    throw new Error('Tried unwrapping option with type none')
  }

  unwrapOrDefault(default_: T): T {
    if (isSome_(this.data)) return this.data.value
    return default_
  }

  unwrapOrElse(fn: () => T): T {
    if (isSome_(this.data)) return this.data.value
    return fn()
  }

  expect(errMsg: string): T {
    if (isSome_(this.data)) return this.data.value
    throw new Error(errMsg)
  }

  toResult(): Result<T, Unit> {
    if (isSome_(this.data)) return Ok(this.data.value)
    return Err(unit)
  }

  toResultWithErr<E>(e: E): Result<T, E> {
    if (isSome_(this.data)) return Ok(this.data.value)
    return Err(e)
  }

  toString(): string {
    // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
    if (isSome_(this.data)) return `Some(${this.data.value})`
    return 'None'
  }

  log(): void {
    console.log(this.toString())
  }

  logWith(logger: (s: string) => void): void {
    logger(this.toString())
  }

  ////////////////advanced functions////////////////////////////

  match<R>(someCase: (t: T) => R, noneCase: () => R): R {
    if (isSome_(this.data)) return someCase(this.data.value)
    return noneCase()
  }

  matchEffect<L, R>(someCase: (t: T) => L, noneCase: () => R): void {
    ;``
    if (isSome_(this.data)) someCase(this.data.value)
    else noneCase()
  }

  map<U>(fn: (t: T) => U): Option<U> {
    if (isSome_(this.data)) return Some(fn(this.data.value))
    return None()
  }

  mapOr<U>(fn: (t: T) => U, default_: U): Option<U> {
    if (isSome_(this.data)) return Some(fn(this.data.value))
    return Some(default_)
  }

  mapOrElse<U>(fn: (t: T) => U, fallback: () => U): Option<U> {
    if (isSome_(this.data)) return Some(fn(this.data.value))
    return Some(fallback())
  }

  flatMap<U>(fn: (t: T) => Option<U>): Option<U> {
    if (isSome_(this.data)) return fn(this.data.value)
    return None()
  }

  filter(fn: (t: T) => boolean): Option<T> {
    if (isSome_(this.data) && fn(this.data.value)) return this
    return None()
  }

  predicate(fn: (t: T) => boolean): boolean {
    if (isSome_(this.data) && fn(this.data.value)) return true
    return false
  }

  zip<U>(o: Option<U>): Option<[T, U]> {
    if (isSome_(this.data) && o.isSome()) return Some([this.data.value, o.unwrap()])
    return None()
  }

  zipWith<U, Z>(o: Option<U>, fn: (t: T, u: U) => Z): Option<Z> {
    if (isSome_(this.data) && o.isSome()) return Some(fn(this.data.value, o.unwrap()))
    return None()
  }

  or(o: Option<T>): Option<T> {
    if (isSome_(this.data)) return this
    return o
  }

  lazyOr(o: () => Option<T>): Option<T> {
    if (isSome_(this.data)) return this
    return o()
  }

  and(o: Option<T>): Option<T> {
    if (isNone_(this.data)) return this
    return o
  }

  static flatten<T>(o: Option<Option<T>>): Option<T> {
    if (o.isSome()) return o.unwrap()
    return None()
  }
}

export function Some<T>(t: T): Option<T> {
  return new Option(Some_(t))
}

export function None<T>(): Option<T> {
  return new Option(None_())
}
