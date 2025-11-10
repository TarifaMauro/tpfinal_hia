require('dotenv').config();
const { Sequelize } = require('sequelize');

const uri = process.env.PG_URI || process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/tp_final';

const sequelize = new Sequelize(uri, {
  dialect: 'postgres',
  logging: false,
  dialectOptions: {
    // ssl: { require: true, rejectUnauthorized: false }
  }
});

module.exports = sequelize;
