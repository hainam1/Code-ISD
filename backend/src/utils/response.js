export function asyncHandler(handler) {
  return async (req, res, next) => {
    try {
      await handler(req, res, next);
    } catch (error) {
      next(error);
    }
  };
}

export function errorHandler(error, _req, res, _next) {
  const status = Number(error?.status || 500);
  const message = error?.message || 'Internal server error.';
  if (status >= 500) {
    // eslint-disable-next-line no-console
    console.error(error);
  }
  res.status(status).json({ message });
}
