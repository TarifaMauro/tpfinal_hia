const { DataTypes } = require('sequelize');
const sequelize = require('../database.pg');

const Category = sequelize.define('Category', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  mongo_id: { type: DataTypes.STRING, allowNull: true },
  nombre: { type: DataTypes.STRING, allowNull: false },
  descripcion: { type: DataTypes.TEXT, allowNull: false }
}, {
  tableName: 'categories',
  underscored: true,
  timestamps: true
});

module.exports = Category;
