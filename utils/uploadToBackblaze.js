const B2 = require("backblaze-b2");

const applicationKeyId = "005d9f00d16e3ab0000000001";
const applicationKey = "K00565ncxQxMwU30n+xNn2v+UnMSbMI";
const bucketId = "8d291fe010fd01e69eb30a1b";
const bucketName = "production-development";


async function uploadToBackblaze(fileBuffer, originalName, folder = "uploads") {
  console.log("➡️ uploadToBackblaze called");
  console.log(
    "🔹 fileBuffer type:",
    Buffer.isBuffer(fileBuffer),
    "length:",
    fileBuffer.length
  );
  console.log("🔹 originalName:", originalName);
  console.log("🔹 folder:", folder);

  try {
    const b2 = new B2({
      applicationKeyId,
      applicationKey,
    });

    console.log("🔑 Authorizing B2...");
    await b2.authorize();
    console.log("✅ B2 authorized");

    const { data: uploadData } = await b2.getUploadUrl({ bucketId });
    console.log("📦 Upload URL retrieved");

    const timestamp = Date.now();
    const safeName = originalName.replace(/\s+/g, "_");
    const fileName = `${folder}/${timestamp}_${safeName}`;

    const { data: uploadedData } = await b2.uploadFile({
      uploadUrl: uploadData.uploadUrl,
      uploadAuthToken: uploadData.authorizationToken,
      fileName,
      data: fileBuffer,
    });

    console.log("✅ File uploaded:", uploadedData.fileName);

    return `https://f005.backblazeb2.com/file/${bucketName}/${uploadedData.fileName}`;
  } catch (error) {
    console.error("❌ B2 Upload Error:", error.response || error);
    throw new Error(
      `Failed to upload file to Backblaze B2: ${error.message || error}`
    );
  }
}

module.exports = { uploadToBackblaze };
