const { DataTypes } = require('sequelize');
const sequelize = require('../database.pg');

const OrderItem = sequelize.define('OrderItem', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  order_id: { type: DataTypes.UUID, allowNull: false },
  product_id: { type: DataTypes.UUID, allowNull: false },
  cantidad: { type: DataTypes.INTEGER, allowNull: false },
  subtotal: { type: DataTypes.DECIMAL(10,2), allowNull: true },
  talla: { type: DataTypes.STRING, allowNull: true }
}, {
  tableName: 'order_items',
  underscored: true,
  timestamps: false
});

module.exports = OrderItem;
