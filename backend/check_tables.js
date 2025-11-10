const { sequelize } = require('./models_sql');
(async ()=>{
  try {
    const [rows] = await sequelize.query("SELECT tablename FROM pg_tables WHERE schemaname='public'");
    console.log(JSON.stringify(rows,null,2));
    await sequelize.close();
  } catch(e) {
    console.error('ERROR', e && e.message || e);
    process.exit(1);
  }
})();
