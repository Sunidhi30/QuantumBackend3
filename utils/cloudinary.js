// const cloudinary = require("cloudinary").v2;
// require("dotenv").config();

// cloudinary.config({
//   cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
//   api_key: process.env.CLOUDINARY_API_KEY,
//   api_secret: process.env.CLOUDINARY_API_SECRET,
// });

// const uploadToCloudinary = async (fileData, folder, mimetype) => {
//     try {
//       const result = await cloudinary.uploader.upload(fileData, {
//         folder: folder,
//         resource_type: mimetype === "application/pdf" ? "raw" : "auto",
//       });
//       return result.secure_url;
//     } catch (error) {
//       throw new Error("Cloudinary upload failed: " + error.message);
//     }
//   };

// module.exports = { uploadToCloudinary };




const cloudinary = require("cloudinary").v2;
require("dotenv").config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadToCloudinary = async (fileBuffer, folder, mimetype) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: folder,
        resource_type: mimetype.startsWith("image") ? "image" : "raw",
      },
      (error, result) => {
        if (error) {
          reject(new Error("Cloudinary upload failed: " + error.message));
        } else {
          resolve(result.secure_url);
        }
      }
    );
    stream.end(fileBuffer); // Pass the file buffer to the stream
  });
};

module.exports = { uploadToCloudinary };
