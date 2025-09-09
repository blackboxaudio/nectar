/**
 * Wraps a functions return type to account for possible errors that
 * may occur during its execution. If a function is likely to throw errors,
 * using this type is preferred.
 */
export type Result<T, E = Error> = [T, null] | [null, E]
