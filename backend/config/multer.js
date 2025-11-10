const multer = require('multer');
let upload;
try {
  const { CloudinaryStorage } = require('multer-storage-cloudinary');
  const cloudinary = require('./cloudinary');

  if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) {
    const storage = new CloudinaryStorage({
      cloudinary,
      params: (req, file) => {
        const categoria = req.body.categoria || 'sin_categoria';
        const nombreProducto = req.body.nombre || 'sin_nombre';
        return { folder: `productos/${categoria}/${nombreProducto}`, allowed_formats: ['jpg','jpeg','png','webp'], public_id: Date.now() + '-' + file.originalname.replace(/\s/g,'_') };
      }
    });
    upload = multer({ storage });
  } else {
    const fs = require('fs');
    const path = require('path');
    const uploadDir = path.join(__dirname, '..', 'uploads');
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
    const storageLocal = multer.diskStorage({ destination: (req,file,cb)=> cb(null, uploadDir), filename: (req,file,cb)=> cb(null, Date.now() + '-' + file.originalname.replace(/\s/g,'_')) });
    upload = multer({ storage: storageLocal });
  }
} catch (err) {
  const fs = require('fs');
  const path = require('path');
  const uploadDir = path.join(__dirname, '..', 'uploads');
  if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
  const storageLocal = multer.diskStorage({ destination: (req,file,cb)=> cb(null, uploadDir), filename: (req,file,cb)=> cb(null, Date.now() + '-' + file.originalname.replace(/\s/g,'_')) });
  upload = multer({ storage: storageLocal });
}

module.exports = upload;
