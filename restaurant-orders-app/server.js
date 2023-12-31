const express = require("express");
const exphbs = require("express-handlebars");
const mongoose = require("mongoose");

const HTTP_PORT = process.env.HTTP_PORT || 8080;
const app = express();

/*
  middlewares
*/
app.use(express.static("public"));
app.use(express.urlencoded({ extended: true }));
app.engine(".hbs", exphbs.engine({ extname: ".hbs" }));
app.set("view engine", ".hbs");

/*
  db connection
*/

const MONGO_DB_URL =
  "mongodb+srv://dbUser:5Tl4PdCVlysHVuhW@cluster0.7edcod3.mongodb.net/myDb?retryWrites=true&w=majority";
mongoose.connect(MONGO_DB_URL);
const db = mongoose.connection;
db.on("error", console.error.bind(console, "Error connecting to database: "));
db.once("open", () => {
  console.log("Mongo DB connected successfully.");
});

const Schema = mongoose.Schema;

const ItemSchema = new Schema({
  name: String,
  image: String,
  description: String,
  price: Number,
});

const OrderSchema = new Schema({
  customerName: String,
  deliveryAddress: String,
  orderCode: String,
  orderItems: Array,
  orderTotal: Number,
  orderDate: { type: Date, default: Date.now },
  orderStatus: String,
  proofOfDelivery: String,
  driverEmailId: String,
});

const DriverSchema = new Schema({
  name: String,
  email: String,
  password: String,
  vehiclemodel: String,
  vehiclecolor: String,
  licenceplatenumber: String,
  activeOrders: Number,
});

const Item = mongoose.model("item_collection", ItemSchema);
const Order = mongoose.model("order_collection", OrderSchema);
const Driver = mongoose.model("driver", DriverSchema);

let cart = [];
/*
  restaurant endpoints
*/

app.get("/", async (req, res) => {
  try {
    const result = await Item.find().lean().exec();

    res.render("restaurant/restaurant", {
      layout: "navbar-layout",
      items: result,
    });
  } catch (error) {
    console.error("Error: ", error);
  }
});

app.get("/create-item", async (req, res) => {
  const item = {
    name: "Peperoni pizza",
    image:
      "https://images.unsplash.com/photo-1525518392674-39ba1fca2ec2?ixlib=rb",
    description: "Delight in the savory perfection of our Pepperoni Pizza",
    price: 24.99,
  };
  try {
    const result = await new Item(item).save();

    return res.send(result);
  } catch (err) {
    console.log(err);
    return res.send(err);
  }
});

app.get("/remove-item/:itemId", async (req, res) => {
  try {
    const result = await Item.findOne({ _id: req.params.itemId });
    if (result === null) {
      return res.send("Cannot find item with that id");
    }
    const id = await result.deleteOne();
    return res.send(`Deleted: ${id}`);
  } catch (err) {
    console.log(err);
    return res.send(err);
  }
});

app.post("/orderForm", (req, res) => {
  const orderItems = req.body.items ? JSON.parse(req.body.items) : [];
  const orderItemsSize = req.body.orderItemsSize;
  let subtotal = 0;

  const deliveryFee = 0.99;
  
  for (let i = 0; i < orderItems.length; i++) {
    subtotal += parseFloat(orderItems[i].price);
  }

  const tax = parseFloat(((subtotal + deliveryFee) * 0.13).toFixed(2)); 
  const total = parseFloat((subtotal + tax + deliveryFee)).toFixed(2);
 
  cart = [];
  for (let i = 0; i < orderItems.length; i++) {
    cart.push(orderItems[i]);
  }
  
  res.render("restaurant/orderForm", {
    layout: "navbar-layout",
    orderItems: orderItems,
    orderItemsSize: orderItemsSize,
    subtotal: subtotal,
    deliveryFee: deliveryFee,
    tax: tax,
    total: total
  });
});

app.get("/order-receipt", (req, res)=>{
  res.render("restaurant/orderReceipt", {
    layout: "navbar-layout",
    orderItems: cart
  })
});

app.get("/order-status", async (req, res) => {
  res.render("restaurant/orderStatus", {
    layout: "navbar-layout",
  });
});

app.post("/order-status", async (req, res) => {
  const orderId = req.body.orderId;
  try {
    const order = await Order.findOne({ orderCode: orderId });
    console.log(order);
    const isReceived = order.orderStatus === "Received";
    const isAvailableForDelivery =
      order.orderStatus === "Available For Delivery";
    const isInTransit = order.orderStatus === "In Transit";
    const isDelivered = order.orderStatus === "Delivered";

    res.render("restaurant/orderStatus", {
      layout: "navbar-layout",
      order: order,
      orderCode: order.orderCode,
      isReceived,
      isAvailableForDelivery,
      isInTransit,
      isDelivered,
    });
  } catch (error) {
    res.render("restaurant/orderStatus", {
      layout: "navbar-layout",
      errMsg: "Order is not found. Please Input Again",
    });
  }
});

app.post("/create-order", async (req, res) => {
  
  const customerName = req.body.customerName;
  const deliveryAddress = req.body.deliveryAddress;
  const orderTotal = req.body.orderTotal;
  console.log("orderTotal" + orderTotal);


  // TODO: Add validation when empty
  // if (customerName === undefined || customerName === null || customerName === "" 
  //      || deliveryAddress === undefined || deliveryAddress === null || deliveryAddress === "" 
  //      || orderTotal === undefined || orderTotal === null || orderTotal === ""
  //      || orderItems === undefined || orderItems === null || orderItems === "") {
  //         console.log(orderItems);
  //         return res.render("restaurant/orderForm", {layout: "navbar-layout", errMsg: "All fields must be filled"})
  //      }
  
  const orderCode = "A" + parseInt(((Math.random() * 1000000) + 1));
  const order = {
    customerName: customerName,
    deliveryAddress: deliveryAddress,
    orderCode: orderCode, //TODO: change this orderCode
    orderItems: cart,
    orderTotal: orderTotal,
    orderStatus: "Received",
    proofOfDelivery: "",
    driverEmailId: "",
  };
  try {
    const result = await new Order(order).save();
    console.log(result);
    return  res.render("restaurant/orderReceipt", {
      layout: "navbar-layout",
      orderItems: cart,
      orderCode: orderCode,
      orderTotal: orderTotal
    })
  } catch (err) {
    console.log(err);
    return res.send(err);
  }
});

app.get("/remove-order/:orderCode", async (req, res) => {
  try {
    const result = await Order.findOne({ orderCode: req.params.orderCode });
    if (result === null) {
      return res.send("Cannot find order with that id");
    }
    const id = await result.deleteOne();
    return res.send(`Deleted: ${id}`);
  } catch (err) {
    console.log(err);
    return res.send(err);
  }
});

/*
  order endpoints
*/

const getOrders = async (orders) => {
  const orderList = [];

  for (order of orders) {
    try {
      let isReceived = false;
      let driverName = "";
      let driverLicensePlate = "";

      const driver = await Driver.findOne({ email: order.driverEmailId });

      if (driver) {
        driverName = driver.name;
        driverLicensePlate = driver.licenceplatenumber;
      }
      if (order.orderStatus === "Received") {
        isReceived = true;
      }

      const orderDate = new Date(order.orderDate);
      const orderDateTime = `${orderDate.getFullYear()}-${
        orderDate.getMonth() + 1
      }-${orderDate.getDate()} ${orderDate.getHours()}:${orderDate.getMinutes()}`;

      const statusesColor = {
        Received: "#f39c12",
        "Available For Delivery": "#27ae60",
        "In Transit": "#2980b9",
        Delivered: "#2c3e50",
      };
      orderList.push({
        _id: order._id,
        customerName: order.customerName,
        deliveryAddress: order.deliveryAddress,
        orderItems: order.orderItems,
        orderCode: order.orderCode,
        orderTotal: order.orderTotal,
        orderDate: orderDateTime,
        orderStatus: order.orderStatus,
        orderStatusColor: statusesColor[order.orderStatus],
        proofOfDelivery: order.proofOfDelivery,
        driverEmailId: order.driverEmailId,
        driverName: driverName,
        driverLicensePlate: driverLicensePlate,
        isReceived: isReceived,
      });
    } catch (err) {
      throw new Error(`Cannot find driver for ${order.orderCode} - ${err}`);
    }
  }
  return orderList;
};

app.get("/orders", async (req, res) => {
  try {
    const orders = await Order.find({ orderStatus: { $ne: "Received" } })
      .sort("-orderDate")
      .lean()
      .exec();
    const activeOrders = await Order.find({ orderStatus: "Received" })
      .sort("-orderDate")
      .lean()
      .exec();
    const orderList = await getOrders(orders);
    const activeOrderList = await getOrders(activeOrders);
    res.render("orders/orders", {
      layout: "navbar-layout",
      orders: orderList,
      activeOrders: activeOrderList,
    });
  } catch (error) {
    res.render("orders/orders", {
      layout: "navbar-layout",
      orders: [],
      errorMsg: `Error: Cannot list Orders at the moment - ${error}`,
    });
  }
});

app.post("/orders", async (req, res) => {
  const customerName = req.body.customerName;
  if (customerName) {
    try {
      const orders = await Order.find({
        customerName,
        orderStatus: { $ne: "Received" },
      })
        .collation({ locale: "en", strength: 2 })
        .sort("-orderDate")
        .lean()
        .exec();

      const activeOrders = await Order.find({ orderStatus: "Received" })
        .sort("-orderDate")
        .lean()
        .exec();

      const orderList = await getOrders(orders);
      const activeOrdersList = await getOrders(activeOrders);
      return res.render("orders/orders", {
        layout: "navbar-layout",
        orders: orderList,
        activeOrders: activeOrdersList,
      });
    } catch (error) {
      return res.render("orders/orders", {
        layout: "navbar-layout",
        orders: [],
      });
    }
  }
  res.redirect("/orders");
});

app.post("/orders/update/:orderCode/:status", async (req, res) => {
  const orderCode = req.params.orderCode;
  const status = req.params.status;
  try {
    const orderToUpdate = await Order.findOne({ orderCode: orderCode });

    if (orderToUpdate === null) {
      return res.send("ERROR: Could not find matching order");
    }

    await orderToUpdate.updateOne({ orderStatus: status });

    res.redirect("/orders");
  } catch (error) {
    console.log(error);
    return res.send("ERROR: Could not update order");
  }
});

app.get("/orders/update/:orderCode/:status", async (req, res) => {
  const orderCode = req.params.orderCode;
  const status = req.params.status;
  try {
    const orderToUpdate = await Order.findOne({ orderCode: orderCode });

    if (orderToUpdate === null) {
      return res.send("ERROR: Could not find matching order");
    }

    await orderToUpdate.updateOne({ orderStatus: status });

    res.redirect("/orders");
  } catch (error) {
    console.log(error);
    return res.send("ERROR: Could not update order");
  }
});

const onHttpStart = () => {
  console.log(`Express web server running on port: ${HTTP_PORT}`);
  console.log(`Press CTRL+C to exit`);
};

app.listen(HTTP_PORT, onHttpStart);
