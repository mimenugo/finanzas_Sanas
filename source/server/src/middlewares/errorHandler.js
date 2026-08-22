export const errorHandler = (err, req, res, next) => {
  
  console.error(' Error:', {
    message: err.message,
    statusCode: err.statusCode || 500,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    path: req.path,
    method: req.method,
    user: req.user?.id || 'anonymous'
  });

  if (err.isOperational) {
    return res.status(err.statusCode).json({
      status: err.status,
      message: err.message
    });
  }

  if (err.code === 'P2002') {
    const field = err.meta?.target?.[0] || 'field';
    return res.status(409).json({
      status: 'fail',
      message: `${field} already exists`
    });
  }

  
  if (err.code === 'P2025') {
    return res.status(404).json({
      status: 'fail',
      message: 'Resource not found'
    });
  }

  
  if (err.code === 'P2003') {
    return res.status(400).json({
      status: 'fail',
      message: 'Invalid reference'
    });
  }


  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      status: 'fail',
      message: 'Token expired'
    });
  }


  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      status: 'fail',
      message: 'Invalid token'
    });
  }


  if (err.name === 'ValidationError') {
    return res.status(400).json({
      status: 'fail',
      message: err.message
    });
  }


  if (err.name === 'CastError') {
    return res.status(400).json({
      status: 'fail',
      message: 'Invalid ID format'
    });
  }


  res.status(500).json({
    status: 'error',
    message: process.env.NODE_ENV === 'development' 
      ? err.message 
      : 'Something went wrong'
  });
};