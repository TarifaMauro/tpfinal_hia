const { DataTypes } = require('sequelize');
const sequelize = require('../database.pg');

const ProductImage = sequelize.define('ProductImage', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  product_id: { type: DataTypes.UUID, allowNull: false },
  url: { type: DataTypes.TEXT, allowNull: false }
}, {
  tableName: 'product_images',
  underscored: true,
  timestamps: false
});

module.exports = ProductImage;
