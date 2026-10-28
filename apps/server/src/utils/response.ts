import { Response } from 'express';
import { ApiResponse, PaginatedResponse, PaginationMeta } from '@infernux/shared';

export function sendSuccess<T>(res: Response, data: T, message?: string, statusCode = 200): Response {
  const body: ApiResponse<T> = {
    success: true,
    message,
    data,
  };
  return res.status(statusCode).json(body);
}

export function sendPaginated<T>(
  res: Response,
  items: T[],
  pagination: PaginationMeta,
  message?: string,
  statusCode = 200
): Response {
  const body: ApiResponse<PaginatedResponse<T>> = {
    success: true,
    message,
    data: {
      items,
      pagination,
    },
  };
  return res.status(statusCode).json(body);
}

export function sendError(
  res: Response,
  message: string,
  statusCode = 400,
  code = 'ERROR',
  details?: any
): Response {
  const body: ApiResponse = {
    success: false,
    error: {
      code,
      message,
      details,
    },
  };
  return res.status(statusCode).json(body);
}

export function getParam(param: string | string[] | undefined, fallback = ''): string {
  if (!param) return fallback;
  return Array.isArray(param) ? param[0] : param;
}
