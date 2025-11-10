(async ()=>{
  try{
    const { sequelize, User } = require('./models_sql');
    await sequelize.authenticate();
    console.log('Connected');
    const u = await User.findOne({ where: { username: 'admin' } });
    if(!u){ console.log('User admin not found'); process.exit(0); }
    console.log('User found:', { id: u.id, username: u.username, email: u.email, rol: u.rol, passwordHash: u.password });
    process.exit(0);
  }catch(e){ console.error('Error:', e); process.exit(1); }
})();
