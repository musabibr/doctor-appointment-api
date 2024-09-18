require("dotenv").config();
const app = require("./src/api_gate_way/app");
const { PORT } = process.env;

const startServer = () => {
    try {
        app.listen(PORT, () => {
        console.log(`Server is listening on port ${PORT}`);
        });
    } catch (error) {
        console.log(error.message);
    }
};

startServer();
