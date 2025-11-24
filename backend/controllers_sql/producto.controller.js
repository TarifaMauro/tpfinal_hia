const { Product, Category, ProductImage, ProductSize } = require('../models_sql');
const { Op } = require('sequelize');

const ctrl = {};

const { parseNumber, parseIntSafe, parseDateToISO } = require('./utils');

ctrl.obtenerProductosPaginados = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, parseInt(req.query.limit) || 25);
    const q = (req.query.q || '').trim();

    const where = {};
    if (q) {
      where[Op.or] = [
        { nombre: { [Op.iLike]: `%${q}%` } },
        { descripcion: { [Op.iLike]: `%${q}%` } }
      ];
    }

    const result = await Product.findAndCountAll({
      where,
      limit,
      offset: (page - 1) * limit,
      order: [['createdAt', 'DESC']],
    });

    return res.json({ items: result.rows, total: result.count });
  } catch (err) {
    console.error('Error obtenerProductosPaginados:', err);
    return res.status(500).json({ msg: 'Error al obtener productos', error: err.message });
  }
};
ctrl.createProducto = async (req, res) => {
  try {
    const { nombre, descripcion, color, categoria } = req.body;
    const imagenesFromBody = req.body.imagenes || [];
    const precio = parseNumber(req.body.precio);

    let tallas = [];
    if (req.body.tallas) {
      if (typeof req.body.tallas === 'string') {
        try { tallas = JSON.parse(req.body.tallas); } catch (e) { tallas = []; }
      } else if (Array.isArray(req.body.tallas)) tallas = req.body.tallas;
    }

    const imagenes = (req.files && req.files.length)
      ? req.files.map(f => f.path || f.secure_url || f.url || f.filename)
      : imagenesFromBody;

    if (precio == null) return res.status(400).json({ status: 'ERROR', msg: 'Precio inválido' });

    let categoria_id = null;
    if (categoria) {
      let cat = await Category.findByPk(categoria);
      if (!cat) cat = await Category.findOne({ where: { nombre: categoria } });
      if (!cat) return res.status(400).json({ status: 'ERROR', msg: 'Categoria no valida' });
      categoria_id = cat.id;
    }

    const prod = await Product.create({ nombre, descripcion, precio, color, categoria_id: categoria_id });

    for (const url of imagenes) await ProductImage.create({ product_id: prod.id, url });
    for (const t of tallas) await ProductSize.create({ product_id: prod.id, talla: t.talla, stock: parseIntSafe(t.stock) || 0 });

    const created = await Product.findByPk(prod.id, { include: ['imagenes', 'tallas', Category] });
    return res.status(201).json({ status: 'OK', producto: created });
  } catch (err) {
    console.error('Error in createProducto:', err.stack || err);
    return res.status(400).json({ status: 'ERROR', msg: 'Error procesando operación', causa: err.message });
  }
};

ctrl.getProductos = async (req, res) => {
  try {
    const productos = await Product.findAll({ include: ['imagenes', 'tallas', Category] });
    if (!productos || productos.length === 0) return res.status(404).json({ status: 'ERROR', msg: 'No se encontraron productos' });
    return res.json({ status: 'OK', productos });
  } catch (err) {
    return res.status(500).json({ status: 'ERROR', msg: 'Error procesando operación', causa: err.message });
  }
};

module.exports = ctrl;

ctrl.getProductoById = async (req, res) => {
  try {
    const id = req.params.id;
    const producto = await Product.findByPk(id, { include: ['imagenes', 'tallas', Category] });
    if (!producto) return res.status(404).json({ status: 'ERROR', msg: 'Producto no encontrado' });
    return res.json({ status: 'OK', producto });
  } catch (err) {
    return res.status(500).json({ status: 'ERROR', msg: 'Error procesando operación', causa: err.message });
  }
};

ctrl.updateProducto = async (req, res) => {
  try {
    const id = req.params.id;
    const { nombre, descripcion, color, categoria } = req.body;
    const imagenesFromBody = req.body.imagenes || [];
    const precio = parseNumber(req.body.precio);
    let tallas = [];
    if (req.body.tallas) {
      if (typeof req.body.tallas === 'string') { try { tallas = JSON.parse(req.body.tallas); } catch (e) { tallas = []; } }
      else if (Array.isArray(req.body.tallas)) tallas = req.body.tallas;
    }
    const imagenes = (req.files && req.files.length)
      ? req.files.map(f => f.path || f.secure_url || f.url || f.filename)
      : imagenesFromBody;

    const producto = await Product.findByPk(id);
    if (!producto) return res.status(404).json({ status: 'ERROR', msg: 'Producto no encontrado' });
    if (precio == null) return res.status(400).json({ status: 'ERROR', msg: 'Precio inválido' });
    let categoria_id = producto.categoria_id;
    if (categoria) {
      let cat = await Category.findByPk(categoria);
      if (!cat) cat = await Category.findOne({ where: { nombre: categoria } });
      if (!cat) return res.status(400).json({ status: 'ERROR', msg: 'Categoria no valida' });
      categoria_id = cat.id;
    }

    await producto.update({ nombre, descripcion, precio, color, categoria_id });

    if (imagenes && imagenes.length) {
      await ProductImage.destroy({ where: { product_id: producto.id } });
      for (const url of imagenes) await ProductImage.create({ product_id: producto.id, url });
    }

    if (tallas && tallas.length) {
      await ProductSize.destroy({ where: { product_id: producto.id } });
      for (const t of tallas) await ProductSize.create({ product_id: producto.id, talla: t.talla, stock: parseIntSafe(t.stock) || 0 });
    }

    const updated = await Product.findByPk(id, { include: ['imagenes', 'tallas', Category] });
    return res.json({ status: 'OK', producto: updated });
  } catch (err) {
    console.error('Error in updateProducto:', err.stack || err);
    return res.status(400).json({ status: 'ERROR', msg: 'Error procesando operación', causa: err.message });
  }
};

ctrl.getProductosByCategoria = async (req, res) => {
  try {
    const nombre = req.params.categoriaNombre;
    const cat = await Category.findOne({ where: { nombre } });
    if (!cat) return res.status(404).json({ status: 'ERROR', msg: 'Categoría no encontrada' });
    const productos = await Product.findAll({ where: { categoria_id: cat.id }, include: ['imagenes', 'tallas'] });
    return res.json({ status: 'OK', productos });
  } catch (err) {
    return res.status(500).json({ status: 'ERROR', msg: 'Error procesando operación', causa: err.message });
  }
};

ctrl.getProductosByNombre = async (req, res) => {
  try {
    const nombre = req.query.nombre || '';
    const { Op } = require('sequelize');
    const productos = await Product.findAll({ where: { nombre: { [Op.iLike]: `%${nombre}%` } }, include: ['imagenes', 'tallas'] });
    if (!productos || productos.length === 0) return res.status(404).json({ status: 'ERROR', msg: 'No se encontraron productos' });
    return res.json({ status: 'OK', productos });
  } catch (err) {
    return res.status(500).json({ status: 'ERROR', msg: 'Error procesando operación', causa: err.message });
  }
};

ctrl.deleteProducto = async (req, res) => {
  try {
    const id = req.params.id;
    const producto = await Product.findByPk(id);
    if (!producto) return res.status(404).json({ status: 'ERROR', msg: 'Producto no encontrado' });
    await ProductImage.destroy({ where: { product_id: id } });
    await ProductSize.destroy({ where: { product_id: id } });
    await Product.destroy({ where: { id } });
    return res.json({ status: 'OK', msg: 'Producto eliminado correctamente' });
  } catch (err) {
    return res.status(500).json({ status: 'ERROR', msg: 'Error procesando operación', causa: err.message });
  }
};
