import multer from 'multer';

export function notFoundHandler(_req, res) {
  return res.status(404).json({ message: 'Endpoint not found.' });
}

export function errorHandler(err, _req, res, _next) {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ message: 'CV file must not exceed 5MB.' });
    }
    return res.status(400).json({ message: err.message });
  }

  if (err.message === 'Only PDF, DOC, DOCX files are allowed.') {
    return res.status(400).json({ message: err.message });
  }

  return res.status(500).json({ message: 'Internal server error.', error: err.message });
}
