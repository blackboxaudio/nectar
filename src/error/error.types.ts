/**
 * Wraps a functions return type to account for possible errors that
 * may occur during its execution. If a function is likely to throw errors,
 * using this type is preferred.
 *
 * @example
 * ```
 * function divide(a: number, b: number): Result<number>
 *
 * const [result, error] = divide(1, 0)
 * if (error) {
 *     // Do something with the error
 * } else {
 *     // Do something with the result
 * }
 * ```
 */
export type Result<T, E = Error> = [T, null] | [null, E]
