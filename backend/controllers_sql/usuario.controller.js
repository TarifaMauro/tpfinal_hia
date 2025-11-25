const { User } = require('../models_sql');
const { Op } = require('sequelize');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const sanitizeHtml = require('sanitize-html');
const { OAuth2Client } = require('google-auth-library');

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

const ctrl = {};
ctrl.obtenerUsuariosCursor = async (req, res) => {
  try {
    const cursor = req.query.cursor || null;
    const limit = Math.min(100, parseInt(req.query.limit) || 25);
    const q = (req.query.q || '').trim();

    const where = {};

    if (q) {
      where[Op.or] = [
        { username: { [Op.iLike]: `%${q}%` } },
        { email: { [Op.iLike]: `%${q}%` } },
        { nombres: { [Op.iLike]: `%${q}%` } },
        { apellido: { [Op.iLike]: `%${q}%` } }
      ];
    }

    // Cursor basado en createdAt
    if (cursor) {
      where.createdAt = { [Op.gt]: new Date(cursor) };
    }

    const users = await User.findAll({
      where,
      limit,
      order: [['createdAt', 'ASC']],
      attributes: { exclude: ['password'] }
    });

    const last = users.length > 0 ? users[users.length - 1] : null;

    return res.json({
      items: users,
      nextCursor: last ? last.createdAt : null,
      hasNext: users.length === limit,
    });

  } catch (err) {
    console.error('Error obtenerUsuariosCursor:', err);
    return res.status(500).json({ msg: 'Error al obtener usuarios', error: err.message });
  }
};



ctrl.createUsuario = async (req, res) => {
  try {
    const camposSanitizados = {
      username: sanitizeHtml(req.body.username || ''),
      email: sanitizeHtml(req.body.email || ''),
      nombres: sanitizeHtml(req.body.nombres || ''),
      apellido: sanitizeHtml(req.body.apellido || '')
    };

    const existingEmail = await User.findOne({ where: { email: camposSanitizados.email } });
    if (existingEmail) return res.status(409).json({ status: 0, msg: 'El email ya está registrado' });

    const existingUsername = await User.findOne({ where: { username: camposSanitizados.username } });
    if (existingUsername) return res.status(409).json({ status: 0, msg: 'El nombre de usuario ya está registrado' });

    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(req.body.password, saltRounds);

    const user = await User.create({
      ...camposSanitizados,
      password: hashedPassword,
      rol: req.body.rol || 'cliente'
    });

    return res.status(201).json({ status: 1, msg: 'Usuario guardado correctamente', usuarioId: user.id });
  } catch (err) {
    return res.status(400).json({ status: 0, msg: 'Error procesando operación', causa: err.message });
  }
};

ctrl.getUsuarios = async (req, res) => {
  try {
    const users = await User.findAll({ attributes: { exclude: ['password'] } });
    return res.status(200).json({ status: 1, msg: 'Usuarios obtenidos correctamente', data: users });
  } catch (err) {
    console.error('Error in updateUsuario:', err.stack || err);
    return res.status(500).json({ status: 0, msg: 'Error del servidor', causa: err.message });
  }
};

ctrl.getUsuario = async (req, res) => {
  try {
    const { id } = req.params;
    const usuario = await User.findByPk(id, { attributes: { exclude: ['password'] } });
    if (!usuario) return res.status(404).json({ status: 0, msg: 'El usuario no existe' });
    return res.status(200).json({ status: 1, msg: 'Usuario encontrado', data: usuario });
  } catch (err) {
    return res.status(500).json({ status: 0, msg: 'Error del servidor', causa: err.message });
  }
};

ctrl.loginUsuario = async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ status: 0, msg: 'Faltan campos requeridos' });

    const usuario = await User.findOne({ where: { username } });
    if (!usuario) return res.status(401).json({ status: 0, msg: 'Usuario o contraseña incorrectos' });

    const match = await bcrypt.compare(password, usuario.password);
    if (!match) return res.status(401).json({ status: 0, msg: 'Usuario o contraseña incorrectos' });

    const token = jwt.sign({ id: usuario.id, rol: usuario.rol }, process.env.JWT_SECRET, { expiresIn: '1h' });

    return res.status(200).json({
      status: 1,
      msg: 'Login exitoso',
      token,
      username: sanitizeHtml(usuario.username),
      rol: usuario.rol,
      userId: usuario.id,
      email: usuario.email,
      nombres: sanitizeHtml(usuario.nombres),
      apellido: sanitizeHtml(usuario.apellido)
    });
  } catch (err) {
    return res.status(500).json({ status: 0, msg: 'Error del servidor', causa: err.message });
  }
};

ctrl.loginGoogle = async (req, res) => {
  const { token } = req.body;
  if (!token || typeof token !== 'string' || token.trim() === '') return res.status(400).json({ status: 0, msg: 'Token de Google requerido' });
  try {
    const ticket = await googleClient.verifyIdToken({ idToken: token, audience: GOOGLE_CLIENT_ID });
    const payload = ticket.getPayload();

    let usuario = await User.findOne({ where: { email: payload.email } });
    if (!usuario) {
      const saltRounds = 10;
      const randomPassword = Math.random().toString(36).slice(-8);
      const hashedPassword = await bcrypt.hash(randomPassword, saltRounds);
      usuario = await User.create({ username: payload.name, password: hashedPassword, email: payload.email, nombres: payload.given_name || '', apellido: payload.family_name || '', rol: 'cliente' });
    }

    const jwtToken = jwt.sign({ id: usuario.id, rol: usuario.rol }, process.env.JWT_SECRET, { expiresIn: '1h' });

    return res.status(200).json({ userId: usuario.id, username: sanitizeHtml(usuario.username), email: usuario.email, imagen: payload.picture, nombres: sanitizeHtml(usuario.nombres), apellido: sanitizeHtml(usuario.apellido), rol: usuario.rol, token: jwtToken });
  } catch (err) {
    return res.status(401).json({ msg: 'Token de Google inválido', causa: err.message });
  }
};

ctrl.updateUsuario = async (req, res) => {
  try {
    const { id } = req.params;
    const datosActualizados = { username: sanitizeHtml(req.body.username || ''), nombres: sanitizeHtml(req.body.nombres || ''), apellido: sanitizeHtml(req.body.apellido || '') };

    if (datosActualizados.username) {
      const usernameRegistrado = await User.findOne({ where: { username: datosActualizados.username, id: { [require('sequelize').Op.ne]: id } } });
      if (usernameRegistrado) return res.status(409).json({ status: 0, msg: 'El nombre de usuario ya está registrado' });
    }

    const [updated] = await User.update(datosActualizados, { where: { id } });
    if (!updated) return res.status(404).json({ status: 0, msg: 'Usuario no encontrado' });
    const usuarioActualizado = await User.findByPk(id, { attributes: { exclude: ['password'] } });
    return res.status(200).json({ status: 1, msg: 'Usuario actualizado correctamente', usuario: usuarioActualizado });
  } catch (err) {
    return res.status(500).json({ status: 0, msg: 'Error del servidor', causa: err.message });
  }
};

ctrl.deleteUsuario = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await User.destroy({ where: { id } });
    if (!deleted) return res.status(404).json({ status: 0, msg: 'Usuario no encontrado' });
    return res.status(200).json({ status: 1, msg: 'Usuario eliminado correctamente' });
  } catch (err) {
    return res.status(500).json({ status: 0, msg: 'Error del servidor', causa: err.message });
  }
};

ctrl.getUsuariosByUsername = async (req, res) => {
  try {
    const { username } = req.params;
    if (!username || username.trim() === '') return res.status(400).json({ status: 0, msg: 'El nombre de usuario es requerido para la búsqueda' });
    const { Op } = require('sequelize');
    const usuarios = await User.findAll({ where: { username: { [Op.iLike]: `%${username}%` } }, attributes: { exclude: ['password'] } });
    return res.status(200).json({ status: 1, msg: 'Usuarios encontrados', data: usuarios });
  } catch (err) {
    return res.status(500).json({ status: 0, msg: 'Error del servidor', causa: err.message });
  }
};

module.exports = ctrl;
