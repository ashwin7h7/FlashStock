import jwt from "jsonwebtoken";

const authUser = (req, res, next) => {
  const token = req.cookies?.token;

  if (!token) {
    return res.status(401).json({ success: false, message: "Not Authorized",
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (!decoded.id) {
      return res.status(401).json({ success: false, message: "Invalid token",
      });
    }

    req.userId = decoded.id; // You can also attach decoded for more info: req.user = decoded
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: "Invalid or expired token",
    });
  }
};

export default authUser;
