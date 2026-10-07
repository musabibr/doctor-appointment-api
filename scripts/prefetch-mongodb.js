// Downloads the MongoDB binary used by demo mode's embedded database, so the
// first start does not have to. Hosting platforms run this during the build.
const { prefetchMongoBinary } = require("../src/demo/embeddedDatabase");

prefetchMongoBinary()
    .then((binary) => console.log(`MongoDB binary ready: ${binary}`))
    .catch((error) => {
        console.error(`Could not download MongoDB: ${error.message}`);
        process.exit(1);
    });
