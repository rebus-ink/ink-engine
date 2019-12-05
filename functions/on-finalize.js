const path = require("path");
const fs = require("fs");
const engine = require("../");
const os = require("os");
const formats = require("../src/formats");
const sharp = require("sharp");

const THUMBSIZE = 400;

module.exports = setup;

// Test by mocking the admin, bucket, and file endpoints.
// This setup needs to take a done callback that knows what to do with the book and what to do if there is an error.
function setup(admin, done) {
  return async function onFinalize(object, context) {
    const fileBucket = object.bucket;
    const filePath = object.name;
    const fileName = path.basename(filePath);
    const contentType = object.contentType;
    const [userType, userId, , pubId] = filePath.split("/");
    if (!userId || !pubId)
      return done(new Error("User id and pub id are required"));
    if (!formats[contentType])
      return done(new Error("Not a supported content type"));
    // The user id here has to be the sub/account id, not the profile id
    // The pubId should be the publication pathname, not its full URL
    const targetPath = [userType, userId, "documents", pubId].join("/");
    const thumbnailPath = [userType, userId, "thumbnails", pubId].join("/");
    const bucket = admin.storage().bucket(fileBucket);
    const tempFilePath = path.join(os.tmpdir(), fileName);
    let book;
    try {
      await bucket.file(filePath).download({ destination: tempFilePath });
      book = await engine(tempFilePath, extract, { type: contentType });
      fs.unlinkSync(tempFilePath);
    } catch (err) {
      done(err);
      // In case of error, the original publication needs to be updated to note that importing the book failed.
      // Also needs to add the file to the resources list as an alternate as we do on success.
    }
    if (book) {
      book.resources = book.resources.concat({
        type: "LinkedResource",
        rel: ["alternate"],
        url: `https://storage.googleapis.com/${fileBucket}/${filePath}`,
        encodingFormat: "contentType"
      });
      await done(null, { publication: pubId, payload: book, userId });
    }
    async function extract(file, resource, metadata) {
      // Should also generate thumbnails of all images.
      let thumb;
      if (
        resource.encodingFormat &&
        resource.encodingFormat.includes("image")
      ) {
        thumb = await sharp(file.contents)
          .resize(THUMBSIZE, THUMBSIZE, { fit: "inside" })
          .jpeg({ quality: 60 })
          .toBuffer();
      }
      const filename = path.join(targetPath, resource.url);
      const storageFile = bucket.file(filename);
      await storageFile.save(file.contents, {
        metadata,
        resumable: false
      });
      if (thumb) {
        const thumbname = path.join(thumbnailPath, resource.url);
        const storageThumb = bucket.file(thumbname);
        await storageThumb.save(thumb, {
          metadata,
          resumable: false
        });
      }
      // This is not actually public. The `storage.googleapis.com` domain should tell the front end to load the asset via the storage API
      // Maybe by generating a signed URL and redirecting to it? Only if it's an image? Use redis to cache everything?
      // This is basically `https://storage.googleapis.com/:bucket/user/:user_id/publication/:pub_id/:path+`
      return `https://storage.googleapis.com/${fileBucket}/${filename}`;
    }
  };
}
