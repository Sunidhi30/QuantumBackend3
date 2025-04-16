// // const cloudinary = require("cloudinary").v2;
// // require("dotenv").config();

// // cloudinary.config({
// //   cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
// //   api_key: process.env.CLOUDINARY_API_KEY,
// //   api_secret: process.env.CLOUDINARY_API_SECRET,
// // });

// // const uploadToCloudinary = async (fileData, folder, mimetype) => {
// //     try {
// //       const result = await cloudinary.uploader.upload(fileData, {
// //         folder: folder,
// //         resource_type: mimetype === "application/pdf" ? "raw" : "auto",
// //       });
// //       return result.secure_url;
// //     } catch (error) {
// //       throw new Error("Cloudinary upload failed: " + error.message);
// //     }
// //   };

// // module.exports = { uploadToCloudinary };




// const cloudinary = require("cloudinary").v2;
// require("dotenv").config();

// cloudinary.config({
//   cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
//   api_key: process.env.CLOUDINARY_API_KEY,
//   api_secret: process.env.CLOUDINARY_API_SECRET,
// });

// const uploadToCloudinary = async (fileBuffer, folder, mimetype) => {
//   return new Promise((resolve, reject) => {
//     const stream = cloudinary.uploader.upload_stream(
//       {
//         folder: folder,
//         resource_type: mimetype.startsWith("image") ? "image" : "raw",
//       },
//       (error, result) => {
//         if (error) {
//           reject(new Error("Cloudinary upload failed: " + error.message));
//         } else {
//           resolve(result.secure_url);
//         }
//       }
//     );
//     stream.end(fileBuffer); // Pass the file buffer to the stream
//   });
// };
// const uploadsCloudinary = async (fileBuffer, folder, mimetype) => {
//   const dataUri = `data:${mimetype};base64,${fileBuffer.toString("base64")}`;

//   try {
//     const result = await cloudinary.uploader.upload(dataUri, {
//       folder: folder,
//       resource_type: "raw", // force raw for PDFs
//       public_id: `kyc_${Date.now()}`,
//     });

//     // Convert the URL to display inline
//     const rawUrl = result.secure_url
//       .replace("/image/upload/", "/raw/upload/")
//       .replace("/upload/", "/upload/fl_attachment:false/");

//     return rawUrl;
//   } catch (error) {
//     throw new Error("Cloudinary upload failed: " + error.message);
//   }
// };
// module.exports = { uploadToCloudinary, uploadsCloudinary };



// const cloudinary = require("cloudinary").v2;
// require("dotenv").config();

// cloudinary.config({
//   cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
//   api_key: process.env.CLOUDINARY_API_KEY,
//   api_secret: process.env.CLOUDINARY_API_SECRET,
// });

// // Added a new parameter 'forDisplay' to control whether the file should be displayed or downloaded
// const uploadToCloudinary = async (fileBuffer, folder, mimetype, forDisplay = false) => {
//   return new Promise((resolve, reject) => {
    
//     const uploadOptions = {
//       folder: folder,
      
//       resource_type: mimetype.startsWith("image") ? "image" : "raw",
//     };
    
//     // If the file should be displayed in the browser instead of downloaded,
//     // add the flags parameter without the attachment flag
//     if (forDisplay && mimetype === 'application/pdf') {
//       uploadOptions.flags = 'attachment:false';
//     }
    
//     const stream = cloudinary.uploader.upload_stream(
//       uploadOptions,
//       (error, result) => {
//         if (error) {
//           reject(new Error("Cloudinary upload failed: " + error.message));
//         } else {
//           resolve(result.secure_url);
//         }
//       }
//     );
//     stream.end(fileBuffer); // Pass the file buffer to the stream
//   });
// };
// module.exports = { uploadToCloudinary};
const cloudinary = require("cloudinary").v2;
require("dotenv").config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadToCloudinary = async (fileBuffer, folder, mimetype, forDisplay = false) => {
  return new Promise((resolve, reject) => {
    // Determine resource_type based on mimetype
    let resourceType = "auto";
    if (mimetype.startsWith("image")) {
      resourceType = "image";
    } else if (mimetype === "application/pdf") {
      resourceType = "raw";
    }
    
    const uploadOptions = {
      folder: folder,
      resource_type: resourceType,
    };
    
    // For PDFs that should be displayed in browser
    if (forDisplay && mimetype === "application/pdf") {
      // This is the critical part - adding these options to make PDFs display in browser
      uploadOptions.flags = "attachment:false";
      uploadOptions.format = "pdf";  // Ensure it stays as PDF
    }
    
    const stream = cloudinary.uploader.upload_stream(
      uploadOptions,
      (error, result) => {
        if (error) {
          reject(new Error("Cloudinary upload failed: " + error.message));
        } else {
          // For PDFs that should be displayed in browser, modify the URL if needed
          if (forDisplay && mimetype === "application/pdf") {
            // Make sure the URL doesn't contain fl_attachment
            let modifiedUrl = result.secure_url;
            if (modifiedUrl.includes("fl_attachment")) {
              modifiedUrl = modifiedUrl.replace(/fl_attachment(:[^\/]*)?\//i, "");
            }
            resolve(modifiedUrl);
          } else {
            resolve(result.secure_url);
          }
        }
      }
    );
    stream.end(fileBuffer);
  });
};
module.exports = { uploadToCloudinary};
