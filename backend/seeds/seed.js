const { sequelize, User, Category, Product, ProductImage, ProductSize } = require('../models_sql');
const bcrypt = require('bcrypt');

async function seed() {
  try {
    await sequelize.authenticate();
    console.log('Connected to Postgres for seeding');

    const adminEmail = 'admin@local.test';
    const [admin, adminCreated] = await User.findOrCreate({ where: { email: adminEmail }, defaults: { username: 'admin', password: await bcrypt.hash('admin123',10), email: adminEmail, nombres: 'Admin', apellido: 'Local', rol: 'admin' } });
    console.log(adminCreated ? 'Admin user created' : 'Admin user already exists');

    const categorias = [ { nombre: 'Ropa', descripcion: 'Categoria ropa' }, { nombre: 'Calzado', descripcion: 'Categoria calzado' } ];
    const createdCats = [];
    for (const c of categorias) {
      const [cat, created] = await Category.findOrCreate({ where: { nombre: c.nombre }, defaults: c });
      createdCats.push(cat);
      console.log(created ? `Category ${c.nombre} created` : `Category ${c.nombre} exists`);
    }

    const ropa = createdCats.find(x => x.nombre === 'Ropa');
    if (ropa) {
      const prodName = 'Remera Demo';
      const existing = await Product.findOne({ where: { nombre: prodName } });
      if (!existing) {
        const prod = await Product.create({ nombre: prodName, descripcion: 'Remera demo creada por seed', precio: 1200.00, color: 'Azul', categoria_id: ropa.id });
        await ProductImage.create({ product_id: prod.id, url: '/uploads/demo1.jpg' });
        await ProductSize.create({ product_id: prod.id, talla: 'S', stock: 10 });
        await ProductSize.create({ product_id: prod.id, talla: 'M', stock: 5 });
        console.log('Sample product created');
      } else { console.log('Sample product already exists'); }
    }

    console.log('Seeding completed');
    process.exit(0);
  } catch (err) {
    console.error('Seeding error:', err);
    process.exit(1);
  }
}

seed();
