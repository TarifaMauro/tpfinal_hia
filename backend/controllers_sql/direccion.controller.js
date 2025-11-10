const { Address } = require('../models_sql');

const ctrl = {};

ctrl.createDireccion = async (req, res) => {
  try {
    const { calle, ciudad, provincia, codigo_postal, user_id } = req.body;
    if (!calle || !ciudad || !provincia || !codigo_postal) {
      return res.status(400).json({ status: 'ERROR', msg: 'Faltan campos requeridos' });
    }
    const nueva = await Address.create({ calle, ciudad, provincia, codigo_postal, user_id: user_id || null });
    return res.status(201).json({ status: 'OK', direccion: nueva });
  } catch (err) {
    console.error('Error createDireccion:', err.stack || err);
    return res.status(500).json({ status: 'ERROR', msg: 'Error procesando operación', causa: err.message });
  }
};

ctrl.getDirecciones = async (req, res) => {
  try {
    const direcciones = await Address.findAll();
    return res.json({ status: 'OK', direcciones });
  } catch (err) {
    return res.status(500).json({ status: 'ERROR', msg: 'Error procesando operación', causa: err.message });
  }
};

ctrl.getDireccionById = async (req, res) => {
  try {
    const id = req.params.id;
    const direccion = await Address.findByPk(id);
    if (!direccion) return res.status(404).json({ status: 'ERROR', msg: 'Dirección no encontrada' });
    return res.json({ status: 'OK', direccion });
  } catch (err) {
    return res.status(500).json({ status: 'ERROR', msg: 'Error procesando operación', causa: err.message });
  }
};

ctrl.updateDireccion = async (req, res) => {
  try {
    const id = req.params.id;
    const direccion = await Address.findByPk(id);
    if (!direccion) return res.status(404).json({ status: 'ERROR', msg: 'Dirección no encontrada' });
    const { calle, ciudad, provincia, codigo_postal, user_id } = req.body;
    await direccion.update({ calle: calle ?? direccion.calle, ciudad: ciudad ?? direccion.ciudad, provincia: provincia ?? direccion.provincia, codigo_postal: codigo_postal ?? direccion.codigo_postal, user_id: user_id ?? direccion.user_id });
    return res.json({ status: 'OK', direccion });
  } catch (err) {
    return res.status(500).json({ status: 'ERROR', msg: 'Error procesando operación', causa: err.message });
  }
};

ctrl.deleteDireccion = async (req, res) => {
  try {
    const id = req.params.id;
    const direccion = await Address.findByPk(id);
    if (!direccion) return res.status(404).json({ status: 'ERROR', msg: 'Dirección no encontrada' });
    await Address.destroy({ where: { id } });
    return res.json({ status: 'OK', msg: 'Dirección eliminada correctamente' });
  } catch (err) {
    return res.status(500).json({ status: 'ERROR', msg: 'Error procesando operación', causa: err.message });
  }
};

module.exports = ctrl;
