const { DataTypes } = require('sequelize');
const sequelize = require('../database.pg');

const Address = sequelize.define('Address', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  mongo_id: { type: DataTypes.STRING, allowNull: true },
  user_id: { type: DataTypes.UUID, allowNull: true },
  calle: { type: DataTypes.STRING, allowNull: false },
  ciudad: { type: DataTypes.STRING, allowNull: false },
  provincia: { type: DataTypes.STRING, allowNull: false },
  codigo_postal: { type: DataTypes.STRING, allowNull: false }
}, {
  tableName: 'addresses',
  underscored: true,
  timestamps: true
});

module.exports = Address;
