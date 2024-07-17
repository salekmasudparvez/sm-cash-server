const express = require("express");
const cors = require("cors");
require("dotenv").config();
const app = express();
const port = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");

const corsOptions = {
  origin: ["http://localhost:5173", "http://localhost:5000"],
  credentials: true,
  optionSuccessStatus: 200,
};
app.use(cors(corsOptions));
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.2gfcy7h.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    await client.connect();
    const db = client.db("SM-Cash");
    const usersCollection = db.collection("users");

    // JWT related API
    app.post("/jwt", (req, res) => {
      const { email } = req.body;
      if (!email) {
        return res.status(400).send({ error: "Email is required" });
      }
      const token = jwt.sign(
        { email: email },
        process.env.ACCESS_TOKEN_SECRET,
        {
          expiresIn: "365d",
        }
      );
      res.send({ token });
    });

    // Handle user registration
    app.post("/user", async (req, res) => {
      const { username, email, phoneNumber, pinNumber, role } = req.body;
      if (!username || !email || !phoneNumber || !pinNumber || !role) {
        return res.status(400).send({ error: "All fields are required" });
      }

      const existingUser = await usersCollection.findOne({ email });
      if (existingUser) {
        return res.status(400).send({ error: "Email already exists" });
      }
      const existingUserNumber = await usersCollection.findOne({ phoneNumber });
      if (existingUserNumber) {
        return res.status(400).send({ error: "Phone number already exists" });
      }

      try {
        const hashPin = await bcrypt.hash(pinNumber, 10);
        const result = await usersCollection.insertOne({
          username,
          email,
          phoneNumber,
          pinNumber: hashPin,
          role,
          status: "pending",
        });
        res.send({ message: "User created successfully", user: result });
      } catch (error) {
        console.error("Error creating user:", error);
        res.status(500).send({ error: "Internal Server Error" });
      }
    });
    //call in useRole
    app.get("/useRole/:email", async (req, res) => {
      const userEmail = req.params.email;
      const user = await usersCollection.findOne({ email: userEmail });
      res.send(user);
    });
   
    //login-verify
    app.post("/login", async (req, res) => {
      const { emailNumber, pin } = req.body;
      console.log(emailNumber, pin, "[[[[[[[[[[[[[[[[");
  
      let query = {};
      if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailNumber)) {
          query = { email: emailNumber };
      } else {
          query = { phoneNumber: emailNumber };
      }
  
      const user = await usersCollection.findOne(query);
      if (user) {
          const valid = await bcrypt.compare(pin, user.pinNumber);
          if (valid) {
            const token = jwt.sign(
              { email: user.email },
              process.env.ACCESS_TOKEN_SECRET,
              {
                expiresIn: "365d",
              }
            );
              res.send({  token });
          } else {
              res.status(401).send({ error: "Invalid credentials" });
          }
      } else {
          res.status(401).send({ error: "User not found" });
      }
  });
  //admin get user 
  app.get("/admin/users", async (req, res) => {
    const users = await usersCollection.find({}).toArray();
    res.send(users);
  });
  

    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("SM Cash is busy running");
});

app.listen(port, () => {
  console.log(`SM Cash server is running on port: ${port}`);
});
