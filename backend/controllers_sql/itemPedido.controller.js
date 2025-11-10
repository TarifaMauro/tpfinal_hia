const { OrderItem, Product } = require('../models_sql');

const ctrl = {};

ctrl.createItemPedido = async (req, res) => {
  try {
    const { product_id, order_id, talla } = req.body;
    const { parseIntSafe, parseNumber } = require('./utils');
    const cantidad = parseIntSafe(req.body.cantidad) || 0;
    const producto = await Product.findByPk(product_id);
    if (!producto) return res.status(400).json({ status: 'ERROR', msg: 'Producto no encontrado' });
    const subtotal = (parseFloat(producto.precio) || 0) * cantidad;
    const item = await OrderItem.create({ product_id, cantidad, order_id, subtotal, talla });
    return res.json({ status: 'OK', item });
  } catch (err) {
    return res.status(400).json({ status: 'ERROR', msg: 'Error procesando operación', causa: err.message });
  }
};

ctrl.getItemsPedido = async (req, res) => {
  try {
    const items = await OrderItem.findAll();
    if (!items.length) return res.status(404).json({ status: 'ERROR', msg: 'No se encontraron items' });
    return res.json({ status: 'OK', items });
  } catch (err) {
    return res.status(500).json({ status: 'ERROR', msg: 'Error procesando operación', causa: err.message });
  }
};

ctrl.getItemsPedidoById = async (req, res) => {
  try {
    const item = await OrderItem.findByPk(req.params.id);
    if (!item) return res.status(404).json({ status: 'ERROR', msg: 'Item no encontrado' });
    return res.json({ status: 'OK', item });
  } catch (err) {
    return res.status(500).json({ status: 'ERROR', msg: 'Error procesando operación', causa: err.message });
  }
};

ctrl.updateItemPedido = async (req, res) => {
  try {
    const id = req.params.id;
    const [updated] = await OrderItem.update(req.body, { where: { id } });
    if (!updated) return res.status(404).json({ status: 'ERROR', msg: 'Item no encontrado' });
    const item = await OrderItem.findByPk(id);
    return res.json({ status: 'OK', item });
  } catch (err) {
    return res.status(400).json({ status: 'ERROR', msg: 'Error procesando operación', causa: err.message });
  }
};

ctrl.deleteItemPedido = async (req, res) => {
  try {
    const deleted = await OrderItem.destroy({ where: { id: req.params.id } });
    if (!deleted) return res.status(404).json({ status: 'ERROR', msg: 'Item no encontrado' });
    return res.json({ status: 'OK', msg: 'Item eliminado correctamente' });
  } catch (err) {
    return res.status(400).json({ status: 'ERROR', msg: 'Error procesando operación', causa: err.message });
  }
};

module.exports = ctrl;
