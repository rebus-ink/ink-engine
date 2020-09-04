const tap = require("tap");
const formats = require("../src/formats/");

tap.test("unsupported media type", async test => {
  try {
    for await (const vfile of formats({
      mediaType: "application/octet-stream"
    })) {
      console.log("we should never get here");
      console.log(vfile);
    }
  } catch (err) {
    test.equals(err.message, "Unsupported Media Type");
  }
});
// tap.test("no media type", async test => {
//   try {
//     for await (const vfile of formats({ mediaType: null })) {
//       console.log("we should never get here");
//       console.log(vfile);
//     }
//   } catch (err) {
//     test.equals(err.message, "Unsupported Media Type");
//   }
// });
