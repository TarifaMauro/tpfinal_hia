const { DataTypes } = require('sequelize');
const sequelize = require('../database.pg');

const User = sequelize.define('User', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  mongo_id: { type: DataTypes.STRING, allowNull: true },
  username: { type: DataTypes.STRING, allowNull: false },
  password: { type: DataTypes.STRING, allowNull: false },
  email: { type: DataTypes.STRING, allowNull: false },
  nombres: { type: DataTypes.STRING, allowNull: false },
  apellido: { type: DataTypes.STRING, allowNull: false },
  rol: { type: DataTypes.STRING, allowNull: false }
}, {
  tableName: 'users',
  underscored: true,
  timestamps: true
});

module.exports = User;
