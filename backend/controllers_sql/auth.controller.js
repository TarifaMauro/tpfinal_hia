const jwt = require('jsonwebtoken');

const authCtrl = {};

authCtrl.verifyToken = async (req, res, next) => {
  if (!req.headers.authorization) return res.status(401).json({ status: 0, msg: 'No se ha proporcionado un token de autorización' });
  const parts = req.headers.authorization.split(' ');
  const token = parts.length >= 2 ? parts[1] : null;
  if (!token) return res.status(401).json({ status: 0, msg: 'Token de autorización no válido' });
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = payload.id;
    req.userRol = payload.rol || payload.role || null;
    req.user = payload;
    next();
  } catch (err) {
    return res.status(401).json({ status: 0, msg: 'Token de autorización no válido' });
  }
};

module.exports = authCtrl;
