const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const mongoose = require("mongoose");
const app = express();
const PORT = process.env.PORT || 5000;
const registerRoutes = require("./routes/register");
const loginRoutes = require("./routes/login");
const adminRoutes = require("./routes/admin");
const studentApproveRoutes = require("./routes/students");
const merchRoutes = require("./routes/merch");
const orderRoutes = require("./routes/orders");
const facebookRoutes = require("./routes/facebook");
const cartRoutes = require("./routes/cart");
const logRoutes = require("./routes/logs");
const eventRoutes = require("./routes/events");
require("dotenv").config();

app.use(
  cors({
    origin: process.env.CORS,
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(bodyParser.json());
mongoose
  .connect(process.env.MONGODB_URI, {
    dbName: process.env.DB_NAME,
  })
  .then(() => console.log("MongoDB PSITS connected"))
  .catch((err) => console.log(err));

//Routes
app.use("/api", registerRoutes);
app.use("/api", loginRoutes);
app.use("/api", studentApproveRoutes);
app.use("/api", adminRoutes);
app.use("/api/merch", merchRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/facebook", facebookRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/logs", logRoutes);
app.use("/api/events", eventRoutes);

app.listen(PORT, () => {
  console.log(`Server started, listening at port ${PORT}`);
});
