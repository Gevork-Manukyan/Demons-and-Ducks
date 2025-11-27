import { ERROR_CODES, type ErrorCode } from "./error-codes";

export type ActionError = {
  error: true;
  message: string;
  code?: ErrorCode;
  field?: string;
};

export type ActionSuccess<T> = {
  error: false;
  data: T;
};

export type ActionResult<T> = ActionError | ActionSuccess<T>;

export function actionSuccess<T>(data: T): ActionSuccess<T> {
  return {
    error: false,
    data,
  };
}

export function actionError(
  message: string,
  code?: ErrorCode,
  field?: string
): ActionError {
  return {
    error: true,
    message,
    code,
    field,
  };
}

export function isActionError<T>(
  result: ActionResult<T>
): result is ActionError {
  return result.error === true;
}

export function isActionSuccess<T>(
  result: ActionResult<T>
): result is ActionSuccess<T> {
  return result.error === false;
}

