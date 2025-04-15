const jwt = require('jsonwebtoken');

// Middleware to protect routes
module.exports = (req, res, next) => {
  const authHeader = req.headers.authorization;

  // Check if Authorization header exists
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized - No token provided' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Check if token includes email
    if (!decoded.email) {
      return res.status(401).json({ error: 'Unauthorized - No email in token' });
    }

    // Check if domain is present
    if (!decoded.domain) {
      return res.status(401).json({ error: 'Unauthorized - No domain in token' });
    }

    // Add decoded user data to request
    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
      domain: decoded.domain
    };

    next(); // Continue to the protected route
  } catch (err) {
    console.error('❌ Token verification failed:', err);
    return res.status(401).json({ error: 'Unauthorized - Invalid token' });
  }
};
