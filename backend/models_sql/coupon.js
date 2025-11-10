const { DataTypes } = require('sequelize');
const sequelize = require('../database.pg');

const Coupon = sequelize.define('Coupon', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  codigo: { type: DataTypes.STRING, allowNull: false, unique: true },
  nombre: { type: DataTypes.STRING, allowNull: false },
  descuento: { type: DataTypes.DECIMAL(10,2), allowNull: false },
  fecha_expiracion: { type: DataTypes.DATE, allowNull: true },
  usos_maximos: { type: DataTypes.INTEGER, allowNull: false },
  usos_restantes: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  activo: { type: DataTypes.BOOLEAN, defaultValue: true }
}, {
  tableName: 'coupons',
  underscored: true,
  timestamps: true
});

module.exports = Coupon;
