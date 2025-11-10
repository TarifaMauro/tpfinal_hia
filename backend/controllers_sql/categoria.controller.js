const { Category } = require('../models_sql');

const ctrl = {};

ctrl.createCategoria = async (req, res) => {
  try {
    const { nombre, descripcion } = req.body;
    const existing = await Category.findOne({ where: { nombre } });
    if (existing) return res.status(409).json({ status: 'ERROR', msg: 'Ya existe una categoría con ese nombre' });
    const cat = await Category.create({ nombre, descripcion });
    return res.json({ status: 'OK', msg: 'Categoria guardada correctamente', categoria: cat });
  } catch (err) {
    return res.status(400).json({ status: 'ERROR', msg: 'Error procesando operación', causa: err.message });
  }
};

ctrl.getCategorias = async (req, res) => {
  try {
    const categorias = await Category.findAll();
    if (!categorias.length) return res.status(404).json({ status: 'ERROR', msg: 'No se encontraron categorias' });
    return res.json({ status: 'OK', categorias });
  } catch (err) {
    return res.status(500).json({ status: 'ERROR', msg: 'Error procesando operación', causa: err.message });
  }
};

ctrl.eliminarCategoria = async (req, res) => {
  try {
    const id = req.params.id;
    const deleted = await Category.destroy({ where: { id } });
    if (!deleted) return res.status(404).json({ status: 'ERROR', msg: 'categoria no encontrada' });
    return res.json({ status: 'OK', msg: 'Categoría eliminado correctamente' });
  } catch (err) {
    return res.status(400).json({ status: 'ERROR', msg: 'Error procesando operación', causa: err.message });
  }
};

module.exports = ctrl;
