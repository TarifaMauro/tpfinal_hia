require('dotenv').config();
const express = require('express');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');
const swaggerFile = require('./swagger_output.json');

// Always use Postgres in this cleaned project
const usePg = true;

// Initialize app
const app = express();
app.use(express.json());

const corsOptions = {
  origin: ['http://localhost:4200'],
  methods: ['GET','POST','PUT','DELETE'],
  allowedHeaders: ['Content-Type','Authorization'],
  credentials: true
};
app.use(cors(corsOptions));
app.use((req,res,next)=>{ if(req.method==='OPTIONS'){ cors(corsOptions)(req,res,()=>res.sendStatus(204)); } else next(); });

// Routes
app.use('/api/categoria', require('./routes/categoria.route'));
app.use('/api/producto', require('./routes/producto.route'));
app.use('/api/direccion', require('./routes/direccion.route'));
app.use('/api/cupon', require('./routes/cupon.route'));
app.use('/api/itemPedido', require('./routes/itemPedido.route'));
app.use('/api/pedido', require('./routes/pedido.route'));
app.use('/api/usuario', require('./routes/usuario.route'));
app.use('/api/mp', require('./routes/mp.route'));
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerFile));
app.use('/api/dashboard', require('./routes/dashboard.route'));
app.use('/api/codigoPostal', require('./routes/codigoPostal.route'));

app.set('port', process.env.PORT || 3001);

function startServer(){
  app.listen(app.get('port'), ()=> {
    console.log('Servidor iniciado en el puerto', app.get('port'));
    console.log(`Documentación: http://localhost:${app.get('port')}/api-docs`);
  });
}

if(usePg){
  const { sequelize } = require('./models_sql');
  (async ()=>{
    try{
      await sequelize.authenticate();
      console.log('Conectado a Postgres, sincronizando modelos...');
      const forceSync = process.env.SEQ_FORCE === 'true';
      console.log('sequelize.sync force:', forceSync);
      await sequelize.sync({ force: forceSync });
      console.log('Modelos sincronizados en Postgres.');
      startServer();
    }catch(err){
      console.error('Error inicializando Postgres:', err.message || err);
      process.exit(1);
    }
  })();
} else {
  startServer();
}
