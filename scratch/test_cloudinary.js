const cloudinary = require('cloudinary').v2;
require('dotenv').config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const publicId = 'cvs/cv_6a0572cefa13b58cf6cb68c7_1778743418904';
const urlImage = cloudinary.url(publicId, {
  resource_type: 'image',
  format: 'pdf',
  sign_url: true,
  secure: true,
  version: '1778743421',
  type: 'upload',
  long_url_signature: true
});

const urlRaw = cloudinary.url(publicId, {
  resource_type: 'raw',
  sign_url: true,
  secure: true
});

console.log('Signed URL (Image):', urlImage);
