/**
 * Normalizes backend ErrorResponse structure into a clean, displayable object.
 * Follows GlobalExceptionHandler format:
 * { correlationId, errorCode, message, status, timestamp, path, validationErrors }
 */
export function parseApiError(error) {
  if (!error) {
    return {
      message: 'An unknown error occurred.',
      errorCode: 'UNKNOWN',
      status: 500,
      validationErrors: null,
      correlationId: null,
    };
  }

  // Network, offline, or timeout error
  if (!error.response) {
    if (error.code === 'ECONNABORTED' || error.message?.toLowerCase().includes('timeout')) {
      return {
        message: 'The request took longer than expected and timed out. Please try again.',
        errorCode: 'TIMEOUT',
        status: 408,
        validationErrors: null,
        correlationId: null,
      };
    }

    return {
      message: error.message || 'Network error. Could not connect to OrgIntel server.',
      errorCode: 'NETWORK_ERROR',
      status: 0,
      validationErrors: null,
      correlationId: null,
    };
  }

  const { data, status } = error.response;

  // If backend returned structured JSON ErrorResponse
  if (data && typeof data === 'object') {
    const correlationId = data.correlationId || null;
    const errorCode = data.errorCode || (status === 401 ? 'UNAUTHORIZED' : status === 403 ? 'FORBIDDEN' : 'SERVER_ERROR');
    const message = data.message || 'Operation failed.';
    const validationErrors = data.validationErrors || null;

    return {
      message,
      errorCode,
      status,
      validationErrors,
      correlationId,
    };
  }

  return {
    message: typeof data === 'string' ? data : `Request failed with status ${status}`,
    errorCode: `HTTP_${status}`,
    status,
    validationErrors: null,
    correlationId: null,
  };
}

/**
 * Returns formatted validation error string or array for a specific form field.
 */
export function getFieldError(validationErrors, fieldName) {
  if (!validationErrors || !validationErrors[fieldName]) {
    return null;
  }
  const errors = validationErrors[fieldName];
  return Array.isArray(errors) ? errors.join(', ') : String(errors);
}
