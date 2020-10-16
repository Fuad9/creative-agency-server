const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
require("dotenv").config();
const fileUpload = require("express-fileupload");
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.sipuf.mongodb.net/${process.env.DB_NAME}?retryWrites=true&w=majority`;
const MongoClient = require("mongodb").MongoClient;
const { ObjectID } = require("mongodb");
const admin = require("firebase-admin");
const port = 5000;

const app = express();
app.use(bodyParser.json());
app.use(cors());
app.use(express.static("services"));
app.use(fileUpload());

var serviceAccount = require("./creative-agency-dc106-firebase-adminsdk-wdqrh-889e3aba29.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://creative-agency-dc106.firebaseio.com",
});

const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});
client.connect((err) => {
  const servicesCollection = client
    .db(`${process.env.DB_NAME}`)
    .collection("services");

  const ordersCollection = client
    .db(`${process.env.DB_NAME}`)
    .collection("orders");

  const reviewsCollection = client
    .db(`${process.env.DB_NAME}`)
    .collection("reviews");

  const singleReviewCollection = client
    .db(`${process.env.DB_NAME}`)
    .collection("singleReview");

  const singleServiceCollection = client
    .db(`${process.env.DB_NAME}`)
    .collection("singleService");

  const adminsCollection = client
    .db(`${process.env.DB_NAME}`)
    .collection("admins");

  // to add customer orders
  app.post("/addOrders", (req, res) => {
    const file = req.files.file;
    const name = req.body.name;
    const email = req.body.email;
    const service = req.body.service;
    const price = req.body.price;
    const description = req.body.description;
    const newImg = file.data;
    const encImg = newImg.toString("base64");

    var image = {
      contentType: file.mimetype,
      size: file.size,
      img: Buffer.from(encImg, "base64"),
    };

    ordersCollection
      .insertOne({
        name,
        email,
        image,
        service,
        price,
        description,
        status: "Pending",
      })
      .then((result) => {
        res.send(result);
      });
  });

  app.get("/", (req, res) => {
    res.send("It's working successfully");
  });

  // to add new service by admin
  app.post("/addServices", (req, res) => {
    const file = req.files.file;
    const title = req.body.title;
    const description = req.body.description;
    const newImg = file.data;
    const encImg = newImg.toString("base64");

    var image = {
      contentType: file.mimetype,
      size: file.size,
      img: Buffer.from(encImg, "base64"),
    };

    singleServiceCollection
      .insertOne({ image, title, description })
      .then((result) => {
        res.send(result.insertedCount > 0);
        console.log(result);
      });
  });

  // to add reviews
  app.post("/addSingleReview", (req, res) => {
    const reviews = req.body;
    singleReviewCollection.insertOne(reviews).then((result) => {
      res.send(result.insertedCount > 0);
    });
  });

  // to check admins
  app.post("/isAdmin", (req, res) => {
    const email = req.body.email;
    adminsCollection.find({ email: email }).toArray((err, admins) => {
      res.send(admins.length > 0);
    });
  });

  // to add Admin
  app.post("/addAdmin", (req, res) => {
    const admin = req.body;
    adminsCollection.insertOne(admin).then((result) => {
      res.send(result.insertedCount > 0);
    });
  });

  // to retrieve single data by JWT
  app.get("/showIndividualOrders", (req, res) => {
    const bearer = req.headers.authorization;
    if (bearer && bearer.startsWith("Bearer ")) {
      const idToken = bearer.split(" ")[1];
      admin
        .auth()
        .verifyIdToken(idToken)
        .then(function (decodedToken) {
          const tokenEmail = decodedToken.email;
          const queryEmail = req.query.email;
          if (tokenEmail == queryEmail) {
            ordersCollection
              .find({ email: queryEmail })
              .toArray((err, documents) => {
                res.status(200).send(documents);
              });
          } else {
            res.status(401).send("un-authorized access");
          }
        })
        .catch(function (error) {
          res.status(401).send("un-authorized access");
        });
    } else {
      res.status(401).send("un-authorized access");
    }
  });

  // to retrieve all services
  app.get("/showServices", (req, res) => {
    servicesCollection.find({}).toArray((err, documents) => {
      res.send(documents);
    });
  });

  // to retrieve single service
  app.get("/showSingleService", (req, res) => {
    singleServiceCollection.find({}).toArray((err, documents) => {
      res.send(documents);
    });
  });

  // to retrieve all reviews
  app.get("/showReviews", (req, res) => {
    reviewsCollection.find({}).toArray((err, documents) => {
      res.send(documents);
    });
  });

  // to retrieve all orders
  app.get("/showOrders", (req, res) => {
    ordersCollection.find({}).toArray((err, documents) => {
      res.send(documents);
    });
  });

  // to retrieve single review
  app.get("/showSingleReview", (req, res) => {
    singleReviewCollection.find({}).toArray((err, documents) => {
      res.send(documents);
    });
  });

  // to update order status
  app.patch("/statusUpdate", (req, res) => {
    ordersCollection
      .updateOne(
        { _id: ObjectID(req.body.id) },
        {
          $set: { status: req.body.status },
        }
      )
      .then((result) => {
        res.send(result.modifiedCount > 0);
      })
      .catch((err) => console.log(err));
  });
});

app.listen(process.env.PORT || port, () => console.log("listening at " + 5000));
