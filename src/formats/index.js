const docx = require("./docx");
const epub = require("./epub");
const markup = require("./markup");
const pdf = require("./pdf");
const path = require("path");
const os = require("os");
const crypto = require("crypto");
const fs = require("fs");
const sharp = require("sharp");
const THUMBSIZE = Number.parseInt(process.env.THUMBSIZE, 10);
const THUMBPATH = process.env.THUMBPATH;
const vfile = require("vfile");
const util = require("util");
const rimraf = util.promisify(require("rimraf"));

const PREFERSDATA = [pdf, markup];
// const PREFERSPATH = [docx, epub]

async function* processor(options) {
  let processor;
  let suffix;
  switch (options.mediaType) {
    case "epub":
    case "application/epub+zip":
      processor = epub;
      suffix = ".epub";
      break;
    case "docx":
    case "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
      processor = docx;
      suffix = ".docx";
      break;
    case "html":
    case "text/html":
      processor = markup;
      suffix = ".html";
      break;
    case "pdf":
    case "application/pdf":
      processor = pdf;
      suffix = ".pdf";
      break;
    default:
      throw new Error("Unsupported Media Type");
  }
  const { data, filename } = options;
  const randomFileName = crypto.randomBytes(15).toString("hex");
  options.tempRoot = path.join(os.tmpdir(), randomFileName, "/");
  await fs.promises.mkdir(options.tempRoot, { recursive: true });
  if (PREFERSDATA.includes(processor) && !data) {
    options.data = await fs.promises.readFile(filename);
  } else if (!filename) {
    options.filename = path.join(options.tempRoot, "original" + suffix);
    await fs.promises.writeFile(options.filename, data);
  }
  for await (const file of processor(options)) {
    if (
      file.contentType &&
      file.contentType.includes("image") &&
      options.thumbnails
    ) {
      const thumb = await sharp(Buffer.from(file.contents))
        .resize(THUMBSIZE, THUMBSIZE, { fit: "inside" })
        .jpeg({ quality: 60 })
        .toBuffer();
      const thumbPath = `${path.join(THUMBPATH, file.path)}.jpg`;
      const thumbFile = vfile({
        contents: thumb,
        contentType: "image/jpeg",
        path: thumbPath
      });
      yield file;
      yield thumbFile;
    } else {
      yield file;
    }
  }
  await rimraf(options.tempRoot);
}

module.exports = processor;
