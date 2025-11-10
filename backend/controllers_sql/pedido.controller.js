const { Order, OrderItem, Product } = require('../models_sql');
const { sequelize } = require('../models_sql');

const ctrl = {};

ctrl.createPedido = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { cliente, emailCliente, items = [], metodoPago, direccion, cupon, transportadora, sucursalEnvio } = req.body;
    const { parseIntSafe, parseNumber } = require('./utils');
    let total = 0;
    for (const it of items) {
      const prod = await Product.findByPk(it.producto);
      if (!prod) { await t.rollback(); return res.status(400).json({ status: 'ERROR', msg: 'Producto no encontrado' }); }
      const cantidad = parseIntSafe(it.cantidad) || 0;
      total += (parseFloat(prod.precio) || 0) * cantidad;
    }
    const order = await Order.create({ cliente_id: cliente || null, email_cliente: emailCliente || null, metodo_pago: metodoPago, direccion_id: direccion, cupon_id: cupon, transportadora, total, sucursal_envio: sucursalEnvio }, { transaction: t });
    for (const it of items) {
      const cantidad = parseIntSafe(it.cantidad) || 0;
      const subtotal = parseNumber(it.subtotal) || ((parseFloat((await Product.findByPk(it.producto)).precio) || 0) * cantidad);
      await OrderItem.create({ order_id: order.id, product_id: it.producto, cantidad: cantidad, subtotal: subtotal, talla: it.talla }, { transaction: t });
    }
    await t.commit();
    return res.json({ status: 'OK', pedido: order });
  } catch (err) {
    await t.rollback();
    return res.status(500).json({ status: 'ERROR', msg: 'Error procesando operación', causa: err.message });
  }
};

ctrl.getPedidos = async (req, res) => {
  try {
    const pedidos = await Order.findAll({ include: [{ model: OrderItem, as: 'items' }] });
    if (!pedidos.length) return res.status(404).json({ status: 'ERROR', msg: 'No se encontraron pedidos' });
    return res.json({ status: 'OK', pedidos });
  } catch (err) {
    return res.status(500).json({ status: 'ERROR', msg: 'Error procesando operación', causa: err.message });
  }
};

ctrl.getPedidoById = async (req, res) => {
  try {
    const pedido = await Order.findByPk(req.params.id, { include: [{ model: OrderItem, as: 'items' }] });
    if (!pedido) return res.status(404).json({ status: 'ERROR', msg: 'Pedido no encontrado' });
    return res.json({ status: 'OK', pedido });
  } catch (err) {
    return res.status(500).json({ status: 'ERROR', msg: 'Error procesando operación', causa: err.message });
  }
};

ctrl.getPedidoByUsserId = async (req, res) => {
  try {
    const pedidos = await Order.findAll({ where: { cliente_id: req.params.id }, include: [{ model: OrderItem, as: 'items' }] });
    if (!pedidos.length) return res.status(404).json({ status: 'ERROR', msg: 'No se encontraron pedidos para este usuario' });
    return res.json({ status: 'OK', pedidos });
  } catch (err) {
    return res.status(500).json({ status: 'ERROR', msg: 'Error procesando operación', causa: err.message });
  }
};

ctrl.updatePedido = async (req, res) => {
  try {
    const id = req.params.id;
    const [updated] = await Order.update(req.body, { where: { id } });
    if (!updated) return res.status(404).json({ status: 'ERROR', msg: 'Pedido no encontrado' });
    const pedido = await Order.findByPk(id);
    return res.json({ status: 'OK', pedido });
  } catch (err) {
    return res.status(500).json({ status: 'ERROR', msg: 'Error procesando operación', causa: err.message });
  }
};

ctrl.deletePedido = async (req, res) => {
  try {
    const deleted = await Order.destroy({ where: { id: req.params.id } });
    if (!deleted) return res.status(404).json({ status: 'ERROR', msg: 'Pedido no encontrado' });
    return res.json({ status: 'OK', msg: 'Pedido eliminado correctamente' });
  } catch (err) {
    return res.status(500).json({ status: 'ERROR', msg: 'Error procesando operación', causa: err.message });
  }
};

module.exports = ctrl;
