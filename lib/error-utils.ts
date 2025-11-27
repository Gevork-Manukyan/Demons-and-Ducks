import type { ActionResult } from "./errors";

export function getErrorMessage<T>(result: ActionResult<T> | null | undefined): string | null {
  if (!result) return null;
  if (result.error === true) {
    return result.message;
  }
  return null;
}

export function hasError<T>(result: ActionResult<T> | null | undefined): boolean {
  if (!result) return false;
  return result.error === true;
}

export function getErrorCode<T>(result: ActionResult<T> | null | undefined): string | null {
  if (!result || result.error === false) return null;
  return result.code || null;
}

export function getErrorField<T>(result: ActionResult<T> | null | undefined): string | null {
  if (!result || result.error === false) return null;
  return result.field || null;
}

