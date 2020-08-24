const processor = require("./engine.js");

// This is only used to for the word count, which is broken
module.exports = async function processEngine({ files, output, cwd }, extract) {
  let processed = [];
  try {
    for (const file of files) {
      const result = await processor.process(file);
      processed = processed.concat(result);
    }
    await processFiles(files, extract);
  } catch (err) {
    console.error(err);
    throw err;
  }
};

async function processFiles(files, extract) {
  for (const file of files) {
    /* const resource =  */ Object.assign({}, file.data.resource, {
      url: file.data.resource.url + ".json",
      encodingFormat: "application/json"
    });
    // await extract(file, resource, {
    //   contentType: "application/json"
    // });
  }
}
