const jwt = require("jsonwebtoken");

// Middleware to verify JWT token and extract user info
const auth = (req, res, next) => {
  const authHeader = req.headers.authorization;

  // Check for Bearer token
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized - No token provided" });
  }

  const token = authHeader.split(" ")[1];

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Validate required fields
    if (!decoded.email) {
      return res.status(401).json({ error: "Unauthorized - No email in token" });
    }

    if (!decoded.domain) {
      return res.status(401).json({ error: "Unauthorized - No domain in token" });
    }

    // Attach decoded user info to the request object
    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
      domain: decoded.domain,
    };

    next();
  } catch (err) {
    console.error("❌ Token verification failed:", err.message);
    return res.status(401).json({ error: "Unauthorized - Invalid token" });
  }
};

module.exports = auth;
