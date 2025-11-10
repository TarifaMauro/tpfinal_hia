const { Coupon } = require('../models_sql');
const { parseNumber, parseIntSafe, parseDateToISO } = require('./utils');

function mapCoupon(c) {
  if (!c) return null;
  const obj = c.toJSON ? c.toJSON() : { ...c };
  return {
    _id: obj.id,
    codigo: obj.codigo,
    nombre: obj.nombre,
    descuento: typeof obj.descuento === 'string' ? parseFloat(obj.descuento) : obj.descuento,
    fechaExpiracion: obj.fecha_expiracion ? (new Date(obj.fecha_expiracion)).toISOString().split('T')[0] : null,
    activo: !!obj.activo,
    usosMaximos: obj.usos_maximos,
    usosRestantes: obj.usos_restantes,
    createdAt: obj.created_at || obj.createdAt,
    updatedAt: obj.updated_at || obj.updatedAt
  };
}

const ctrl = {};

ctrl.createCupon = async (req, res) => {
  try {
    const { codigo, nombre } = req.body;
    const descuento = parseNumber(req.body.descuento);
    const fechaExpiracion = parseDateToISO(req.body.fechaExpiracion || req.body.fecha_expiracion);
    const usosMaximos = parseIntSafe(req.body.usosMaximos ?? req.body.usos_maximos) || 0;
    const cupon = await Coupon.create({ codigo, nombre, descuento, fecha_expiracion: fechaExpiracion, usos_maximos: usosMaximos, usos_restantes: usosMaximos });
    return res.json({ status: 'OK', cupon: mapCoupon(cupon) });
  } catch (err) {
    return res.status(400).json({ status: 'ERROR', msg: 'Error procesando operación', causa: err.message });
  }
};

ctrl.getCupones = async (req, res) => {
  try {
    const cupones = await Coupon.findAll();
    if (!cupones.length) return res.status(404).json({ status: 'ERROR', msg: 'No se encontraron cupones' });
    const mapped = cupones.map(mapCoupon);
    return res.json({ status: 'OK', cupones: mapped });
  } catch (err) {
    return res.status(500).json({ status: 'ERROR', msg: 'Error procesando operación', causa: err.message });
  }
};

ctrl.getCuponById = async (req, res) => {
  try {
    const id = req.params.id;
    const cupon = await Coupon.findByPk(id);
    if (!cupon) return res.status(404).json({ status: 'ERROR', msg: 'Cupón no encontrado' });
    return res.json({ status: 'OK', cupon: mapCoupon(cupon) });
  } catch (err) {
    return res.status(500).json({ status: 'ERROR', msg: 'Error procesando operación', causa: err.message });
  }
};

ctrl.getCuponByCodigo = async (req, res) => {
  try {
    const codigo = req.params.codigo;
    const cupon = await Coupon.findOne({ where: { codigo } });
    if (!cupon) return res.status(404).json({ status: 'ERROR', msg: 'Cupón no encontrado' });
    return res.json({ status: 'OK', cupon: mapCoupon(cupon) });
  } catch (err) {
    return res.status(500).json({ status: 'ERROR', msg: 'Error procesando operación', causa: err.message });
  }
};

ctrl.updateCupon = async (req, res) => {
  try {
    const id = req.params.id;
    const payload = { ...req.body };
    if (payload.descuento != null) payload.descuento = parseNumber(payload.descuento);
    if (payload.fechaExpiracion || payload.fecha_expiracion) payload.fecha_expiracion = parseDateToISO(payload.fechaExpiracion || payload.fecha_expiracion);
    if (payload.usosMaximos != null || payload.usos_maximos != null) payload.usos_maximos = parseIntSafe(payload.usosMaximos ?? payload.usos_maximos);
    delete payload.fechaExpiracion;
    delete payload.usosMaximos;
    const [updated] = await Coupon.update(payload, { where: { id } });
    if (!updated) return res.status(404).json({ status: 'ERROR', msg: 'Cupón no encontrado' });
    const cupon = await Coupon.findByPk(id);
    return res.json({ status: 'OK', cupon: mapCoupon(cupon) });
  } catch (err) {
    return res.status(400).json({ status: 'ERROR', msg: 'Error procesando operación', causa: err.message });
  }
};

ctrl.deleteCupon = async (req, res) => {
  try {
    const deleted = await Coupon.destroy({ where: { id: req.params.id } });
    if (!deleted) return res.status(404).json({ status: 'ERROR', msg: 'Cupón no encontrado' });
    return res.json({ status: 'OK', msg: 'Cupón eliminado correctamente' });
  } catch (err) {
    return res.status(400).json({ status: 'ERROR', msg: 'Error procesando operación', causa: err.message });
  }
};

ctrl.applyCupon = async (req, res) => {
  try {
    const { codigo } = req.body;
    if (!codigo) return res.status(400).json({ status: 'ERROR', msg: 'Código de cupón requerido' });
    const cupon = await Coupon.findOne({ where: { codigo } });
    if (!cupon) return res.status(404).json({ status: 'ERROR', msg: 'Cupón no encontrado' });

    const ahora = new Date();
    if (!cupon.activo) return res.status(400).json({ status: 'ERROR', msg: 'Cupón no está activo' });
    if (cupon.fecha_expiracion && new Date(cupon.fecha_expiracion) < ahora) return res.status(400).json({ status: 'ERROR', msg: 'Cupón expirado' });
    if (typeof cupon.usos_restantes === 'number' && cupon.usos_restantes <= 0) return res.status(400).json({ status: 'ERROR', msg: 'Cupón sin usos disponibles' });

    if (typeof cupon.usos_restantes === 'number') {
      cupon.usos_restantes = cupon.usos_restantes - 1;
      await cupon.save();
    }

    return res.json({ status: 'OK', msg: 'Cupón aplicado correctamente', descuento: cupon.descuento });
  } catch (err) {
    return res.status(500).json({ status: 'ERROR', msg: 'Error procesando operación', causa: err.message });
  }
};

module.exports = ctrl;
