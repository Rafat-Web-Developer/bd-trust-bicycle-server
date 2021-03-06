const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.qrhxn.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

function verifyJWT(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).send({ message: "UnAuthorized access" });
  }
  const token = authHeader.split(" ")[1];

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {
    if (err) {
      return res.status(403).send({ message: "Forbidden access" });
    }
    req.decoded = decoded;
    next();
  });
}

async function run() {
  try {
    await client.connect();

    // All Collections
    const usersCollection = client
      .db("bd-trust-bicycle-db")
      .collection("users");
    const productsCollection = client
      .db("bd-trust-bicycle-db")
      .collection("products");
    const ordersCollection = client
      .db("bd-trust-bicycle-db")
      .collection("orders");
    const reviewsCollection = client
      .db("bd-trust-bicycle-db")
      .collection("reviews");

    const verifyAdmin = async (req, res, next) => {
      const requester = req.decoded.email;
      const requesterAccount = await usersCollection.findOne({
        email: requester,
      });
      if (requesterAccount.role === "admin") {
        next();
      } else {
        res.status(403).send({ message: "forbidden" });
      }
    };

    // ---->All API Start<-----

    // All users API Start

    app.get("/total/:email", verifyJWT, async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const checkAdmin = await usersCollection.find(query).toArray();
      if (checkAdmin[0]?.role === "admin") {
        const queryUsers = { role: "user" };
        const queryAdmins = { role: "admin" };
        const users = await usersCollection.find(queryUsers).toArray();
        const admins = await usersCollection.find(queryAdmins).toArray();
        const totalUsers = {
          userCount: users.length,
          adminCount: admins.length,
        };
        res.send(totalUsers);
      } else {
        const query = { user_email: email };
        const orders = await ordersCollection.find(query).toArray();
        const totalOrders = {
          ordersCount: orders.length,
        };
        res.send(totalOrders);
      }
    });

    app.get("/users", verifyJWT, verifyAdmin, async (req, res) => {
      const query = { role: "user" };
      const users = await usersCollection.find(query).toArray();
      res.send(users);
    });

    app.put("/user/:email", async (req, res) => {
      const email = req.params.email;
      const user = req.body;
      const query = { email: email };
      const checkAdmin = await usersCollection.find(query).toArray();

      if (
        checkAdmin.length === 0 ||
        !checkAdmin[0]?.role === "admin" ||
        checkAdmin[0]?.role === "user"
      ) {
        const filter = { email: email };
        const options = { upsert: true };
        const updateDoc = {
          $set: user,
        };
        const result = await usersCollection.updateOne(
          filter,
          updateDoc,
          options
        );
        const token = jwt.sign(
          { email: email },
          process.env.ACCESS_TOKEN_SECRET,
          { expiresIn: "1h" }
        );
        res.send({ result, token });
      } else {
        const adminData = { email: user.email, role: "admin" };
        const filter = { email: email };
        const options = { upsert: true };
        const updateDoc = {
          $set: adminData,
        };
        const result = await usersCollection.updateOne(
          filter,
          updateDoc,
          options
        );
        const token = jwt.sign(
          { email: email },
          process.env.ACCESS_TOKEN_SECRET,
          { expiresIn: "1h" }
        );
        res.send({ result, token });
      }
    });

    app.put("/user/admin/:email", verifyJWT, verifyAdmin, async (req, res) => {
      const email = req.params.email;
      const filter = { email: email };
      const updateDoc = {
        $set: { role: "admin" },
      };
      const result = await usersCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    // All users API End

    // All admin API start

    app.get("/checkAdmin/:email", verifyJWT, async (req, res) => {
      const requester = req.params.email;
      let data = { admin: false };
      const requesterAccount = await usersCollection.findOne({
        email: requester,
      });
      if (requesterAccount.role === "admin") {
        data = { admin: true };
      } else {
        data = { admin: false };
      }
      res.send(data);
    });

    app.get("/admins", verifyJWT, verifyAdmin, async (req, res) => {
      const query = { role: "admin" };
      const admins = await usersCollection.find(query).toArray();
      res.send(admins);
    });

    app.put("/admin/user/:email", verifyJWT, verifyAdmin, async (req, res) => {
      const email = req.params.email;
      const filter = { email: email };
      const updateDoc = {
        $set: { role: "user" },
      };
      const result = await usersCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    // All admin API end

    // All products API start

    app.get("/products", async (req, res) => {
      const query = {};
      const products = await productsCollection.find(query).toArray();
      res.send(products);
    });

    app.get("/product/:id", verifyJWT, async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const products = await productsCollection.findOne(query);
      res.send(products);
    });

    app.post("/product", verifyJWT, verifyAdmin, async (req, res) => {
      const product = req.body;
      const result = await productsCollection.insertOne(product);
      res.send(result);
    });

    app.delete("/product/:id", verifyJWT, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await productsCollection.deleteOne(query);
      res.send(result);
    });

    // All products API end

    // All Orders API Start

    app.get("/orders", verifyJWT, verifyAdmin, async (req, res) => {
      const query = {};
      const orders = await ordersCollection.find(query).toArray();
      res.send(orders);
    });

    app.get("/myOrders/:email", verifyJWT, async (req, res) => {
      const email = req.params.email;
      const query = { user_email: email };
      const orders = await ordersCollection.find(query).toArray();
      res.send(orders);
    });

    app.get("/order/:id", verifyJWT, async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const order = await ordersCollection.findOne(query);
      res.send(order);
    });

    app.post("/order", verifyJWT, async (req, res) => {
      const order = req.body;
      const query = {
        user_email: order.user_email,
        product_name: order.product_name,
        product_id: order.product_id,
      };
      const exist = await ordersCollection.findOne(query);
      if (exist) {
        return res.send({
          success: false,
          message: "You already ordered this product.",
        });
      }
      const result = await ordersCollection.insertOne(order);
      res.send({ success: true, result });
    });

    app.put("/order/shipped/:id", verifyJWT, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const filter = { _id: ObjectId(id) };
      const updateDoc = {
        $set: {
          shipment_status: true,
        },
      };
      const result = await ordersCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    app.put("/order/:id", verifyJWT, async (req, res) => {
      const id = req.params.id;
      const updateData = req.body;
      const filter = { _id: ObjectId(id) };
      const updateDoc = {
        $set: {
          payment_status: updateData.payment_status,
          transaction_id: updateData.transaction_id,
        },
      };
      const result = await ordersCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    app.delete("/order/:id", verifyJWT, async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await ordersCollection.deleteOne(query);
      res.send(result);
    });

    // All Orders API End

    // All Review API Start

    app.get("/reviews", async (req, res) => {
      const query = {};
      const reviews = await reviewsCollection.find(query).toArray();
      res.send(reviews);
    });

    app.put("/addReview/:id", verifyJWT, async (req, res) => {
      const id = req.params.id;
      const updateData = req.body;
      const filter = {
        product_id: updateData?.product_id,
        user_email: updateData?.user_email,
      };
      const options = { upsert: true };
      const updateDoc = {
        $set: updateData,
      };
      const result = await reviewsCollection.updateOne(
        filter,
        updateDoc,
        options
      );
      res.send(result);
    });

    // All Review API End

    // ---->All API End<-----
  } finally {
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("BD Trust Bicycle Server Working... Alhamdulillah!!");
});

app.listen(port, () => {
  console.log(`BD Trust Bicycle app listening on port ${port}`);
});
