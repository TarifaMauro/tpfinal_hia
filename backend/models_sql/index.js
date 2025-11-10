const sequelize = require('../database.pg');
const Category = require('./category');
const Product = require('./product');
const ProductImage = require('./productImage');
const ProductSize = require('./productSize');
const User = require('./user');
const Address = require('./address');
const Coupon = require('./coupon');
const Order = require('./order');
const OrderItem = require('./orderItem');

// Associations
Category.hasMany(Product, { foreignKey: 'categoria_id' });
Product.belongsTo(Category, { foreignKey: 'categoria_id' });

Product.hasMany(ProductImage, { foreignKey: 'product_id', as: 'imagenes' });
ProductImage.belongsTo(Product, { foreignKey: 'product_id' });

Product.hasMany(ProductSize, { foreignKey: 'product_id', as: 'tallas' });
ProductSize.belongsTo(Product, { foreignKey: 'product_id' });

User.hasMany(Address, { foreignKey: 'user_id' });
Address.belongsTo(User, { foreignKey: 'user_id' });

User.hasMany(Order, { foreignKey: 'cliente_id' });
Order.belongsTo(User, { foreignKey: 'cliente_id' });

Order.belongsTo(Address, { foreignKey: 'direccion_id' });
Order.belongsTo(Coupon, { foreignKey: 'cupon_id' });

Order.hasMany(OrderItem, { foreignKey: 'order_id', as: 'items' });
OrderItem.belongsTo(Order, { foreignKey: 'order_id' });

OrderItem.belongsTo(Product, { foreignKey: 'product_id' });

module.exports = {
  sequelize,
  Category,
  Product,
  ProductImage,
  ProductSize,
  User,
  Address,
  Coupon,
  Order,
  OrderItem
};
