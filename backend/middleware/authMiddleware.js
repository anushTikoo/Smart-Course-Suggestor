import jwt from 'jsonwebtoken';

const authenticateToken = (req, res, next) => {
  // Get the token from the Authorization header
  // Format: "Bearer <token>"
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  try {
    // Verify the access token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Attach the user payload to the request object
    // This makes req.user available to any route that uses this middleware
    req.user = decoded;
    
    next(); // Pass control to the next middleware or route handler
  } catch (error) {
    // If the token is invalid or expired
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Access token expired.' });
    }
    return res.status(403).json({ error: 'Invalid access token.' });
  }
};

export default authenticateToken;
