const { DataTypes } = require('sequelize');
const sequelize = require('../database.pg');

const Order = sequelize.define('Order', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  mongo_id: { type: DataTypes.STRING, allowNull: true },
  cliente_id: { type: DataTypes.UUID, allowNull: true },
  email_cliente: { type: DataTypes.STRING, allowNull: true },
  fecha: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  estado: { type: DataTypes.STRING, allowNull: false, defaultValue: 'pendiente' },
  metodo_pago: { type: DataTypes.STRING, allowNull: false },
  direccion_id: { type: DataTypes.UUID, allowNull: false },
  cupon_id: { type: DataTypes.UUID, allowNull: true },
  transportadora: { type: DataTypes.STRING, allowNull: true },
  total: { type: DataTypes.DECIMAL(10,2), allowNull: false },
  sucursal_envio: { type: DataTypes.STRING, allowNull: true }
}, {
  tableName: 'orders',
  underscored: true,
  timestamps: true
});

module.exports = Order;
