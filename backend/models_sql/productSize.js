const { DataTypes } = require('sequelize');
const sequelize = require('../database.pg');

const ProductSize = sequelize.define('ProductSize', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  product_id: { type: DataTypes.UUID, allowNull: false },
  talla: { type: DataTypes.STRING, allowNull: false },
  stock: { type: DataTypes.INTEGER, allowNull: false }
}, {
  tableName: 'product_sizes',
  underscored: true,
  timestamps: false
});

module.exports = ProductSize;
