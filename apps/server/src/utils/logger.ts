type LogLevel = 'info' | 'warn' | 'error' | 'debug';

interface LogPayload {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: string;
  data?: Record<string, any>;
  error?: {
    message: string;
    stack?: string;
    code?: string;
  };
}

class Logger {
  private formatLog(level: LogLevel, message: string, context?: string, data?: any, err?: any): LogPayload {
    const sanitizedData = data ? this.sanitize(data) : undefined;
    return {
      level,
      message,
      timestamp: new Date().toISOString(),
      context,
      data: sanitizedData,
      error: err
        ? {
            message: err.message || String(err),
            stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
            code: err.code,
          }
        : undefined,
    };
  }

  private sanitize(obj: any): any {
    if (!obj || typeof obj !== 'object') return obj;
    const sensitiveKeys = ['password', 'token', 'accessToken', 'refreshToken', 'secretKey', 'authorization'];
    const sanitized: Record<string, any> = Array.isArray(obj) ? [] : {};

    for (const key of Object.keys(obj)) {
      if (sensitiveKeys.some((s) => key.toLowerCase().includes(s))) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof obj[key] === 'object' && obj[key] !== null) {
        sanitized[key] = this.sanitize(obj[key]);
      } else {
        sanitized[key] = obj[key];
      }
    }
    return sanitized;
  }

  info(message: string, context?: string, data?: any) {
    const payload = this.formatLog('info', message, context, data);
    console.log(JSON.stringify(payload));
  }

  warn(message: string, context?: string, data?: any) {
    const payload = this.formatLog('warn', message, context, data);
    console.warn(JSON.stringify(payload));
  }

  error(message: string, context?: string, err?: any, data?: any) {
    const payload = this.formatLog('error', message, context, data, err);
    console.error(JSON.stringify(payload));
  }

  debug(message: string, context?: string, data?: any) {
    if (process.env.NODE_ENV !== 'production') {
      const payload = this.formatLog('debug', message, context, data);
      console.debug(JSON.stringify(payload));
    }
  }
}

export const logger = new Logger();
