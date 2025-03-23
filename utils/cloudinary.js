const cloudinary = require("cloudinary").v2;
require("dotenv").config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadToCloudinary = async (file, folder) => {
  try {
    const result = await cloudinary.uploader.upload(file, {
    //   folder,
      resource_type: "auto", // Auto-detect file type (image, PDF, etc.)
    });
    return result.secure_url; // Return the Cloudinary URL
  } catch (error) {
    throw new Error("Failed to upload file to Cloudinary: " + error.message);
  }
};

module.exports = { uploadToCloudinary };
