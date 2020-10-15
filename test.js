const pdf = require("./src/formats/");
const fs = require("fs");
const path = require("path");

const pdfPath = path.join(__dirname, "./FigureItOut-PDF-1.pdf");

async function test() {
  const file = await fs.promises.readFile(pdfPath);
  for await (const vfile of pdf({
    data: file,
    filename: "FigureItOut-PDF-1.pdf",
    mediaType: "pdf"
  })) {
    console.log(vfile.path);
    await fs.promises.writeFile(path.join("fio", vfile.path), vfile.contents);
  }
}

test().then(() => console.log("done"));
