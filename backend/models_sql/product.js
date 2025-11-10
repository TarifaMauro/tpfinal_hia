const { DataTypes } = require('sequelize');
const sequelize = require('../database.pg');

const Product = sequelize.define('Product', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  mongo_id: { type: DataTypes.STRING, allowNull: true },
  nombre: { type: DataTypes.STRING, allowNull: false },
  descripcion: { type: DataTypes.TEXT, allowNull: false },
  precio: { type: DataTypes.DECIMAL(10,2), allowNull: false },
  color: { type: DataTypes.STRING, allowNull: true },
  categoria_id: { type: DataTypes.UUID, allowNull: false }
}, {
  tableName: 'products',
  underscored: true,
  timestamps: true
});

module.exports = Product;
