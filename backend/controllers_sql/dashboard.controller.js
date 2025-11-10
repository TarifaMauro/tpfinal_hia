const { sequelize, User, Order, Coupon } = require('../models_sql');
const { QueryTypes } = require('sequelize');

const dashboardCtrl = {};

dashboardCtrl.usuariosPorDia = async (req, res) => {
  try {
    const dias = 7;
    const hoy = new Date(); hoy.setHours(0,0,0,0);
    const haceNDias = new Date(hoy); haceNDias.setDate(hoy.getDate() - (dias - 1));
    const since = haceNDias.toISOString().split('T')[0];
    const rows = await sequelize.query(
      `SELECT to_char(created_at::date, 'YYYY-MM-DD') AS day, COUNT(*)::int AS total FROM users WHERE created_at::date >= '${since}' GROUP BY day ORDER BY day ASC`,
      { type: QueryTypes.SELECT }
    );
    const resultadoMap = {};
    rows.forEach(r => { resultadoMap[r.day] = parseInt(r.total, 10); });
    const conteoCompleto = [];
    for (let i = 0; i < dias; i++) {
      const fecha = new Date(haceNDias); fecha.setDate(haceNDias.getDate() + i);
      const clave = fecha.toISOString().split('T')[0];
      conteoCompleto.push(resultadoMap[clave] || 0);
    }
    return res.json(conteoCompleto);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Error al obtener usuarios por día', causa: err.message });
  }
};

dashboardCtrl.pedidosPorDia = async (req, res) => {
  try {
    const dias = 7;
    const hoy = new Date(); hoy.setHours(0,0,0,0);
    const haceNDias = new Date(hoy); haceNDias.setDate(hoy.getDate() - (dias - 1));
    const since = haceNDias.toISOString().split('T')[0];
    const rows = await sequelize.query(
      `SELECT to_char(created_at::date, 'YYYY-MM-DD') AS day, COUNT(*)::int AS total FROM orders WHERE created_at::date >= '${since}' GROUP BY day ORDER BY day ASC`,
      { type: QueryTypes.SELECT }
    );
    const resultadoMap = {};
    rows.forEach(r => { resultadoMap[r.day] = parseInt(r.total, 10); });
    const conteoCompleto = [];
    for (let i = 0; i < dias; i++) {
      const fecha = new Date(haceNDias); fecha.setDate(haceNDias.getDate() + i);
      const clave = fecha.toISOString().split('T')[0];
      conteoCompleto.push(resultadoMap[clave] || 0);
    }
    return res.json(conteoCompleto);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Error al obtener pedidos por día', causa: err.message });
  }
};

dashboardCtrl.dineroPorPedido = async (req, res) => {
  try {
    const pedidos = await Order.findAll({ attributes: ['total'], order: [['created_at','DESC']], limit: 4 });
    const montos = pedidos.map(p => parseFloat(p.total)).reverse();
    return res.json(montos);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Error al obtener montos de pedidos', causa: err.message });
  }
};

dashboardCtrl.cuponesUsados = async (req, res) => {
  try {
    const rows = await sequelize.query(
      `SELECT nombre AS label, SUM(usos_maximos - usos_restantes)::int AS total_usos FROM coupons GROUP BY nombre`,
      { type: QueryTypes.SELECT }
    );
    const labels = rows.map(r => r.label);
    const data = rows.map(r => parseInt(r.total_usos,10));
    return res.json({ labels, data });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Error al obtener datos de cupones usados', causa: err.message });
  }
};

module.exports = dashboardCtrl;
