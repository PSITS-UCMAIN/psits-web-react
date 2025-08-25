"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const body_parser_1 = __importDefault(require("body-parser"));
const cors_1 = __importDefault(require("cors"));
const mongoose_1 = __importDefault(require("mongoose"));
const helmet_1 = __importDefault(require("helmet"));
const dotenv_1 = __importDefault(require("dotenv"));
//Routes Import
const index_route_1 = __importDefault(require("./routes/index.route"));
const admin_route_1 = __importDefault(require("./routes/admin.route"));
const students_route_1 = __importDefault(require("./routes/students.route"));
const cart_route_1 = __importDefault(require("./routes/cart.route"));
const orders_route_1 = __importDefault(require("./routes/orders.route"));
const private_route_1 = __importDefault(require("./routes/private.route"));
const logs_route_1 = __importDefault(require("./routes/logs.route"));
const merchandise_route_1 = __importDefault(require("./routes/merchandise.route"));
const events_route_1 = __importDefault(require("./routes/events.route"));
//Declaration
const app = (0, express_1.default)();
dotenv_1.default.config();
const PORT = process.env.PORT || 5000;
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)({
    origin: process.env.CORS,
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
}));
app.set("trust proxy", 1);
app.use(body_parser_1.default.json());
mongoose_1.default
    .connect(process.env.MONGODB_URI ?? "", {
    dbName: process.env.DB_NAME ?? "psits-test",
})
    .then(() => console.log("MongoDB PSITS Connected [" + process.env.DB_NAME + "]"))
    .catch((err) => console.log(err));
//Routes
app.use("/api", index_route_1.default);
app.use("/api", students_route_1.default);
app.use("/api/admin", admin_route_1.default);
app.use("/api/merch", merchandise_route_1.default);
app.use("/api/orders", orders_route_1.default);
app.use("/api/cart", cart_route_1.default);
app.use("/api/logs", logs_route_1.default);
app.use("/api/events", events_route_1.default);
app.use("/api", private_route_1.default);
app.listen(PORT, () => {
    console.log(`Server started, listening at port ${PORT}`);
});
